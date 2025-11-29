import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native'; // 1. 引入 Platform

import en from './locales/en.json';
import zh from './locales/zh.json';

const LANGUAGE_STORAGE_KEY = 'user-language';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
};

// Get the device language
const getDeviceLanguage = () => {
  // Expo Localization 在服务端可能返回空，做个防护
  const locales = Localization.getLocales();
  const locale = locales && locales[0] ? locales[0] : { languageCode: 'zh' };
  const languageCode = locale.languageCode || 'zh';

  if (languageCode.startsWith('en')) {
    return 'en';
  }
  return 'zh';
};

// Initialize i18n
const initI18n = async () => {
  let savedLanguage = null;

  // 2. 关键修复：只有在非 Web 端，或者 Web 端的浏览器环境下(有 window)，才读取存储
  // 服务器端构建时 (window is undefined)，跳过这一步，防止报错
  if (Platform.OS !== 'web' || typeof window !== 'undefined') {
    try {
      savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  }

  // 如果是服务器端，savedLanguage 为 null，这里会使用设备语言或默认 'zh'
  const language = savedLanguage || getDeviceLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: language,
      fallbackLng: 'zh',
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: 'v4',
      // 3. 建议添加：在 React Native 中不检测 DOM
      react: {
        useSuspense: false,
      },
    });
};

// 立即执行初始化
initI18n();

// Function to change language and persist it
export const changeLanguage = async (language: string) => {
  try {
    // 4. 同样保护写入操作
    if (Platform.OS !== 'web' || typeof window !== 'undefined') {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export default i18n;