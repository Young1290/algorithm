import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // For web platform, use relative paths
  if (Platform.OS === 'web') {
    return path;
  }

  // For development on mobile
  if (process.env.NODE_ENV === 'development') {
    const origin = Constants.experienceUrl.replace('exp://', 'http://');
    return origin.concat(path);
  }

  // For production mobile builds
  if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL environment variable is not defined',
    );
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
};