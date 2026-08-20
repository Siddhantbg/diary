/**
 * Custom illustrated faces (20-pack) — used for Entry / Cherished markers.
 */
import { ImageSourcePropType } from 'react-native';

const P01 = require('../assets/images/moods/mood-face-01.png');
const P02 = require('../assets/images/moods/mood-face-02.png');
const P03 = require('../assets/images/moods/mood-face-03.png');
const P04 = require('../assets/images/moods/mood-face-04.png');
const P05 = require('../assets/images/moods/mood-face-05.png');
const P06 = require('../assets/images/moods/mood-face-06.png');
const P07 = require('../assets/images/moods/mood-face-07.png');
const P08 = require('../assets/images/moods/mood-face-08.png');
const P09 = require('../assets/images/moods/mood-face-09.png');
const P10 = require('../assets/images/moods/mood-face-10.png');
const P11 = require('../assets/images/moods/mood-face-11.png');
const P12 = require('../assets/images/moods/mood-face-12.png');
const P13 = require('../assets/images/moods/mood-face-13.png');
const P14 = require('../assets/images/moods/mood-face-14.png');
const P15 = require('../assets/images/moods/mood-face-15.png');
const P16 = require('../assets/images/moods/mood-face-16.png');
const P17 = require('../assets/images/moods/mood-face-17.png');
const P18 = require('../assets/images/moods/mood-face-18.png');
const P19 = require('../assets/images/moods/mood-face-19.png');
const P20 = require('../assets/images/moods/mood-face-20.png');

export type StickerFace = {
  id: string;
  name: string;
  source: ImageSourcePropType;
  tint: string;
};

export const STICKER_FACES: StickerFace[] = [
  { id: 'face-01', name: 'Glad', source: P01, tint: '#D89058' },
  { id: 'face-02', name: 'Playful', source: P02, tint: '#E8C050' },
  { id: 'face-03', name: 'Down', source: P03, tint: '#5888D0' },
  { id: 'face-04', name: 'Soft', source: P04, tint: '#E08898' },
  { id: 'face-05', name: 'Bright', source: P05, tint: '#E8C050' },
  { id: 'face-06', name: 'Shy', source: P06, tint: '#E08898' },
  { id: 'face-07', name: 'Cool', source: P07, tint: '#4A88C8' },
  { id: 'face-08', name: 'Spark', source: P08, tint: '#E8C050' },
  { id: 'face-09', name: 'Quiet', source: P09, tint: '#8BA3C7' },
  { id: 'face-10', name: 'Tear', source: P10, tint: '#D88038' },
  { id: 'face-11', name: 'Loved', source: P11, tint: '#E08898' },
  { id: 'face-12', name: 'Wink', source: P12, tint: '#E8C050' },
  { id: 'face-13', name: 'Calm', source: P13, tint: '#7BC4B0' },
  { id: 'face-14', name: 'Meh', source: P14, tint: '#D05070' },
  { id: 'face-15', name: 'Mad', source: P15, tint: '#E07040' },
  { id: 'face-16', name: 'Sweet', source: P16, tint: '#F07BA9' },
  { id: 'face-17', name: 'Amazed', source: P17, tint: '#D05070' },
  { id: 'face-18', name: 'Happy', source: P18, tint: '#E8C050' },
  { id: 'face-19', name: 'Warm', source: P19, tint: '#E89848' },
  { id: 'face-20', name: 'Sobbing', source: P20, tint: '#D89058' },
];

/** Default diary-day marker. */
export const DEFAULT_ENTRY_FACE = 'face-01';
/** Default cherished marker (heart-eyes from this pack). */
export const DEFAULT_CHERISHED_FACE = 'face-11';

export function stickerFaceById(id: string | null | undefined): StickerFace | null {
  if (!id) return null;
  return STICKER_FACES.find((f) => f.id === id) ?? null;
}

export function stickerFaceSource(id: string | null | undefined): ImageSourcePropType | null {
  return stickerFaceById(id)?.source ?? null;
}

export function isStickerFaceId(id: string | null | undefined): boolean {
  return !!id && id.startsWith('face-');
}
