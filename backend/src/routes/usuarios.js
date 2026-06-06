const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../config/database');
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// GET /usuarios — lista usuários do restaurante (admin)
router.get('/', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nome, email, role, ativo FROM usuarios WHERE restaurante_id = ? ORDER BY nome',
      [rid(req)]
    );
    res.json(rows);
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
    const [r] = await db.query(
      'INSERT INTO usuarios (restaurante_id, nome, email, senha_hash, role) VALUES (?,?,?,?,?)',
      [rid(req), nome, email, hash, role]
    );
    res.status(201).json({ id: r.insertId, nome, email, role, ativo: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Email já cadastrado neste restaurante' });
    next(err);
  }
});

// PUT /usuarios/:id — editar usuário (admin)
router.put('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const { nome, email, senha, role, ativo } = req.body;
    let hash = null;
    if (senha) hash = await bcrypt.hash(senha, 10);

    await db.query(
      `UPDATE usuarios SET
        nome       = COALESCE(?, nome),
        email      = COALESCE(?, email),
        senha_hash = COALESCE(?, senha_hash),
        role       = COALESCE(?, role),
        ativo      = COALESCE(?, ativo)
       WHERE id = ? AND restaurante_id = ?`,
      [nome, email, hash, role, ativo !== undefined ? (ativo ? 1 : 0) : null,
       req.params.id, rid(req)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /usuarios/:id — desativar usuário (admin)
router.delete('/:id', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    await db.query(
      'UPDATE usuarios SET ativo = 0 WHERE id = ? AND restaurante_id = ?',
      [req.params.id, rid(req)]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
