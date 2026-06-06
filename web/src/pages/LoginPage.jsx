import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro]   = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));

      if (data.usuario.role === 'cozinha') navigate('/cozinha');
      else navigate('/admin');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login');
    }
  }

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Comanda Digital</h1>
        {erro && <p style={styles.erro}>{erro}</p>}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <button style={styles.btn} type="submit">Entrar</button>
      </form>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' },
  card:      { background: '#fff', padding: 40, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16, width: 320 },
  title:     { textAlign: 'center', fontSize: 22, fontWeight: 700, color: '#1a1a2e' },
  input:     { padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15 },
  btn:       { padding: '12px 0', background: '#e63946', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  erro:      { color: '#e63946', fontSize: 14, textAlign: 'center' },
};
