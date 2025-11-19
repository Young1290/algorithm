import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { changeLanguage } from '@/i18n';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {t('settings.language')}:
      </ThemedText>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            currentLanguage === 'en' && {
              backgroundColor: tintColor,
            },
          ]}
          onPress={() => handleLanguageChange('en')}
        >
          <ThemedText
            style={[
              styles.buttonText,
              currentLanguage === 'en' && { color: '#fff' },
            ]}
          >
            {t('settings.english')}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            currentLanguage === 'zh' && {
              backgroundColor: tintColor,
            },
          ]}
          onPress={() => handleLanguageChange('zh')}
        >
          <ThemedText
            style={[
              styles.buttonText,
              currentLanguage === 'zh' && { color: '#fff' },
            ]}
          >
            {t('settings.chinese')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonText: {
    fontSize: 14,
  },
});
