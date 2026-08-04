import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import {
  markLockPromptShown,
  recordLockPromptSession,
  shouldShowLockPrompt,
  snoozeLockPrompt,
} from '@/lib/lockPrompt';

const PROMO = require('../../assets/images/set-diary-lock-promo.png');

/**
 * Periodic “Set Diary Lock” promo when lock is off.
 * Uses the ChatGPT promo art; shows on session cadence + after LATER snooze.
 */
export function SetDiaryLockPrompt() {
  const { ready, config, unlocked } = useSettings();
  const { tokens } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [help, setHelp] = useState<{
    title: string;
    message?: string;
    actions: SheetAction[];
  } | null>(null);
  const evaluating = useRef(false);

  useEffect(() => {
    if (!ready || !unlocked) return;
    if (config.pinEnabled && config.hasPin) {
      setVisible(false);
      return;
    }
    // Don't cover lock setup itself
    if (pathname?.includes('lock')) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (evaluating.current || cancelled) return;
        evaluating.current = true;
        try {
          await recordLockPromptSession();
          const ok = await shouldShowLockPrompt();
          if (!cancelled && ok) {
            await markLockPromptShown();
            setVisible(true);
          }
        } finally {
          evaluating.current = false;
        }
      })();
    }, 1400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, unlocked, config.pinEnabled, config.hasPin, pathname]);

  // Hide permanently once lock is enabled
  useEffect(() => {
    if (config.pinEnabled && config.hasPin) setVisible(false);
  }, [config.pinEnabled, config.hasPin]);

  const onLater = async () => {
    setVisible(false);
    await snoozeLockPrompt();
  };

  const onSetNow = async () => {
    setVisible(false);
    await markLockPromptShown();
    router.push('/lock');
  };

  const onHelp = () => {
    setHelp({
      title: 'Diary Lock',
      message:
        'A PIN (and optional fingerprint) keeps your diary private when someone opens the app on this phone. Recovery question and email help if you forget the PIN. You can change this anytime in Settings → Diary Lock.',
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });
  };

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => void onLater()}
      >
        <View style={[styles.backdrop, { backgroundColor: 'rgba(8, 14, 28, 0.72)' }]}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: tokens.bgElevated,
                borderColor: tokens.line,
              },
            ]}
          >
            <Image
              source={PROMO}
              style={styles.hero}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              accessibilityLabel="Diary lock illustration"
            />

            <Text style={[styles.title, { color: tokens.text }]}>Set Diary Lock</Text>
            <Text style={[styles.body, { color: tokens.textMuted }]}>
              We recommend you set a diary lock to protect your privacy.{' '}
              <Text
                onPress={onHelp}
                style={[styles.helpLink, { color: tokens.accent }]}
                accessibilityRole="link"
              >
                Need help?
              </Text>
            </Text>

            <Pressable
              onPress={() => void onSetNow()}
              style={[styles.primaryBtn, { backgroundColor: tokens.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Set diary lock now"
            >
              <Text style={styles.primaryText}>SET NOW</Text>
            </Pressable>

            <Pressable
              onPress={() => void onLater()}
              style={[styles.secondaryBtn, { borderColor: tokens.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Set diary lock later"
            >
              <Text style={[styles.secondaryText, { color: tokens.accent }]}>LATER</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ActionSheet
        visible={!!help}
        title={help?.title ?? ''}
        message={help?.message}
        actions={help?.actions ?? []}
        onClose={() => setHelp(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  hero: {
    width: '100%',
    height: 200,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  helpLink: {
    fontFamily: fonts.body,
    textDecorationLine: 'underline',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  primaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    letterSpacing: 1,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    letterSpacing: 1,
  },
});
