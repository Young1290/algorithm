/**
 * Firebase configuration and initialization
 * Uses Firebase JS SDK for Expo Go compatibility
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
    getAuth,
    // @ts-expect-error - getReactNativePersistence is available in react-native environment
    getReactNativePersistence,
    initializeAuth,
    type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Log Firebase config status (without exposing sensitive data)
console.log('🔥 Firebase Config Status:');
console.log('  API Key:', firebaseConfig.apiKey ? '✅ Set' : '❌ Missing');
console.log('  Project ID:', firebaseConfig.projectId || '❌ Missing');
console.log('  Auth Domain:', firebaseConfig.authDomain ? '✅ Set' : '❌ Missing');

// Initialize Firebase app (singleton pattern) with error handling
let app: FirebaseApp;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Initialize Auth with React Native persistence
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // Auth already initialized, get existing instance
  auth = getAuth(app);
}

// Initialize Firestore
const db: Firestore = getFirestore(app);

export { app, auth, db };
