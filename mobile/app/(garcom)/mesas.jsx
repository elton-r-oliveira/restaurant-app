import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/services/api';
import { conectarSocket, desconectarSocket } from '../../src/services/socket';

const COR = { livre: '#2ecc71', ocupada: '#e67e22', reservada: '#3498db' };

export default function MesasScreen() {
  const { usuario, logout } = useAuth();
  const [mesas,   setMesas]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    conectarSocket().then((s) => {
      s.on('mesa_atualizada', ({ mesa_id, status }) =>
        setMesas((prev) => prev.map((m) => m.id === mesa_id ? { ...m, status } : m))
      );
    });
    return () => desconectarSocket();
  }, []);

  useFocusEffect(useCallback(() => {
    api.get('/mesas').then(({ data }) => setMesas(data)).finally(() => setLoading(false));
  }, []));

  async function handleMesa(mesa) {
    if (mesa.status === 'livre') {
      try {
        const { data } = await api.post('/comandas', { mesa_id: mesa.id });
        router.push({ pathname: '/(garcom)/comanda/[id]', params: { id: data.id, mesa_numero: mesa.numero } });
      } catch (err) { alert(err.response?.data?.erro || 'Erro ao abrir comanda'); }
    } else {
      const { data } = await api.get(`/mesas/${mesa.id}`);
      if (data.comanda_ativa)
        router.push({ pathname: '/(garcom)/comanda/[id]', params: { id: data.comanda_ativa.id, mesa_numero: mesa.numero } });
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#e63946" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.titulo}>Mesas</Text>
        <Text style={s.sub}>{usuario?.nome}</Text>
        <TouchableOpacity onPress={logout}><Text style={s.sair}>Sair</Text></TouchableOpacity>
      </View>
      <FlatList
        data={mesas}
        keyExtractor={(m) => String(m.id)}
        numColumns={3}
        contentContainerStyle={s.grid}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, { borderTopColor: COR[item.status] }]} onPress={() => handleMesa(item)}>
            <Text style={s.num}>{item.numero}</Text>
            <Text style={s.cap}>{item.capacidade} lug.</Text>
            <View style={[s.badge, { backgroundColor: COR[item.status] }]}>
              <Text style={s.badgeText}>{item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:    { backgroundColor: '#1a1a2e', padding: 16, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  titulo:    { color: '#fff', fontWeight: '700', fontSize: 18, flex: 1 },
  sub:       { color: '#aaa', fontSize: 13, marginRight: 12 },
  sair:      { color: '#e63946', fontWeight: '700' },
  grid:      { padding: 12 },
  card:      { flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderTopWidth: 4, alignItems: 'center', elevation: 2 },
  num:       { fontSize: 22, fontWeight: '700', color: '#1a1a2e' },
  cap:       { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 6 },
  badge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
