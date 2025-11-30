import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/i18n';

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const handleLanguageChange = async (lang: string) => {
    await changeLanguage(lang);
  };

  return (
    <View className="flex-row rounded-lg border p-0.5 bg-default-200 border-default-300">
      <TouchableOpacity
        className={`px-3 py-1.5 rounded-md min-w-[50px] items-center ${
          currentLanguage === 'en' ? 'bg-primary' : ''
        }`}
        onPress={() => handleLanguageChange('en')}
        activeOpacity={0.7}
      >
        <Text
          className={`text-sm font-semibold ${
            currentLanguage === 'en' ? 'text-white' : 'text-default-500'
          }`}
        >
          EN
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`px-3 py-1.5 rounded-md min-w-[50px] items-center ${
          currentLanguage === 'zh' ? 'bg-primary' : ''
        }`}
        onPress={() => handleLanguageChange('zh')}
        activeOpacity={0.7}
      >
        <Text
          className={`text-sm font-semibold ${
            currentLanguage === 'zh' ? 'text-white' : 'text-default-500'
          }`}
        >
          中文
        </Text>
      </TouchableOpacity>
    </View>
  );
}
