const router = require('express').Router();
const db     = require('../config/database');
const { sql } = db;
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// GET /mesas — lista todas as mesas do restaurante
router.get('/', autenticar, async (req, res, next) => {
  try {
    const { recordset } = await db.execute('s_mesas_lista', [
      ['restauranteId', sql.Int, rid(req)],
    ]);
    res.json(recordset);
  } catch (err) { next(err); }
});

// GET /mesas/:id — detalhe de uma mesa + comanda aberta
router.get('/:id', autenticar, async (req, res, next) => {
  try {
    const { recordsets } = await db.execute('s_mesas_detalha', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    const [mesas, comandasAtivas] = recordsets;
    if (!mesas.length) return res.status(404).json({ erro: 'Mesa não encontrada' });

    const mesa = mesas[0];
    mesa.comanda_ativa = comandasAtivas[0] || null;

    res.json(mesa);
  } catch (err) { next(err); }
});

// POST /mesas — criar mesa (admin)
router.post('/', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { numero, capacidade } = req.body;
    if (!numero) return res.status(400).json({ erro: 'Número da mesa é obrigatório' });

    const { recordset } = await db.execute('s_mesas_insere', [
      ['restauranteId', sql.Int, rid(req)],
      ['numero', sql.SmallInt, numero],
      ['capacidade', sql.SmallInt, capacidade || 4],
    ]);
    res.status(201).json(recordset[0]);
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ erro: 'Número de mesa já existe' });
    next(err);
  }
});

// PUT /mesas/:id — editar mesa (admin)
router.put('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { numero, capacidade } = req.body;
    await db.execute('s_mesas_atualiza', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
      ['numero', sql.SmallInt, numero ?? null],
      ['capacidade', sql.SmallInt, capacidade ?? null],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /mesas/:id — remover mesa (admin)
router.delete('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.execute('s_mesas_remove', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
