import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { fonts } from '@/constants/theme';
import { MicIcon } from '@/components/editor/MicIcon';
import { GalleryIcon } from '@/components/icons/GalleryIcon';
import { TagIcon } from '@/components/icons/TagIcon';
import { LegendIcon } from '@/components/icons/LegendIcon';
import { ThemeIcon } from '@/components/icons/ThemeIcon';

export type ToolId =
  | 'background'
  | 'photos'
  | 'favorite'
  | 'mood'
  | 'title'
  | 'legend'
  | 'tags'
  | 'mic';

type Props = {
  favorite?: boolean;
  recording?: boolean;
  /** Tags panel open */
  tagsActive?: boolean;
  /** Custom legend applied */
  legendColor?: string | null;
  onPress: (id: ToolId) => void;
};

/** Bottom strip matching entry editor chrome. */
const TOOLS: { id: ToolId; icon: string; label: string }[] = [
  { id: 'background', icon: '', label: 'Themes' },
  { id: 'photos', icon: '▢', label: 'Photos' },
  { id: 'favorite', icon: '☆', label: 'Favorite' },
  { id: 'mood', icon: '☺', label: 'Mood' },
  { id: 'title', icon: 'Tt', label: 'Type' },
  { id: 'legend', icon: '', label: 'Legend' },
  { id: 'tags', icon: '', label: 'Tags' },
  { id: 'mic', icon: '', label: 'Voice note' },
];

export function EditorToolStrip({
  favorite,
  recording,
  tagsActive,
  legendColor,
  onPress,
}: Props) {
  const { tokens, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const variant = isDark ? 'dark' : 'light';

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: tokens.bgElevated,
          borderTopColor: tokens.line,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {TOOLS.map((t) => {
        const activeStar = t.id === 'favorite' && favorite;
        const activeMic = t.id === 'mic' && recording;
        const activeTags = t.id === 'tags' && tagsActive;
        const activeLegend = t.id === 'legend' && !!legendColor;
        return (
          <Pressable
            key={t.id}
            onPress={() => onPress(t.id)}
            style={[
              styles.btn,
              activeMic && { backgroundColor: 'rgba(220, 60, 60, 0.18)', borderRadius: 20 },
              activeTags && { backgroundColor: tokens.accentSoft, borderRadius: 20 },
              activeLegend && { backgroundColor: tokens.accentSoft, borderRadius: 20 },
            ]}
            accessibilityLabel={activeMic ? 'Stop recording' : t.label}
            hitSlop={6}
          >
            {t.id === 'background' ? (
              <ThemeIcon
                color={tokens.text}
                cutoutColor={tokens.bgElevated}
                variant={variant}
                size={22}
              />
            ) : t.id === 'mic' ? (
              <MicIcon variant={variant} size={22} />
            ) : t.id === 'photos' ? (
              <GalleryIcon variant={variant} size={22} />
            ) : t.id === 'tags' ? (
              <TagIcon
                variant={variant}
                color={activeTags ? tokens.accent : undefined}
                size={22}
              />
            ) : t.id === 'legend' ? (
              <LegendIcon
                variant={variant}
                color={legendColor || tokens.text}
                chipColors={
                  legendColor
                    ? [legendColor, legendColor, legendColor]
                    : undefined
                }
                size={22}
              />
            ) : (
              <Text
                style={[
                  styles.icon,
                  {
                    color: activeStar ? tokens.favorite : tokens.text,
                    fontSize: t.id === 'title' ? 17 : 20,
                  },
                ]}
              >
                {activeStar ? '★' : t.icon}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontFamily: fonts.body,
  },
});
