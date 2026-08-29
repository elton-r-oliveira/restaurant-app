const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../config/database');
const { sql } = db;
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// GET /usuarios — lista usuários do restaurante (admin)
router.get('/', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { recordset } = await db.execute('s_usuarios_lista', [
      ['restauranteId', sql.Int, rid(req)],
    ]);
    res.json(recordset);
  } catch (err) { next(err); }
});

// POST /usuarios — criar garçom/cozinha/admin (admin)
router.post('/', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { nome, email, senha, role } = req.body;
    if (!nome || !email || !senha || !role) {
      return res.status(400).json({ erro: 'nome, email, senha e role são obrigatórios' });
    }
    const roles = ['garcom', 'cozinha', 'admin'];
    if (!roles.includes(role)) return res.status(400).json({ erro: 'Role inválido' });

    const hash = await bcrypt.hash(senha, 10);
    const { recordset } = await db.execute('s_usuarios_insere', [
      ['restauranteId', sql.Int, rid(req)],
      ['nome', sql.NVarChar(100), nome],
      ['email', sql.NVarChar(150), email],
      ['senhaHash', sql.VarChar(255), hash],
      ['role', sql.VarChar(10), role],
    ]);
    res.status(201).json(recordset[0]);
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ erro: 'Email já cadastrado neste restaurante' });
    next(err);
  }
});

// PUT /usuarios/:id — editar usuário (admin)
router.put('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { nome, email, senha, role, ativo } = req.body;
    let hash = null;
    if (senha) hash = await bcrypt.hash(senha, 10);

    await db.execute('s_usuarios_atualiza', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
      ['nome', sql.NVarChar(100), nome ?? null],
      ['email', sql.NVarChar(150), email ?? null],
      ['senhaHash', sql.VarChar(255), hash],
      ['role', sql.VarChar(10), role ?? null],
      ['ativo', sql.Bit, ativo !== undefined ? (ativo ? 1 : 0) : null],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /usuarios/:id — desativar usuário (admin)
router.delete('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.execute('s_usuarios_desativa', [
      ['id', sql.Int, req.params.id],
      ['restauranteId', sql.Int, rid(req)],
    ]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
