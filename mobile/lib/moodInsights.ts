import { MOOD_EMOJIS, MOOD_LABELS, parseDateKey } from '@/lib/dates';

/**
 * Approximate positivity score (1–10) for analytics.
 * Mood ids are categories; valence ranks how “upbeat” each feels.
 */
export const MOOD_VALENCE: Record<number, number> = {
  1: 5, // Meh
  2: 7, // Happy
  3: 8, // Glad
  4: 9, // Loved
  5: 8, // Playful
  6: 9, // Amazed
  7: 2, // Angry
  8: 3, // Down
  9: 2, // Sad
  10: 1, // Sobbing
};

const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type MoodSample = {
  date: string;
  mood: number;
};

export type MoodInsights = {
  totalWithMood: number;
  /** count[1..10] */
  counts: number[];
  /** percent[1..10] 0–100 */
  percents: number[];
  /** Share of upbeat moods (ids 2–6) */
  positivePercent: number;
  /** 0–100: higher = more consistent valence */
  stability: number;
  stabilityLabel: string;
  /** Weekday with highest average valence */
  bestWeekday: {
    name: string;
    short: string;
    avgValence: number;
    sampleCount: number;
    topMood: number;
  } | null;
  /** Best single day in the current 7-day window */
  bestThisWeek: {
    date: string;
    weekday: string;
    mood: number;
    valence: number;
  } | null;
};

function valence(mood: number): number {
  return MOOD_VALENCE[mood] ?? 5;
}

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sampleStd(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance = nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(variance);
}

export function computeMoodInsights(
  samples: MoodSample[],
  weekKeys: string[]
): MoodInsights {
  const valid = samples.filter((s) => s.mood >= 1 && s.mood <= 10);

  const counts = Array(11).fill(0) as number[];
  for (const s of valid) counts[s.mood] += 1;

  const totalWithMood = valid.length;
  const percents = Array(11).fill(0) as number[];
  if (totalWithMood > 0) {
    for (let i = 1; i <= 10; i++) {
      percents[i] = Math.round((counts[i] / totalWithMood) * 100);
    }
  }

  const positive = counts.slice(2, 7).reduce((a, b) => a + b, 0);
  const positivePercent =
    totalWithMood > 0 ? Math.round((positive / totalWithMood) * 100) : 0;

  const valences = valid.map((s) => valence(s.mood));
  const std = sampleStd(valences);
  // Valence span ~1–9; std 0 → 100%, ~3+ → low scores
  const stability =
    valences.length === 0
      ? 0
      : valences.length === 1
        ? 100
        : Math.max(0, Math.min(100, Math.round(100 - (std / 3) * 100)));

  let stabilityLabel = 'No data yet';
  if (valences.length === 0) stabilityLabel = 'No data yet';
  else if (valences.length === 1) stabilityLabel = 'Need more days';
  else if (stability >= 75) stabilityLabel = 'Very steady';
  else if (stability >= 50) stabilityLabel = 'Fairly steady';
  else if (stability >= 30) stabilityLabel = 'Some swings';
  else stabilityLabel = 'Quite variable';

  // Best weekday by average valence
  const sumByDow = Array(7).fill(0) as number[];
  const countByDow = Array(7).fill(0) as number[];
  const moodHitsByDow: number[][] = Array.from({ length: 7 }, () => Array(11).fill(0));

  for (const s of valid) {
    const dow = parseDateKey(s.date).getDay();
    sumByDow[dow] += valence(s.mood);
    countByDow[dow] += 1;
    moodHitsByDow[dow][s.mood] += 1;
  }

  let bestWeekday: MoodInsights['bestWeekday'] = null;
  let bestAvg = -1;
  for (let dow = 0; dow < 7; dow++) {
    if (countByDow[dow] === 0) continue;
    const avg = sumByDow[dow] / countByDow[dow];
    if (avg <= bestAvg) continue;
    bestAvg = avg;

    let topMood = 1;
    let topCount = -1;
    for (let m = 1; m <= 10; m++) {
      if (moodHitsByDow[dow][m] > topCount) {
        topCount = moodHitsByDow[dow][m];
        topMood = m;
      }
    }

    const name = WEEKDAY_LONG[dow];
    bestWeekday = {
      name,
      short: name.slice(0, 3),
      avgValence: Math.round(avg * 10) / 10,
      sampleCount: countByDow[dow],
      topMood,
    };
  }

  // Best single day this week
  let bestThisWeek: MoodInsights['bestThisWeek'] = null;
  const weekSet = new Set(weekKeys);
  for (const s of valid) {
    if (!weekSet.has(s.date)) continue;
    const v = valence(s.mood);
    if (
      !bestThisWeek ||
      v > bestThisWeek.valence ||
      (v === bestThisWeek.valence && s.date > bestThisWeek.date)
    ) {
      bestThisWeek = {
        date: s.date,
        weekday: WEEKDAY_LONG[parseDateKey(s.date).getDay()],
        mood: s.mood,
        valence: v,
      };
    }
  }

  return {
    totalWithMood,
    counts,
    percents,
    positivePercent,
    stability,
    stabilityLabel,
    bestWeekday,
    bestThisWeek,
  };
}

export function moodEmoji(mood: number): string {
  return MOOD_EMOJIS[mood] ?? '';
}

export function moodLabel(mood: number): string {
  return MOOD_LABELS[mood] ?? '';
}
