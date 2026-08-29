import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Sector, Customized } from 'recharts';
import api from '../../services/api';

// -------------------------------------------------------------------
// Paleta (ver skill de dataviz): azul sequencial para magnitude única;
// cores de categoria reaproveitadas do Cardápio, para identidade
// consistente com o resto do app.
// -------------------------------------------------------------------
const AZUL       = '#2a78d6';
const AZUL_HOVER = '#1c5cab';

const CAT_COLOR = {
  entradas:   '#f39c12',
  pratos:     '#e63946',
  bebidas:    '#3498db',
  sobremesas: '#9b59b6',
};

function toISO(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function fmtDiaMes(iso) { const [, m, d] = iso.split('-'); return `${d}/${m}`; }
function fmtMoeda(v) { return `R$ ${Number(v).toFixed(2)}`; }

// Preenche os dias sem venda no intervalo com zero, pra o gráfico não
// "sumir" com dias que não tiveram nenhuma comanda fechada.
function preencherDias(porDia, inicio, fim) {
  const porData = Object.fromEntries(porDia.map((d) => [d.data, d]));
  const dias = [];
  let cursor = new Date(`${inicio}T00:00:00`);
  const fimData = new Date(`${fim}T00:00:00`);
  while (cursor <= fimData) {
    const iso = toISO(cursor);
    dias.push(porData[iso] || { data: iso, total_comandas: 0, faturamento: 0 });
    cursor = addDays(cursor, 1);
  }
  return dias;
}

const HOJE = toISO(new Date());

const PRESETS = [
  { label: 'Hoje',          calc: () => [HOJE, HOJE] },
  { label: 'Últimos 7 dias',  calc: () => [toISO(addDays(new Date(), -6)), HOJE] },
  { label: 'Últimos 30 dias', calc: () => [toISO(addDays(new Date(), -29)), HOJE] },
  { label: 'Este mês',       calc: () => [HOJE.slice(0, 8) + '01', HOJE] },
];

export default function RelatorioPage() {
  const [presetAtivo, setPresetAtivo] = useState('Últimos 7 dias');
  const [inicio, setInicio] = useState(PRESETS[1].calc()[0]);
  const [fim,    setFim]    = useState(PRESETS[1].calc()[1]);
  const [relatorio, setRel] = useState(null);

  async function carregar() {
    const { data } = await api.get(`/relatorios/periodo?inicio=${inicio}&fim=${fim}`);
    setRel(data);
  }

  useEffect(() => { carregar(); }, [inicio, fim]);

  function aplicarPreset(p) {
    const [i, f] = p.calc();
    setPresetAtivo(p.label);
    setInicio(i);
    setFim(f);
  }

  const s = styles;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Relatório</h2>

        {/* Filtro de período — presets + intervalo personalizado, tudo numa linha */}
        <div style={s.filtroRow}>
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => aplicarPreset(p)}
              style={{ ...s.presetBtn, ...(presetAtivo === p.label ? s.presetBtnAtivo : {}) }}>
              {p.label}
            </button>
          ))}
          <span style={s.filtroDivisor} />
          <input type="date" value={inicio} max={fim}
            onChange={(e) => { setInicio(e.target.value); setPresetAtivo(null); }} style={s.dateInput} />
          <span style={{ color: '#999' }}>até</span>
          <input type="date" value={fim} min={inicio} max={HOJE}
            onChange={(e) => { setFim(e.target.value); setPresetAtivo(null); }} style={s.dateInput} />
        </div>
      </div>

      {!relatorio ? <p>Carregando...</p> : <Conteudo relatorio={relatorio} />}
    </div>
  );
}

function Conteudo({ relatorio }) {
  const s = styles;

  return (
    <>
      <div style={s.cards}>
        <StatCard label="Comandas fechadas" value={relatorio.total_comandas} />
        <StatCard label="Faturamento"        value={fmtMoeda(relatorio.faturamento)} />
        <StatCard label="Ticket médio"       value={fmtMoeda(relatorio.ticket_medio)} />
      </div>

      <div style={s.chartCard}>
        <h3 style={s.chartTitle}>Faturamento por dia</h3>
        <GraficoBarrasDias dados={preencherDias(relatorio.por_dia, relatorio.inicio, relatorio.fim)} />
      </div>

      <div style={s.duasColunas}>
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Itens mais vendidos</h3>
          {relatorio.itens_mais_vendidos.length === 0
            ? <p style={{ color: '#888' }}>Nenhum dado para este período.</p>
            : <RankingHorizontal
                itens={relatorio.itens_mais_vendidos.map((i) => ({ label: i.nome, valor: Number(i.receita), sub: `${i.total_vendido}× vendido` }))}
                cor={AZUL} />}
        </div>

        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Faturamento por categoria</h3>
          {relatorio.por_categoria.length === 0
            ? <p style={{ color: '#888' }}>Nenhum dado para este período.</p>
            : <div style={{ height: 300 }}><PieCategoria dados={relatorio.por_categoria} /></div>}
        </div>
      </div>
    </>
  );
}

