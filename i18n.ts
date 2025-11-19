import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import zh from './locales/zh.json';

const LANGUAGE_STORAGE_KEY = 'user-language';

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

// Get the device language
const getDeviceLanguage = () => {
  const locale = Localization.getLocales()[0];
  const languageCode = locale?.languageCode || 'en';

  // Map language codes to our supported languages
  if (languageCode.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
};

// Initialize i18n
const initI18n = async () => {
  let savedLanguage = null;

  try {
    savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.error('Error loading saved language:', error);
  }

  const language = savedLanguage || getDeviceLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: 'v4',
    });
};

initI18n();

// Function to change language and persist it
export const changeLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export default i18n;
