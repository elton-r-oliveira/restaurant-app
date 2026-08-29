import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const CAT_STYLE = {
  entradas:   { icon: 'nutrition-outline', color: '#f39c12' },
  pratos:     { icon: 'restaurant-outline', color: '#e63946' },
  bebidas:    { icon: 'cafe-outline', color: '#3498db' },
  sobremesas: { icon: 'ice-cream-outline', color: '#9b59b6' },
};
const DEFAULT_CAT_STYLE = { icon: 'fast-food-outline', color: '#7f8c8d' };
function catStyle(nome) { return CAT_STYLE[nome?.toLowerCase()] || DEFAULT_CAT_STYLE; }

export default function CardapioScreen({ navigation, route }) {
  const { comandaId, mesa_numero } = route.params;
  const [categorias,  setCategorias]  = useState([]);
  const [itens,       setItens]       = useState([]);
  const [busca,       setBusca]       = useState('');
  const [catAtiva,    setCatAtiva]    = useState(null);
  const [carrinho,    setCarrinho]    = useState({});
  const [observacoes, setObservacoes] = useState({});
  const [enviando,    setEnviando]    = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: `Cardápio — Mesa ${mesa_numero}` });
    Promise.all([api.get('/cardapio/categorias'), api.get('/cardapio/itens?disponivel=1')])
      .then(([c, i]) => {
        setCategorias(c.data);
        setItens(i.data);
        if (c.data.length) setCatAtiva(c.data[0].id);
      });
  }, []);

  const filtrados = itens.filter((i) => {
    const matchCat   = busca ? true : catAtiva ? i.categoria_id === catAtiva : true;
    const matchBusca = busca ? i.nome.toLowerCase().includes(busca.toLowerCase()) : true;
    return matchCat && matchBusca;
  });

  function inc(id) { setCarrinho((p) => ({ ...p, [id]: (p[id] || 0) + 1 })); }
  function dec(id) {
    setCarrinho((p) => {
      const q = (p[id] || 0) - 1;
      if (q <= 0) { const { [id]: _, ...r } = p; return r; }
      return { ...p, [id]: q };
    });
  }

  const totalItens = Object.values(carrinho).reduce((a, b) => a + b, 0);

  async function enviar() {
    const lista = Object.entries(carrinho).map(([item_id, quantidade]) => ({
      item_id: Number(item_id), quantidade, observacao: observacoes[item_id] || null,
    }));
    setEnviando(true);
    try {
      await api.post(`/comandas/${comandaId}/itens`, { itens: lista });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Erro', err.response?.data?.erro || 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={s.container}>
      <TextInput style={s.busca} placeholder="Buscar item..." placeholderTextColor="#aaa"
        value={busca} onChangeText={(t) => { setBusca(t); if (t) setCatAtiva(null); }} />

      {!busca && (
        <View style={s.cats}>
          {categorias.map((item) => {
            const { icon, color } = catStyle(item.nome);
            const ativa = catAtiva === item.id;
            return (
              <TouchableOpacity key={item.id} style={[s.catBtn, ativa && { backgroundColor: color, borderColor: color }]} onPress={() => setCatAtiva(item.id)}>
                <Ionicons name={icon} size={22} color={ativa ? '#fff' : color} />
                <Text style={[s.catText, ativa && { color: '#fff' }]} numberOfLines={1}>{item.nome}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <FlatList data={filtrados} keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const qtd = carrinho[item.id] || 0;
          return (
            <View style={s.card}>
              <View style={s.cardRow}>
                {(() => {
                  const { icon, color } = catStyle(categorias.find((c) => c.id === item.categoria_id)?.nome);
                  return (
                    <View style={[s.itemIconBadge, { backgroundColor: color }]}>
                      <Ionicons name={icon} size={18} color="#fff" />
                    </View>
                  );
                })()}
                <View style={{ flex: 1 }}>
                  <Text style={s.nome}>{item.nome}</Text>
                  {item.descricao ? <Text style={s.desc}>{item.descricao}</Text> : null}
                  <Text style={s.preco}>R$ {Number(item.preco).toFixed(2)}</Text>
                </View>
                <View style={s.ctrl}>
                  <TouchableOpacity style={s.ctrlBtn} onPress={() => dec(item.id)}>
                    <Text style={s.ctrlTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.ctrlNum}>{qtd}</Text>
                  <TouchableOpacity style={[s.ctrlBtn, { backgroundColor: '#e63946', borderColor: '#e63946' }]} onPress={() => inc(item.id)}>
                    <Text style={[s.ctrlTxt, { color: '#fff' }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {qtd > 0 && (
                <TextInput style={s.obs} placeholder="Observação (opcional)" placeholderTextColor="#bbb"
                  value={observacoes[item.id] || ''}
                  onChangeText={(t) => setObservacoes((p) => ({ ...p, [item.id]: t }))} />
              )}
            </View>
          );
        }} />

      {totalItens > 0 && (
        <View style={s.footer}>
          <TouchableOpacity style={s.btnEnviar} onPress={enviar} disabled={enviando}>
            {enviando
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnEnviarTxt}>Enviar pedido · {totalItens} {totalItens === 1 ? 'item' : 'itens'}</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f5f5f5' },
  busca:       { margin: 12, backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#eee' },
  cats:        { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8, gap: 8 },
  catBtn:      { flex: 1, height: 68, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  catText:     { fontSize: 11, color: '#555', fontWeight: '600', textAlign: 'center', marginTop: 4 },
  card:        { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  cardRow:     { flexDirection: 'row', alignItems: 'center' },
  itemIconBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  nome:        { fontWeight: '700', fontSize: 15, color: '#1a1a2e', marginBottom: 2 },
  desc:        { fontSize: 12, color: '#888', marginBottom: 4 },
  preco:       { fontSize: 14, color: '#e63946', fontWeight: '700' },
  ctrl:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctrlBtn:     { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  ctrlTxt:     { fontSize: 18, fontWeight: '700', color: '#555', lineHeight: 20 },
  ctrlNum:     { fontSize: 16, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  obs:         { marginTop: 10, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#eee' },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  btnEnviar:   { backgroundColor: '#e63946', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnEnviarTxt:{ color: '#fff', fontWeight: '700', fontSize: 16 },
});
