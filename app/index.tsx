import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { colors } from '../lib/theme';

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.secondaryContainer} size="large" />
      </View>
    );
  }

  return <Redirect href={token ? '/dashboard' : '/login'} />;
}
