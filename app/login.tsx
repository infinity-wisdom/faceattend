import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Card, Headline, Input, Screen, Subtext } from '../components/ui';
import { useAuth } from '../lib/AuthContext';
import { colors, spacing } from '../lib/theme';

export default function Login() {
  const { login } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(studentId.trim(), password);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e?.message ?? 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.marginSide * 1.5 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.base,
            }}
          >
            <Text style={{ fontSize: 28 }}>🎓</Text>
          </View>
          <Headline>FaceAttend</Headline>
          <Subtext>Sign in to mark your attendance</Subtext>
        </View>

        <Card>
          <Input
            label="Student ID"
            placeholder="e.g. U2021/12345"
            autoCapitalize="none"
            value={studentId}
            onChangeText={setStudentId}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error && (
            <Text style={{ color: colors.error, marginBottom: spacing.base }}>{error}</Text>
          )}
          <Button title="Sign In" onPress={onSubmit} loading={loading} disabled={!studentId || !password} />
          <Link href="/register" asChild>
            <Text style={{ textAlign: 'center', color: colors.secondary, marginTop: spacing.base }}>
              New student? Create an account
            </Text>
          </Link>
        </Card>
      </View>
    </Screen>
  );
}
