import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { parseDateKey } from '@/lib/dates';
import { SheetCloseButton, SheetHeader } from '@/components/ui/SheetClose';

type Props = {
  visible: boolean;
  /** Entry date key yyyy-mm-dd — clock is applied to this day */
  dateKey: string;
  value: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

/**
 * Modal “Time & Date” for log time (device-time default; user can override).
 */
export function DateTimePickerModal({
  visible,
  dateKey,
  value,
  onClose,
  onConfirm,
}: Props) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const [webTime, setWebTime] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(value);
      const h = String(value.getHours()).padStart(2, '0');
      const m = String(value.getMinutes()).padStart(2, '0');
      setWebTime(`${h}:${m}`);
    }
  }, [visible, value]);

  const applyToEntryDay = (picked: Date) => {
    const base = parseDateKey(dateKey);
    base.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
    return base;
  };

  const onChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed' || !selected) {
        onClose();
        return;
      }
      onConfirm(applyToEntryDay(selected));
      onClose();
      return;
    }
    if (selected) setDraft(selected);
  };

  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={draft}
        mode="time"
        display="default"
        onChange={onChange}
      />
    );
  }

  if (Platform.OS === 'web') {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.dim} onPress={onClose}>
          <View
            style={[styles.sheet, { backgroundColor: tokens.bgElevated, padding: spacing.lg }]}
            onStartShouldSetResponder={() => true}
          >
            <SheetHeader
              title="Time & Date"
              onClose={onClose}
              style={{ marginBottom: spacing.md }}
            />
            <TextInput
              value={webTime}
              onChangeText={setWebTime}
              placeholder="HH:MM"
              placeholderTextColor={tokens.textSubtle}
              style={{
                fontFamily: fonts.body,
                fontSize: 18,
                color: tokens.text,
                borderBottomWidth: 1,
                borderBottomColor: tokens.accent,
                paddingVertical: 10,
                marginBottom: spacing.lg,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
              <Pressable
                onPress={() => {
                  const [hh, mm] = webTime.split(':').map(Number);
                  if (Number.isNaN(hh) || Number.isNaN(mm)) return;
                  const d = new Date(draft);
                  d.setHours(hh, mm, 0, 0);
                  onConfirm(applyToEntryDay(d));
                  onClose();
                }}
              >
                <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.dim} onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.bgElevated,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.text }]}>Time & Date</Text>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => {
                  onConfirm(applyToEntryDay(draft));
                  onClose();
                }}
                hitSlop={8}
              >
                <Text style={[styles.action, { color: tokens.accent }]}>Done</Text>
              </Pressable>
              <SheetCloseButton onPress={onClose} />
            </View>
          </View>

          <DateTimePicker
            value={draft}
            mode="time"
            display="spinner"
            themeVariant="dark"
            onChange={onChange}
            style={{ alignSelf: 'center' }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 17,
  },
  action: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    paddingHorizontal: 6,
  },
});
