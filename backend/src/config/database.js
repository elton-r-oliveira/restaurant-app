const sql = require('mssql');

const config = {
  server:   process.env.DB_HOST || 'localhost',
  port:     Number(process.env.DB_PORT) || 1433,
  user:     process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'BDRestaurant_App',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config).connect();

// -------------------------------------------------------------------
// Toda a lógica de acesso a dados vive em Stored Procedures — as rotas
// só chamam execute(nomeDaProc, inputs), nunca rodam SQL solto.
//
// `inputs` é uma lista de [nome, tipo, valor] — a mesma assinatura de
// request.input(nome, tipo, valor) do driver — pra deixar o tipo de
// cada parâmetro explícito (importante pra parâmetros opcionais que
// podem chegar como null, onde o driver não consegue inferir o tipo
// sozinho).
// -------------------------------------------------------------------
async function execute(procName, inputs = []) {
  const pool = await poolPromise;
  const request = pool.request();
  for (const [name, type, value] of inputs) {
    request.input(name, type, value === undefined ? null : value);
  }
  return request.execute(procName);
}

module.exports = { execute, sql, poolPromise };
