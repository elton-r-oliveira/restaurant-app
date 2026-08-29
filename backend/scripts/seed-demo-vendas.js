/**
 * Popula comandas fechadas (vendas) em dias anteriores para alimentar o
 * gráfico de Relatório com dados de demonstração.
 *
 * Uso: node scripts/seed-demo-vendas.js [inicio] [fim]
 *   inicio/fim no formato YYYY-MM-DD (padrão: dia 1 do mês atual até ontem)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../src/config/database');
const { sql } = db;

const RESTAURANTE_ID = 1;
const COMANDAS_POR_DIA = [4, 10]; // faixa aleatória de comandas fechadas por dia
const ITENS_POR_COMANDA = [1, 5];
const QTD_POR_ITEM = [1, 3];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function toISO(d) { return d.toISOString().slice(0, 10); }

function diaComHora(dataISO, hora, minuto) {
  return new Date(`${dataISO}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`);
}

async function main() {
  const hoje = new Date();
  const inicioPadrao = `${toISO(hoje).slice(0, 8)}01`;
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
  const fimPadrao = toISO(ontem);

  const inicio = process.argv[2] || inicioPadrao;
  const fim = process.argv[3] || fimPadrao;

  const { recordset: mesas } = await db.execute('s_mesas_lista', [
    ['restauranteId', sql.Int, RESTAURANTE_ID],
  ]);
  const { recordset: todosItens } = await db.execute('s_itens_lista', [
    ['restauranteId', sql.Int, RESTAURANTE_ID],
    ['categoriaId', sql.Int, null],
    ['disponivel', sql.Bit, 1],
    ['busca', sql.NVarChar(120), null],
  ]);
  const { recordset: todosUsuarios } = await db.execute('s_usuarios_lista', [
    ['restauranteId', sql.Int, RESTAURANTE_ID],
  ]);
  const garcons = todosUsuarios.filter((u) => u.role === 'garcom');

  if (!mesas.length || !todosItens.length || !garcons.length) {
    console.error('Faltam mesas, itens ou garçons cadastrados para o restaurante demo. Abortando.');
    process.exit(1);
  }

  let totalComandas = 0;
  let cursor = new Date(`${inicio}T00:00:00`);
  const fimData = new Date(`${fim}T00:00:00`);

  while (cursor <= fimData) {
    const dataISO = toISO(cursor);
    const nComandas = randInt(...COMANDAS_POR_DIA);

    for (let i = 0; i < nComandas; i++) {
      const abertaEm = diaComHora(dataISO, randInt(11, 21), randInt(0, 59));
      const fechadaEm = new Date(abertaEm.getTime() + randInt(15, 90) * 60000);

      const { recordset } = await db.execute('s_comandas_insere_demo', [
        ['restauranteId', sql.Int, RESTAURANTE_ID],
        ['mesaId', sql.Int, pick(mesas).id],
        ['garcomId', sql.Int, pick(garcons).id],
        ['abertaEm', sql.DateTime2, abertaEm],
        ['fechadaEm', sql.DateTime2, fechadaEm],
      ]);
      const comandaId = recordset[0].id;

      const nItens = randInt(...ITENS_POR_COMANDA);
      for (let j = 0; j < nItens; j++) {
        const item = pick(todosItens);
        const qtd = randInt(...QTD_POR_ITEM);
        await db.execute('s_comanda_itens_insere_demo', [
          ['comandaId', sql.Int, comandaId],
          ['itemId', sql.Int, item.id],
          ['quantidade', sql.SmallInt, qtd],
          ['precoUnitario', sql.Decimal(10, 2), item.preco],
          ['pedidoEm', sql.DateTime2, abertaEm],
          ['prontoEm', sql.DateTime2, fechadaEm],
        ]);
      }

      totalComandas++;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  console.log(`✓ ${totalComandas} comandas de demonstração criadas entre ${inicio} e ${fim}.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
