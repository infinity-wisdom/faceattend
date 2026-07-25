import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Headline, Screen, Subtext } from '../components/ui';
import { colors, radii, spacing } from '../lib/theme';

export default function VerificationSuccess() {
  const { confidence } = useLocalSearchParams<{ confidence?: string }>();

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: '#e6f7ef',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.marginSide,
          }}
        >
          <Text style={{ fontSize: 44 }}>✅</Text>
        </View>
        <Headline>Attendance Marked</Headline>
        <Subtext>
          {confidence ? `Identity verified with ${confidence}% confidence.` : 'Your identity has been verified.'}
        </Subtext>
        <View style={{ height: spacing.marginSide * 1.5 }} />
        <Button title="Back to Dashboard" onPress={() => router.replace('/dashboard')} />
      </View>
    </Screen>
  );
}
