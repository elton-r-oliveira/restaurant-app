const router  = require('express').Router();
const db      = require('../config/database');
const { autenticar } = require('../middleware/auth');
const { getIO }      = require('../socket');

const rid = (req) => req.usuario.restaurante_id;

// GET /comandas — lista comandas abertas do restaurante
router.get('/', autenticar, async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [rid(req)];
    let sql = `
      SELECT c.id, c.mesa_id, m.numero AS mesa_numero,
             c.garcom_id, u.nome AS garcom_nome,
             c.status, c.total, c.aberta_em, c.fechada_em
      FROM comandas c
      JOIN mesas m   ON m.id = c.mesa_id
      JOIN usuarios u ON u.id = c.garcom_id
      WHERE c.restaurante_id = ?`;

    if (status) { sql += ' AND c.status = ?'; params.push(status); }
    sql += ' ORDER BY c.aberta_em DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /comandas/:id — comanda com todos os itens
router.get('/:id', autenticar, async (req, res, next) => {
  try {
    const [comandas] = await db.query(
      `SELECT c.id, c.mesa_id, m.numero AS mesa_numero,
              c.garcom_id, u.nome AS garcom_nome,
              c.status, c.total, c.aberta_em, c.fechada_em
       FROM comandas c
       JOIN mesas m    ON m.id = c.mesa_id
       JOIN usuarios u ON u.id = c.garcom_id
       WHERE c.id = ? AND c.restaurante_id = ?`,
      [req.params.id, rid(req)]
    );
    if (!comandas.length) return res.status(404).json({ erro: 'Comanda não encontrada' });

    const [itens] = await db.query(
      `SELECT ci.id, ci.item_id, i.nome AS item_nome,
              ci.quantidade, ci.preco_unitario, ci.observacao,
              ci.status, ci.pedido_em, ci.pronto_em
       FROM comanda_itens ci
       JOIN itens i ON i.id = ci.item_id
       WHERE ci.comanda_id = ?
       ORDER BY ci.pedido_em`,
      [req.params.id]
    );

    res.json({ ...comandas[0], itens });
  } catch (err) { next(err); }
});

// POST /comandas — abrir nova comanda em uma mesa
router.post('/', autenticar, async (req, res, next) => {
  try {
    const { mesa_id } = req.body;
    if (!mesa_id) return res.status(400).json({ erro: 'mesa_id é obrigatório' });

    const [mesas] = await db.query(
      'SELECT id, numero, status FROM mesas WHERE id = ? AND restaurante_id = ?',
      [mesa_id, rid(req)]
    );
    if (!mesas.length) return res.status(404).json({ erro: 'Mesa não encontrada' });

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO comandas (restaurante_id, mesa_id, garcom_id) VALUES (?,?,?)',
        [rid(req), mesa_id, req.usuario.id]
      );

      await conn.query(
        "UPDATE mesas SET status = 'ocupada' WHERE id = ?",
        [mesa_id]
      );

      await conn.commit();

      const novaComanda = {
        id:           result.insertId,
        mesa_id,
        mesa_numero:  mesas[0].numero,
        garcom_id:    req.usuario.id,
        garcom_nome:  req.usuario.nome,
        status:       'aberta',
        total:        0,
        itens:        [],
      };

      getIO().to(`r_${rid(req)}`).emit('mesa_atualizada', {
        mesa_id,
        status: 'ocupada',
      });

      res.status(201).json(novaComanda);
    } catch (err) {
      await conn.rollback();
      if (err.sqlState === '45000') return res.status(409).json({ erro: err.message });
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) { next(err); }
});

