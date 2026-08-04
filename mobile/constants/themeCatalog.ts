/**
 * Static MyDiary theme gallery data (Phase 7).
 * Structural spacing lives in theme.ts; packs only override colors + illustration.
 */

export type ThemeCategory = 'hot' | 'dark' | 'light';

export type ThemeIllustration = {
  /** Gradient sky top → bottom */
  sky: [string, string, string?];
  ground: string;
  orb: string;
  mountain: string;
};

export type ThemePack = {
  id: string;
  name: string;
  category: ThemeCategory;
  free: boolean;
  bg: string;
  bgElevated: string;
  bgCard: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentSoft: string;
  fab: string;
  line: string;
  danger: string;
  favorite: string;
  white: string;
  overlay: string;
  headerIllustration?: string;
  illustration: ThemeIllustration;
};

type ThemeInput = Omit<ThemePack, 'danger' | 'favorite' | 'white' | 'overlay' | 'accentSoft'> &
  Partial<Pick<ThemePack, 'danger' | 'favorite' | 'white' | 'overlay' | 'accentSoft'>>;

function pack(base: ThemeInput): ThemePack {
  return {
    danger: '#E05A5A',
    favorite: '#FFC857',
    white: '#FFFFFF',
    overlay: base.category === 'light' ? 'rgba(15,32,61,0.35)' : 'rgba(0,0,0,0.5)',
    accentSoft: `${base.accent}33`,
    ...base,
  };
}

// ─── DARK ───────────────────────────────────────────────────────────────────

const nightMountain = pack({
  id: 'night-mountain',
  name: 'Night Mountain',
  category: 'dark',
  free: true,
  bg: '#0B162C',
  bgElevated: '#16223E',
  bgCard: '#1A2744',
  text: '#FFFFFF',
  textMuted: '#8BA3C7',
  textSubtle: '#5A7B9A',
  accent: '#4A90E2',
  accentSoft: 'rgba(74, 144, 226, 0.18)',
  fab: '#3B82F6',
  line: 'rgba(139, 163, 199, 0.22)',
  headerIllustration: '#0A1220',
  illustration: {
    sky: ['#0A1220', '#152238', '#1a3050'],
    ground: '#06101C',
    orb: 'rgba(255,255,255,0.9)',
    mountain: '#0A1424',
  },
});

const midnightOcean = pack({
  id: 'midnight-ocean',
  name: 'Midnight Ocean',
  category: 'dark',
  free: true,
  bg: '#061820',
  bgElevated: '#0C2530',
  bgCard: '#103040',
  text: '#E8F4F8',
  textMuted: '#7AA8B8',
  textSubtle: '#4A7080',
  accent: '#2DD4BF',
  fab: '#14B8A6',
  line: 'rgba(122, 168, 184, 0.22)',
  headerIllustration: '#041218',
  illustration: {
    sky: ['#041218', '#0A2430', '#0E3848'],
    ground: '#031018',
    orb: 'rgba(180,240,255,0.85)',
    mountain: '#062028',
  },
});

const charcoalEmber = pack({
  id: 'charcoal-ember',
  name: 'Charcoal Ember',
  category: 'dark',
  free: true,
  bg: '#141210',
  bgElevated: '#221E1A',
  bgCard: '#2A2420',
  text: '#F5EDE6',
  textMuted: '#B0A090',
  textSubtle: '#706050',
  accent: '#E07A4A',
  fab: '#D4653A',
  line: 'rgba(176, 160, 144, 0.2)',
  favorite: '#F0C060',
  headerIllustration: '#100E0C',
  illustration: {
    sky: ['#100E0C', '#2A1810', '#3A2015'],
    ground: '#0C0A08',
    orb: 'rgba(255,180,100,0.7)',
    mountain: '#1A120E',
  },
});

const forestNight = pack({
  id: 'forest-night',
  name: 'Forest Night',
  category: 'dark',
  free: false,
  bg: '#0A1410',
  bgElevated: '#12241C',
  bgCard: '#163028',
  text: '#E8F5EC',
  textMuted: '#7AAA90',
  textSubtle: '#4A7060',
  accent: '#3DBF7A',
  fab: '#2EA86A',
  line: 'rgba(122, 170, 144, 0.2)',
  headerIllustration: '#081210',
  illustration: {
    sky: ['#081210', '#0E2418', '#143820'],
    ground: '#06100C',
    orb: 'rgba(200,255,220,0.75)',
    mountain: '#0C2018',
  },
});

