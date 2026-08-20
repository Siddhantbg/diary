import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  color?: string;
  size?: number;
};

/**
 * Edit / pencil control for day header (coolicons-style affordance).
 */
export function EditIcon({ color = '#FFFFFF', size = 22 }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={{
          color,
          fontSize: size * 0.92,
          lineHeight: size,
          includeFontPadding: false,
          textAlign: 'center',
        }}
      >
        ✎
      </Text>
    </View>
  );
}
