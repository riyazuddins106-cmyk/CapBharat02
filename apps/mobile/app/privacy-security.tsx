import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Modal, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { profileApi, platformApi } from '@/lib/api';

export default function PrivacySecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken, logout } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [pwModal, setPwModal]       = useState(false);
  const [delModal, setDelModal]     = useState(false);
  const [policyModal, setPolicyModal] = useState<'privacy_policy' | 'terms' | null>(null);
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [delPw, setDelPw]           = useState('');

  // ── Fetch whichever policy is open ──────────────────────────
  const { data: policyData, isLoading: policyLoading } = useQuery({
    queryKey: ['platform-policy', policyModal],
    queryFn: () => platformApi.getPolicy(policyModal!),
    enabled: !!policyModal,
    staleTime: 5 * 60 * 1000,
  });

  // ── Mutations ───────────────────────────────────────────────
  const changePwMutation = useMutation({
    mutationFn: () => profileApi.changePassword(currentPw, newPw, accessToken!),
    onSuccess: () => {
      Alert.alert('Success', 'Your password has been changed.');
      setPwModal(false);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => profileApi.logoutAll(accessToken!),
    onSuccess: async () => {
      Alert.alert('Signed out everywhere', 'You have been signed out from all devices.');
      await logout();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => profileApi.deleteAccount(delPw, accessToken!),
    onSuccess: async () => {
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      await logout();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleChangePw = () => {
    if (!currentPw || !newPw || !confirmPw) return Alert.alert('Error', 'All fields are required.');
    if (newPw !== confirmPw) return Alert.alert('Error', 'New passwords do not match.');
    if (newPw.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters.');
    changePwMutation.mutate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Privacy & Security</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}>
        {/* Security */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT SECURITY</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <MenuItem icon="lock-closed-outline" title="Change Password" subtitle="Update your account password" onPress={() => setPwModal(true)} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="phone-portrait-outline"
            title="Sign Out All Devices"
            subtitle="Invalidate all active sessions"
            onPress={() => Alert.alert('Sign Out All Devices', 'This will sign you out from all devices including this one.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out All', style: 'destructive', onPress: () => logoutAllMutation.mutate() },
            ])}
            colors={colors}
          />
        </View>

        {/* Privacy — links open live content from DB */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PRIVACY</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <MenuItem
            icon="document-text-outline"
            title="Privacy Policy"
            subtitle="How we collect and use your data"
            onPress={() => setPolicyModal('privacy_policy')}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuItem
            icon="reader-outline"
            title="Terms & Conditions"
            subtitle="Rules for using ServeNow"
            onPress={() => setPolicyModal('terms')}
            colors={colors}
          />
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>DANGER ZONE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <MenuItem icon="trash-outline" title="Delete Account" subtitle="Permanently delete your account and all data" onPress={() => setDelModal(true)} colors={colors} danger />
        </View>
      </ScrollView>

      {/* ── Policy content modal ── */}
      <Modal visible={!!policyModal} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={() => setPolicyModal(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.policySheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]} numberOfLines={1}>
                {policyData?.title ?? (policyModal === 'privacy_policy' ? 'Privacy Policy' : 'Terms & Conditions')}
              </Text>
              <TouchableOpacity onPress={() => setPolicyModal(null)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {policyLoading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.policyContent, { color: colors.foreground }]}>
                  {policyData?.content ?? 'Content unavailable. Please try again.'}
                </Text>
              </ScrollView>
            )}

            {policyData?.updatedAt && (
              <Text style={[styles.policyDate, { color: colors.mutedForeground }]}>
                Last updated: {new Date(policyData.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Change Password modal ── */}
      <Modal visible={pwModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setPwModal(false)}><Ionicons name="close" size={22} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            {(['Current Password|currentPw', 'New Password|newPw', 'Confirm New Password|confirmPw'] as const).map((entry) => {
              const [label, key] = entry.split('|');
              const valueMap: Record<string, string> = { currentPw, newPw, confirmPw };
              const setterMap: Record<string, (v: string) => void> = { currentPw: setCurrentPw, newPw: setNewPw, confirmPw: setConfirmPw };
              return (
                <View key={key} style={{ gap: 4 }}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
                  <TextInput value={valueMap[key]} onChangeText={setterMap[key]} secureTextEntry placeholder="••••••••"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]} />
                </View>
              );
            })}
            <TouchableOpacity
              onPress={handleChangePw}
              disabled={changePwMutation.isPending}
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: changePwMutation.isPending ? 0.7 : 1 }]}
            >
              <Text style={styles.saveBtnText}>{changePwMutation.isPending ? 'Saving…' : 'Change Password'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Delete Account modal ── */}
      <Modal visible={delModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.destructive }]}>Delete Account</Text>
              <TouchableOpacity onPress={() => setDelModal(false)}><Ionicons name="close" size={22} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            <Text style={[styles.delWarning, { color: colors.mutedForeground }]}>
              This action is permanent and cannot be undone. All your data including bookings and reviews will be deleted.
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Enter your password to confirm</Text>
            <TextInput value={delPw} onChangeText={setDelPw} secureTextEntry placeholder="Your password"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]} />
            <TouchableOpacity
              onPress={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending || !delPw}
              style={[styles.saveBtn, { backgroundColor: colors.destructive, borderRadius: colors.radius, opacity: deleteAccountMutation.isPending || !delPw ? 0.7 : 1 }]}
            >
              <Text style={styles.saveBtnText}>{deleteAccountMutation.isPending ? 'Deleting…' : 'Permanently Delete Account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MenuItem({ icon, title, subtitle, onPress, colors, danger }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuItem} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? '#fee2e2' : colors.secondary }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuTitle, { color: danger ? colors.destructive : colors.foreground }]}>{title}</Text>
        <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:      { padding: 4 },
  title:        { flex: 1, fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: -8 },
  card:         { borderWidth: 1, overflow: 'hidden' },
  divider:      { height: 1 },
  menuItem:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuText:     { flex: 1, gap: 2 },
  menuTitle:    { fontSize: 14, fontWeight: '600' },
  menuSub:      { fontSize: 12 },
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { margin: 12, padding: 24, gap: 12 },
  policySheet:  { margin: 12, padding: 24, gap: 12, maxHeight: '85%' },
  sheetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle:   { fontSize: 18, fontWeight: '700', flex: 1, marginRight: 8 },
  policyContent:{ fontSize: 14, lineHeight: 22 },
  policyDate:   { fontSize: 11, textAlign: 'right', marginTop: 8 },
  fieldLabel:   { fontSize: 12, fontWeight: '600' },
  input:        { padding: 12, fontSize: 14 },
  saveBtn:      { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  delWarning:   { fontSize: 13, lineHeight: 19, marginBottom: 4 },
});