const slateInk = pack({
  id: 'slate-ink',
  name: 'Slate Ink',
  category: 'dark',
  free: true,
  bg: '#12151C',
  bgElevated: '#1C222C',
  bgCard: '#242B38',
  text: '#F0F2F5',
  textMuted: '#9AA3B5',
  textSubtle: '#5A6478',
  accent: '#6B8CFF',
  fab: '#5B7CFF',
  line: 'rgba(154, 163, 181, 0.2)',
  headerIllustration: '#0E1118',
  illustration: {
    sky: ['#0E1118', '#1A2030', '#243048'],
    ground: '#0A0C12',
    orb: 'rgba(200,210,255,0.8)',
    mountain: '#141A28',
  },
});

// ─── HOT ────────────────────────────────────────────────────────────────────

const auroraGlow = pack({
  id: 'aurora-glow',
  name: 'Aurora Glow',
  category: 'hot',
  free: true,
  bg: '#0E1528',
  bgElevated: '#1A2240',
  bgCard: '#1E2850',
  text: '#FFFFFF',
  textMuted: '#A8B8E0',
  textSubtle: '#6E7EAE',
  accent: '#7B8CFF',
  accentSoft: 'rgba(123, 140, 255, 0.2)',
  fab: '#8B5CF6',
  line: 'rgba(168, 184, 224, 0.2)',
  headerIllustration: '#121a33',
  illustration: {
    sky: ['#121a33', '#1a2050', '#2a1860'],
    ground: '#0A1020',
    orb: 'rgba(180,160,255,0.85)',
    mountain: '#141830',
  },
});

const cherryNeon = pack({
  id: 'cherry-neon',
  name: 'Cherry Neon',
  category: 'hot',
  free: true,
  bg: '#180818',
  bgElevated: '#2A1028',
  bgCard: '#341530',
  text: '#FFE8F4',
  textMuted: '#D090B0',
  textSubtle: '#805070',
  accent: '#FF5A9A',
  fab: '#F43F8A',
  line: 'rgba(208, 144, 176, 0.22)',
  favorite: '#FFD060',
  headerIllustration: '#120612',
  illustration: {
    sky: ['#120612', '#2A1030', '#4A1848'],
    ground: '#0E050E',
    orb: 'rgba(255,120,180,0.7)',
    mountain: '#201018',
  },
});

const sunsetPeak = pack({
  id: 'sunset-peak',
  name: 'Sunset Peak',
  category: 'hot',
  free: true,
  bg: '#1A1018',
  bgElevated: '#2A1824',
  bgCard: '#342030',
  text: '#FFF0E8',
  textMuted: '#D0A090',
  textSubtle: '#807060',
  accent: '#FF7A45',
  fab: '#F06540',
  line: 'rgba(208, 160, 144, 0.22)',
  headerIllustration: '#140C12',
  illustration: {
    sky: ['#140C12', '#3A1828', '#6A2830'],
    ground: '#100810',
    orb: 'rgba(255,200,120,0.85)',
    mountain: '#281018',
  },
});

const indigoBloom = pack({
  id: 'indigo-bloom',
  name: 'Indigo Bloom',
  category: 'hot',
  free: false,
  bg: '#10081C',
  bgElevated: '#1C1030',
  bgCard: '#241840',
  text: '#F0E8FF',
  textMuted: '#A890D0',
  textSubtle: '#685898',
  accent: '#A78BFA',
  fab: '#8B5CF6',
  line: 'rgba(168, 144, 208, 0.22)',
  headerIllustration: '#0C0618',
  illustration: {
    sky: ['#0C0618', '#1A1040', '#301860'],
    ground: '#080412',
    orb: 'rgba(200,160,255,0.8)',
    mountain: '#180C30',
  },
});

const violetStorm = pack({
  id: 'violet-storm',
  name: 'Violet Storm',
  category: 'hot',
  free: true,
  bg: '#120E20',
  bgElevated: '#1C1630',
  bgCard: '#261E40',
  text: '#F2ECFF',
  textMuted: '#B0A0D8',
  textSubtle: '#7060A0',
  accent: '#C084FC',
  fab: '#A855F7',
  line: 'rgba(176, 160, 216, 0.2)',
  headerIllustration: '#0E0A18',
  illustration: {
    sky: ['#0E0A18', '#201040', '#302060'],
    ground: '#0A0814',
    orb: 'rgba(220,180,255,0.75)',
    mountain: '#181028',
  },
});

