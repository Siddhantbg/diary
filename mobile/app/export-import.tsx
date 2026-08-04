import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Stack } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { usePreferences } from '@/context/PreferencesContext';
import { fonts, radius, spacing } from '@/constants/theme';
import { ActionSheet, SheetAction } from '@/components/ui/ActionSheet';
import {
  buildDataPackage,
  entriesToHtml,
  entriesToTxt,
  EXPORT_PERIOD_OPTIONS,
  ExportPeriodId,
  fetchAllEntries,
  filterEntriesByRange,
  formatExportDateSlash,
  parseDataPackage,
  periodLabel,
  rangeForPeriod,
} from '@/lib/exportImport';
import { parseDateKey, shiftDateKey, toDateKey } from '@/lib/dates';
import { friendlyApiMessage } from '@/lib/api';

type SheetState = {
  title: string;
  message?: string;
  actions: SheetAction[];
};

type DateField = 'from' | 'to' | null;

export default function ExportImportScreen() {
  const { api } = useSettings();
  const { tokens } = useTheme();
  const { prefs, setPref } = usePreferences();

  const today = toDateKey();
  const [period, setPeriod] = useState<ExportPeriodId>('last7');
  const [fromDate, setFromDate] = useState(() => shiftDateKey(today, -6));
  const [toDate, setToDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [dateField, setDateField] = useState<DateField>(null);

  const openSheet = (next: SheetState) => setSheet(next);
  const closeSheet = () => setSheet(null);
  const notice = (title: string, message: string) =>
    openSheet({
      title,
      message,
      actions: [{ key: 'ok', label: 'Got it', icon: '✓', onPress: () => undefined }],
    });

  const activeRange = useMemo(() => {
    if (period === 'custom') return rangeForPeriod('custom', fromDate, toDate);
    return rangeForPeriod(period);
  }, [period, fromDate, toDate]);

  const periodDisplay = useMemo(() => {
    if (period === 'custom') return 'Custom range';
    return periodLabel(period);
  }, [period]);

  const loadFiltered = useCallback(async () => {
    const all = await fetchAllEntries(api);
    const { from, to } = activeRange;
    return filterEntriesByRange(all, from, to);
  }, [api, activeRange]);

  const shareFile = async (uri: string, mimeType: string, dialogTitle: string) => {
    const can = await Sharing.isAvailableAsync();
    if (!can) {
      notice('Sharing unavailable', 'This device cannot open the share sheet.');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: mimeType });
  };

  const writeCache = async (name: string, contents: string) => {
    const base = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    if (!base) throw new Error('No writable cache directory');
    const uri = `${base}${name}`;
    await FileSystem.writeAsStringAsync(uri, contents);
    return uri;
  };

  const run = async (label: string, work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await work();
    } catch (e: unknown) {
      notice(`${label} failed`, friendlyApiMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const pickPeriod = () => {
    openSheet({
      title: 'Export diary period',
      message: 'Choose which days to include.',
      actions: [
        ...EXPORT_PERIOD_OPTIONS.map((o) => ({
          key: o.id,
          label: o.id === period ? `${o.label}  · current` : o.label,
          icon: o.id === period ? '✓' : '·',
          onPress: () => {
            setPeriod(o.id);
            if (o.id !== 'custom') {
              const r = rangeForPeriod(o.id);
              if (r.from) setFromDate(r.from);
              if (r.to) setToDate(r.to);
            }
          },
        })),
        {
          key: 'cancel',
          label: 'Cancel',
          icon: '✕',
          cancel: true,
          onPress: () => undefined,
        },
      ],
    });
  };

  const exportTxt = () =>
    run('TXT export', async () => {
      const entries = await loadFiltered();
      if (!entries.length) {
        notice('Nothing to export', 'No entries in this date range.');
        return;
      }
      const text = entriesToTxt(entries, !prefs.removeExportWatermark);
      const stamp = toDateKey().replace(/-/g, '');
      const uri = await writeCache(`mydiary-${stamp}.txt`, text);
      await shareFile(uri, 'text/plain', 'Export diary as TXT');
    });

  const exportPdf = () =>
    run('PDF export', async () => {
      const entries = await loadFiltered();
      if (!entries.length) {
        notice('Nothing to export', 'No entries in this date range.');
        return;
      }
      const html = entriesToHtml(entries, {
        includeMediaNote: true,
        watermark: !prefs.removeExportWatermark,
      });
      const { uri } = await Print.printToFileAsync({ html });
      await shareFile(uri, 'application/pdf', 'Export diary as PDF');
    });

  const exportPackage = () =>
    run('Package export', async () => {
      const entries = await loadFiltered();
      if (!entries.length) {
        notice('Nothing to export', 'No entries in this date range.');
        return;
      }
      const pkg = buildDataPackage(entries);
      const stamp = toDateKey().replace(/-/g, '');
      const uri = await writeCache(
        `mydiary-package-${stamp}.json`,
        JSON.stringify(pkg, null, 2)
      );
      await shareFile(uri, 'application/json', 'Export data package');
    });

  const importPackage = () =>
    run('Import', async () => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri);
      const pkg = parseDataPackage(raw);
      let imported = 0;
      let failed = 0;
      for (const e of pkg.entries) {
        if (!e?.date || !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
          failed += 1;
          continue;
        }
        try {
          await api.saveEntry(e.date, {
            title: e.title || '',
            mood: e.mood ?? null,
            tags: e.tags || [],
            people: e.people || [],
            favorite: !!e.favorite,
            legendId: e.legendId || '',
            weatherNote: e.weatherNote || '',
            body: e.body || '',
            // Server accepts logs array on put for package restore
            logs: e.logs || [],
          } as Parameters<typeof api.saveEntry>[1]);
          imported += 1;
        } catch {
          failed += 1;
        }
      }
      notice(
        'Import finished',
        `Imported ${imported} day${imported === 1 ? '' : 's'}${
          failed ? ` · ${failed} skipped` : ''
        }. Photos and voice files are not included in packages yet.`
      );
    });

  const help = () =>
    notice(
      'Export & Import',
      'TXT is text-only. PDF is a printable summary. Data packages move day text, moods, tags, and moments between devices. Photos stay on the server and are noted, not bundled yet.'
    );

  const displayFrom = period === 'all' ? '…' : formatExportDateSlash(activeRange.from || fromDate);
  const displayTo = period === 'all' ? '…' : formatExportDateSlash(activeRange.to || toDate);

  return (
    <View style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Stack.Screen
        options={{
          title: 'Export & Import',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Pressable onPress={help} hitSlop={12} accessibilityLabel="Help">
              <View style={[styles.helpBubble, { backgroundColor: tokens.accent }]}>
                <Text style={styles.helpGlyph}>?</Text>
              </View>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {busy ? (
          <View style={styles.busyBar}>
            <ActivityIndicator color={tokens.accent} />
            <Text style={[styles.busyText, { color: tokens.textMuted }]}>Working…</Text>
          </View>
        ) : null}

        <Text style={[styles.section, { color: tokens.textMuted }]}>Export</Text>

        {/* Period */}
        <View style={[styles.row, styles.rowCol, { borderBottomColor: tokens.line }]}>
          <View style={styles.rowMain}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: tokens.text }]}>Export Diary Period</Text>
              <Pressable onPress={pickPeriod} hitSlop={8} style={styles.periodLink}>
                <Text style={[styles.periodValue, { color: tokens.textMuted }]}>
                  {periodDisplay}
                </Text>
                <Text style={{ color: tokens.textSubtle, fontSize: 16 }}>›</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.datePickRow}>
            <Pressable
              onPress={() => {
                setPeriod('custom');
                setDateField('from');
              }}
              style={[
                styles.dateBox,
                { backgroundColor: tokens.bgElevated, borderColor: tokens.line },
              ]}
            >
              <Text style={[styles.dateBoxText, { color: tokens.text }]}>{displayFrom}</Text>
            </Pressable>
            <Text style={[styles.toLabel, { color: tokens.textMuted }]}>To</Text>
            <Pressable
              onPress={() => {
                setPeriod('custom');
                setDateField('to');
              }}
              style={[
                styles.dateBox,
                { backgroundColor: tokens.bgElevated, borderColor: tokens.line },
              ]}
            >
              <Text style={[styles.dateBoxText, { color: tokens.text }]}>{displayTo}</Text>
            </Pressable>
          </View>
        </View>

        <ActionRow
          title="Export to .TXT"
          subtitle="Only text will be exported"
          actionLabel="EXPORT"
          actionColor={tokens.accent}
          textColor={tokens.text}
          muted={tokens.textMuted}
          line={tokens.line}
          onPress={exportTxt}
          disabled={busy}
        />
        <ActionRow
          title="Export to .PDF"
          subtitle="Include pictures and backgrounds"
          actionLabel="EXPORT"
          actionColor={tokens.accent}
          textColor={tokens.text}
          muted={tokens.textMuted}
          line={tokens.line}
          onPress={exportPdf}
          disabled={busy}
        />

        <View style={[styles.row, { borderBottomColor: tokens.line }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.rowTitle, { color: tokens.text }]}>Remove Watermark</Text>
            <Text style={[styles.rowSub, { color: tokens.textMuted }]}>
              Remove watermark when exporting
            </Text>
          </View>
          <Switch
            value={prefs.removeExportWatermark}
            onValueChange={(v) => void setPref('removeExportWatermark', v)}
            trackColor={{ false: tokens.line, true: tokens.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        <ActionRow
          title="Export Data Package"
          subtitle="Migrate data to MyDiary on other devices, including diary text, moods, and moments"
          actionLabel="EXPORT"
          actionColor={tokens.accent}
          textColor={tokens.text}
          muted={tokens.textMuted}
          line={tokens.line}
          onPress={exportPackage}
          disabled={busy}
        />

        <Text style={[styles.section, { color: tokens.textMuted, marginTop: spacing.lg }]}>
          Import
        </Text>

        <ActionRow
          title="Import Data Package"
          subtitle="Migrate MyDiary data files from other devices"
          actionLabel="IMPORT"
          actionColor={tokens.accent}
          textColor={tokens.text}
          muted={tokens.textMuted}
          line={tokens.line}
          onPress={importPackage}
          disabled={busy}
        />
      </ScrollView>

      <ActionSheet
        visible={!!sheet}
        title={sheet?.title ?? ''}
        message={sheet?.message}
        actions={sheet?.actions ?? []}
        onClose={closeSheet}
      />

      {dateField && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseDateKey(dateField === 'to' ? toDate : fromDate)}
          mode="date"
          display="default"
          onChange={(event: DateTimePickerEvent, selected?: Date) => {
            if (event.type === 'dismissed' || !selected) {
              setDateField(null);
              return;
            }
            const key = toDateKey(selected);
            if (dateField === 'from') {
              setFromDate(key);
              if (key > toDate) setToDate(key);
            } else {
              setToDate(key);
              if (key < fromDate) setFromDate(key);
            }
            setDateField(null);
          }}
        />
      ) : null}

      <Modal
        visible={dateField != null && Platform.OS !== 'android'}
        transparent
        animationType="slide"
        onRequestClose={() => setDateField(null)}
      >
        <Pressable style={styles.iosDim} onPress={() => setDateField(null)}>
          <View
            style={[styles.iosSheet, { backgroundColor: tokens.bgElevated }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.iosHeader}>
              <Text style={[styles.iosTitle, { color: tokens.text }]}>
                {dateField === 'to' ? 'To date' : 'From date'}
              </Text>
              <Pressable onPress={() => setDateField(null)}>
                <Text style={{ color: tokens.accent, fontFamily: fonts.bodyMedium }}>Done</Text>
              </Pressable>
            </View>
            {dateField ? (
              <DateTimePicker
                value={parseDateKey(dateField === 'to' ? toDate : fromDate)}
                mode="date"
                display="spinner"
                onChange={(_e, selected) => {
                  if (!selected) return;
                  const key = toDateKey(selected);
                  if (dateField === 'from') {
                    setFromDate(key);
                    if (key > toDate) setToDate(key);
                  } else {
                    setToDate(key);
                    if (key < fromDate) setFromDate(key);
                  }
                }}
              />
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

type ActionRowProps = {
  title: string;
  subtitle: string;
  actionLabel: string;
  actionColor: string;
  textColor: string;
  muted: string;
  line: string;
  onPress: () => void;
  disabled?: boolean;
};

function ActionRow({
  title,
  subtitle,
  actionLabel,
  actionColor,
  textColor,
  muted,
  line,
  onPress,
  disabled,
}: ActionRowProps) {
  return (
    <View style={[styles.row, { borderBottomColor: line, opacity: disabled ? 0.55 : 1 }]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: muted }]}>{subtitle}</Text>
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.actionBtn, { backgroundColor: actionColor }]}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
      >
        <Text style={styles.actionBtnText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 48,
  },
  section: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.4,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowCol: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: {
    fontFamily: fonts.body,
    fontSize: 16,
  },
  rowSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  periodLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  periodValue: {
    fontFamily: fonts.body,
    fontSize: 14,
  },
  datePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 10,
  },
  dateBox: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  dateBoxText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  toLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.sm,
    minWidth: 84,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  helpBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  helpGlyph: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  busyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
  },
  busyText: {
    fontFamily: fonts.body,
    fontSize: 13,
  },
  iosDim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iosSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.lg,
  },
  iosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iosTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
  },
});
