import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radii, shadow, spacing, typography } from '../lib/theme';

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'destructive';
}) {
  const bg =
    variant === 'primary'
      ? colors.secondaryContainer
      : variant === 'destructive'
      ? colors.error
      : colors.surfaceContainerLowest;
  const textColor =
    variant === 'secondary' ? colors.primary : variant === 'primary' ? colors.primary : colors.onError;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.outlineVariant },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: spacing.vertical }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.outline}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusChip({ status }: { status: 'present' | 'rejected' | 'pending' }) {
  const config = {
    present: { bg: '#e6f7ef', fg: colors.onTertiaryContainer, label: 'Verified' },
    rejected: { bg: colors.errorContainer, fg: colors.onErrorContainer, label: 'Rejected' },
    pending: { bg: colors.warningContainer, fg: colors.warning, label: 'Pending' },
  }[status];
  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <Text style={[styles.chipText, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Headline({ children }: { children: React.ReactNode }) {
  return <Text style={styles.headline}>{children}</Text>;
}

export function Subtext({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtext}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.marginSide,
    paddingTop: spacing.safeArea,
  },
  button: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  buttonText: {
    ...typography.subheader,
    fontWeight: '600',
  },
  label: {
    ...typography.subtext,
    color: colors.onSurfaceVariant,
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: spacing.base * 2,
    fontSize: 16,
    color: colors.onSurface,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.card,
    padding: spacing.marginSide,
    ...shadow.card,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  chipText: {
    ...typography.labelCaps,
  },
  headline: {
    ...typography.headlineMd,
    color: colors.onSurface,
    marginBottom: spacing.base,
  },
  subtext: {
    ...typography.subtext,
    color: colors.onSurfaceVariant,
  },
});
