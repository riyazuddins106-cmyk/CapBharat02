import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register' | 'verify-otp' | 'forgot' | 'reset';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, register, verifyOtp, forgotPassword, resetPassword, resendOtp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const doLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
    setLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (!fullName || !email || !password) return Alert.alert('Error', 'Please fill in all fields');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return Alert.alert('Error', 'Enter a valid email address');
    if (password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) return Alert.alert('Error', 'Password must contain an uppercase letter');
    if (!/[0-9]/.test(password)) return Alert.alert('Error', 'Password must contain a number');
    setLoading(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password, phone: phone.trim() || undefined });
      setPendingEmail(email.trim());
      setMode('verify-otp');
    } catch (e: any) {
      Alert.alert('Registration Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  const doVerifyOtp = async () => {
    if (otp.length !== 6) return Alert.alert('Error', 'Enter the 6-digit code');
    setLoading(true);
    try {
      const purpose = mode === 'verify-otp' ? 'signup' : 'password_reset';
      await verifyOtp(pendingEmail, otp, purpose);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Invalid Code', e.message);
    } finally {
      setLoading(false);
    }
  };

  const doForgot = async () => {
    if (!email) return Alert.alert('Error', 'Enter your email address');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setPendingEmail(email.trim());
      setMode('reset');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const doReset = async () => {
    if (otp.length !== 6 || !newPassword) return Alert.alert('Error', 'Fill in all fields');
    if (newPassword.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    if (!/[A-Z]/.test(newPassword)) return Alert.alert('Error', 'Password must contain an uppercase letter');
    if (!/[0-9]/.test(newPassword)) return Alert.alert('Error', 'Password must contain a number');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    setLoading(true);
    try {
      await resetPassword(pendingEmail, otp, newPassword);
      await login(pendingEmail, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const TITLES: Record<Mode, string> = {
    login: 'Welcome back',
    register: 'Create account',
    'verify-otp': 'Verify email',
    forgot: 'Reset password',
    reset: 'New password',
  };
  const SUBTITLES: Record<Mode, string> = {
    login: 'Sign in to continue',
    register: 'Join ServeNow today',
    'verify-otp': `Enter the 6-digit code sent to\n${pendingEmail}`,
    forgot: 'We\'ll send a reset code to your email',
    reset: `Enter the code sent to ${pendingEmail}`,
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => (mode === 'login' || mode === 'register') ? router.back() : setMode(mode === 'reset' ? 'forgot' : mode === 'verify-otp' ? 'register' : 'login')}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>SN</Text>
          </View>
        </View>

        <View style={{ padding: 24, gap: 6 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{TITLES[mode]}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{SUBTITLES[mode]}</Text>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 16 }}>
          {/* Register fields */}
          {mode === 'register' && (
            <>
              <View>
                <Text style={[styles.label, { color: colors.foreground }]}>Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Arjun Mehta"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <View>
                <Text style={[styles.label, { color: colors.foreground }]}>Phone (optional)</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
            </>
          )}

          {/* Email field */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              />
            </View>
          )}

          {/* Password field */}
          {(mode === 'login' || mode === 'register') && (
            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View style={[styles.passWrap, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min 8 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPass}
                  style={[styles.passInput, { color: colors.foreground }]}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* OTP field */}
          {(mode === 'verify-otp' || mode === 'reset') && (
            <View>
              <Text style={[styles.label, { color: colors.foreground }]}>Verification Code</Text>
              <TextInput
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                style={[styles.otpInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius, borderColor: otp.length === 6 ? colors.primary : colors.border, letterSpacing: 8 }]}
              />
              <TouchableOpacity style={styles.resendRow} onPress={() => resendOtp(pendingEmail, mode === 'reset' ? 'password_reset' : 'signup')}>
                <Text style={[styles.resendText, { color: colors.primary }]}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* New password for reset */}
          {mode === 'reset' && (
            <>
              <View>
                <Text style={[styles.label, { color: colors.foreground }]}>New Password</Text>
                <View style={[styles.passWrap, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Min 8 chars, uppercase, number"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showNewPass}
                    style={[styles.passInput, { color: colors.foreground }]}
                  />
                  <TouchableOpacity onPress={() => setShowNewPass((v) => !v)}>
                    <Ionicons name={showNewPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              <View>
                <Text style={[styles.label, { color: colors.foreground }]}>Confirm Password</Text>
                <View style={[styles.passWrap, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.mutedForeground}
                    secureTextEntry={!showNewPass}
                    style={[styles.passInput, { color: colors.foreground }]}
                  />
                </View>
              </View>
            </>
          )}

          {/* Forgot password link */}
          {mode === 'login' && (
            <TouchableOpacity onPress={() => setMode('forgot')} style={styles.forgotRow}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {/* Primary action button */}
          <TouchableOpacity
            onPress={mode === 'login' ? doLogin : mode === 'register' ? doRegister : mode === 'verify-otp' ? doVerifyOtp : mode === 'forgot' ? doForgot : doReset}
            disabled={loading}
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : mode === 'verify-otp' ? 'Verify & Continue' : mode === 'forgot' ? 'Send Reset Code' : 'Set New Password'}
            </Text>
          </TouchableOpacity>

          {/* Toggle login/register */}
          {(mode === 'login' || mode === 'register') && (
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: colors.mutedForeground }]}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                <Text style={[styles.toggleLink, { color: colors.primary }]}>
                  {mode === 'login' ? 'Register' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, fontSize: 15 },
  passWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  passInput: { flex: 1, fontSize: 15, padding: 0 },
  otpInput: { padding: 16, fontSize: 22, fontWeight: '700', borderWidth: 2 },
  resendRow: { alignItems: 'flex-end', marginTop: 8 },
  resendText: { fontSize: 13, fontWeight: '600' },
  forgotRow: { alignItems: 'flex-end', marginTop: -8 },
  forgotText: { fontSize: 13, fontWeight: '600' },
  actionBtn: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  toggleText: { fontSize: 14 },
  toggleLink: { fontSize: 14, fontWeight: '700' },
});
