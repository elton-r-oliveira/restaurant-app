import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email,   setEmail]   = useState('');
  const [senha,   setSenha]   = useState('');
  const [erro,    setErro]    = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !senha) { setErro('Preencha email e senha'); return; }
    setErro('');
    setLoading(true);
    try {
      await login(email.trim(), senha);
      router.replace('/(garcom)/mesas');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <Text style={s.titulo}>Comanda Digital</Text>
        <Text style={s.subtitulo}>Área do Garçom</Text>
        {erro ? <Text style={s.erro}>{erro}</Text> : null}
        <TextInput style={s.input} placeholder="Email" placeholderTextColor="#aaa"
          keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={s.input} placeholder="Senha" placeholderTextColor="#aaa"
          secureTextEntry value={senha} onChangeText={setSenha} />
        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' },
  card:      { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 28 },
  titulo:    { fontSize: 22, fontWeight: '700', color: '#1a1a2e', textAlign: 'center', marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  input:     { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, color: '#1a1a2e' },
  btn:       { backgroundColor: '#e63946', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
  erro:      { backgroundColor: '#ffeaea', color: '#e63946', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13, textAlign: 'center' },
});
