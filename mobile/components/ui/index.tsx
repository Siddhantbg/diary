import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom')[];
};

export function Screen({
  children,
  scroll,
  style,
  contentStyle,
  edges = ['top', 'bottom'],
}: ScreenProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[{ flex: 1, backgroundColor: tokens.bg }, style]}
        contentContainerStyle={[{ padding: spacing.lg, ...pad }, contentStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: tokens.bg, ...pad }, style]}>
      {children}
    </View>
  );
}

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: CardProps) {
  const { tokens } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tokens.bgCard,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tokens.line,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type SectionHeaderProps = {
  title: string;
  style?: StyleProp<TextStyle>;
};

export function SectionHeader({ title, style }: SectionHeaderProps) {
  const { tokens } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.bodyMedium,
          fontSize: 13,
          color: tokens.accent,
          letterSpacing: 0.4,
          marginBottom: spacing.sm,
          marginTop: spacing.md,
        },
        style,
      ]}
    >
      {title}
    </Text>
  );
}

type ListRowProps = {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({ title, subtitle, left, right, onPress, style }: ListRowProps) {
  const { tokens } = useTheme();
  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: tokens.line,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {left}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 16, color: tokens.text }}>{title}</Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              color: tokens.textMuted,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: PrimaryButtonProps) {
  const { tokens } = useTheme();
  const bg =
    variant === 'primary'
      ? tokens.accent
      : variant === 'danger'
        ? tokens.danger
        : 'transparent';
  const border =
    variant === 'ghost' ? { borderWidth: 1, borderColor: tokens.accent } : undefined;
  const color = variant === 'ghost' ? tokens.accent : tokens.white;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: radius.sm,
          alignItems: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        border,
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color }}>{label}</Text>
    </Pressable>
  );
}

type FABProps = {
  onPress?: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export function FAB({ onPress, label = '+', style }: FABProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add entry"
      style={({ pressed }) => [
        {
          width: 62,
          height: 62,
          borderRadius: 31,
          backgroundColor: tokens.fab,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: pressed ? 3 : 8,
          shadowColor: tokens.fab,
          shadowOpacity: pressed ? 0.25 : 0.5,
          shadowRadius: pressed ? 6 : 12,
          shadowOffset: { width: 0, height: pressed ? 2 : 5 },
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.9 : 1 }],
        },
        style,
      ]}
    >
      <Text
        style={{
          color: tokens.white,
          fontSize: 32,
          fontFamily: fonts.bodyMedium,
          marginTop: -2,
          lineHeight: 36,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type AppTextProps = {
  children: React.ReactNode;
  variant?: 'display' | 'title' | 'body' | 'muted' | 'label';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function AppText({ children, variant = 'body', style, numberOfLines }: AppTextProps) {
  const { tokens } = useTheme();
  const base: TextStyle =
    variant === 'display'
      ? { fontFamily: fonts.display, fontSize: 28, color: tokens.text }
      : variant === 'title'
        ? { fontFamily: fonts.bodyMedium, fontSize: 20, color: tokens.text }
        : variant === 'muted'
          ? { fontFamily: fonts.body, fontSize: 14, color: tokens.textMuted }
          : variant === 'label'
            ? {
                fontFamily: fonts.bodyMedium,
                fontSize: 12,
                color: tokens.textSubtle,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }
            : { fontFamily: fonts.body, fontSize: 16, color: tokens.text, lineHeight: 24 };

  return (
    <Text style={[base, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}
