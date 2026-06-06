const router = require('express').Router();
const db     = require('../config/database');
const { autenticar, autorizar } = require('../middleware/auth');

const rid = (req) => req.usuario.restaurante_id;

// GET /relatorios/dia?data=2024-12-01
// Se data não informada, usa hoje
router.get('/dia', autenticar, autorizar('admin'), async (req, res, next) => {
  try {
    const data = req.query.data || new Date().toISOString().slice(0, 10);

    const [[resumo]] = await db.query(
      `SELECT
         COUNT(*)                                AS total_comandas,
         COALESCE(SUM(total), 0)                 AS faturamento,
         COALESCE(AVG(total), 0)                 AS ticket_medio
       FROM comandas
       WHERE restaurante_id = ?
         AND status = 'fechada'
         AND DATE(fechada_em) = ?`,
      [rid(req), data]
    );

    const [itensMaisVendidos] = await db.query(
      `SELECT i.nome, SUM(ci.quantidade) AS total_vendido,
              SUM(ci.quantidade * ci.preco_unitario) AS receita
       FROM comanda_itens ci
       JOIN itens i        ON i.id = ci.item_id
       JOIN comandas c     ON c.id = ci.comanda_id
       WHERE c.restaurante_id = ?
         AND c.status = 'fechada'
         AND DATE(c.fechada_em) = ?
       GROUP BY ci.item_id
       ORDER BY total_vendido DESC
       LIMIT 10`,
      [rid(req), data]
    );

    res.json({ data, ...resumo, itens_mais_vendidos: itensMaisVendidos });
  } catch (err) { next(err); }
});

module.exports = router;