const coralNight = pack({
  id: 'coral-night',
  name: 'Coral Night',
  category: 'hot',
  free: true,
  bg: '#181018',
  bgElevated: '#281820',
  bgCard: '#322028',
  text: '#FFF0EC',
  textMuted: '#D0A0A0',
  textSubtle: '#806068',
  accent: '#FF6B6B',
  fab: '#EF4444',
  line: 'rgba(208, 160, 160, 0.22)',
  headerIllustration: '#120C12',
  illustration: {
    sky: ['#120C12', '#301820', '#582028'],
    ground: '#0E080C',
    orb: 'rgba(255,160,140,0.75)',
    mountain: '#201018',
  },
});

const goldenHorizon = pack({
  id: 'golden-horizon',
  name: 'Golden Horizon',
  category: 'hot',
  free: false,
  bg: '#18140C',
  bgElevated: '#282018',
  bgCard: '#342818',
  text: '#FFF8E8',
  textMuted: '#C8B080',
  textSubtle: '#807050',
  accent: '#F5B942',
  fab: '#E5A820',
  line: 'rgba(200, 176, 128, 0.22)',
  favorite: '#FFD060',
  headerIllustration: '#12100A',
  illustration: {
    sky: ['#12100A', '#2A2010', '#4A3018'],
    ground: '#0E0C08',
    orb: 'rgba(255,220,120,0.9)',
    mountain: '#201808',
  },
});

const fireworkFerris = pack({
  id: 'firework-ferris',
  name: 'Ferris Night',
  category: 'hot',
  free: true,
  bg: '#0C1028',
  bgElevated: '#161C40',
  bgCard: '#1C2450',
  text: '#E8ECFF',
  textMuted: '#98A8E0',
  textSubtle: '#5868A8',
  accent: '#818CF8',
  fab: '#6366F1',
  line: 'rgba(152, 168, 224, 0.22)',
  headerIllustration: '#080C20',
  illustration: {
    sky: ['#080C20', '#1A1050', '#3A1880'],
    ground: '#060818',
    orb: 'rgba(255,200,255,0.7)',
    mountain: '#101030',
  },
});

// ─── LIGHT ──────────────────────────────────────────────────────────────────

const softDawn = pack({
  id: 'soft-dawn',
  name: 'Soft Dawn',
  category: 'light',
  free: true,
  bg: '#F4F7FB',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  text: '#0F203D',
  textMuted: '#5A7B9A',
  textSubtle: '#8BA3C7',
  accent: '#4A90E2',
  accentSoft: 'rgba(74, 144, 226, 0.12)',
  fab: '#3B82F6',
  line: 'rgba(15, 32, 61, 0.1)',
  danger: '#C94B4B',
  favorite: '#D4A017',
  headerIllustration: '#C5D8F0',
  illustration: {
    sky: ['#D0E4F8', '#E8F0FA', '#F4F7FB'],
    ground: '#B8D0E8',
    orb: 'rgba(255,240,200,0.95)',
    mountain: '#A0B8D0',
  },
});

const paperSage = pack({
  id: 'paper-sage',
  name: 'Paper Sage',
  category: 'light',
  free: true,
  bg: '#F2F5F0',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  text: '#1A2A20',
  textMuted: '#5A7A65',
  textSubtle: '#8AA895',
  accent: '#4A9B6A',
  fab: '#3D8B5A',
  line: 'rgba(26, 42, 32, 0.1)',
  danger: '#C94B4B',
  favorite: '#C9A227',
  headerIllustration: '#C8DCC8',
  illustration: {
    sky: ['#C8DCC8', '#E0ECD8', '#F2F5F0'],
    ground: '#A8C8A8',
    orb: 'rgba(255,250,220,0.9)',
    mountain: '#90B890',
  },
});

