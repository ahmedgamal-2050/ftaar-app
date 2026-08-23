import React from 'react';
import { I18nManager, StyleSheet, Text, type TextProps } from 'react-native';
import { isolateLtr } from '../ltr';

/**
 * Wraps values that must never mirror — money amounts and lobby codes. A price
 * like "12.50 SAR" or a code like "4F2K-9B" is meaningless once bidi
 * reordering gets hold of it, so every such value goes through this component
 * rather than a plain `Text`.
 */
export function LtrText({ children, style, ...rest }: TextProps) {
  const isTextValue =
    typeof children === 'string' || typeof children === 'number';
  const content = isTextValue
    ? isolateLtr(children, I18nManager.isRTL)
    : children;

  return (
    <Text {...rest} style={[styles.ltr, style]}>
      {content}
    </Text>
  );
}

const styles = StyleSheet.create({
  ltr: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
