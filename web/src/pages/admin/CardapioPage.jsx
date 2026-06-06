import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function CardapioPage() {
  const [categorias, setCategorias] = useState([]);
  const [itens,      setItens]      = useState([]);
  const [catForm,    setCatForm]    = useState({ nome: '', ordem: '' });
  const [itemForm,   setItemForm]   = useState({ categoria_id: '', nome: '', descricao: '', preco: '', disponivel: true });
  const [editCat,    setEditCat]    = useState(null);
  const [editItem,   setEditItem]   = useState(null);

  async function carregar() {
    const [c, i] = await Promise.all([
      api.get('/cardapio/categorias'),
      api.get('/cardapio/itens'),
    ]);
    setCategorias(c.data);
    setItens(i.data);
  }

  useEffect(() => { carregar(); }, []);

  async function salvarCategoria(e) {
    e.preventDefault();
    if (editCat) {
      await api.put(`/cardapio/categorias/${editCat}`, catForm);
    } else {
      await api.post('/cardapio/categorias', catForm);
    }
    setCatForm({ nome: '', ordem: '' });
    setEditCat(null);
    carregar();
  }

  async function salvarItem(e) {
    e.preventDefault();
    if (editItem) {
      await api.put(`/cardapio/itens/${editItem}`, itemForm);
    } else {
      await api.post('/cardapio/itens', itemForm);
    }
    setItemForm({ categoria_id: '', nome: '', descricao: '', preco: '', disponivel: true });
    setEditItem(null);
    carregar();
  }

  const s = styles;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>
      {/* Categorias */}
      <div>
        <h3 style={{ marginBottom: 14 }}>Categorias</h3>
        <form onSubmit={salvarCategoria} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <input style={s.input} placeholder="Nome" value={catForm.nome} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })} required />
          <input style={s.input} placeholder="Ordem" type="number" value={catForm.ordem} onChange={(e) => setCatForm({ ...catForm, ordem: e.target.value })} />
          <button style={s.btn} type="submit">{editCat ? 'Salvar' : 'Adicionar'}</button>
          {editCat && <button type="button" onClick={() => { setEditCat(null); setCatForm({ nome: '', ordem: '' }); }} style={{ ...s.btn, background: '#aaa' }}>Cancelar</button>}
        </form>

        {categorias.map((c) => (
          <div key={c.id} style={s.listItem}>
            <span style={{ fontWeight: 600 }}>{c.nome}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.link} onClick={() => { setEditCat(c.id); setCatForm({ nome: c.nome, ordem: c.ordem }); }}>Editar</button>
              <button style={{ ...s.link, color: '#e63946' }} onClick={async () => { await api.delete(`/cardapio/categorias/${c.id}`); carregar(); }}>Remover</button>
            </div>
          </div>
        ))}
      </div>

      {/* Itens */}
      <div>
        <h3 style={{ marginBottom: 14 }}>Itens do Cardápio</h3>
        <form onSubmit={salvarItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <select style={s.input} value={itemForm.categoria_id} onChange={(e) => setItemForm({ ...itemForm, categoria_id: e.target.value })} required>
            <option value="">Categoria</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <input style={s.input} placeholder="Nome do item" value={itemForm.nome} onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })} required />
          <input style={{ ...s.input, gridColumn: '1/-1' }} placeholder="Descrição" value={itemForm.descricao} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} />
          <input style={s.input} placeholder="Preço (R$)" type="number" step="0.01" value={itemForm.preco} onChange={(e) => setItemForm({ ...itemForm, preco: e.target.value })} required />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={itemForm.disponivel} onChange={(e) => setItemForm({ ...itemForm, disponivel: e.target.checked })} />
            Disponível
          </label>
          <button style={{ ...s.btn, gridColumn: '1/-1' }} type="submit">{editItem ? 'Salvar' : 'Adicionar item'}</button>
          {editItem && <button type="button" onClick={() => { setEditItem(null); setItemForm({ categoria_id: '', nome: '', descricao: '', preco: '', disponivel: true }); }} style={{ ...s.btn, background: '#aaa', gridColumn: '1/-1' }}>Cancelar</button>}
        </form>

        {itens.map((i) => (
          <div key={i.id} style={s.listItem}>
            <div>
              <div style={{ fontWeight: 600 }}>{i.nome} <span style={{ color: '#888', fontWeight: 400, fontSize: 13 }}>({i.categoria_nome})</span></div>
              <div style={{ fontSize: 13, color: '#555' }}>R$ {Number(i.preco).toFixed(2)} · {i.disponivel ? '✅ Disponível' : '❌ Indisponível'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.link} onClick={() => {
                setEditItem(i.id);
                setItemForm({ categoria_id: i.categoria_id, nome: i.nome, descricao: i.descricao || '', preco: i.preco, disponivel: !!i.disponivel });
              }}>Editar</button>
              <button style={{ ...s.link, color: '#e63946' }} onClick={async () => { await api.delete(`/cardapio/itens/${i.id}`); carregar(); }}>Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  input:    { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 },
  btn:      { padding: '9px 0', background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#fff', borderRadius: 8, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
  link:     { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#555' },
};
