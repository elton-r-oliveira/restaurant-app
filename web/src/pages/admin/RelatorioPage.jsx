import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function RelatorioPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [data,    setData]    = useState(hoje);
  const [relatorio, setRel]   = useState(null);

  async function carregar() {
    const { data: d } = await api.get(`/relatorios/dia?data=${data}`);
    setRel(d);
  }

  useEffect(() => { carregar(); }, [data]);

  if (!relatorio) return <p>Carregando...</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h2>Relatório do Dia</h2>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={styles.input} />
      </div>

      <div style={styles.cards}>
        <StatCard label="Comandas fechadas" value={relatorio.total_comandas} />
        <StatCard label="Faturamento"        value={`R$ ${Number(relatorio.faturamento).toFixed(2)}`} />
        <StatCard label="Ticket médio"       value={`R$ ${Number(relatorio.ticket_medio).toFixed(2)}`} />
      </div>

      <h3 style={{ margin: '28px 0 14px' }}>Itens mais vendidos</h3>
      {relatorio.itens_mais_vendidos.length === 0 ? (
        <p style={{ color: '#888' }}>Nenhum dado para este dia.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['Item', 'Qtd vendida', 'Receita'].map((h) => <th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {relatorio.itens_mais_vendidos.map((i, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{i.nome}</td>
                <td style={styles.td}>{i.total_vendido}</td>
                <td style={styles.td}>R$ {Number(i.receita).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
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
  input:    { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 },
  cards:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  statCard: { background: '#fff', padding: 20, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.1)', textAlign: 'center' },
  statValue:{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' },
  statLabel:{ fontSize: 13, color: '#888', marginTop: 4 },
  table:    { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.1)' },
  th:       { padding: '12px 16px', textAlign: 'left', background: '#f8f8f8', fontSize: 13, fontWeight: 700, color: '#555' },
  td:       { padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 },
};
