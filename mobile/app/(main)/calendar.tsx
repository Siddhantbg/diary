import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { usePreferences, formatPrefTime } from '@/context/PreferencesContext';
import { ApiError, DayMarker, DiaryEntry, friendlyApiMessage } from '@/lib/api';
import { ErrorBlock } from '@/components/ui/StateViews';
import {
  formatCalendarStrip,
  formatMonthYear,
  monthRange,
  MOOD_EMOJIS,
  MOOD_LABELS,
  toDateKey,
} from '@/lib/dates';
import { fonts, radius, spacing } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui';
import { SheetHeader } from '@/components/ui/SheetClose';
import { GalleryIcon } from '@/components/icons/GalleryIcon';
import {
  defaultLegends,
  DiaryLegend,
  loadLegends,
  markerDotColor,
} from '@/lib/legends';

function monthCacheKey(year: number, monthIndex: number) {
  return `${year}-${monthIndex}`;
}

export default function CalendarScreen() {
  const { api } = useSettings();
  const { tokens, isDark } = useTheme();
  const { prefs, calendarFirstDay } = usePreferences();
  const router = useRouter();
  const today = toDateKey();

  const [selected, setSelected] = useState(today);
  const [markers, setMarkers] = useState<Record<string, DayMarker>>({});
  const [markersLoading, setMarkersLoading] = useState(true);
  const [markersError, setMarkersError] = useState('');
  const [legends, setLegends] = useState<DiaryLegend[]>(defaultLegends());
  const [visible, setVisible] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [currentMonth, setCurrentMonth] = useState(() => `${today.slice(0, 7)}-01`);

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState('');

  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  /** Which month's markers are currently in `markers` state. */
  const markersMonthRef = useRef<string | null>(null);
  /** Bumps to drop stale getEntry responses when day changes quickly. */
  const entrySeqRef = useRef(0);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const inflightMarkersRef = useRef<Promise<Record<string, DayMarker> | null> | null>(null);
  const inflightKeyRef = useRef<string | null>(null);

  /**
   * Fetch month marker map.
   * - force: re-request even if we already have this month (tab focus / invalidate)
   * - silent: keep current dots; no blocking spinner (background refresh)
   */
  const loadMarkers = useCallback(
    async (
      year: number,
      month: number,
      opts?: { force?: boolean; silent?: boolean }
    ): Promise<Record<string, DayMarker> | null> => {
      if (!api) return null;
      const key = monthCacheKey(year, month);
      const force = opts?.force ?? false;
      const silent = opts?.silent ?? false;

      if (!force && markersMonthRef.current === key) {
        setMarkersLoading(false);
        return markersRef.current;
      }

      if (inflightMarkersRef.current && inflightKeyRef.current === key) {
        return inflightMarkersRef.current;
      }

      setMarkersError('');
      if (!silent) setMarkersLoading(true);

      const job = (async () => {
        try {
          const { from, to } = monthRange(year, month);
          const data = await api.markers(from, to);
          setMarkers(data);
          markersMonthRef.current = key;
          return data;
        } catch (e: unknown) {
          setMarkersError(friendlyApiMessage(e));
          return null;
        } finally {
          setMarkersLoading(false);
          if (inflightKeyRef.current === key) {
            inflightMarkersRef.current = null;
            inflightKeyRef.current = null;
          }
        }
      })();

      inflightMarkersRef.current = job;
      inflightKeyRef.current = key;
      return job;
    },
    [api]
  );

  /**
   * Preview panel for selected day:
   * - date not in markers (and inside loaded month window) → empty, no network
   * - date in markers → GET full entry
   * - date outside current markers window (padded grid day) → GET entry (can't trust map)
   */
  const resolvePreview = useCallback(
    async (date: string, map: Record<string, DayMarker>, year: number, month: number) => {
      if (!api) return;

      setEntryError('');
      const { from, to } = monthRange(year, month);
      const inWindow = date >= from && date <= to;
      const hasEntry = !!map[date]?.hasEntry;

      // Instant empty — skip 404 round-trip
      if (inWindow && !hasEntry) {
        entrySeqRef.current += 1;
        setEntry(null);
        setEntryLoading(false);
        return;
      }

      const seq = ++entrySeqRef.current;
      setEntry((prev) => (prev?.date === date ? prev : null));
      setEntryLoading(true);

      try {
        const e = await api.getEntry(date);
        if (seq !== entrySeqRef.current) return;
        setEntry(e);
      } catch (err: unknown) {
        if (seq !== entrySeqRef.current) return;
        if (err instanceof ApiError && err.status === 404) {
          setEntry(null);
          // Marker was stale (e.g. deleted entry) — drop phantom dot locally
          if (map[date]) {
            setMarkers((prev) => {
              const next = { ...prev };
              delete next[date];
              return next;
            });
          }
        } else {
          setEntry(null);
          setEntryError(err instanceof Error ? err.message : 'Failed to load day');
        }
      } finally {
        if (seq === entrySeqRef.current) setEntryLoading(false);
      }
    },
    [api]
  );

  // Month change / swipe — load markers when the visible month changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadMarkers(visible.year, visible.month);
      if (cancelled) return;
      // Selected-day effect reacts to markers update
    })();
    return () => {
      cancelled = true;
    };
  }, [visible.year, visible.month, loadMarkers]);

  // Day selection — debounce rapid taps; trust markers when ready
  useEffect(() => {
    const year = visible.year;
    const month = visible.month;
    const key = monthCacheKey(year, month);
    const markersReady = markersMonthRef.current === key && !markersLoading;

    if (!markersReady) {
      // Can't prove empty yet — show panel spinner until month map arrives
      setEntryLoading(true);
      setEntryError('');
      return;
    }

    const { from, to } = monthRange(year, month);
    const inWindow = selected >= from && selected <= to;

    // Instant empty for days without a marker
    if (inWindow && !markers[selected]?.hasEntry) {
      entrySeqRef.current += 1;
      setEntry(null);
      setEntryLoading(false);
      setEntryError('');
      return;
    }

    const timer = setTimeout(() => {
      void resolvePreview(selected, markers, year, month);
    }, 200);

    return () => {
      clearTimeout(timer);
      entrySeqRef.current += 1;
    };
  }, [selected, markers, markersLoading, visible.year, visible.month, resolvePreview]);

  // Tab focus — soft revalidate dots after writing elsewhere; don't flash spinner if cached
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        void loadLegends().then((list) => {
          if (!cancelled) setLegends(list);
        });
        const { year, month } = visibleRef.current;
        const key = monthCacheKey(year, month);
        const had = markersMonthRef.current === key;
        const date = selectedRef.current;

        // Show cached empty immediately while dots refresh
        if (had) {
          const map = markersRef.current;
          const { from, to } = monthRange(year, month);
          if (date >= from && date <= to && !map[date]?.hasEntry) {
            setEntry(null);
            setEntryLoading(false);
          }
        }

        const data = await loadMarkers(year, month, { force: true, silent: had });
        if (cancelled || !data) return;
        void resolvePreview(selectedRef.current, data, year, month);
      })();
      return () => {
        cancelled = true;
        entrySeqRef.current += 1;
      };
    }, [loadMarkers, resolvePreview])
  );

  const goToMonth = (year: number, monthIndex: number) => {
    setVisible({ year, month: monthIndex });
    setCurrentMonth(`${year}-${String(monthIndex + 1).padStart(2, '0')}-01`);
    if (markersMonthRef.current !== monthCacheKey(year, monthIndex)) {
      setMarkersLoading(true);
    }
    setMonthPickerOpen(false);
  };

  const openDay = (date?: string) => {
    router.push(`/day/${date || selected}`);
  };

  const markedDates = useMemo(() => {
    const marks: Record<string, Record<string, unknown>> = {};

    for (const [date, m] of Object.entries(markers)) {
      marks[date] = {
        marked: true,
        dotColor: markerDotColor(legends, m),
      };
    }

    marks[selected] = {
      ...(marks[selected] || {}),
      selected: true,
      selectedColor: tokens.accent,
      selectedTextColor: tokens.white,
    };

    return marks;
  }, [markers, selected, tokens, legends]);

  const selectedMood =
    prefs.displayMoodOnCalendar && markers[selected]?.mood
      ? markers[selected].mood
      : null;

  const photoDays = useMemo(
    () =>
      Object.entries(markers)
        .filter(([, m]) => m.photoCount > 0)
        .map(([date, m]) => ({ date, count: m.photoCount }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [markers]
  );

  const monthOptions = useMemo(() => {
    const opts: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    for (let i = -18; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      opts.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: formatMonthYear(d.getFullYear(), d.getMonth()),
      });
    }
    return opts.reverse();
  }, []);

  const hasContent =
    !!entry &&
    (!!entry.title?.trim() ||
      !!entry.body?.trim() ||
      (entry.logs && entry.logs.length > 0) ||
      (entry.photoIds && entry.photoIds.length > 0));

  const logs = entry?.logs?.length
    ? entry.logs
    : entry?.body
      ? [{ id: 'body', text: entry.body, at: '' }]
      : [];

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Gallery shortcuts */}
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => router.push('/gallery')}
            hitSlop={10}
            accessibilityLabel="All photos"
            style={[styles.iconBtn, { borderColor: tokens.line }]}
          >
            <Text style={{ color: tokens.text, fontSize: 16 }}>All</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setGalleryOpen(true)}
            hitSlop={10}
            accessibilityLabel="Photo gallery this month"
            style={[styles.iconBtn, { borderColor: tokens.line }]}
          >
            <GalleryIcon
              color={tokens.text}
              variant={isDark ? 'dark' : 'light'}
              size={18}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={() => setMonthPickerOpen(true)}
          style={styles.monthRow}
          accessibilityRole="button"
          accessibilityLabel="Choose month"
        >
          <Text style={[styles.monthLabel, { color: tokens.text }]}>
            {formatMonthYear(visible.year, visible.month)}
          </Text>
          <Text style={{ color: tokens.accent, fontSize: 14, marginLeft: 6 }}>▼</Text>
          {markersLoading ? (
            <ActivityIndicator color={tokens.accent} size="small" style={{ marginLeft: 10 }} />
          ) : null}
        </Pressable>

        {!!markersError && (
          <ErrorBlock
            message={markersError}
            onRetry={() => {
              void loadMarkers(visible.year, visible.month, { force: true });
            }}
          />
        )}

        <Calendar
          key={`${currentMonth}-${calendarFirstDay}`}
          current={currentMonth}
          firstDay={calendarFirstDay}
          onDayPress={(day: DateData) => setSelected(day.dateString)}
          markedDates={markedDates}
          onMonthChange={(m) => {
            setVisible({ year: m.year, month: m.month - 1 });
            setCurrentMonth(`${m.year}-${String(m.month).padStart(2, '0')}-01`);
            if (
              markersMonthRef.current !== monthCacheKey(m.year, m.month - 1)
            ) {
              setMarkersLoading(true);
            }
          }}
          enableSwipeMonths
          hideArrows
          renderHeader={() => <View style={{ height: 0 }} />}
          theme={{
            backgroundColor: tokens.bg,
            calendarBackground: tokens.bg,
            textSectionTitleColor: tokens.textMuted,
            selectedDayBackgroundColor: tokens.accent,
            selectedDayTextColor: tokens.white,
            todayTextColor: tokens.fab,
            dayTextColor: tokens.text,
            textDisabledColor: tokens.textSubtle,
            arrowColor: tokens.accent,
            monthTextColor: 'transparent',
            textDayFontFamily: fonts.body,
            textMonthFontFamily: fonts.display,
            textDayHeaderFontFamily: fonts.bodyMedium,
            textDayFontSize: 16,
            textDayHeaderFontSize: 12,
            textMonthFontSize: 1,
          }}
        />

        <View style={[styles.legend, { borderTopColor: tokens.line }]}>
          {legends.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push('/legends')}
              style={styles.legendItem}
              hitSlop={4}
            >
              <Text style={{ color: l.color, fontSize: 12 }}>●</Text>
              <Text style={[styles.legendLabel, { color: tokens.textMuted }]}>{l.name}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => router.push('/legends')} hitSlop={8}>
            <Text style={{ color: tokens.accent, fontFamily: fonts.body, fontSize: 13 }}>+ key</Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.strip,
            { backgroundColor: tokens.bgElevated, borderColor: tokens.line },
          ]}
        >
          <Text style={[styles.stripText, { color: tokens.text }]}>
            {formatCalendarStrip(selected)}
          </Text>
          {selectedMood ? (
            <Text style={[styles.stripMood, { color: tokens.accent }]}>
              {MOOD_EMOJIS[selectedMood]} {MOOD_LABELS[selectedMood]}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.panel,
            { backgroundColor: tokens.bgCard, borderColor: tokens.line },
          ]}
        >
          {entryLoading ? (
            <ActivityIndicator color={tokens.accent} style={{ marginVertical: 20 }} />
          ) : entryError ? (
            <Text style={{ color: tokens.danger, fontFamily: fonts.body }}>{entryError}</Text>
          ) : !hasContent ? (
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>
                No diaries on this day.
              </Text>
              <Text style={[styles.emptySub, { color: tokens.textMuted }]}>Write now!</Text>
              <PrimaryButton
                label="Write now"
                onPress={() => openDay()}
                style={{ marginTop: spacing.md, alignSelf: 'center', minWidth: 160 }}
              />
            </View>
          ) : (
            <Pressable onPress={() => openDay()} style={styles.entryBlock}>
              <View style={styles.entryHeader}>
                <Text style={[styles.entryTitle, { color: tokens.text }]} numberOfLines={1}>
                  {entry!.title || 'Untitled day'}
                </Text>
                {entry!.favorite ? (
                  <Text style={{ color: tokens.favorite, fontSize: 16 }}>★</Text>
                ) : null}
              </View>
              {entry!.mood ? (
                <Text style={[styles.mood, { color: tokens.accent }]}>
                  {MOOD_LABELS[entry!.mood] || ''}
                </Text>
              ) : null}

              {logs.map((log) => (
                <View key={log.id} style={[styles.logRow, { borderTopColor: tokens.line }]}>
                  {log.at ? (
                    <Text style={[styles.logTime, { color: tokens.textMuted }]}>
                      {formatPrefTime(log.at, prefs.timeFormat)}
                    </Text>
                  ) : null}
                  <Text style={[styles.logText, { color: tokens.text }]} numberOfLines={3}>
                    {log.text.replace(/\s+/g, ' ').trim()}
                  </Text>
                </View>
              ))}

              {entry!.photoIds?.length ? (
                <Text style={[styles.meta, { color: tokens.textSubtle }]}>
                  {entry!.photoIds.length} photo
                  {entry!.photoIds.length > 1 ? 's' : ''}
                </Text>
              ) : null}

              <Text style={[styles.openLink, { color: tokens.accent }]}>Open day →</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={monthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerOpen(false)}
      >
        <Pressable style={styles.modalDim} onPress={() => setMonthPickerOpen(false)}>
          <View
            style={[styles.monthSheet, { backgroundColor: tokens.bgElevated }]}
            onStartShouldSetResponder={() => true}
          >
            <SheetHeader title="Jump to month" onClose={() => setMonthPickerOpen(false)} />
            <ScrollView style={{ maxHeight: 360 }}>
              {monthOptions.map((opt) => {
                const active = opt.year === visible.year && opt.month === visible.month;
                return (
                  <Pressable
                    key={`${opt.year}-${opt.month}`}
                    onPress={() => goToMonth(opt.year, opt.month)}
                    style={[styles.monthOption, active && { backgroundColor: tokens.accentSoft }]}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        color: active ? tokens.accent : tokens.text,
                        fontSize: 15,
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={galleryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setGalleryOpen(false)}
      >
        <Pressable style={styles.modalDim} onPress={() => setGalleryOpen(false)}>
          <View
            style={[styles.gallerySheet, { backgroundColor: tokens.bgElevated }]}
            onStartShouldSetResponder={() => true}
          >
            <SheetHeader
              title={`Photos · ${formatMonthYear(visible.year, visible.month)}`}
              onClose={() => setGalleryOpen(false)}
            />
            <Pressable
              onPress={() => {
                setGalleryOpen(false);
                router.push('/gallery');
              }}
              style={{ marginBottom: spacing.md }}
            >
              <Text style={{ fontFamily: fonts.bodyMedium, color: tokens.accent }}>
                Browse all photos →
              </Text>
            </Pressable>
            {photoDays.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, color: tokens.textMuted, padding: 8 }}>
                No photo days in this month yet.
              </Text>
            ) : (
              <ScrollView>
                {photoDays.map((p) => (
                  <Pressable
                    key={p.date}
                    onPress={() => {
                      setGalleryOpen(false);
                      setSelected(p.date);
                      openDay(p.date);
                    }}
                    style={[styles.galleryRow, { borderBottomColor: tokens.line }]}
                  >
                    <Text style={{ fontFamily: fonts.body, color: tokens.text, flex: 1 }}>
                      {formatCalendarStrip(p.date)}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, color: tokens.accent }}>
                      {p.count} photo{p.count > 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: 36,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  monthLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    letterSpacing: 1.2,
  },
  error: {
    fontFamily: fonts.body,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  strip: {
    marginTop: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stripText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    textAlign: 'center',
  },
  stripMood: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  panel: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    minHeight: 120,
  },
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 15,
    marginTop: 6,
  },
  entryBlock: {
    gap: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  entryTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    flex: 1,
  },
  mood: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 4,
  },
  logRow: {
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logTime: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 0.2,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  logText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  openLink: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    marginTop: spacing.md,
  },
  modalDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  monthSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  gallerySheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  monthOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
  },
  galleryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
});