// POST /comandas/:id/itens — adicionar item(ns) à comanda
router.post('/:id/itens', autenticar, async (req, res, next) => {
  try {
    const { itens } = req.body; // [{ item_id, quantidade, observacao }]
    if (!itens?.length) return res.status(400).json({ erro: 'Lista de itens vazia' });

    const [comandas] = await db.query(
      "SELECT id, mesa_id FROM comandas WHERE id = ? AND restaurante_id = ? AND status = 'aberta'",
      [req.params.id, rid(req)]
    );
    if (!comandas.length) return res.status(404).json({ erro: 'Comanda aberta não encontrada' });

    const itemIds = itens.map((i) => i.item_id);
    const [cardapio] = await db.query(
      'SELECT id, nome, preco FROM itens WHERE id IN (?) AND restaurante_id = ? AND disponivel = 1',
      [itemIds, rid(req)]
    );

    const precoMap = Object.fromEntries(cardapio.map((i) => [i.id, i]));

    const novosItens = [];
    for (const pedido of itens) {
      const itemCardapio = precoMap[pedido.item_id];
      if (!itemCardapio) {
        return res.status(400).json({ erro: `Item ${pedido.item_id} não encontrado ou indisponível` });
      }

      const [r] = await db.query(
        'INSERT INTO comanda_itens (comanda_id, item_id, quantidade, preco_unitario, observacao) VALUES (?,?,?,?,?)',
        [req.params.id, pedido.item_id, pedido.quantidade || 1, itemCardapio.preco, pedido.observacao || null]
      );

      novosItens.push({
        id:             r.insertId,
        comanda_id:     Number(req.params.id),
        item_id:        pedido.item_id,
        item_nome:      itemCardapio.nome,
        quantidade:     pedido.quantidade || 1,
        preco_unitario: itemCardapio.preco,
        observacao:     pedido.observacao || null,
        status:         'pendente',
        mesa_id:        comandas[0].mesa_id,
      });
    }

    getIO().to(`r_${rid(req)}`).emit('novo_pedido', {
      comanda_id: Number(req.params.id),
      mesa_id:    comandas[0].mesa_id,
      itens:      novosItens,
    });

    res.status(201).json(novosItens);
  } catch (err) { next(err); }
});

// PATCH /comandas/:id/itens/:itemId/status — cozinha atualiza status do item
router.patch('/:id/itens/:itemId/status', autenticar, async (req, res, next) => {
  try {
    const { status } = req.body;
    const statusValidos = ['pendente', 'em_preparo', 'pronto', 'entregue'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }

    const prontoEm = status === 'pronto' ? new Date() : null;

    const [result] = await db.query(
      `UPDATE comanda_itens ci
       JOIN comandas c ON c.id = ci.comanda_id
       SET ci.status = ?, ci.pronto_em = COALESCE(?, ci.pronto_em)
       WHERE ci.id = ? AND ci.comanda_id = ? AND c.restaurante_id = ?`,
      [status, prontoEm, req.params.itemId, req.params.id, rid(req)]
    );

    if (!result.affectedRows) return res.status(404).json({ erro: 'Item não encontrado' });

    getIO().to(`r_${rid(req)}`).emit('status_item', {
      comanda_id: Number(req.params.id),
      item_id:    Number(req.params.itemId),
      status,
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /comandas/:id/fechar — fechar comanda e liberar mesa
router.post('/:id/fechar', autenticar, async (req, res, next) => {
  try {
    const [comandas] = await db.query(
      "SELECT id, mesa_id, total FROM comandas WHERE id = ? AND restaurante_id = ? AND status = 'aberta'",
      [req.params.id, rid(req)]
    );
    if (!comandas.length) return res.status(404).json({ erro: 'Comanda aberta não encontrada' });

    const { mesa_id, total } = comandas[0];

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        "UPDATE comandas SET status = 'fechada', fechada_em = NOW() WHERE id = ?",
        [req.params.id]
      );
      await conn.query(
        "UPDATE mesas SET status = 'livre' WHERE id = ?",
        [mesa_id]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    getIO().to(`r_${rid(req)}`).emit('mesa_atualizada', {
      mesa_id,
      status: 'livre',
    });

    res.json({ ok: true, total });
  } catch (err) { next(err); }
});

module.exports = router;
