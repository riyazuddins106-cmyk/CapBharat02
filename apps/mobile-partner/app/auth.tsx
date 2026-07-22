import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { categoriesApi } from '@/lib/api';

type Mode = 'login' | 'forgot' | 'reset' | 'register' | 'verify';

interface Category { id: string; name: string; isActive: boolean; }

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, forgotPassword, resetPassword, resendOtp, registerPartner, verifySignupOtp } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  // Login / forgot / reset fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regCategoryId, setRegCategoryId] = useState('');
  const [showRegPass, setShowRegPass] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);

  // Verify OTP (after register)
  const [verifyOtp, setVerifyOtp] = useState('');

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

  // Load categories when entering register mode
  useEffect(() => {
    if (mode === 'register' && categories.length === 0) {
      setCatsLoading(true);
      categoriesApi.list()
        .then(data => setCategories((data as Category[]).filter(c => c.isActive)))
        .catch(() => {})
        .finally(() => setCatsLoading(false));
    }
  }, [mode]);

  const doLogin = async () => {
    clearMessages();
    if (!email || !password) return setError('Please fill in all fields');
    setLoading(true);
    try {
      await login(email.trim(), password);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e: any) {
      setError(e?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const doForgot = async () => {
    clearMessages();
    if (!email) return setError('Enter your email address');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setPendingEmail(email.trim());
      setSuccessMsg('Reset code sent — check your email.');
      setMode('reset');
    } catch (e: any) {
      setError(e?.message ?? 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const doReset = async () => {
    clearMessages();
    if (otp.length !== 6 || !newPassword) return setError('Fill in all fields');
    setLoading(true);
    try {
      await resetPassword(pendingEmail, otp, newPassword);
      await login(pendingEmail, newPassword);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e: any) {
      setError(e?.message ?? 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const doRegister = async () => {
    clearMessages();
    if (!regName || !regEmail || !regPassword || !regCategoryId || !regTitle) {
      return setError('Please fill in all required fields');
    }
    setLoading(true);
    try {
      const result = await registerPartner({
        fullName: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim() || undefined,
        categoryId: regCategoryId,
        title: regTitle.trim(),
      });
      setPendingEmail(result.email);
      setSuccessMsg('Account created! Enter the 6-digit code sent to your email.');
      setMode('verify');
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const doVerify = async () => {
    clearMessages();
    if (verifyOtp.length !== 6) return setError('Enter the 6-digit code');
    setLoading(true);
    try {
      await verifySignupOtp(pendingEmail, verifyOtp);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const subtitles: Record<Mode, string> = {
    login: 'Sign in to manage your jobs',
    forgot: 'Reset your password',
    reset: 'Create a new password',
    register: 'Create your partner account',
    verify: 'Verify your email',
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
        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="briefcase" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>ServeNow Partner</Text>
          <Text style={[styles.appSub, { color: colors.mutedForeground }]}>{subtitles[mode]}</Text>
        </View>

        {/* Banners */}
        {error ? (
          <View style={[styles.banner, styles.bannerError]}>
            <Ionicons name="alert-circle" size={16} color="#dc2626" />
            <Text style={styles.bannerErrorText}>{error}</Text>
          </View>
        ) : null}
        {successMsg ? (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={styles.bannerSuccessText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  placeholder="your@email.com" placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
                <View style={styles.passRow}>
                  <TextInput
                    value={password} onChangeText={setPassword}
                    secureTextEntry={!showPass} placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1, backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eye}>
                    <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity onPress={() => { clearMessages(); setMode('forgot'); }} style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={doLogin} disabled={loading}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { clearMessages(); setMode('register'); }} style={styles.switchLink}>
                <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                  New partner? <Text style={{ color: colors.primary, fontWeight: '700' }}>Create an account</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── FORGOT ── */}
          {mode === 'forgot' && (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
                <TextInput
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  placeholder="your@email.com" placeholderTextColor={colors.mutedForeground}
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
              <TouchableOpacity onPress={() => { clearMessages(); setMode('login'); }} style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>← Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── RESET ── */}
          {mode === 'reset' && (
            <>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to {pendingEmail}
              </Text>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>OTP Code</Text>
                <TextInput
                  value={otp} onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad" maxLength={6} placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius, letterSpacing: 6, fontSize: 20, textAlign: 'center' }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>New Password</Text>
                <View style={styles.passRow}>
                  <TextInput
                    value={newPassword} onChangeText={setNewPassword}
                    secureTextEntry={!showPass} placeholder="Min 8 chars, uppercase, number"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1, backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eye}>
                    <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                onPress={doReset} disabled={loading}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Resetting…' : 'Reset Password'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  clearMessages();
                  try {
                    await resendOtp(pendingEmail, 'password_reset');
                    setSuccessMsg('Code resent — check your email.');
                  } catch (e: any) {
                    setError(e?.message ?? 'Could not resend code.');
                  }
                }}
                style={styles.forgotLink}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && (
            <>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name *</Text>
                <TextInput
                  value={regName} onChangeText={setRegName}
                  autoCapitalize="words" placeholder="Your full name"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Email *</Text>
                <TextInput
                  value={regEmail} onChangeText={setRegEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  placeholder="your@email.com" placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone (optional)</Text>
                <TextInput
                  value={regPhone} onChangeText={setRegPhone}
                  keyboardType="phone-pad" placeholder="+91 98765 43210"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Password *</Text>
                <View style={styles.passRow}>
                  <TextInput
                    value={regPassword} onChangeText={setRegPassword}
                    secureTextEntry={!showRegPass} placeholder="Min 8 chars, uppercase, number"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { flex: 1, backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                  />
                  <TouchableOpacity onPress={() => setShowRegPass(!showRegPass)} style={styles.eye}>
                    <Ionicons name={showRegPass ? 'eye-off' : 'eye'} size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Service Category *</Text>
                {catsLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                    <View style={styles.chipRow}>
                      {categories.map(c => (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => setRegCategoryId(c.id)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: regCategoryId === c.id ? colors.primary : colors.muted,
                              borderColor: regCategoryId === c.id ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.chipText, { color: regCategoryId === c.id ? '#fff' : colors.foreground }]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Professional Title *</Text>
                <TextInput
                  value={regTitle} onChangeText={setRegTitle}
                  placeholder="e.g. Expert Plumber, Senior Electrician"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </View>
              <TouchableOpacity
                onPress={doRegister} disabled={loading}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Creating account…' : 'Create Account'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { clearMessages(); setMode('login'); }} style={styles.switchLink}>
                <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                  Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── VERIFY OTP (post-register) ── */}
          {mode === 'verify' && (
            <>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to {pendingEmail}
              </Text>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Verification Code</Text>
                <TextInput
                  value={verifyOtp} onChangeText={setVerifyOtp}
                  keyboardType="number-pad" maxLength={6} placeholder="123456"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius, letterSpacing: 6, fontSize: 20, textAlign: 'center' }]}
                />
              </View>
              <TouchableOpacity
                onPress={doVerify} disabled={loading}
                style={[styles.btn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: loading ? 0.7 : 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{loading ? 'Verifying…' : 'Verify & Sign In'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  clearMessages();
                  try {
                    await resendOtp(pendingEmail, 'signup');
                    setSuccessMsg('Code resent — check your email.');
                  } catch (e: any) {
                    setError(e?.message ?? 'Could not resend code.');
                  }
                }}
                style={styles.forgotLink}
              >
                <Text style={[styles.forgotText, { color: colors.primary }]}>Resend code</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {(mode === 'login' || mode === 'register') && (
          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            By continuing, you agree to ServeNow's Terms of Service.
          </Text>
        )}
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8 },
  bannerError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  bannerSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  bannerErrorText: { color: '#dc2626', fontSize: 13, flex: 1 },
  bannerSuccessText: { color: '#16a34a', fontSize: 13, flex: 1 },
  card: { padding: 20, borderWidth: 1, gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { padding: 13, fontSize: 15 },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: { padding: 8 },
  forgotLink: { alignItems: 'flex-end' },
  forgotText: { fontSize: 13, fontWeight: '600' },
  switchLink: { alignItems: 'center', marginTop: 4 },
  switchText: { fontSize: 13 },
  btn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 13, textAlign: 'center' },
  footer: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
});
