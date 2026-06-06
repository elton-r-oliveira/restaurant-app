import { useEffect, useState } from 'react';
import api from '../../services/api';

const ROLES = ['garcom', 'cozinha', 'admin'];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [form,     setForm]     = useState({ nome: '', email: '', senha: '', role: 'garcom' });
  const [editId,   setEditId]   = useState(null);
  const [erro,     setErro]     = useState('');

  async function carregar() {
    const { data } = await api.get('/usuarios');
    setUsuarios(data);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      const payload = { ...form };
      if (!payload.senha) delete payload.senha;

      if (editId) {
        await api.put(`/usuarios/${editId}`, payload);
      } else {
        await api.post('/usuarios', payload);
      }
      setForm({ nome: '', email: '', senha: '', role: 'garcom' });
      setEditId(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao salvar');
    }
  }

  async function desativar(id) {
    if (!confirm('Desativar este usuário?')) return;
    await api.delete(`/usuarios/${id}`);
    carregar();
  }

  const s = styles;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Usuários</h2>

      <form onSubmit={salvar} style={s.form}>
        <input style={s.input} placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <input style={s.input} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required={!editId} />
        <input style={s.input} placeholder={editId ? 'Nova senha (opcional)' : 'Senha'} type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required={!editId} />
        <select style={s.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {erro && <span style={{ color: 'red', fontSize: 13 }}>{erro}</span>}
        <button style={s.btn} type="submit">{editId ? 'Salvar' : 'Adicionar'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ nome: '', email: '', senha: '', role: 'garcom' }); }} style={{ ...s.btn, background: '#aaa' }}>Cancelar</button>}
      </form>

      <table style={s.table}>
        <thead>
          <tr>{['Nome', 'Email', 'Role', 'Status', ''].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td style={s.td}>{u.nome}</td>
              <td style={s.td}>{u.email}</td>
              <td style={s.td}><span style={{ ...s.badge, background: roleColor[u.role] }}>{u.role}</span></td>
              <td style={s.td}>{u.ativo ? '✅ Ativo' : '🔴 Inativo'}</td>
              <td style={s.td}>
                <button style={s.link} onClick={() => { setEditId(u.id); setForm({ nome: u.nome, email: u.email, senha: '', role: u.role }); }}>Editar</button>
                {u.ativo && <button style={{ ...s.link, color: '#e63946', marginLeft: 8 }} onClick={() => desativar(u.id)}>Desativar</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const roleColor = { garcom: '#3498db', cozinha: '#e67e22', admin: '#9b59b6' };

const styles = {
  form:  { display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 },
  btn:   { padding: '8px 18px', background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.1)' },
  th:    { padding: '12px 16px', textAlign: 'left', background: '#f8f8f8', fontSize: 13, fontWeight: 700, color: '#555' },
  td:    { padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 14 },
  link:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555' },
  badge: { padding: '2px 8px', borderRadius: 12, color: '#fff', fontSize: 12, fontWeight: 600 },
};
