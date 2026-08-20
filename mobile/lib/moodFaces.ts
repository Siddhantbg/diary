/**
 * Mood faces — glossy sticker set (16 yellow emoji faces).
 * Mood ids stay 1–10 (API).
 */
import { ImageSourcePropType } from 'react-native';

const S01 = require('../assets/images/sticker-faces/face-01-grin-closed.png');
const S02 = require('../assets/images/sticker-faces/face-02-grin-open.png');
const S03 = require('../assets/images/sticker-faces/face-03-calm.png');
const S04 = require('../assets/images/sticker-faces/face-04-sleepy.png');
const S05 = require('../assets/images/sticker-faces/face-05-sad.png');
const S06 = require('../assets/images/sticker-faces/face-06-crying.png');
const S07 = require('../assets/images/sticker-faces/face-07-angry.png');
const S08 = require('../assets/images/sticker-faces/face-08-heart-eyes.png');
const S09 = require('../assets/images/sticker-faces/face-09-thinking.png');
const S10 = require('../assets/images/sticker-faces/face-10-cool.png');
const S11 = require('../assets/images/sticker-faces/face-11-party.png');
const S12 = require('../assets/images/sticker-faces/face-12-halo.png');
const S13 = require('../assets/images/sticker-faces/face-13-wink.png');
const S14 = require('../assets/images/sticker-faces/face-14-wink-tongue.png');
const S15 = require('../assets/images/sticker-faces/face-15-star-eyes.png');
const S16 = require('../assets/images/sticker-faces/face-16-hearts.png');

const STICKERS: ImageSourcePropType[] = [
  S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S15, S16,
];

/**
 * Mood id 1–10 → glossy sticker index.
 * Labels: Meh, Happy, Glad, Loved, Playful, Amazed, Angry, Down, Sad, Sobbing.
 */
const MOOD_TO_STICKER: Record<number, number> = {
  1: 8, // Meh — thinking
  2: 0, // Happy — grin, eyes closed
  3: 1, // Glad — grin, eyes open
  4: 7, // Loved — heart eyes
  5: 13, // Playful — wink + tongue
  6: 14, // Amazed — star eyes
  7: 6, // Angry
  8: 2, // Down — calm / low
  9: 4, // Sad
  10: 5, // Sobbing — crying
};

export function moodFaceSource(mood: number | null | undefined): ImageSourcePropType {
  if (mood && MOOD_TO_STICKER[mood] != null) {
    return STICKERS[MOOD_TO_STICKER[mood]];
  }
  return S03;
}

export const MOOD_FACE_COLORS = [
  '',
  '#E8C84A',
  '#F0C14A',
  '#F0C14A',
  '#E05A5A',
  '#F07BA9',
  '#5BA8EA',
  '#E07040',
  '#E8C84A',
  '#6A8FD8',
  '#5BA8EA',
] as const;
