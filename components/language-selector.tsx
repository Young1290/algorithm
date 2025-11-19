import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { changeLanguage } from '@/i18n';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
      <TouchableOpacity
        style={[
          styles.button,
          currentLanguage === 'en' && {
            backgroundColor: colors.accent,
          },
        ]}
        onPress={() => handleLanguageChange('en')}
        activeOpacity={0.7}
      >
        <ThemedText
          style={[
            styles.buttonText,
            { color: currentLanguage === 'en' ? '#fff' : colors.textSecondary },
          ]}
        >
          EN
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          currentLanguage === 'zh' && {
            backgroundColor: colors.accent,
          },
        ]}
        onPress={() => handleLanguageChange('zh')}
        activeOpacity={0.7}
      >
        <ThemedText
          style={[
            styles.buttonText,
            { color: currentLanguage === 'zh' ? '#fff' : colors.textSecondary },
          ]}
        >
          中文
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
