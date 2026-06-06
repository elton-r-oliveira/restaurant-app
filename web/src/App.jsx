import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage     from './pages/LoginPage';
import AdminRoutes   from './pages/admin/AdminRoutes';
import CozinhaPage   from './pages/cozinha/CozinhaPage';

function PrivateRoute({ children, roles }) {
  const raw = localStorage.getItem('usuario');
  if (!raw) return <Navigate to="/login" replace />;
  const usuario = JSON.parse(raw);
  if (roles && !roles.includes(usuario.role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin/*"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminRoutes />
          </PrivateRoute>
        }
      />

      <Route
        path="/cozinha"
        element={
          <PrivateRoute roles={['cozinha', 'admin']}>
            <CozinhaPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
