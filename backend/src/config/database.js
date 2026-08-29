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
// Camada de compatibilidade com a API do mysql2 usada nas rotas:
// db.query(sql, params) -> [rows]; db.getConnection() -> transação
// com beginTransaction/commit/rollback/release.
// -------------------------------------------------------------------

// Converte "?" posicionais em parâmetros nomeados (@p0, @p1, ...).
// Um array de valores (usado em "IN (?)", com os parênteses já na
// query original) é expandido em uma lista: "IN (@p0_0, @p0_1)".
function bindParams(request, text, params = []) {
  let i = 0;
  const converted = text.replace(/\?/g, () => {
    const value = params[i];
    let placeholder;
    if (Array.isArray(value)) {
      const names = value.map((v, j) => {
        const name = `p${i}_${j}`;
        request.input(name, v);
        return `@${name}`;
      });
      placeholder = names.length ? names.join(', ') : 'NULL';
    } else {
      const name = `p${i}`;
      request.input(name, value === undefined ? null : value);
      placeholder = `@${name}`;
    }
    i += 1;
    return placeholder;
  });
  return converted;
}

// Replica o formato de retorno do mysql2: SELECT -> array de linhas;
// INSERT -> objeto com insertId/affectedRows; UPDATE/DELETE -> objeto
// com affectedRows.
function normalizeResult(result, text) {
  if (/^\s*INSERT/i.test(text)) {
    return [{
      insertId: result.recordset?.[0]?.insertId ?? null,
      affectedRows: result.rowsAffected?.[0] || 0,
    }, undefined];
  }
  if (/^\s*(UPDATE|DELETE)/i.test(text)) {
    return [{ affectedRows: result.rowsAffected?.[0] || 0 }, undefined];
  }
  return [result.recordset || [], undefined];
}

async function runQuery(requestFactory, text, params) {
  const request = requestFactory();
  let finalText = bindParams(request, text, params);
  if (/^\s*INSERT/i.test(finalText)) {
    finalText += '; SELECT SCOPE_IDENTITY() AS insertId;';
  }
  const result = await request.query(finalText);
  return normalizeResult(result, finalText);
}

async function query(text, params) {
  const pool = await poolPromise;
  return runQuery(() => pool.request(), text, params);
}

async function getConnection() {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  return {
    beginTransaction: () => transaction.begin(),
    commit: () => transaction.commit(),
    rollback: () => transaction.rollback(),
    release: () => {},
    query: (text, params) => runQuery(() => new sql.Request(transaction), text, params),
  };
}

module.exports = { query, getConnection, sql, poolPromise };
