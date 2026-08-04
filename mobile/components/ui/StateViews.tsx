import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { fonts, spacing } from '@/constants/theme';

type LoadingProps = {
  message?: string;
  style?: StyleProp<ViewStyle>;
};

export function LoadingBlock({ message = 'Loading…', style }: LoadingProps) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator color={tokens.accent} size="large" />
      {message ? (
        <Text style={[styles.msg, { color: tokens.textMuted }]}>{message}</Text>
      ) : null}
    </View>
  );
}

type ErrorProps = {
  message: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ErrorBlock({ message, onRetry, style }: ErrorProps) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: tokens.accentSoft, borderColor: tokens.line }, style]}>
      <Text style={[styles.errTitle, { color: tokens.danger }]}>Something went wrong</Text>
      <Text style={[styles.msg, { color: tokens.textMuted, marginTop: 6 }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={[styles.retry, { backgroundColor: tokens.accent }]}
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type EmptyProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function EmptyBlock({ title, subtitle, actionLabel, onAction, style }: EmptyProps) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: spacing.xl }, style]}>
      <Text style={[styles.emptyTitle, { color: tokens.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.msg, { color: tokens.textMuted, marginTop: 8 }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.retry, { backgroundColor: tokens.accent, marginTop: spacing.md }]}
        >
          <Text style={styles.retryText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  box: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  msg: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errTitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
});