const creamRose = pack({
  id: 'cream-rose',
  name: 'Cream Rose',
  category: 'light',
  free: true,
  bg: '#FBF5F6',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  text: '#2A1820',
  textMuted: '#8A6070',
  textSubtle: '#B890A0',
  accent: '#E86A8A',
  fab: '#DB5A7A',
  line: 'rgba(42, 24, 32, 0.1)',
  danger: '#C94B4B',
  favorite: '#D4A017',
  headerIllustration: '#F0D0D8',
  illustration: {
    sky: ['#F0D0D8', '#F8E8EC', '#FBF5F6'],
    ground: '#E8C0C8',
    orb: 'rgba(255,230,220,0.95)',
    mountain: '#D8A8B0',
  },
});

const cloudySky = pack({
  id: 'cloudy-sky',
  name: 'Cloudy Sky',
  category: 'light',
  free: true,
  bg: '#F0F4F8',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  text: '#1A2838',
  textMuted: '#5A7088',
  textSubtle: '#90A0B0',
  accent: '#5B9BD5',
  fab: '#4A8AC4',
  line: 'rgba(26, 40, 56, 0.1)',
  danger: '#C94B4B',
  favorite: '#D4A017',
  headerIllustration: '#C8D8E8',
  illustration: {
    sky: ['#B0C8E0', '#D0E0F0', '#F0F4F8'],
    ground: '#A0B8D0',
    orb: 'rgba(255,255,255,0.9)',
    mountain: '#90A8C0',
  },
});

const mintBreeze = pack({
  id: 'mint-breeze',
  name: 'Mint Breeze',
  category: 'light',
  free: false,
  bg: '#F0F8F6',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  text: '#103028',
  textMuted: '#4A8070',
  textSubtle: '#80B0A0',
  accent: '#2AB89A',
  fab: '#20A888',
  line: 'rgba(16, 48, 40, 0.1)',
  danger: '#C94B4B',
  favorite: '#D4A017',
  headerIllustration: '#B8E0D4',
  illustration: {
    sky: ['#B8E0D4', '#D8F0E8', '#F0F8F6'],
    ground: '#98D0C0',
    orb: 'rgba(255,250,230,0.9)',
    mountain: '#80C0B0',
  },
});

const lavenderMilk = pack({
  id: 'lavender-milk',
  name: 'Lavender Milk',
  category: 'light',
  free: true,
  bg: '#F6F4FB',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  text: '#1C1830',
  textMuted: '#6A6090',
  textSubtle: '#A098C0',
  accent: '#8B7CF8',
  fab: '#7C6CF0',
  line: 'rgba(28, 24, 48, 0.1)',
  danger: '#C94B4B',
  favorite: '#D4A017',
  headerIllustration: '#D8D0F0',
  illustration: {
    sky: ['#D8D0F0', '#EBE8F8', '#F6F4FB'],
    ground: '#C0B8E0',
    orb: 'rgba(255,255,255,0.95)',
    mountain: '#B0A8D0',
  },
});

const sunshinePage = pack({
  id: 'sunshine-page',
  name: 'Sunshine Page',
  category: 'light',
  free: true,
  bg: '#FFFBF0',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  text: '#2A2410',
  textMuted: '#8A7850',
  textSubtle: '#B8A880',
  accent: '#E8A820',
  fab: '#D89810',
  line: 'rgba(42, 36, 16, 0.1)',
  danger: '#C94B4B',
  favorite: '#E8A820',
  headerIllustration: '#F8E8B0',
  illustration: {
    sky: ['#F8E8B0', '#FFF4D0', '#FFFBF0'],
    ground: '#E8D890',
    orb: 'rgba(255,220,100,0.95)',
    mountain: '#D8C870',
  },
});

export const THEME_CATALOG: ThemePack[] = [
  nightMountain,
  midnightOcean,
  charcoalEmber,
  forestNight,
  slateInk,
  auroraGlow,
  cherryNeon,
  sunsetPeak,
  indigoBloom,
  violetStorm,
  coralNight,
  goldenHorizon,
  fireworkFerris,
  softDawn,
  paperSage,
  creamRose,
  cloudySky,
  mintBreeze,
  lavenderMilk,
  sunshinePage,
];

export const DEFAULT_THEME_ID = nightMountain.id;

export function getThemeById(id: string | null | undefined): ThemePack {
  return THEME_CATALOG.find((t) => t.id === id) ?? nightMountain;
}

export function getThemesByCategory(category: ThemeCategory): ThemePack[] {
  return THEME_CATALOG.filter((t) => t.category === category);
}
