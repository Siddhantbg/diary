import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'mydiary_legends_v1';

export type DiaryLegend = {
  id: string;
  name: string;
  color: string;
  /** Built-in; name/color still customizable; cannot delete. */
  system?: 'entry' | 'cherished';
};

export const SYSTEM_ENTRY_ID = 'system-entry';
export const SYSTEM_CHERISHED_ID = 'system-cherished';

/** Default legend palette when the user creates a new item. */
export const LEGEND_COLOR_PRESETS = [
  '#4A90E2',
  '#FFC857',
  '#E05A5A',
  '#5BC57A',
  '#B07CE8',
  '#F07BA9',
  '#4ECDC4',
  '#FF8C42',
  '#8BA3C7',
  '#FFFFFF',
  '#6B8E9F',
  '#D4A574',
];

export function defaultLegends(): DiaryLegend[] {
  return [
    { id: SYSTEM_ENTRY_ID, name: 'Entry', color: '#4A90E2', system: 'entry' },
    {
      id: SYSTEM_CHERISHED_ID,
      name: 'Cherished',
      color: '#FFC857',
      system: 'cherished',
    },
  ];
}

function normalize(list: DiaryLegend[]): DiaryLegend[] {
  const defaults = defaultLegends();
  const byId = new Map(list.map((l) => [l.id, l]));
  for (const d of defaults) {
    if (!byId.has(d.id)) byId.set(d.id, d);
    else {
      // Keep user color/name; preserve system flag
      const cur = byId.get(d.id)!;
      byId.set(d.id, { ...cur, system: d.system });
    }
  }
  // System first, then custom by name
  const all = Array.from(byId.values());
  const system = defaults.map((d) => byId.get(d.id)!);
  const custom = all
    .filter((l) => !l.system)
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...system, ...custom];
}

export async function loadLegends(): Promise<DiaryLegend[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLegends();
    const parsed = JSON.parse(raw) as DiaryLegend[];
    if (!Array.isArray(parsed)) return defaultLegends();
    return normalize(
      parsed
        .filter((l) => l && l.id && l.name && l.color)
        .map((l) => ({
          id: String(l.id),
          name: String(l.name).slice(0, 40),
          color: String(l.color),
          system: l.system,
        }))
    );
  } catch {
    return defaultLegends();
  }
}

export async function saveLegends(list: DiaryLegend[]): Promise<void> {
  const next = normalize(list);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function addLegend(name: string, color: string): Promise<DiaryLegend> {
  const list = await loadLegends();
  const legend: DiaryLegend = {
    id: `lg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 40) || 'Legend',
    color: color || LEGEND_COLOR_PRESETS[0],
  };
  await saveLegends([...list, legend]);
  return legend;
}

export async function updateLegend(
  id: string,
  patch: Partial<Pick<DiaryLegend, 'name' | 'color'>>
): Promise<void> {
  const list = await loadLegends();
  const next = list.map((l) => {
    if (l.id !== id) return l;
    return {
      ...l,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 40) || l.name : l.name,
      color: patch.color !== undefined ? patch.color : l.color,
    };
  });
  await saveLegends(next);
}

export async function deleteLegend(id: string): Promise<void> {
  const list = await loadLegends();
  const target = list.find((l) => l.id === id);
  if (!target || target.system) return;
  await saveLegends(list.filter((l) => l.id !== id));
}

export function legendById(list: DiaryLegend[], id: string | null | undefined): DiaryLegend | null {
  if (!id) return null;
  return list.find((l) => l.id === id) ?? null;
}

/**
 * Dot color for a calendar day.
 * Cherished (favorite) uses cherished color; else custom legend; else entry color.
 */
export function markerDotColor(
  legends: DiaryLegend[],
  marker: { favorite?: boolean; legendId?: string }
): string {
  const entry = legends.find((l) => l.system === 'entry') || defaultLegends()[0];
  const cherished = legends.find((l) => l.system === 'cherished') || defaultLegends()[1];
  if (marker.favorite) return cherished.color;
  if (marker.legendId) {
    const custom = legends.find((l) => l.id === marker.legendId && !l.system);
    if (custom) return custom.color;
  }
  return entry.color;
}
