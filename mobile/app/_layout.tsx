import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { SyncProvider } from '../src/contexts/SyncContext';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: colors.background,
            },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(auth)/login"
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{
              title: 'Chat',
              headerBackTitle: 'Voltar',
            }}
          />
          <Stack.Screen
            name="ticket/[id]"
            options={{
              title: 'Ticket',
              headerBackTitle: 'Voltar',
            }}
          />
          <Stack.Screen
            name="company/select"
            options={{
              title: 'Selecionar Empresa',
              headerBackTitle: 'Voltar',
              presentation: 'modal',
            }}
          />
        </Stack>
      </SyncProvider>
    </AuthProvider>
  );
}

