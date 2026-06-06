import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const token = await SecureStore.getItemAsync('token');
        const raw   = await SecureStore.getItemAsync('usuario');
        if (token && raw) setUsuario(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    await SecureStore.setItemAsync('token', data.token);
    await SecureStore.setItemAsync('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }

  async function logout() {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('usuario');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
