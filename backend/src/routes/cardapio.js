const router = require('express').Router();
const db     = require('../config/database');
const { sql } = db;
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// ---------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------

// GET /cardapio/categorias
router.get('/categorias', autenticar, async (req, res, next) => {
  try {
    const { recordset } = await db.execute('s_categorias_lista', [
      ['restauranteId', sql.Int, rid(req)],
    ]);
    res.json(recordset);
  } catch (err) { next(err); }
});

// POST /cardapio/categorias
router.post('/categorias', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { nome, ordem } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
    const { recordset } = await db.execute('s_categorias_insere', [
      ['restauranteId', sql.Int, rid(req)],
      ['nome', sql.NVarChar(80), nome],
      ['ordem', sql.SmallInt, ordem || 0],
    ]);
    res.status(201).json(recordset[0]);
  } catch (err) { next(err); }
});

// PUT /cardapio/categorias/:id
router.put('/categorias/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { nome, ordem } = req.body;
    await db.execute('s_categorias_atualiza', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
      ['nome', sql.NVarChar(80), nome ?? null],
      ['ordem', sql.SmallInt, ordem ?? null],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /cardapio/categorias/:id
router.delete('/categorias/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.execute('s_categorias_remove', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------
// Itens
// ---------------------------------------------------------------

// GET /cardapio/itens — lista itens (opcionalmente filtrado por categoria)
router.get('/itens', autenticar, async (req, res, next) => {
  try {
    const { categoria_id, disponivel, busca } = req.query;
    const { recordset } = await db.execute('s_itens_lista', [
      ['restauranteId', sql.Int, rid(req)],
      ['categoriaId', sql.Int, categoria_id || null],
      ['disponivel', sql.Bit, disponivel !== undefined ? (disponivel === '1' ? 1 : 0) : null],
      ['busca', sql.NVarChar(120), busca || null],
    ]);
    res.json(recordset);
  } catch (err) { next(err); }
});

// GET /cardapio/itens/:id
router.get('/itens/:id', autenticar, async (req, res, next) => {
  try {
    const { recordset } = await db.execute('s_itens_detalha', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    if (!recordset.length) return res.status(404).json({ erro: 'Item não encontrado' });
    res.json(recordset[0]);
  } catch (err) { next(err); }
});

// POST /cardapio/itens
router.post('/itens', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { categoria_id, nome, descricao, preco, disponivel, imagem_url } = req.body;
    if (!categoria_id || !nome || preco === undefined) {
      return res.status(400).json({ erro: 'categoria_id, nome e preco são obrigatórios' });
    }
    const { recordset } = await db.execute('s_itens_insere', [
      ['restauranteId', sql.Int, rid(req)],
      ['categoriaId', sql.Int, categoria_id],
      ['nome', sql.NVarChar(120), nome],
      ['descricao', sql.NVarChar(sql.MAX), descricao || null],
      ['preco', sql.Decimal(10, 2), preco],
      ['disponivel', sql.Bit, disponivel !== false ? 1 : 0],
      ['imagemUrl', sql.VarChar(500), imagem_url || null],
    ]);
    res.status(201).json(recordset[0]);
  } catch (err) { next(err); }
});

// PUT /cardapio/itens/:id
router.put('/itens/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { categoria_id, nome, descricao, preco, disponivel, imagem_url } = req.body;
    await db.execute('s_itens_atualiza', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
      ['categoriaId', sql.Int, categoria_id ?? null],
      ['nome', sql.NVarChar(120), nome ?? null],
      ['descricao', sql.NVarChar(sql.MAX), descricao ?? null],
      ['preco', sql.Decimal(10, 2), preco ?? null],
      ['disponivel', sql.Bit, disponivel !== undefined ? (disponivel ? 1 : 0) : null],
      ['imagemUrl', sql.VarChar(500), imagem_url ?? null],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /cardapio/itens/:id
router.delete('/itens/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.execute('s_itens_remove', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
