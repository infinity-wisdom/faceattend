import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Headline, Screen, Subtext } from '../components/ui';
import { colors, spacing } from '../lib/theme';

export default function VerificationMismatch() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.errorContainer,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.marginSide,
          }}
        >
          <Text style={{ fontSize: 44 }}>✕</Text>
        </View>
        <Headline>Verification Failed</Headline>
        <Subtext>{reason ?? 'We could not confirm your identity. Please try again in good lighting.'}</Subtext>
        <View style={{ height: spacing.marginSide * 1.5 }} />
        <Button title="Try Again" onPress={() => router.back()} />
        <Button variant="secondary" title="Back to Dashboard" onPress={() => router.replace('/dashboard')} />
      </View>
    </Screen>
  );
}
