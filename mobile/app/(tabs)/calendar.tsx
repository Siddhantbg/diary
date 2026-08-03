import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { DayMarker } from '@/lib/api';
import { monthRange, toDateKey } from '@/lib/dates';
import { colors, fonts, spacing } from '@/constants/theme';

export default function CalendarScreen() {
  const { api } = useSettings();
  const router = useRouter();
  const [markers, setMarkers] = useState<Record<string, DayMarker>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = toDateKey();
  const [visible, setVisible] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const load = useCallback(
    async (year: number, month: number) => {
      if (!api) {
        setLoading(false);
        setError('Connect your API in Settings.');
        return;
      }
      setError('');
      try {
        const { from, to } = monthRange(year, month);
        const data = await api.markers(from, to);
        setMarkers(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load calendar');
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  useFocusEffect(
    useCallback(() => {
      load(visible.year, visible.month);
    }, [load, visible.year, visible.month])
  );

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    for (const [date, m] of Object.entries(markers)) {
      marks[date] = {
        marked: true,
        dotColor: m.favorite ? colors.favorite : colors.leaf,
        selected: date === today,
        selectedColor: colors.leafSoft,
        selectedTextColor: colors.ink,
      };
    }
    if (!marks[today]) {
      marks[today] = {
        selected: true,
        selectedColor: colors.leafSoft,
        selectedTextColor: colors.ink,
      };
    } else {
      marks[today] = {
        ...marks[today],
        selected: true,
        selectedColor: colors.leafSoft,
        selectedTextColor: colors.ink,
      };
    }
    return marks;
  }, [markers, today]);

  const onDayPress = (day: DateData) => {
    router.push(`/day/${day.dateString}`);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.hint}>Tap a day to open or start an entry.</Text>
      {loading ? <ActivityIndicator color={colors.leaf} style={{ marginTop: 24 }} /> : null}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Calendar
        current={today}
        onDayPress={onDayPress}
        markedDates={markedDates}
        onMonthChange={(m) => {
          setVisible({ year: m.year, month: m.month - 1 });
          setLoading(true);
        }}
        theme={{
          backgroundColor: colors.paper,
          calendarBackground: colors.paper,
          textSectionTitleColor: colors.inkMuted,
          selectedDayBackgroundColor: colors.leaf,
          selectedDayTextColor: colors.white,
          todayTextColor: colors.accent,
          dayTextColor: colors.ink,
          textDisabledColor: colors.line,
          arrowColor: colors.leaf,
          monthTextColor: colors.ink,
          textDayFontFamily: fonts.body,
          textMonthFontFamily: fonts.display,
          textDayHeaderFontFamily: fonts.bodyMedium,
          textMonthFontSize: 20,
        }}
        style={styles.calendar}
      />
      <View style={styles.legend}>
        <Text style={styles.legendItem}>● entry</Text>
        <Text style={[styles.legendItem, { color: colors.favorite }]}>● cherished</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.md,
  },
  hint: {
    fontFamily: fonts.body,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  calendar: {
    borderRadius: 0,
  },
  error: {
    fontFamily: fonts.body,
    color: colors.danger,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    padding: spacing.md,
  },
  legendItem: {
    fontFamily: fonts.body,
    color: colors.leaf,
    fontSize: 13,
  },
});
