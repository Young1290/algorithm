/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3b82f6';
const tintColorDark = '#60a5fa';

export const Colors = {
  light: {
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    backgroundTertiary: '#eff6ff',
    tint: tintColorLight,
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    userMessage: '#3b82f6',
    userMessageText: '#ffffff',
    aiMessage: '#ffffff',
    aiMessageBorder: '#e2e8f0',
    input: '#ffffff',
    inputBorder: '#e2e8f0',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentLight: '#eff6ff',
  },
  dark: {
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#1e3a5f',
    tint: tintColorDark,
    border: '#334155',
    borderLight: '#1e293b',
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    userMessage: '#3b82f6',
    userMessageText: '#ffffff',
    aiMessage: '#1e293b',
    aiMessageBorder: '#334155',
    input: '#1e293b',
    inputBorder: '#334155',
    accent: '#60a5fa',
    accentHover: '#3b82f6',
    accentLight: '#1e3a5f',
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
export const getProseStyles = (isDark: boolean, isUserMessage: boolean = false) => {
  const colors = isDark ? Colors.dark : Colors.light;
  const textColor = isUserMessage ? '#ffffff' : colors.text;
  const secondaryColor = isUserMessage ? 'rgba(255,255,255,0.8)' : colors.textSecondary;

  return {
    body: {
      color: textColor,
      fontSize: 15,
      lineHeight: 24,
    },
    heading1: {
      color: textColor,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700' as const,
      marginTop: 0,
      marginBottom: 16,
    },
    heading2: {
      color: textColor,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '700' as const,
      marginTop: 24,
      marginBottom: 12,
    },
    heading3: {
      color: textColor,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '600' as const,
      marginTop: 20,
      marginBottom: 8,
    },
    heading4: {
      color: textColor,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 16,
      color: textColor,
      fontSize: 15,
      lineHeight: 24,
    },
    strong: {
      fontWeight: '600' as const,
      color: textColor,
    },
    em: {
      fontStyle: 'italic' as const,
      color: textColor,
    },
    code_inline: {
      backgroundColor: isUserMessage ? 'rgba(255,255,255,0.2)' : (isDark ? '#1e293b' : '#f1f5f9'),
      color: isUserMessage ? '#ffffff' : (isDark ? '#e879f9' : '#db2777'),
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: Fonts?.mono || 'monospace',
    },
    code_block: {
      backgroundColor: isUserMessage ? 'rgba(255,255,255,0.1)' : (isDark ? '#1e293b' : '#f8fafc'),
      borderWidth: 1,
      borderColor: isUserMessage ? 'rgba(255,255,255,0.2)' : colors.border,
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts?.mono || 'monospace',
      color: textColor,
    },
    fence: {
      backgroundColor: isUserMessage ? 'rgba(255,255,255,0.1)' : (isDark ? '#1e293b' : '#f8fafc'),
      borderWidth: 1,
      borderColor: isUserMessage ? 'rgba(255,255,255,0.2)' : colors.border,
      borderRadius: 8,
      padding: 12,
      marginVertical: 12,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: Fonts?.mono || 'monospace',
      color: textColor,
    },
    blockquote: {
      backgroundColor: isUserMessage ? 'rgba(255,255,255,0.1)' : (isDark ? '#1e293b' : '#f8fafc'),
      borderLeftWidth: 4,
      borderLeftColor: isUserMessage ? '#ffffff' : colors.accent,
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
      minWidth: 120,
      flexShrink: 0,
    },
    tr: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      flexDirection: 'row' as const,
    },
    td: {
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: colors.borderLight,
      minWidth: 120,
      flexShrink: 0,
    },
    text: {
      flexWrap: 'nowrap' as const,
    },
    link: {
      color: isUserMessage ? '#ffffff' : colors.accent,
      textDecorationLine: 'underline' as const,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 16,
    },
  };
};
