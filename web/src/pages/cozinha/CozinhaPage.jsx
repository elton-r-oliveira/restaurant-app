import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_LABEL = { pendente: 'Pendente', em_preparo: 'Em preparo', pronto: 'Pronto', entregue: 'Entregue' };
const PROXIMO = { pendente: 'em_preparo', em_preparo: 'pronto' };

export default function CozinhaPage() {
  const [itens,   setItens]   = useState([]);
  const socketRef = useRef(null);
  const audioRef  = useRef(null);

  function playBeep() {
    audioRef.current?.play().catch(() => {});
  }

  useEffect(() => {
    carregarPendentes();

    const token = localStorage.getItem('token');
    socketRef.current = io(API_URL, { auth: { token } });

    socketRef.current.on('novo_pedido', ({ itens: novos }) => {
      setItens((prev) => [...prev, ...novos.map((i) => ({ ...i, comanda_id: i.comanda_id }))]);
      playBeep();
    });

    socketRef.current.on('status_item', ({ item_id, status }) => {
      setItens((prev) =>
        status === 'entregue'
          ? prev.filter((i) => i.id !== item_id)
          : prev.map((i) => (i.id === item_id ? { ...i, status } : i))
      );
    });

    return () => socketRef.current?.disconnect();
  }, []);

  async function carregarPendentes() {
    const { data: comandas } = await api.get('/comandas?status=aberta');
    const todos = [];
    await Promise.all(
      comandas.map(async (c) => {
        const { data } = await api.get(`/comandas/${c.id}`);
        data.itens
          .filter((i) => i.status !== 'entregue')
          .forEach((i) => todos.push({ ...i, comanda_id: c.id, mesa_numero: c.mesa_numero }));
      })
    );
    setItens(todos);
  }

  async function avancarStatus(item) {
    const proximo = PROXIMO[item.status];
    if (!proximo) return;
    await api.patch(`/comandas/${item.comanda_id}/itens/${item.id}/status`, { status: proximo });
  }

  const pendentes   = itens.filter((i) => i.status === 'pendente');
  const emPreparo   = itens.filter((i) => i.status === 'em_preparo');
  const prontos     = itens.filter((i) => i.status === 'pronto');

  const s = styles;

  return (
    <div style={s.page}>
      {/* Som de notificação (beep sintético via Web Audio) */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA..." preload="auto" style={{ display: 'none' }} />

      <h1 style={s.title}>Cozinha</h1>

      <div style={s.colunas}>
        <Coluna titulo="Novos pedidos" cor="#e63946" itens={pendentes} onAcao={avancarStatus} labelAcao="Iniciar preparo" />
        <Coluna titulo="Em preparo"    cor="#e67e22" itens={emPreparo} onAcao={avancarStatus} labelAcao="Marcar pronto" />
        <Coluna titulo="Prontos"       cor="#2ecc71" itens={prontos}   onAcao={null}          labelAcao={null} />
      </div>
    </div>
  );
}

function Coluna({ titulo, cor, itens, onAcao, labelAcao }) {
  const s = styles;
  return (
    <div style={s.coluna}>
      <div style={{ ...s.colunaHeader, background: cor }}>{titulo} ({itens.length})</div>
      {itens.length === 0 && <p style={s.vazio}>Nenhum item</p>}
      {itens.map((item) => (
        <div key={item.id} style={s.card}>
          <div style={s.cardTop}>
            <span style={s.mesa}>Mesa {item.mesa_numero ?? '?'}</span>
            <span style={s.qtd}>×{item.quantidade}</span>
          </div>
          <div style={s.itemNome}>{item.item_nome}</div>
          {item.observacao && <div style={s.obs}>💬 {item.observacao}</div>}
          {onAcao && (
            <button style={{ ...s.btn, background: cor }} onClick={() => onAcao(item)}>
              {labelAcao}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const styles = {
  page:        { padding: 20, background: '#111', minHeight: '100vh', color: '#fff' },
  title:       { fontSize: 22, fontWeight: 700, marginBottom: 20 },
  colunas:     { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' },
  coluna:      { background: '#1e1e1e', borderRadius: 12, overflow: 'hidden' },
  colunaHeader:{ padding: '10px 16px', fontWeight: 700, fontSize: 15 },
  vazio:       { padding: 16, color: '#555', fontSize: 14 },
  card:        { background: '#2a2a2a', margin: 10, borderRadius: 8, padding: 14 },
  cardTop:     { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  mesa:        { fontSize: 13, color: '#aaa', fontWeight: 600 },
  qtd:         { fontSize: 18, fontWeight: 700, color: '#fff' },
  itemNome:    { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  obs:         { fontSize: 13, color: '#f0ad4e', marginBottom: 8 },
  btn:         { width: '100%', padding: '8px 0', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 },
};
