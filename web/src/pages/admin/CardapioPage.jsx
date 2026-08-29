import { useEffect, useState } from 'react';
import {
  Tag, Type, Hash, AlignLeft, DollarSign, Plus, Save, X, Pencil, Trash2,
  CheckCircle2, XCircle, Apple, UtensilsCrossed, Coffee, IceCreamCone,
} from 'lucide-react';
import api from '../../services/api';

const CAT_STYLE = {
  entradas:   { color: '#f39c12', Icon: Apple },
  pratos:     { color: '#e63946', Icon: UtensilsCrossed },
  bebidas:    { color: '#3498db', Icon: Coffee },
  sobremesas: { color: '#9b59b6', Icon: IceCreamCone },
};
const DEFAULT_CAT_STYLE = { color: '#7f8c8d', Icon: Tag };

function catStyle(nome) {
  return CAT_STYLE[nome?.toLowerCase()] || DEFAULT_CAT_STYLE;
}

function CategoriaIcon({ nome, size = 18, badgeSize = 30, radius = 8, cor }) {
  const { color, Icon } = catStyle(nome);
  return (
    <div style={{ ...styles.catBadge, width: badgeSize, height: badgeSize, borderRadius: radius, background: cor || color }}>
      <Icon size={size} color="#fff" strokeWidth={2} />
    </div>
  );
}

function FieldIcon({ icon: Icon, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={16} color="#999" style={styles.fieldIcon} />
      {children}
    </div>
  );
}

const ITEM_VAZIO = { nome: '', descricao: '', preco: '', disponivel: true };

