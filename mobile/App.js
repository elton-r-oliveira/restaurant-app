import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen        from './src/screens/LoginScreen';
import MesasScreen        from './src/screens/MesasScreen';
import ComandaScreen      from './src/screens/ComandaScreen';
import CardapioScreen     from './src/screens/CardapioScreen';

const Stack = createNativeStackNavigator();

function Routes() {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: '#1a1a2e' },
        headerTintColor:  '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerShown:      false,
      }}
    >
      {!usuario ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Mesas"    component={MesasScreen} />
          <Stack.Screen name="Comanda"  component={ComandaScreen}  options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="Cardapio" component={CardapioScreen} options={{ headerShown: true, title: 'Cardápio' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Routes />
      </NavigationContainer>
    </AuthProvider>
  );
}
