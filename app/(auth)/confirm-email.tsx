/**
 * Email Confirmation Screen - CINEMA-GRADE 2025
 * 
 * Displays after successful registration to guide users through email verification.
 * Provides quick actions to open Gmail and proceed to login.
 * 
 * Features:
 * - Clear instructions for email verification
 * - "Open Gmail" button (deeplink to Gmail app)
 * - "Go to Login" button
 * - Resend verification email option
 * - Cinema-grade UI design
 */

import { resendVerificationEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { openInbox } from 'react-native-email-link';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConfirmEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;
  const accessToken = params.access_token as string | undefined;
  const refreshToken = params.refresh_token as string | undefined;
  const authType = params.type as string | undefined;

  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const insets = useSafeAreaInsets();

  // Handle open Gmail (opens native email app)
  const handleOpenGmail = async () => {
    try {

      // Helpful message for chooser
      const title = 'Open email app';
      const message = 'Open your email app to check the verification link in your inbox.';

  // Open the inbox using the library (it will show the chooser if necessary)
      await openInbox({ title, message });
    } catch (error) {
      console.error('Error opening email app:', error);
      // Fallback: try opening a mailto: URL — may open default mail client
      try {
        await Linking.openURL('mailto:');
      } catch (linkError) {
        console.error('Linking.openURL(mailto:) failed:', linkError);
        Alert.alert('Error', 'Could not open your email app. Please check your email manually.');
      }
    }
  };

  // Handle resend verification email
  const handleResendEmail = async () => {
    if (resendCooldown > 0) {
      Alert.alert('Please Wait', `You can resend the email in ${resendCooldown} seconds.`);
      return;
    }

    setIsResending(true);
    try {
      await resendVerificationEmail(email);
      
      Alert.alert(
        'Email Sent!',
        'A new verification email has been sent. Please check your inbox and spam folder.'
      );

      // Set cooldown (60 seconds)
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error resending email:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to resend verification email. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // Handle go to login
  const handleGoToLogin = () => {
    router.replace('/(auth)/login');
  };

  // If the app was opened via deep link with access_token & refresh_token, exchange them for a session
  useEffect(() => {
    let mounted = true;
    const trySetSessionFromParams = async () => {
      if (!accessToken || !refreshToken) return;
      try {
        // Set session explicitly for mobile environment
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Failed to set session from deep link:', error);
          return;
        }

        // Fetch user profile and save to auth store (if available)
        const session = data.session;
        const user = session?.user;
        if (mounted && user) {
          // Retrieve profile from users table
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.warn('Could not fetch user profile after confirmation:', profileError);
          }

          // Persist auth state
          await useAuthStore.getState().setAuth(profile ?? (user as any), {
            user: (profile ?? user) as any,
            accessToken: session?.access_token ?? accessToken,
            refreshToken: session?.refresh_token ?? refreshToken,
          });

          // Navigate to dashboard/home depending on role
          router.replace('/');
        }
      } catch (err) {
        console.error('Error handling deep link session:', err);
      }
    };

    trySetSessionFromParams();

    return () => {
      mounted = false;
    };
  }, [accessToken, refreshToken, router]);

  // If the confirmation link was used without returning tokens (simple confirmation redirect)
  // show a friendly message and guide user to login
  useEffect(() => {
    if (!authType) return;
    if (authType === 'signup' && !accessToken && !refreshToken) {
      Alert.alert('Email Confirmed', 'Your email has been confirmed. You can now login.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  }, [authType, accessToken, refreshToken, router]);

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} className="bg-neutral-50 dark:bg-neutral-950">
      <ScrollView className="flex-1" contentContainerClassName="px-6 py-8">
        {/* Header Icon */}
        <View className="items-center mb-8">
          <View className="bg-[#4F46E5] w-24 h-24 rounded-2xl items-center justify-center border-2 border-[#4338CA]">
            <Ionicons name="mail-unread" size={48} color="white" />
          </View>
        </View>

        {/* Title */}
        <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-0 text-center mb-4 tracking-tighter">
          Confirm Your Email
        </Text>

        {/* Subtitle */}
        <Text className="text-base text-neutral-600 dark:text-neutral-400 text-center mb-8 tracking-tight">
          We have sent a verification email to
        </Text>

        {/* Email Display */}
        <View className="bg-white dark:bg-neutral-900 rounded-2xl p-5 mb-8 border-2 border-neutral-200 dark:border-neutral-800">
          <View className="flex-row items-center justify-center">
            <Ionicons name="mail" size={20} color="#4F46E5" />
            <Text className="text-base font-bold text-neutral-900 dark:text-neutral-0 ml-3 tracking-tight">
              {email}
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View className="bg-[#EEF2FF] dark:bg-neutral-900 rounded-2xl p-6 mb-8 border-2 border-[#C7D2FE] dark:border-neutral-800">
          <View className="flex-row items-start mb-4">
            <View className="bg-[#4F46E5] w-8 h-8 rounded-lg items-center justify-center mr-3">
              <Text className="text-white font-bold text-base">1</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-0 mb-1 tracking-tight">
                Check Your Inbox
              </Text>
              <Text className="text-xs text-neutral-600 dark:text-neutral-400 tracking-tight">
                Open the email we sent you and click the verification link
              </Text>
            </View>
          </View>

          <View className="flex-row items-start mb-4">
            <View className="bg-[#4F46E5] w-8 h-8 rounded-lg items-center justify-center mr-3">
              <Text className="text-white font-bold text-base">2</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-0 mb-1 tracking-tight">
                Verify Your Account
              </Text>
              <Text className="text-xs text-neutral-600 dark:text-neutral-400 tracking-tight">
                Click the confirmation link to activate your account
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="bg-[#4F46E5] w-8 h-8 rounded-lg items-center justify-center mr-3">
              <Text className="text-white font-bold text-base">3</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-0 mb-1 tracking-tight">
                Return and Login
              </Text>
              <Text className="text-xs text-neutral-600 dark:text-neutral-400 tracking-tight">
                Come back here and tap Go to Login to sign in
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-4 mb-6">
          {/* Open Email App Button */}
          <TouchableOpacity
            onPress={handleOpenGmail}
            className="bg-[#EA4335] py-5 rounded-2xl border-2 border-[#C5221F] active:scale-95 flex-row items-center justify-center"
          >
            <Ionicons name="mail-open" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-3 tracking-tight">
              Open Email App
            </Text>
          </TouchableOpacity>

          {/* Go to Login Button */}
          <TouchableOpacity
            onPress={handleGoToLogin}
            className="bg-[#4F46E5] py-5 rounded-2xl border-2 border-[#4338CA] active:scale-95 flex-row items-center justify-center"
          >
            <Ionicons name="log-in-outline" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-3 tracking-tight">
              Go to Login
            </Text>
          </TouchableOpacity>
        </View>

        {/* Resend Email Section */}
        <View className="bg-neutral-100 dark:bg-neutral-900 rounded-2xl p-5 border-2 border-neutral-200 dark:border-neutral-800">
          <Text className="text-sm text-neutral-600 dark:text-neutral-400 text-center mb-3 tracking-tight">
            Did not receive the email?
          </Text>
          
          {resendCooldown > 0 ? (
            <View className="bg-neutral-200 dark:bg-neutral-800 py-3 rounded-xl">
              <Text className="text-neutral-500 dark:text-neutral-500 font-semibold text-center tracking-tight">
                Resend in {resendCooldown}s
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleResendEmail}
              disabled={isResending}
              className={`py-3 rounded-xl ${
                isResending
                  ? 'bg-neutral-300 dark:bg-neutral-800'
                  : 'bg-white dark:bg-neutral-850 border-2 border-neutral-300 dark:border-neutral-700 active:scale-95'
              }`}
            >
              <Text className="text-[#4F46E5] font-bold text-center tracking-tight">
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Help Text */}
        <View className="mt-8 px-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={20} color="#A3A3A3" />
            <Text className="flex-1 text-xs text-neutral-500 dark:text-neutral-500 ml-2 tracking-tight">
              Check your spam or junk folder if you do not see the email. Make sure you entered the correct email address during registration.
            </Text>
          </View>
        </View>

        {/* Support Link */}
        <View className="mt-6 items-center">
          <Text className="text-xs text-neutral-500 dark:text-neutral-500 tracking-tight">
            Need help?{' '}
            <Text className="text-[#4F46E5] font-semibold">
              Contact Support
            </Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