export default function CardapioPage() {
  const [categorias,  setCategorias]  = useState([]);
  const [itens,       setItens]       = useState([]);
  const [catAtiva,    setCatAtiva]    = useState(null);
  const [catForm,     setCatForm]     = useState({ nome: '', ordem: '' });
  const [itemForm,    setItemForm]    = useState(ITEM_VAZIO);
  const [editCat,     setEditCat]     = useState(null);
  const [editItem,    setEditItem]    = useState(null);
  const [showCatForm, setShowCatForm] = useState(false);

  async function carregar() {
    const [c, i] = await Promise.all([
      api.get('/cardapio/categorias'),
      api.get('/cardapio/itens'),
    ]);
    setCategorias(c.data);
    setItens(i.data);
    setCatAtiva((prev) => prev ?? c.data[0]?.id ?? null);
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
    setShowCatForm(false);
    carregar();
  }

  function editarCategoria(c) {
    setEditCat(c.id);
    setCatForm({ nome: c.nome, ordem: c.ordem });
    setShowCatForm(true);
  }

  async function removerCategoria(id) {
    await api.delete(`/cardapio/categorias/${id}`);
    if (catAtiva === id) setCatAtiva(null);
    carregar();
  }

  async function salvarItem(e) {
    e.preventDefault();
    const payload = { ...itemForm, categoria_id: catAtiva };
    if (editItem) {
      await api.put(`/cardapio/itens/${editItem}`, payload);
    } else {
      await api.post('/cardapio/itens', payload);
    }
    setItemForm(ITEM_VAZIO);
    setEditItem(null);
    carregar();
  }

  const s = styles;
  const itensDaCategoria = itens.filter((i) => i.categoria_id === catAtiva);
  const categoriaAtiva = categorias.find((c) => c.id === catAtiva);

  return (
    <div>
      {/* Categorias — cards lado a lado, igual ao mobile */}
      <h3 style={s.sectionTitle}><Tag size={20} /> Categorias</h3>
      <div style={s.catsRow}>
        {categorias.map((c) => {
          const { color, Icon } = catStyle(c.nome);
          const ativa = c.id === catAtiva;
          return (
            <div key={c.id} style={{ ...s.catCard, ...(ativa ? { background: color, borderColor: color } : {}) }} onClick={() => setCatAtiva(c.id)}>
              <div style={s.catCardActions}>
                <button style={s.miniIconBtn} title="Editar" onClick={(e) => { e.stopPropagation(); editarCategoria(c); }}>
                  <Pencil size={12} color={ativa ? '#fff' : '#555'} />
                </button>
                <button style={s.miniIconBtn} title="Remover" onClick={(e) => { e.stopPropagation(); removerCategoria(c.id); }}>
                  <Trash2 size={12} color={ativa ? '#fff' : '#e63946'} />
                </button>
              </div>
              <Icon size={24} color={ativa ? '#fff' : color} strokeWidth={2} />
              <span style={{ ...s.catCardText, color: ativa ? '#fff' : '#555' }}>{c.nome}</span>
            </div>
          );
        })}
        <div style={s.catCardAdd} onClick={() => { setEditCat(null); setCatForm({ nome: '', ordem: '' }); setShowCatForm((v) => !v); }}>
          <Plus size={22} color="#999" />
          <span style={{ ...s.catCardText, color: '#999' }}>Nova</span>
        </div>
      </div>

      {showCatForm && (
        <form onSubmit={salvarCategoria} style={s.catForm}>
          <FieldIcon icon={Type}>
            <input style={s.inputIcon} placeholder="Nome" value={catForm.nome} onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })} required />
          </FieldIcon>
          <FieldIcon icon={Hash}>
            <input style={{ ...s.inputIcon, width: 100 }} placeholder="Ordem" type="number" value={catForm.ordem} onChange={(e) => setCatForm({ ...catForm, ordem: e.target.value })} />
          </FieldIcon>
          <button style={s.btn} type="submit">
            {editCat ? <Save size={16} /> : <Plus size={16} />} {editCat ? 'Salvar' : 'Adicionar'}
          </button>
          <button type="button" onClick={() => { setShowCatForm(false); setEditCat(null); }} style={{ ...s.btn, background: '#aaa' }}>
            <X size={16} /> Cancelar
          </button>
        </form>
      )}

      {/* Itens da categoria selecionada */}
      <h3 style={{ ...s.sectionTitle, marginTop: 28 }}>
        <UtensilsCrossed size={20} /> Itens {categoriaAtiva ? `— ${categoriaAtiva.nome}` : ''}
      </h3>

      {!categoriaAtiva ? (
        <p style={{ color: '#888' }}>Crie uma categoria para começar a adicionar itens.</p>
      ) : (
        <>
          <form onSubmit={salvarItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <FieldIcon icon={Type}>
              <input style={s.inputIcon} placeholder="Nome do item" value={itemForm.nome} onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })} required />
            </FieldIcon>
            <FieldIcon icon={DollarSign}>
              <input style={s.inputIcon} placeholder="Preço (R$)" type="number" step="0.01" value={itemForm.preco} onChange={(e) => setItemForm({ ...itemForm, preco: e.target.value })} required />
            </FieldIcon>
            <div style={{ gridColumn: '1/-1' }}>
              <FieldIcon icon={AlignLeft}>
                <input style={s.inputIcon} placeholder="Descrição" value={itemForm.descricao} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} />
              </FieldIcon>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input type="checkbox" checked={itemForm.disponivel} onChange={(e) => setItemForm({ ...itemForm, disponivel: e.target.checked })} />
              <CheckCircle2 size={15} color="#2ecc71" /> Disponível
            </label>
            <div />
            <button style={{ ...s.btn, gridColumn: '1/-1' }} type="submit">
              {editItem ? <Save size={16} /> : <Plus size={16} />} {editItem ? 'Salvar' : 'Adicionar item'}
            </button>
            {editItem && (
              <button type="button" onClick={() => { setEditItem(null); setItemForm(ITEM_VAZIO); }} style={{ ...s.btn, background: '#aaa', gridColumn: '1/-1' }}>
                <X size={16} /> Cancelar
              </button>
            )}
          </form>

          {itensDaCategoria.map((i) => (
            <div key={i.id} style={s.itemCard}>
              <CategoriaIcon nome={i.categoria_nome} size={20} badgeSize={44} radius={12} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{i.nome}</span>
                {i.descricao && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{i.descricao}</div>}
                <div style={{ fontSize: 14, color: '#e63946', fontWeight: 700, marginTop: 4 }}>R$ {Number(i.preco).toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {i.disponivel
                  ? <CheckCircle2 size={16} color="#2ecc71" title="Disponível" style={{ marginRight: 4 }} />
                  : <XCircle size={16} color="#e63946" title="Indisponível" style={{ marginRight: 4 }} />}
                <button style={s.iconBtn} title="Editar" onClick={() => {
                  setEditItem(i.id);
                  setItemForm({ nome: i.nome, descricao: i.descricao || '', preco: i.preco, disponivel: !!i.disponivel });
                }}>
                  <Pencil size={15} />
                </button>
                <button style={{ ...s.iconBtn, color: '#e63946' }} title="Remover" onClick={async () => { await api.delete(`/cardapio/itens/${i.id}`); carregar(); }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {itensDaCategoria.length === 0 && <p style={{ color: '#888' }}>Nenhum item nessa categoria ainda.</p>}
        </>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  inputIcon:  { width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 32px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 },
  fieldIcon:  { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' },
  btn:        { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  itemCard:   { display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14, background: '#fff', borderRadius: 12, marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,.1)' },
  catBadge:   { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconBtn:    { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#555' },

  catsRow:      { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  catCard:      { position: 'relative', flex: '1 1 110px', height: 100, background: '#fff', borderRadius: 14, border: '1px solid #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  catCardAdd:   { flex: '1 1 110px', height: 100, background: '#fafafa', borderRadius: 14, border: '1px dashed #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' },
  catCardText:  { fontSize: 12, fontWeight: 600, textAlign: 'center' },
  catCardActions: { position: 'absolute', top: 6, right: 6, display: 'flex', gap: 2 },
  miniIconBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(0,0,0,.06)', border: 'none', borderRadius: 5, cursor: 'pointer' },
  catForm:      { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.08)', maxWidth: 520 },
};
