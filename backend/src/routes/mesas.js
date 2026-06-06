const router = require('express').Router();
const db     = require('../config/database');
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// GET /mesas — lista todas as mesas do restaurante
router.get('/', autenticar, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, numero, capacidade, status FROM mesas WHERE restaurante_id = ? ORDER BY numero',
      [rid(req)]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /mesas/:id — detalhe de uma mesa + comanda aberta
router.get('/:id', autenticar, async (req, res, next) => {
  try {
    const [mesas] = await db.query(
      'SELECT id, numero, capacidade, status FROM mesas WHERE id = ? AND restaurante_id = ?',
      [req.params.id, rid(req)]
    );
    if (!mesas.length) return res.status(404).json({ erro: 'Mesa não encontrada' });

    const mesa = mesas[0];

    const [comandas] = await db.query(
      `SELECT c.id, c.status, c.total, c.aberta_em,
              u.nome AS garcom_nome
       FROM comandas c
       JOIN usuarios u ON u.id = c.garcom_id
       WHERE c.mesa_id = ? AND c.status = 'aberta'`,
      [mesa.id]
    );
    mesa.comanda_ativa = comandas[0] || null;

    res.json(mesa);
  } catch (err) { next(err); }
});

// POST /mesas — criar mesa (admin)
router.post('/', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { numero, capacidade } = req.body;
    if (!numero) return res.status(400).json({ erro: 'Número da mesa é obrigatório' });

    const [result] = await db.query(
      'INSERT INTO mesas (restaurante_id, numero, capacidade) VALUES (?, ?, ?)',
      [rid(req), numero, capacidade || 4]
    );
    res.status(201).json({ id: result.insertId, numero, capacidade: capacidade || 4, status: 'livre' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Número de mesa já existe' });
    next(err);
  }
});

// PUT /mesas/:id — editar mesa (admin)
router.put('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { numero, capacidade } = req.body;
    await db.query(
      'UPDATE mesas SET numero = COALESCE(?, numero), capacidade = COALESCE(?, capacidade) WHERE id = ? AND restaurante_id = ?',
      [numero, capacidade, req.params.id, rid(req)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /mesas/:id — remover mesa (admin)
router.delete('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM mesas WHERE id = ? AND restaurante_id = ?',
      [req.params.id, rid(req)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
