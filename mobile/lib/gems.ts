/**
 * Gem catalog — 18 cuts from the gem sheet.
 * Custom legends still map gems; Entry / Cherished use sticker faces.
 */
import { ImageSourcePropType } from 'react-native';
import {
  DEFAULT_CHERISHED_FACE,
  DEFAULT_ENTRY_FACE,
  stickerFaceById,
} from '@/lib/stickerFaces';

const G01 = require('../assets/images/gems/gem-01-amethyst-emerald.png');
const G02 = require('../assets/images/gems/gem-02-sky-octagon.png');
const G03 = require('../assets/images/gems/gem-03-citrine-kite.png');
const G04 = require('../assets/images/gems/gem-04-amber-octagon.png');
const G05 = require('../assets/images/gems/gem-05-seafoam-oval.png');
const G06 = require('../assets/images/gems/gem-06-sapphire-star.png');
const G07 = require('../assets/images/gems/gem-07-lime-trilliant.png');
const G08 = require('../assets/images/gems/gem-08-rust-octagon.png');
const G09 = require('../assets/images/gems/gem-09-cobalt-pentagon.png');
const G10 = require('../assets/images/gems/gem-10-lilac-spike.png');
const G11 = require('../assets/images/gems/gem-11-rose-oval.png');
const G12 = require('../assets/images/gems/gem-12-gold-needle.png');
const G13 = require('../assets/images/gems/gem-13-aqua-shield.png');
const G14 = require('../assets/images/gems/gem-14-tangerine-diamond.png');
const G15 = require('../assets/images/gems/gem-15-lavender-oval.png');
const G16 = require('../assets/images/gems/gem-16-fire-starburst.png');
const G17 = require('../assets/images/gems/gem-17-jade-pear.png');
const G18 = require('../assets/images/gems/gem-18-teal-hex.png');

export type GemDef = {
  id: string;
  name: string;
  source: ImageSourcePropType;
  /** Suggested accent when assigning this gem */
  tint: string;
};

export const GEMS: GemDef[] = [
  { id: 'gem-01', name: 'Amethyst', source: G01, tint: '#B8A0D8' },
  { id: 'gem-02', name: 'Sky', source: G02, tint: '#8BB8D8' },
  { id: 'gem-03', name: 'Citrine', source: G03, tint: '#E8C84A' },
  { id: 'gem-04', name: 'Amber', source: G04, tint: '#E89848' },
  { id: 'gem-05', name: 'Seafoam', source: G05, tint: '#7BC4B0' },
  { id: 'gem-06', name: 'Sapphire', source: G06, tint: '#6A8FD8' },
  { id: 'gem-07', name: 'Lime', source: G07, tint: '#A8C84A' },
  { id: 'gem-08', name: 'Rust', source: G08, tint: '#D07048' },
  { id: 'gem-09', name: 'Cobalt', source: G09, tint: '#4A88C8' },
  { id: 'gem-10', name: 'Lilac', source: G10, tint: '#B898D0' },
  { id: 'gem-11', name: 'Rose', source: G11, tint: '#E8A0B8' },
  { id: 'gem-12', name: 'Gold needle', source: G12, tint: '#E8C850' },
  { id: 'gem-13', name: 'Aqua shield', source: G13, tint: '#78B8D8' },
  { id: 'gem-14', name: 'Tangerine', source: G14, tint: '#E88840' },
  { id: 'gem-15', name: 'Lavender', source: G15, tint: '#C0A0D8' },
  { id: 'gem-16', name: 'Fire', source: G16, tint: '#E07040' },
  { id: 'gem-17', name: 'Jade', source: G17, tint: '#90C060' },
  { id: 'gem-18', name: 'Teal hex', source: G18, tint: '#4A9088' },
];

export const DEFAULT_ENTRY_GEM = DEFAULT_ENTRY_FACE;
export const DEFAULT_CHERISHED_GEM = DEFAULT_CHERISHED_FACE;

export function gemById(id: string | null | undefined): GemDef | null {
  if (!id) return null;
  const gem = GEMS.find((g) => g.id === id);
  if (gem) return gem;
  const face = stickerFaceById(id);
  if (!face) return null;
  return { id: face.id, name: face.name, source: face.source, tint: face.tint };
}

export function gemSource(id: string | null | undefined): ImageSourcePropType | null {
  return gemById(id)?.source ?? null;
}
