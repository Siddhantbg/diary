/**
 * MyDiary design tokens — shared spacing/fonts + re-exports of theme packs.
 */

import {
  DEFAULT_THEME_ID,
  getThemeById,
  THEME_CATALOG,
  ThemePack,
  ThemeIllustration,
  ThemeCategory,
} from '@/constants/themeCatalog';

export type { ThemeIllustration, ThemePack, ThemeCategory };
export type ThemeTokens = ThemePack;

export const fonts = {
  display: 'Montserrat_600SemiBold',
  displayItalic: 'Montserrat_400Regular_Italic',
  body: 'Poppins_400Regular',
  bodyMedium: 'Poppins_600SemiBold',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export { THEME_CATALOG, DEFAULT_THEME_ID, getThemeById };

export const nightMountain = getThemeById('night-mountain');
export const softDawn = getThemeById('soft-dawn');
export const auroraGlow = getThemeById('aurora-glow');

/**
 * Backward-compatible static map used by screens still importing `colors`.
 * Mirrors the default dark theme.
 */
export const colors = {
  ink: nightMountain.text,
  inkMuted: nightMountain.textMuted,
  paper: nightMountain.bg,
  paperDeep: nightMountain.bgElevated,
  leaf: nightMountain.accent,
  leafSoft: nightMountain.accentSoft,
  accent: nightMountain.accent,
  line: nightMountain.line,
  danger: nightMountain.danger,
  white: nightMountain.white,
  favorite: nightMountain.favorite,
  bg: nightMountain.bg,
  bgElevated: nightMountain.bgElevated,
  bgCard: nightMountain.bgCard,
  text: nightMountain.text,
  textMuted: nightMountain.textMuted,
  fab: nightMountain.fab,
};
