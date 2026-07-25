import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Headline, Input, Screen, Subtext } from '../components/ui';
import { useAuth } from '../lib/AuthContext';
import { colors, spacing } from '../lib/theme';

export default function Register() {
  const { register } = useAuth();
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await register(studentId.trim(), fullName.trim(), email.trim(), password);
      router.replace('/enrollment');
    } catch (e: any) {
      setError(e?.message ?? 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ marginBottom: spacing.marginSide }}>
          <Headline>Create your account</Headline>
          <Subtext>You'll enroll your face in the next step</Subtext>
        </View>
        <Card>
          <Input label="Student ID" autoCapitalize="none" value={studentId} onChangeText={setStudentId} />
          <Input label="Full Name" value={fullName} onChangeText={setFullName} />
          <Input
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error && <Text style={{ color: colors.error, marginBottom: spacing.base }}>{error}</Text>}
          <Button
            title="Continue"
            onPress={onSubmit}
            loading={loading}
            disabled={!studentId || !fullName || !email || !password}
          />
        </Card>
      </View>
    </Screen>
  );
}
