const router = require('express').Router();
const db     = require('../config/database');
const { sql } = db;
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// GET /relatorios/dia?data=2024-12-01
// Se data não informada, usa hoje
router.get('/dia', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const data = req.query.data || new Date().toISOString().slice(0, 10);

    const { recordsets } = await db.execute('s_relatorio_dia', [
      ['restauranteId', sql.Int, rid(req)],
      ['data', sql.Date, data],
    ]);
    const [resumoRows, itensMaisVendidos] = recordsets;

    res.json({ data, ...resumoRows[0], itens_mais_vendidos: itensMaisVendidos });
  } catch (err) { next(err); }
});

// GET /relatorios/periodo?inicio=2024-12-01&fim=2024-12-07
router.get('/periodo', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const fim    = req.query.fim    || new Date().toISOString().slice(0, 10);
    const inicio = req.query.inicio || fim;

    const { recordsets } = await db.execute('s_relatorio_periodo', [
      ['restauranteId', sql.Int, rid(req)],
      ['inicio', sql.Date, inicio],
      ['fim', sql.Date, fim],
    ]);
    const [resumoRows, porDia, itensMaisVendidos, porCategoria] = recordsets;

    res.json({
      inicio, fim, ...resumoRows[0],
      por_dia: porDia,
      itens_mais_vendidos: itensMaisVendidos,
      por_categoria: porCategoria,
    });
  } catch (err) { next(err); }
});

module.exports = router;