// -------------------------------------------------------------------
// Gráfico de barras — faturamento por dia, com tooltip por barra.
// -------------------------------------------------------------------
function GraficoBarrasDias({ dados }) {
  const [hover, setHover] = useState(null); // { idx, x, y }
  const s = styles;

  const max = Math.max(1, ...dados.map((d) => Number(d.faturamento)));
  const idxMax = dados.reduce((best, d, i) => (Number(d.faturamento) > Number(dados[best]?.faturamento ?? -1) ? i : best), 0);

  const W = 720, H = 220, padL = 44, padB = 26, padT = 16;
  const areaW = W - padL - 8, areaH = H - padB - padT;
  const n = Math.max(dados.length, 1);
  const slot = areaW / n;
  const barW = Math.min(24, slot - 6);

  const passoLabel = n > 12 ? Math.ceil(n / 12) : 1;
  const yTicks = [0, 0.5, 1].map((f) => Math.round(max * f));

  if (dados.length === 0) return <p style={{ color: '#888' }}>Nenhum dado para este período.</p>;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* gridlines */}
        {yTicks.map((t, i) => {
          const y = padT + areaH - (t / max) * areaH;
          return (
            <g key={i}>
              <line x1={padL} x2={W} y1={y} y2={y} stroke="#e1e0d9" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#898781">{t}</text>
            </g>
          );
        })}

        {dados.map((d, i) => {
          const val = Number(d.faturamento);
          const h = max ? (val / max) * areaH : 0;
          const x = padL + i * slot + (slot - barW) / 2;
          const y = padT + areaH - h;
          const isHover = hover?.idx === i;
          const cor = isHover ? AZUL_HOVER : AZUL;
          return (
            <g key={d.data}
               onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover({ idx: i, x: r.left + r.width / 2, y: r.top }); }}
               onMouseLeave={() => setHover(null)}
               style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="4" ry="4" fill={cor} />
              {h > 4 && <rect x={x} y={y + Math.max(h, 1) - 4} width={barW} height="4" fill={cor} />}
              {/* hit area maior que a barra visível */}
              <rect x={padL + i * slot} y={padT} width={slot} height={areaH} fill="transparent" />
              {i === idxMax && val > 0 && (
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b0b0b">{fmtMoeda(val)}</text>
              )}
              {i % passoLabel === 0 && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#898781">{fmtDiaMes(d.data)}</text>
              )}
            </g>
          );
        })}

        <line x1={padL} x2={W} y1={padT + areaH} y2={padT + areaH} stroke="#c3c2b7" strokeWidth="1" />
      </svg>

      {hover && (
        <div style={{ ...s.tooltip, left: 0, top: 0, transform: `translate(${hover.x}px, ${hover.y - 54}px) translateX(-50%)`, position: 'fixed' }}>
          <div style={{ fontSize: 11, color: '#c3c2b7' }}>{fmtDiaMes(dados[hover.idx].data)}</div>
          <div style={{ fontWeight: 700 }}>{fmtMoeda(dados[hover.idx].faturamento)}</div>
          <div style={{ fontSize: 11, color: '#c3c2b7' }}>{dados[hover.idx].total_comandas} comanda(s)</div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Ranking horizontal — barras com nome à esquerda e valor na ponta.
// -------------------------------------------------------------------
function RankingHorizontal({ itens, cor }) {
  const s = styles;
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div>
      {itens.map((item, idx) => (
        <div key={idx} style={s.rankRow}>
          <div style={s.rankLabel} title={item.label}>
            {item.label}
            {item.sub && <div style={{ fontSize: 11, color: '#999', fontWeight: 400 }}>{item.sub}</div>}
          </div>
          <div style={s.catBarTrack}>
            <div style={{ ...s.catBarFill, width: `${Math.max((item.valor / max) * 100, 3)}%`, background: cor }} />
          </div>
          <div style={s.catValor}>{fmtMoeda(item.valor)}</div>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------
// Pizza (donut) de faturamento por categoria — mesmo padrão visual do
// PieRanking usado no projeto neooMonit: fatia expande no hover com
// linha-guia até o rótulo, total no centro, legenda embaixo.
// -------------------------------------------------------------------
const PIE_FALLBACK_COLORS = ['#10b981', '#a855f7', '#3b82f6', '#ec4899', '#ef4444', '#facc15', '#06b6d4'];
function corCategoria(nome, idx) {
  return CAT_COLOR[nome?.toLowerCase()] || PIE_FALLBACK_COLORS[idx % PIE_FALLBACK_COLORS.length];
}

function renderActiveShapeCategoria(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  const sin = Math.sin(-((startAngle + endAngle) / 2) * (Math.PI / 180));
  const cos = Math.cos(-((startAngle + endAngle) / 2) * (Math.PI / 180));
  const mx = cx + (outerRadius + 22) * cos;
  const my = cy + (outerRadius + 22) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 18;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <path d={`M${cx + outerRadius * cos},${cy + outerRadius * sin}L${mx},${my}L${ex},${ey}`}
        stroke={fill} fill="none" strokeWidth={1.5} />
      <circle cx={ex} cy={ey} r={2} fill={fill} />
      <text x={ex + (cos >= 0 ? 6 : -6)} y={ey} textAnchor={textAnchor} fill="#1a1a1a" fontSize={11} fontWeight={600}>
        {payload.name}
      </text>
      <text x={ex + (cos >= 0 ? 6 : -6)} y={ey + 14} textAnchor={textAnchor} fill={fill} fontSize={11}>
        {`${fmtMoeda(payload.value)} · ${(percent * 100).toFixed(1)}%`}
      </text>
    </g>
  );
}

function CenterLabelCategoria({ cx, cy, total }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#1a1a1a" fontSize={12} opacity={0.5}>total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#1a1a1a" fontSize={15} fontWeight={700}>{fmtMoeda(total)}</text>
    </g>
  );
}

function PieCategoria({ dados }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const chartData = dados.map((d) => ({ name: d.categoria_nome, value: Number(d.receita), qtd: Number(d.total_vendido) }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  function renderLabel({ cx, cy, midAngle, outerRadius, percent, value, fill }) {
    if (activeIndex !== null || percent < 0.001) return null;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + outerRadius * cos;
    const sy = cy + outerRadius * sin;
    const mx = cx + (outerRadius + 22) * cos;
    const my = cy + (outerRadius + 22) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 18;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';
    const tx = ex + (cos >= 0 ? 6 : -6);
    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={1.5} />
        <circle cx={ex} cy={ey} r={2} fill={fill} />
        <text x={tx} y={ey - 4} textAnchor={textAnchor} fill="#1a1a1a" fontSize={11} fontWeight={700}>{fmtMoeda(value)}</text>
        <text x={tx} y={ey + 10} textAnchor={textAnchor} fill={fill} fontSize={10}>{`${(percent * 100).toFixed(1)}%`}</text>
      </g>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart style={{ overflow: 'visible' }}>
        <Pie
          data={chartData}
          cx="50%" cy="50%"
          innerRadius="38%" outerRadius="60%"
          dataKey="value"
          paddingAngle={3}
          isAnimationActive={false}
          activeIndex={activeIndex ?? undefined}
          activeShape={renderActiveShapeCategoria}
          label={renderLabel}
          labelLine={false}
          onMouseEnter={(_, i) => setActiveIndex(i)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {chartData.map((d, i) => (
            <Cell key={i} fill={corCategoria(d.name, i)} opacity={activeIndex === null || activeIndex === i ? 1 : 0.3} />
          ))}
        </Pie>
        <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {total > 0 && (
          <Customized component={(props) => {
            const pie = props.formattedGraphicalItems?.[0];
            if (!pie) return null;
            const { cx, cy } = pie.props;
            return <CenterLabelCategoria cx={cx} cy={cy} total={total} />;
          }} />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  filtroRow:   { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  presetBtn:   { padding: '7px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#555', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  presetBtnAtivo: { background: '#1a1a2e', borderColor: '#1a1a2e', color: '#fff' },
  filtroDivisor: { width: 1, height: 22, background: '#ddd', margin: '0 4px' },
  dateInput:   { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 },

  cards:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 },
  statCard: { background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.1)', textAlign: 'center' },
  statValue:{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' },
  statLabel:{ fontSize: 13, color: '#888', marginTop: 4 },

  chartCard:  { background: '#fcfcfb', border: '1px solid #f0f0ee', borderRadius: 12, padding: 18, marginBottom: 20 },
  chartTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  duasColunas:{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },

  tooltip: { background: '#1a1a1a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.25)' },

  rankRow:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  rankLabel:  { width: 130, fontSize: 13, color: '#333', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  catBarTrack:{ flex: 1, height: 10, background: '#eeeeec', borderRadius: 5, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 5 },
  catValor:   { width: 80, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#1a1a2e', flexShrink: 0 },
};
