const router = require('express').Router();
const db     = require('../config/database');
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// ---------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------

// GET /cardapio/categorias
router.get('/categorias', autenticar, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nome, ordem FROM categorias WHERE restaurante_id = ? ORDER BY ordem, nome',
      [rid(req)]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /cardapio/categorias
router.post('/categorias', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { nome, ordem } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
    const [r] = await db.query(
      'INSERT INTO categorias (restaurante_id, nome, ordem) VALUES (?, ?, ?)',
      [rid(req), nome, ordem || 0]
    );
    res.status(201).json({ id: r.insertId, nome, ordem: ordem || 0 });
  } catch (err) { next(err); }
});

// PUT /cardapio/categorias/:id
router.put('/categorias/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { nome, ordem } = req.body;
    await db.query(
      'UPDATE categorias SET nome = COALESCE(?, nome), ordem = COALESCE(?, ordem) WHERE id = ? AND restaurante_id = ?',
      [nome, ordem, req.params.id, rid(req)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /cardapio/categorias/:id
router.delete('/categorias/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM categorias WHERE id = ? AND restaurante_id = ?',
      [req.params.id, rid(req)]
    );
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
    let sql = `
      SELECT i.id, i.categoria_id, c.nome AS categoria_nome,
             i.nome, i.descricao, i.preco, i.disponivel, i.imagem_url
      FROM itens i
      JOIN categorias c ON c.id = i.categoria_id
      WHERE i.restaurante_id = ?`;
    const params = [rid(req)];

    if (categoria_id) { sql += ' AND i.categoria_id = ?'; params.push(categoria_id); }
    if (disponivel !== undefined) { sql += ' AND i.disponivel = ?'; params.push(disponivel === '1' ? 1 : 0); }
    if (busca) { sql += ' AND i.nome LIKE ?'; params.push(`%${busca}%`); }

    sql += ' ORDER BY c.ordem, c.nome, i.nome';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /cardapio/itens/:id
router.get('/itens/:id', autenticar, async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, categoria_id, nome, descricao, preco, disponivel, imagem_url FROM itens WHERE id = ? AND restaurante_id = ?',
      [req.params.id, rid(req)]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Item não encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /cardapio/itens
router.post('/itens', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { categoria_id, nome, descricao, preco, disponivel, imagem_url } = req.body;
    if (!categoria_id || !nome || preco === undefined) {
      return res.status(400).json({ erro: 'categoria_id, nome e preco são obrigatórios' });
    }
    const [r] = await db.query(
      'INSERT INTO itens (restaurante_id, categoria_id, nome, descricao, preco, disponivel, imagem_url) VALUES (?,?,?,?,?,?,?)',
      [rid(req), categoria_id, nome, descricao || null, preco, disponivel !== false ? 1 : 0, imagem_url || null]
    );
    res.status(201).json({ id: r.insertId, nome, preco, disponivel: disponivel !== false });
  } catch (err) { next(err); }
});

// PUT /cardapio/itens/:id
router.put('/itens/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { categoria_id, nome, descricao, preco, disponivel, imagem_url } = req.body;
    await db.query(
      `UPDATE itens SET
        categoria_id = COALESCE(?, categoria_id),
        nome         = COALESCE(?, nome),
        descricao    = COALESCE(?, descricao),
        preco        = COALESCE(?, preco),
        disponivel   = COALESCE(?, disponivel),
        imagem_url   = COALESCE(?, imagem_url)
       WHERE id = ? AND restaurante_id = ?`,
      [categoria_id, nome, descricao, preco, disponivel !== undefined ? (disponivel ? 1 : 0) : null,
       imagem_url, req.params.id, rid(req)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /cardapio/itens/:id
router.delete('/itens/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.query(
      'DELETE FROM itens WHERE id = ? AND restaurante_id = ?',
      [req.params.id, rid(req)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
