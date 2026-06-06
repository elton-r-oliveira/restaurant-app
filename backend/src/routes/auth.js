const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');

// POST /auth/login
// Body: { email, senha }
// Funciona para usuários do restaurante (garçom, cozinha, admin)
router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const [rows] = await db.query(
      `SELECT u.id, u.nome, u.email, u.senha_hash, u.role, u.ativo,
              u.restaurante_id, r.nome AS restaurante_nome
       FROM usuarios u
       JOIN restaurantes r ON r.id = u.restaurante_id
       WHERE u.email = ? AND r.ativo = 1`,
      [email]
    );

    const usuario = rows[0];
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const payload = {
      id:             usuario.id,
      nome:           usuario.nome,
      email:          usuario.email,
      role:           usuario.role,
      restaurante_id: usuario.restaurante_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({
      token,
      usuario: {
        id:               usuario.id,
        nome:             usuario.nome,
        email:            usuario.email,
        role:             usuario.role,
        restaurante_id:   usuario.restaurante_id,
        restaurante_nome: usuario.restaurante_nome,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
