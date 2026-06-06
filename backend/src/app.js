const express = require('express');
const cors = require('cors');

const authRoutes     = require('./routes/auth');
const mesasRoutes    = require('./routes/mesas');
const cardapioRoutes = require('./routes/cardapio');
const comandasRoutes = require('./routes/comandas');
const usuariosRoutes = require('./routes/usuarios');
const relatoriosRoutes = require('./routes/relatorios');

const app = express();

app.use(cors());

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth',      authRoutes);
app.use('/mesas',     mesasRoutes);
app.use('/cardapio',  cardapioRoutes);
app.use('/comandas',  comandasRoutes);
app.use('/usuarios',  usuariosRoutes);
app.use('/relatorios',relatoriosRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ erro: err.message || 'Erro interno do servidor' });
});

module.exports = app;
