const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/database');
const { sql } = db;

// POST /auth/login
// Body: { email, senha }
// Funciona para usuários do restaurante (garçom, cozinha, admin)
router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    const { recordset } = await db.execute('s_login_busca_por_email', [
      ['email', sql.NVarChar(150), email],
    ]);

    const usuario = recordset[0];
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
