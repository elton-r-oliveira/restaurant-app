import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Users, BarChart2, ChefHat, LogOut } from 'lucide-react';
import MesasPage     from './MesasPage';
import CardapioPage  from './CardapioPage';
import UsuariosPage  from './UsuariosPage';
import RelatorioPage from './RelatorioPage';
import CozinhaPage   from '../cozinha/CozinhaPage';
import logo from '../../assets/logo.svg';

export default function AdminRoutes() {
  const navigate = useNavigate();

  function sair() {
    localStorage.clear();
    navigate('/login');
  }

  const nav = { display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 16, padding: '12px 24px', background: '#1a1a2e' };
  const links = { display: 'flex', justifyContent: 'center', gap: 8 };
  const link = { display: 'flex', alignItems: 'center', gap: 8, color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 16, fontWeight: 600 };
  const activeStyle = { background: '#FF9500' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <nav style={nav}>
        <img src={logo} alt="Comanda Digital" style={{ height: 64 }} />
        <div style={links}>
          <NavLink to="/admin/mesas"    style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}><UtensilsCrossed size={20} /> Mesas</NavLink>
          <NavLink to="/admin/cardapio" style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}><UtensilsCrossed size={20} /> Cardápio</NavLink>
          <NavLink to="/admin/usuarios" style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}><Users size={20} /> Usuários</NavLink>
          <NavLink to="/admin/relatorio" style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}><BarChart2 size={20} /> Relatório</NavLink>
          <NavLink to="/admin/cozinha"   style={({ isActive }) => ({ ...link, ...(isActive ? activeStyle : {}) })}><ChefHat size={20} /> Cozinha</NavLink>
        </div>
        <button onClick={sair} style={{ ...link, background: 'transparent', border: '1px solid #555', cursor: 'pointer' }}><LogOut size={20} /> Sair</button>
      </nav>

      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Routes>
          <Route path="mesas"     element={<MesasPage />} />
          <Route path="cardapio"  element={<CardapioPage />} />
          <Route path="usuarios"  element={<UsuariosPage />} />
          <Route path="relatorio" element={<RelatorioPage />} />
          <Route path="cozinha"   element={<CozinhaPage />} />
          <Route path="*"         element={<MesasPage />} />
        </Routes>
      </div>
    </div>
  );
}
