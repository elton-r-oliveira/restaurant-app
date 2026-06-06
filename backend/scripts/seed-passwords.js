/**
 * Gera hashes bcrypt para os usuários de demo e atualiza o banco.
 * Execute uma única vez: node scripts/seed-passwords.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db     = require('../src/config/database');

const USUARIOS = [
  { email: 'demo@comanda.app',    senha: 'demo123',    tabela: 'restaurantes' },
  { email: 'admin@comanda.app',   senha: 'admin123',   tabela: 'usuarios' },
  { email: 'alfred@comanda.app',    senha: 'garcom123',  tabela: 'usuarios' },
  { email: 'cozinha@comanda.app', senha: 'cozinha123', tabela: 'usuarios' },
];

async function main() {
  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.senha, 10);
    await db.query(
      `UPDATE ${u.tabela} SET senha_hash = ? WHERE email = ?`,
      [hash, u.email]
    );
    console.log(`✓ ${u.email} → hash atualizado`);
  }
  console.log('\nSenhas configuradas com sucesso!');
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
