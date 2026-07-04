import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'forgot' | 'reset';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, forgotPassword, resetPassword, resendOtp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const doLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
    setLoading(true);
    try {
      await login(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
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
    setLoading(true);
    try {
      await resetPassword(pendingEmail, otp, newPassword);
      await login(pendingEmail, newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="briefcase" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>ServeNow Partner</Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>
            {mode === 'login' ? 'Sign in to manage your jobs' : mode === 'forgot' ? 'Reset your password' : 'Create a new password'}
          </Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {mode === 'login' && (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  placeholder="your@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
                <View style={styles.passRow}>
                  <TextInput
                    value={password} onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1, backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eye}>
                    <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={() => setMode('forgot')} style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={doLogin} disabled={loading}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none"
                  placeholder="your@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <TouchableOpacity
                onPress={doForgot} disabled={loading}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Sending…' : 'Send Reset Code'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('login')} style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>← Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'reset' && (
            <>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to {pendingEmail}
              </Text>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>OTP Code</Text>
                <TextInput
                  value={otp} onChangeText={setOtp}
                  keyboardType="number-pad" maxLength={6}
                  placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius, letterSpacing: 6, fontSize: 20, textAlign: 'center' }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>New Password</Text>
                <TextInput
                  value={newPassword} onChangeText={setNewPassword}
                  secureTextEntry placeholder="New password"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <TouchableOpacity
                onPress={doReset} disabled={loading}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Resetting…' : 'Reset Password'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => resendOtp(pendingEmail, 'password_reset')}
                style={styles.forgotLink}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Partner accounts are set up by ServeNow admin.{'\n'}Contact support if you need access.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 24 },
  brand: { alignItems: 'center', gap: 10 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 26, fontWeight: '800' },
  appSub: { fontSize: 14, textAlign: 'center' },
  card: { padding: 20, borderWidth: 1, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { padding: 13, fontSize: 15 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: { padding: 8 },
  forgotLink: { alignItems: 'flex-end' },
  forgotText: { fontSize: 13, fontWeight: '600' },
  btn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 13, textAlign: 'center' },
  footer: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
