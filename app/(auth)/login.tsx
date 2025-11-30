/**
 * Login Screen
 * Handles email/password and Google OAuth authentication
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const { t } = useTranslation();

  const getErrorMessage = (code: string): string => {
    const errorMap: Record<string, string> = {
      'auth/invalid-email': t('auth.errors.invalidEmail'),
      'auth/user-disabled': t('auth.errors.userDisabled'),
      'auth/user-not-found': t('auth.errors.userNotFound'),
      'auth/wrong-password': t('auth.errors.wrongPassword'),
      'auth/email-already-in-use': t('auth.errors.emailInUse'),
      'auth/weak-password': t('auth.errors.weakPassword'),
      'auth/too-many-requests': t('auth.errors.tooManyRequests'),
      'auth/network-request-failed': t('auth.errors.networkError'),
      'auth/invalid-credential': t('auth.errors.invalidCredential'),
    };
    return errorMap[code] || t('auth.errors.default');
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('auth.error'), t('auth.enterBothFields'));
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      const message = getErrorMessage(error.code || error.message);
      Alert.alert(t('auth.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert(t('auth.error'), t('auth.googleSignInFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center p-6 max-w-[400px] w-full self-center">
        <Text className="text-3xl font-bold text-center mb-2 text-slate-800">
          {isSignUp ? t('auth.createAccount') : t('auth.welcomeBack')}
        </Text>
        <Text className="text-base text-center mb-8 text-slate-500">
          {isSignUp
            ? t('auth.signUpSubtitle')
            : t('auth.signInSubtitle')}
        </Text>

        <View className="gap-4">
          <TextInput
            className="border rounded-2xl p-4 text-base text-slate-800 bg-slate-50 border-slate-200"
            placeholder={t('auth.email')}
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!isLoading}
          />

          <TextInput
            className="border rounded-2xl p-4 text-base text-slate-800 bg-slate-50 border-slate-200"
            placeholder={t('auth.password')}
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            editable={!isLoading}
          />

          <TouchableOpacity
            className="p-4 rounded-2xl items-center justify-center min-h-[52px] bg-blue-500"
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-semibold">
                {isSignUp ? t('auth.signUp') : t('auth.signIn')}
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-2">
            <View className="flex-1 h-px bg-slate-200" />
            <Text className="px-4 text-sm text-slate-400">{t('auth.or')}</Text>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          <TouchableOpacity
            className="border p-4 rounded-2xl items-center justify-center min-h-[52px] bg-slate-50 border-slate-200"
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text className="text-base font-semibold text-slate-800">
              {t('auth.continueWithGoogle')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={isLoading}
          className="mt-6"
        >
          <Text className="text-center text-sm text-slate-500">
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
            <Text className="text-blue-500 font-semibold">
              {isSignUp ? t('auth.signIn') : t('auth.signUp')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
