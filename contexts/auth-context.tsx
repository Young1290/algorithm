/**
 * Authentication Context
 * Provides auth state and methods to all components
 * Supports Email/Password and Google OAuth
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { auth } from '@/app/lib/firebase/config';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required for OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  /** Currently authenticated user */
  user: User | null;
  /** Whether auth state is being determined */
  loading: boolean;
  /** Sign in with email and password */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign up with email and password */
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  /** Sign in with Google OAuth */
  signInWithGoogle: () => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Google OAuth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  // Debug: Log the redirect URI that needs to be added to Google Cloud Console
  useEffect(() => {
    if (request?.redirectUri) {
      console.log('===========================================');
      console.log('ADD THIS REDIRECT URI TO GOOGLE CLOUD CONSOLE:');
      console.log(request.redirectUri);
      console.log('===========================================');
    }
  }, [request]);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      console.log('Google OAuth response params:', response.params);
      const { id_token, access_token } = response.params;

      // Web returns access_token, native returns id_token
      if (id_token) {
        console.log('Using id_token for auth');
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential).catch((error) => {
          console.error('Google sign-in error:', error);
        });
      } else if (access_token) {
        console.log('Using access_token for auth');
        // For web, we need to use the access token differently
        const credential = GoogleAuthProvider.credential(null, access_token);
        signInWithCredential(auth, credential).catch((error) => {
          console.error('Google sign-in error with access_token:', error);
        });
      } else {
        console.error('No id_token or access_token in response:', response.params);
      }
    } else if (response) {
      console.log('Google OAuth response type:', response.type);
    }
  }, [response]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Email sign-up error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
