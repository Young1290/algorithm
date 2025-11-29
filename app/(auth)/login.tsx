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
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

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
      // Navigation happens automatically via auth state change
    } catch (error: any) {
      Alert.alert('Error', 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isSignUp
            ? 'Sign up to sync your conversations'
            : 'Sign in to continue'}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!isLoading}
          />

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>
              or
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.googleButtonText, { color: colors.text }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={isLoading}
          style={styles.switchButton}
        >
          <Text style={[styles.switchText, { color: colors.textSecondary }]}>
            {isSignUp
              ? 'Already have an account? '
              : "Don't have an account? "}
            <Text style={{ color: colors.accent, fontWeight: '600' }}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 24,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
