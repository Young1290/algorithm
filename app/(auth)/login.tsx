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

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
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
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
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
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text className="text-base text-center mb-8 text-slate-500">
          {isSignUp
            ? 'Sign up to sync your conversations'
            : 'Sign in to continue'}
        </Text>

        <View className="gap-4">
          <TextInput
            className="border rounded-2xl p-4 text-base text-slate-800 bg-slate-50 border-slate-200"
            placeholder="Email"
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
            placeholder="Password"
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
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center my-2">
            <View className="flex-1 h-px bg-slate-200" />
            <Text className="px-4 text-sm text-slate-400">or</Text>
            <View className="flex-1 h-px bg-slate-200" />
          </View>

          <TouchableOpacity
            className="border p-4 rounded-2xl items-center justify-center min-h-[52px] bg-slate-50 border-slate-200"
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text className="text-base font-semibold text-slate-800">
              Continue with Google
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={isLoading}
          className="mt-6"
        >
          <Text className="text-center text-sm text-slate-500">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text className="text-blue-500 font-semibold">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getErrorMessage(code: string): string {
  const errorMap: Record<string, string> = {
    'auth/invalid-email': 'Please enter a valid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account already exists with this email',
    'auth/weak-password': 'Password must be at least 6 characters',
    'auth/too-many-requests': 'Too many attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/invalid-credential': 'Invalid email or password',
  };

  return errorMap[code] || 'An error occurred. Please try again.';
}
