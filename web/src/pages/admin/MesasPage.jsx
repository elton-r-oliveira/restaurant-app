import { useEffect, useState } from 'react';
import api from '../../services/api';
import { conectarSocket, desconectarSocket } from '../../services/socket';

export default function MesasPage() {
  const [mesas,  setMesas]  = useState([]);
  const [form,   setForm]   = useState({ numero: '', capacidade: 4 });
  const [editId, setEditId] = useState(null);
  const [erro,   setErro]   = useState('');

  async function carregar() {
    const { data } = await api.get('/mesas');
    setMesas(data);
  }

  useEffect(() => {
    carregar();
    const s = conectarSocket();
    s.on('mesa_atualizada', ({ mesa_id, status }) =>
      setMesas((prev) => prev.map((m) => m.id === mesa_id ? { ...m, status } : m))
    );
    return () => {
      s.off('mesa_atualizada');
      desconectarSocket();
    };
  }, []);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      if (editId) {
        await api.put(`/mesas/${editId}`, form);
      } else {
        await api.post('/mesas', form);
      }
      setForm({ numero: '', capacidade: 4 });
      setEditId(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar');
    }
  }

  async function remover(id) {
    if (!confirm('Remover esta mesa?')) return;
    await api.delete(`/mesas/${id}`);
    carregar();
  }

  function editar(mesa) {
    setEditId(mesa.id);
    setForm({ numero: mesa.numero, capacidade: mesa.capacidade });
  }

  const statusColor = { livre: '#2ecc71', ocupada: '#e67e22', reservada: '#3498db' };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Mesas</h2>

      <form onSubmit={salvar} style={styles.form}>
        <input
          style={styles.input}
          type="number"
          placeholder="Número"
          value={form.numero}
          onChange={(e) => setForm({ ...form, numero: e.target.value })}
          required
        />
        <input
          style={styles.input}
          type="number"
          placeholder="Capacidade"
          value={form.capacidade}
          onChange={(e) => setForm({ ...form, capacidade: e.target.value })}
          required
        />
        {erro && <span style={{ color: 'red', fontSize: 13 }}>{erro}</span>}
        <button style={styles.btn} type="submit">{editId ? 'Salvar' : 'Adicionar'}</button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm({ numero: '', capacidade: 4 }); }} style={{ ...styles.btn, background: '#aaa' }}>
            Cancelar
          </button>
        )}
      </form>

      <div style={styles.grid}>
        {mesas.map((m) => (
          <div key={m.id} style={{ ...styles.card, borderTop: `4px solid ${statusColor[m.status]}` }}>
            <div style={styles.cardNum}>Mesa {m.numero}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{m.capacidade} lugares</div>
            <div style={{ fontSize: 12, color: statusColor[m.status], fontWeight: 600, marginTop: 4 }}>{m.status}</div>
            <div style={styles.cardActions}>
              <button onClick={() => editar(m)}    style={styles.smallBtn}>Editar</button>
              <button onClick={() => remover(m.id)} style={{ ...styles.smallBtn, color: '#e63946' }}>Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  form:       { display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' },
  input:      { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: 130 },
  btn:        { padding: '8px 18px', background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 16 },
  card:       { background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.1)' },
  cardNum:    { fontWeight: 700, fontSize: 18 },
  cardActions:{ display: 'flex', gap: 8, marginTop: 10 },
  smallBtn:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#555', padding: 0 },
};
