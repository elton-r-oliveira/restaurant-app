import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { getSocket } from '../services/socket';

const COR   = { pendente: '#aaa', em_preparo: '#e67e22', pronto: '#2ecc71', entregue: '#95a5a6' };
const LABEL = { pendente: 'Pendente', em_preparo: 'Em preparo', pronto: '✅ Pronto', entregue: 'Entregue' };

export default function ComandaScreen({ navigation, route }) {
  const { id, mesa_numero } = route.params;
  const [comanda, setComanda] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    api.get(`/comandas/${id}`).then(({ data }) => {
      setComanda(data);
      navigation.setOptions({ title: `Mesa ${mesa_numero}` });
    }).finally(() => setLoading(false));
  }, [id]));

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.on('status_item', ({ comanda_id, item_id, status }) => {
      if (Number(comanda_id) !== Number(id)) return;
      setComanda((prev) => ({ ...prev, itens: prev.itens.map((i) => i.id === item_id ? { ...i, status } : i) }));
    });
    return () => s.off('status_item');
  }, [id]);

  async function fechar() {
    Alert.alert('Fechar comanda', `Total: R$ ${Number(comanda.total).toFixed(2)}\n\nConfirmar?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Fechar', onPress: async () => {
        try {
          await api.post(`/comandas/${id}/fechar`);
        } catch (err) {
          const status = err.response?.status;
          if (status !== 404) {
            Alert.alert('Erro', err.response?.data?.erro || 'Erro ao fechar comanda');
            return;
          }
        }
        navigation.navigate('Mesas');
      }},
    ]);
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#e63946" /></View>;
  if (!comanda) return <View style={s.center}><Text>Não encontrado</Text></View>;

  const itens = comanda.itens.filter((i) => i.status !== 'entregue');
  const total = Number(comanda.total).toFixed(2);

  return (
    <View style={s.container}>
      <View style={s.totalBar}>
        <Text style={s.totalLabel}>Total da comanda</Text>
        <Text style={s.totalValor}>R$ {total}</Text>
      </View>

      {itens.length === 0
        ? <View style={s.center}><Text style={{ color: '#aaa' }}>Nenhum item pedido ainda</Text></View>
        : <FlatList data={itens} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <View style={s.card}>
                <View style={s.row}>
                  <Text style={s.nome}>{item.item_nome}</Text>
                  <Text style={s.qtd}>×{item.quantidade}</Text>
                </View>
                {item.observacao ? <Text style={s.obs}>💬 {item.observacao}</Text> : null}
                <View style={[s.badge, { backgroundColor: COR[item.status] }]}>
                  <Text style={s.badgeText}>{LABEL[item.status]}</Text>
                </View>
              </View>
            )} />
      }

      <View style={s.footer}>
        <TouchableOpacity style={s.btnAdd}
          onPress={() => navigation.navigate('Cardapio', { comandaId: id, mesa_numero })}>
          <Text style={s.btnText}>+ Adicionar itens</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnFechar} onPress={fechar}>
          <Text style={s.btnText}>Fechar conta · R$ {total}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  totalBar:  { backgroundColor: '#1a1a2e', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:{ color: '#aaa', fontSize: 13 },
  totalValor:{ color: '#2ecc71', fontWeight: '700', fontSize: 18 },
  card:      { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nome:      { fontWeight: '700', fontSize: 15, color: '#1a1a2e', flex: 1 },
  qtd:       { fontWeight: '700', fontSize: 16, color: '#e63946' },
  obs:       { fontSize: 12, color: '#e67e22', marginBottom: 6 },
  badge:     { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  footer:    { padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  btnAdd:    { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnFechar: { backgroundColor: '#e63946', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
