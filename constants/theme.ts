/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#60a5fa';

export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#f1f5f9',
    tint: tintColorLight,
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    userMessage: '#f1f5f9',
    aiMessage: '#ffffff',
    input: '#ffffff',
    inputBorder: '#e2e8f0',
    accent: '#0a7ea4',
    accentHover: '#0369a1',
  },
  dark: {
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',
    tint: tintColorDark,
    border: '#334155',
    borderLight: '#1e293b',
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    userMessage: '#1e293b',
    aiMessage: '#0f172a',
    input: '#1e293b',
    inputBorder: '#334155',
    accent: '#60a5fa',
    accentHover: '#3b82f6',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Prose styles for markdown rendering
 * Inspired by Tailwind's prose classes for beautiful typography
 */
export const getProseStyles = (isDark: boolean) => {
  const colors = isDark ? Colors.dark : Colors.light;

  return {
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 24,
    },
    heading1: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700' as const,
      marginTop: 0,
      marginBottom: 16,
    },
    heading2: {
      color: colors.text,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '700' as const,
      marginTop: 24,
      marginBottom: 12,
    },
    heading3: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as const,
      marginTop: 20,
      marginBottom: 8,
    },
    heading4: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 16,
      color: colors.text,
      fontSize: 15,
      lineHeight: 24,
    },
    strong: {
      fontWeight: '600' as const,
      color: colors.text,
    },
    em: {
      fontStyle: 'italic' as const,
      color: colors.text,
    },
    code_inline: {
      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
      color: isDark ? '#e879f9' : '#db2777',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: Fonts?.mono || 'monospace',
    },
    code_block: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts?.mono || 'monospace',
      color: colors.text,
    },
    fence: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts?.mono || 'monospace',
      color: colors.text,
    },
    blockquote: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginVertical: 12,
      fontStyle: 'italic' as const,
    },
    bullet_list: {
      marginVertical: 8,
    },
    ordered_list: {
      marginVertical: 8,
    },
    list_item: {
      marginVertical: 4,
      flexDirection: 'row' as const,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginVertical: 12,
      overflow: 'hidden' as const,
    },
    thead: {
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    },
    th: {
      padding: 12,
      fontWeight: '600' as const,
      borderBottomWidth: 2,
      borderBottomColor: colors.border,
      borderRightWidth: 1,
      borderRightColor: colors.borderLight,
    },
    tr: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    td: {
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: colors.borderLight,
    },
    link: {
      color: colors.accent,
      textDecorationLine: 'underline' as const,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 16,
    },
  };
};
