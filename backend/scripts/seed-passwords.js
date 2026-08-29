/**
 * Gera hashes bcrypt para os usuários de demo e atualiza o banco.
 * Execute uma única vez: node scripts/seed-passwords.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db     = require('../src/config/database');
const { sql } = db;

const USUARIOS = [
  { email: 'demo@comanda.app',    senha: 'demo123',    proc: 's_restaurantes_atualiza_senha_por_email' },
  { email: 'admin@comanda.app',   senha: 'admin123',   proc: 's_usuarios_atualiza_senha_por_email' },
  { email: 'joao@comanda.app',    senha: 'garcom123',  proc: 's_usuarios_atualiza_senha_por_email' },
  { email: 'cozinha@comanda.app', senha: 'cozinha123', proc: 's_usuarios_atualiza_senha_por_email' },
];

async function main() {
  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.senha, 10);
    await db.execute(u.proc, [
      ['email', sql.NVarChar(150), u.email],
      ['senhaHash', sql.VarChar(255), hash],
    ]);
    console.log(`✓ ${u.email} → hash atualizado`);
  }
  console.log('\nSenhas configuradas com sucesso!');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
