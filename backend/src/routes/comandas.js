const router  = require('express').Router();
const db      = require('../config/database');
const { sql } = db;
const { autenticar } = require('../middleware/auth');
const { getIO }      = require('../socket');

const rid = (req) => req.usuario.restaurante_id;

// GET /comandas — lista comandas do restaurante (opcionalmente por status)
router.get('/', autenticar, async (req, res, next) => {
  try {
    const { status } = req.query;
    const { recordset } = await db.execute('s_comandas_lista', [
      ['restauranteId', sql.Int, rid(req)],
      ['status', sql.VarChar(10), status || null],
    ]);
    res.json(recordset);
  } catch (err) { next(err); }
});

// GET /comandas/:id — comanda com todos os itens
router.get('/:id', autenticar, async (req, res, next) => {
  try {
    const { recordsets } = await db.execute('s_comandas_detalha', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    const [comandas, itens] = recordsets;
    if (!comandas.length) return res.status(404).json({ erro: 'Comanda não encontrada' });

    res.json({ ...comandas[0], itens });
  } catch (err) { next(err); }
});

// POST /comandas — abrir nova comanda em uma mesa
router.post('/', autenticar, async (req, res, next) => {
  try {
    const { mesa_id } = req.body;
    if (!mesa_id) return res.status(400).json({ erro: 'mesa_id é obrigatório' });

    const { recordset } = await db.execute('s_comandas_abre', [
      ['restauranteId', sql.Int, rid(req)],
      ['mesaId', sql.Int, mesa_id],
      ['garcomId', sql.Int, req.usuario.id],
    ]);
    const novaComanda = { ...recordset[0], itens: [] };

    getIO().to(`r_${rid(req)}`).emit('mesa_atualizada', {
      mesa_id,
      status: 'ocupada',
    });

    res.status(201).json(novaComanda);
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ erro: err.message });
    if (err.number === 50002) return res.status(409).json({ erro: err.message });
    next(err);
  }
});

// POST /comandas/:id/itens — adicionar item(ns) à comanda
router.post('/:id/itens', autenticar, async (req, res, next) => {
  try {
    const { itens } = req.body; // [{ item_id, quantidade, observacao }]
    if (!itens?.length) return res.status(400).json({ erro: 'Lista de itens vazia' });

    const { recordset: novosItens } = await db.execute('s_comandas_itens_insere', [
      ['comandaId', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
      ['itensJson', sql.NVarChar(sql.MAX), JSON.stringify(itens)],
    ]);

    const { mesa_id, mesa_numero } = novosItens[0];

    getIO().to(`r_${rid(req)}`).emit('novo_pedido', {
      comanda_id: Number(req.params.id),
      mesa_id,
      mesa_numero,
      itens: novosItens,
    });

    res.status(201).json(novosItens);
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ erro: err.message });
    if (err.number === 50003) return res.status(400).json({ erro: err.message });
    next(err);
  }
});

// PATCH /comandas/:id/itens/:itemId/status — cozinha atualiza status do item
router.patch('/:id/itens/:itemId/status', autenticar, async (req, res, next) => {
  try {
    const { status } = req.body;
    const statusValidos = ['pendente', 'em_preparo', 'pronto', 'entregue'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido' });
    }

    const { recordset } = await db.execute('s_comandas_item_atualiza_status', [
      ['id', sql.Int, req.params.itemId],
      ['comandaId', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
      ['status', sql.VarChar(12), status],
    ]);

    if (!recordset[0].linhasAfetadas) return res.status(404).json({ erro: 'Item não encontrado' });

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
    const { recordset } = await db.execute('s_comandas_fecha', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    const { mesa_id, total } = recordset[0];

    getIO().to(`r_${rid(req)}`).emit('mesa_atualizada', {
      mesa_id,
      status: 'livre',
    });

    res.json({ ok: true, total });
  } catch (err) {
    if (err.number === 50001) return res.status(404).json({ erro: err.message });
    next(err);
  }
});

module.exports = router;
