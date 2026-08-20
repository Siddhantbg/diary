import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CHERISHED_GEM, DEFAULT_ENTRY_GEM, gemById } from '@/lib/gems';
import { isStickerFaceId } from '@/lib/stickerFaces';

const STORAGE_KEY = 'mydiary_legends_v1';

export type DiaryLegend = {
  id: string;
  name: string;
  color: string;
  /** Optional gem from the gem catalog (mapped by the user). */
  gemId?: string | null;
  /** Built-in; name/color/gem still customizable; cannot delete. */
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
    {
      id: SYSTEM_ENTRY_ID,
      name: 'Entry',
      color: '#4A90E2',
      gemId: DEFAULT_ENTRY_GEM,
      system: 'entry',
    },
    {
      id: SYSTEM_CHERISHED_ID,
      name: 'Cherished',
      color: '#FFC857',
      gemId: DEFAULT_CHERISHED_GEM,
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
      const cur = byId.get(d.id)!;
      byId.set(d.id, {
        ...cur,
        system: d.system,
        // Entry / Cherished use the illustrated pack (migrate off gems / old glossy defaults).
        gemId:
          d.system &&
          (!isStickerFaceId(cur.gemId) ||
            (d.system === 'entry' && cur.gemId === 'face-02') ||
            (d.system === 'cherished' && cur.gemId === 'face-08'))
            ? d.gemId
            : cur.gemId || d.gemId || null,
      });
    }
  }
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
          gemId: l.gemId ? String(l.gemId) : null,
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

export async function addLegend(
  name: string,
  color: string,
  gemId?: string | null
): Promise<DiaryLegend> {
  const list = await loadLegends();
  const gem = gemById(gemId);
  const legend: DiaryLegend = {
    id: `lg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim().slice(0, 40) || 'Legend',
    color: color || gem?.tint || LEGEND_COLOR_PRESETS[0],
    gemId: gem?.id ?? null,
  };
  await saveLegends([...list, legend]);
  return legend;
}

export async function updateLegend(
  id: string,
  patch: Partial<Pick<DiaryLegend, 'name' | 'color' | 'gemId'>>
): Promise<void> {
  const list = await loadLegends();
  const next = list.map((l) => {
    if (l.id !== id) return l;
    return {
      ...l,
      name: patch.name !== undefined ? patch.name.trim().slice(0, 40) || l.name : l.name,
      color: patch.color !== undefined ? patch.color : l.color,
      gemId: patch.gemId !== undefined ? patch.gemId : l.gemId,
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

/** Resolve which gem to show for a day / entry. */
export function markerGemId(
  legends: DiaryLegend[],
  marker: { favorite?: boolean; legendId?: string; gemId?: string | null }
): string | null {
  const entry = legends.find((l) => l.system === 'entry') || defaultLegends()[0];
  const cherished = legends.find((l) => l.system === 'cherished') || defaultLegends()[1];
  // Per-day gem wins when set (cherished pick from the star tool).
  if (marker.gemId) return marker.gemId;
  if (marker.favorite) return cherished.gemId || DEFAULT_CHERISHED_GEM;
  if (marker.legendId) {
    const custom = legends.find((l) => l.id === marker.legendId && !l.system);
    if (custom?.gemId) return custom.gemId;
  }
  return entry.gemId || DEFAULT_ENTRY_GEM;
}

export function cherishedGemId(legends: DiaryLegend[]): string {
  const cherished = legends.find((l) => l.system === 'cherished') || defaultLegends()[1];
  return cherished.gemId || DEFAULT_CHERISHED_GEM;
}
