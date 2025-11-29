import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // For web platform in production, use relative paths
  if (Platform.OS === 'web' && process.env.NODE_ENV === 'production') {
    return path; // ✅ 相对路径，例如 '/api/chat'
  }

  // For development on mobile
  if (process.env.NODE_ENV === 'development') {
    const origin = Constants.experienceUrl.replace('exp://', 'http://');
    return origin.concat(path);
  }

  // For production mobile builds, use environment variable or relative path
  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';
  return BASE_URL.concat(path);
};