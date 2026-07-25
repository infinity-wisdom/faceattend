import { ConvexProvider, useMutation } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { convex } from '../lib/convexClient';
import { AuthProvider } from '../lib/AuthContext';
import { colors } from '../lib/theme';
import { api } from '../convex/_generated/api';

function DemoSeeder() {
  const seedDemoData = useMutation(api.seed.seedDemoData);
  useEffect(() => {
    seedDemoData().catch(() => {
      // Non-fatal — the dashboard will just show no courses if this fails.
    });
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <DemoSeeder />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="enrollment" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="scanner" />
          <Stack.Screen name="verification-success" />
          <Stack.Screen name="verification-mismatch" />
        </Stack>
      </AuthProvider>
    </ConvexProvider>
  );
}
