const router = require('express').Router();
const db     = require('../config/database');
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// GET /relatorios/dia?data=2024-12-01
// Se data não informada, usa hoje
router.get('/dia', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const data = req.query.data || new Date().toISOString().slice(0, 10);

    const [resumoRows] = await db.query(
      `SELECT
         COUNT(*)                                AS total_comandas,
         COALESCE(SUM(total), 0)                 AS faturamento,
         COALESCE(AVG(total), 0)                 AS ticket_medio
       FROM comandas
       WHERE restaurante_id = ?
         AND status = 'fechada'
         AND CAST(fechada_em AS DATE) = ?`,
      [rid(req), data]
    );
    const resumo = resumoRows[0];

    const [itensMaisVendidos] = await db.query(
      `SELECT TOP 10 i.nome, SUM(ci.quantidade) AS total_vendido,
              SUM(ci.quantidade * ci.preco_unitario) AS receita
       FROM comanda_itens ci
       JOIN itens i        ON i.id = ci.item_id
       JOIN comandas c     ON c.id = ci.comanda_id
       WHERE c.restaurante_id = ?
         AND c.status = 'fechada'
         AND CAST(c.fechada_em AS DATE) = ?
       GROUP BY ci.item_id, i.nome
       ORDER BY total_vendido DESC`,
      [rid(req), data]
    );

    res.json({ data, ...resumo, itens_mais_vendidos: itensMaisVendidos });
  } catch (err) { next(err); }
});

// GET /relatorios/periodo?inicio=2024-12-01&fim=2024-12-07
router.get('/periodo', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const fim    = req.query.fim    || new Date().toISOString().slice(0, 10);
    const inicio = req.query.inicio || fim;

    const [resumoRows] = await db.query(
      `SELECT
         COUNT(*)                 AS total_comandas,
         COALESCE(SUM(total), 0)  AS faturamento,
         COALESCE(AVG(total), 0)  AS ticket_medio
       FROM comandas
       WHERE restaurante_id = ?
         AND status = 'fechada'
         AND CAST(fechada_em AS DATE) BETWEEN ? AND ?`,
      [rid(req), inicio, fim]
    );
    const resumo = resumoRows[0];

    const [porDia] = await db.query(
      `SELECT CONVERT(varchar(10), CAST(fechada_em AS DATE), 23) AS data,
              COUNT(*)                 AS total_comandas,
              COALESCE(SUM(total), 0)  AS faturamento
       FROM comandas
       WHERE restaurante_id = ?
         AND status = 'fechada'
         AND CAST(fechada_em AS DATE) BETWEEN ? AND ?
       GROUP BY CAST(fechada_em AS DATE)
       ORDER BY CAST(fechada_em AS DATE)`,
      [rid(req), inicio, fim]
    );

    const [itensMaisVendidos] = await db.query(
      `SELECT TOP 10 i.nome, SUM(ci.quantidade) AS total_vendido,
              SUM(ci.quantidade * ci.preco_unitario) AS receita
       FROM comanda_itens ci
       JOIN itens i        ON i.id = ci.item_id
       JOIN comandas c     ON c.id = ci.comanda_id
       WHERE c.restaurante_id = ?
         AND c.status = 'fechada'
         AND CAST(c.fechada_em AS DATE) BETWEEN ? AND ?
       GROUP BY ci.item_id, i.nome
       ORDER BY total_vendido DESC`,
      [rid(req), inicio, fim]
    );

    const [porCategoria] = await db.query(
      `SELECT cat.nome AS categoria_nome,
              SUM(ci.quantidade) AS total_vendido,
              SUM(ci.quantidade * ci.preco_unitario) AS receita
       FROM comanda_itens ci
       JOIN itens i        ON i.id = ci.item_id
       JOIN categorias cat ON cat.id = i.categoria_id
       JOIN comandas c     ON c.id = ci.comanda_id
       WHERE c.restaurante_id = ?
         AND c.status = 'fechada'
         AND CAST(c.fechada_em AS DATE) BETWEEN ? AND ?
       GROUP BY cat.id, cat.nome
       ORDER BY receita DESC`,
      [rid(req), inicio, fim]
    );

    res.json({
      inicio, fim, ...resumo,
      por_dia: porDia,
      itens_mais_vendidos: itensMaisVendidos,
      por_categoria: porCategoria,
    });
  } catch (err) { next(err); }
});

module.exports = router;
