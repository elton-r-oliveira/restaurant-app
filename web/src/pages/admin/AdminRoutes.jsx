import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import MesasPage     from './MesasPage';
import CardapioPage  from './CardapioPage';
import UsuariosPage  from './UsuariosPage';
import RelatorioPage from './RelatorioPage';

export default function AdminRoutes() {
  const navigate = useNavigate();

  function sair() {
    localStorage.clear();
    navigate('/login');
  }

  const nav = { display: 'flex', gap: 8, padding: '12px 24px', background: '#1a1a2e', alignItems: 'center' };
  const link = { color: '#fff', textDecoration: 'none', padding: '6px 14px', borderRadius: 6, fontSize: 14 };
  const activeStyle = { background: '#e63946' };

  return (
    <div>
      <nav style={nav}>
        <span style={{ color: '#fff', fontWeight: 700, marginRight: 16 }}>Comanda Digital</span>
        <NavLink to="/admin/mesas"    style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}>Mesas</NavLink>
        <NavLink to="/admin/cardapio" style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}>Cardápio</NavLink>
        <NavLink to="/admin/usuarios" style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}>Usuários</NavLink>
        <NavLink to="/admin/relatorio"style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}>Relatório</NavLink>
        <button onClick={sair} style={{ ...link, background: 'transparent', border: '1px solid #555', cursor: 'pointer', marginLeft: 'auto' }}>Sair</button>
      </nav>

      <div style={{ padding: 24 }}>
        <Routes>
          <Route path="mesas"     element={<MesasPage />} />
          <Route path="cardapio"  element={<CardapioPage />} />
          <Route path="usuarios"  element={<UsuariosPage />} />
          <Route path="relatorio" element={<RelatorioPage />} />
          <Route path="*"         element={<MesasPage />} />
        </Routes>
      </div>
    </div>
  );
}
