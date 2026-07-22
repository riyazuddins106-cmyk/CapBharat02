import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Platform, ActivityIndicator,
  Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi, categoriesApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

// ── Web-safe helpers ────────────────────────────────────────────────────────
const isWeb = Platform.OS === 'web';

function webConfirm(message: string): boolean {
  if (isWeb && typeof window !== 'undefined') return window.confirm(message);
  return false;
}

function showAlert(title: string, message: string) {
  if (isWeb && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const colors   = useColors();
  const insets   = useSafeAreaInsets();
  const { user, logout, accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [uploading, setUploading] = useState(false);

  // Modal visibility
  const [proModal,  setProModal]  = useState(false);
  const [acctModal, setAcctModal] = useState(false);
  const [pwModal,   setPwModal]   = useState(false);

  // Form state
  const [proForm,  setProForm]  = useState({ title: '', bio: '', basePrice: '', priceUnit: '/visit', tags: '' });
  const [acctForm, setAcctForm] = useState({ fullName: '', phone: '' });
  const [pwForm,   setPwForm]   = useState({ currentPw: '', newPw: '', confirmPw: '' });

  // Inline error / success messages per modal
  const [proErr,   setProErr]   = useState('');
  const [proOk,    setProOk]    = useState('');
  const [acctErr,  setAcctErr]  = useState('');
  const [acctOk,   setAcctOk]   = useState('');
  const [pwErr,    setPwErr]    = useState('');
  const [pwOk,     setPwOk]     = useState('');

  const { data: profile, refetch } = useQuery({
    queryKey: ['/api/partner/profile', accessToken],
    queryFn: () => partnerApi.getProfile(accessToken!),
    enabled: !!accessToken,
  });

  const availabilityMutation = useMutation({
    mutationFn: (status: 'available' | 'busy' | 'offline') =>
      partnerApi.updateAvailability(status, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
      refetch();
    },
    onError: (e: any) => showAlert('Availability update failed', e.message ?? 'Please try again.'),
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: () => categoriesApi.list(),
  });
  const categoryName = categories?.find((c) => c.id === profile?.categoryId)?.name;

  useEffect(() => {
    if (profile) {
      setProForm({
        title:     profile.title ?? '',
        bio:       profile.bio ?? '',
        basePrice: String(profile.basePrice ?? ''),
        priceUnit: profile.priceUnit ?? '/visit',
        tags:      (profile.tags ?? []).join(', '),
      });
    }
  }, [profile]);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    if (isWeb) {
      // Alert.alert button callbacks don't fire on Expo web — use window.confirm
      if (webConfirm('Are you sure you want to sign out?')) {
        logout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const pickAndUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission needed', 'Please allow access to your photo library to update your profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setUploading(true);
      await partnerApi.uploadAvatar(result.assets[0].uri, accessToken!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
      refetch();
    } catch (e: any) {
      showAlert('Upload failed', e.message ?? 'Could not update photo.');
    } finally {
      setUploading(false);
    }
  };

  // ── Professional Info ─────────────────────────────────────────────────────
  const updateProMutation = useMutation({
    mutationFn: () => partnerApi.updateProfile({
      title:     proForm.title.trim(),
      bio:       proForm.bio.trim(),
      basePrice: Number(proForm.basePrice),
      priceUnit: proForm.priceUnit.trim(),
      tags:      proForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
    }, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
      refetch();
      setProOk('Professional info saved successfully!');
      setTimeout(() => { setProModal(false); setProOk(''); }, 1200);
    },
    onError: (e: any) => setProErr(e.message ?? 'Failed to save. Please try again.'),
  });

  const handleSavePro = () => {
    setProErr(''); setProOk('');
    if (!proForm.title.trim()) { setProErr('Title / role is required.'); return; }
    if (!proForm.basePrice || isNaN(Number(proForm.basePrice)) || Number(proForm.basePrice) <= 0) {
      setProErr('Please enter a valid base price (numbers only).'); return;
    }
    updateProMutation.mutate();
  };

  // ── Account ───────────────────────────────────────────────────────────────
  const updateAcctMutation = useMutation({
    mutationFn: () => partnerApi.updateAccount({
      fullName: acctForm.fullName.trim() || undefined,
      phone:    acctForm.phone.trim() || undefined,
    }, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAcctOk('Account details saved successfully!');
      setTimeout(() => { setAcctModal(false); setAcctOk(''); }, 1200);
    },
    onError: (e: any) => setAcctErr(e.message ?? 'Failed to save. Please try again.'),
  });

  const handleSaveAcct = () => {
    setAcctErr(''); setAcctOk('');
    if (!acctForm.fullName.trim()) { setAcctErr('Full name is required.'); return; }
    updateAcctMutation.mutate();
  };

  // ── Change Password ───────────────────────────────────────────────────────
  const changePwMutation = useMutation({
    mutationFn: () => partnerApi.changePassword(pwForm.currentPw, pwForm.newPw, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPwOk('Password changed successfully!');
      setTimeout(() => { setPwModal(false); setPwForm({ currentPw: '', newPw: '', confirmPw: '' }); setPwOk(''); }, 1200);
    },
    onError: (e: any) => setPwErr(e.message ?? 'Incorrect current password or server error.'),
  });

  const handleChangePw = () => {
    setPwErr(''); setPwOk('');
    if (!pwForm.currentPw)          { setPwErr('Current password is required.'); return; }
    if (!pwForm.newPw)              { setPwErr('New password is required.'); return; }
    if (pwForm.newPw.length < 8)    { setPwErr('New password must be at least 8 characters.'); return; }
    if (pwForm.newPw !== pwForm.confirmPw) { setPwErr('New passwords do not match.'); return; }
    changePwMutation.mutate();
  };

  // ── Open modal helpers ────────────────────────────────────────────────────
  const openEditPro = () => {
    setProForm({
      title:     profile?.title ?? '',
      bio:       profile?.bio ?? '',
      basePrice: String(profile?.basePrice ?? ''),
      priceUnit: profile?.priceUnit ?? '/visit',
      tags:      (profile?.tags ?? []).join(', '),
    });
    setProErr(''); setProOk('');
    setProModal(true);
  };

  const openEditAcct = () => {
    setAcctForm({ fullName: user?.fullName ?? '', phone: user?.phone ?? '' });
    setAcctErr(''); setAcctOk('');
    setAcctModal(true);
  };

  const openChangePw = () => {
    setPwForm({ currentPw: '', newPw: '', confirmPw: '' });
    setPwErr(''); setPwOk('');
    setPwModal(true);
  };

  const displayName   = profile?.name ?? user?.fullName ?? 'Partner';
  const displayAvatar = profile?.avatarUrl;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* ── Header ── */}
        <View style={[styles.headerBg, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {displayName[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              {uploading
                ? <ActivityIndicator size={12} color="#fff" />
                : <Ionicons name="camera" size={12} color="#fff" />}
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
          {profile && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#fbbf24" />
              <Text style={styles.ratingText}>{profile.rating.toFixed(1)} · {profile.reviewCount} reviews</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 16, gap: 12 }}>

          {/* ── Professional Info card ── */}
          {profile && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Professional Info</Text>
                <TouchableOpacity onPress={openEditPro} style={[styles.editChip, { borderColor: colors.primary }]}>
                  <Ionicons name="pencil-outline" size={12} color={colors.primary} />
                  <Text style={[styles.editChipText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
              </View>
              <InfoRow icon="briefcase-outline" label="Title"    value={profile.title} colors={colors} />
              {categoryName ? <InfoRow icon="grid-outline" label="Category" value={categoryName} colors={colors} /> : null}
              <InfoRow icon="pricetag-outline"  label="Rate"   value={`₹${profile.basePrice}${profile.priceUnit}`} colors={colors} />
              <InfoRow icon="star-outline"      label="Rating" value={`${profile.rating.toFixed(1)} (${profile.reviewCount} reviews)`} colors={colors} />
              {profile.bio ? (
                <View style={styles.bioRow}>
                  <Text style={[styles.bioLabel, { color: colors.mutedForeground }]}>Bio</Text>
                  <Text style={[styles.bioText, { color: colors.foreground }]}>{profile.bio}</Text>
                </View>
              ) : null}
              {((profile.tags as string[]) ?? []).length > 0 && (
                <View style={styles.tagsWrap}>
                  {((profile.tags as string[]) ?? []).map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: 100 }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {profile && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Partner Availability</Text>
              <Text style={[styles.securitySub, { color: colors.mutedForeground }]}>
                Choose when you can receive new customer bookings.
              </Text>
              <View style={styles.availabilityRow}>
                {(['available', 'busy', 'offline'] as const).map((status) => {
                  const selected = (profile.availabilityStatus ?? 'offline') === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      disabled={availabilityMutation.isPending}
                      onPress={() => availabilityMutation.mutate(status)}
                      style={[styles.availabilityChip, { backgroundColor: selected ? colors.primary : colors.muted, borderRadius: colors.radius }]}
                    >
                      <Text style={{ color: selected ? '#fff' : colors.foreground, fontSize: 12, fontWeight: '700' }}>
                        {status[0].toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Account card ── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account</Text>
              <TouchableOpacity onPress={openEditAcct} style={[styles.editChip, { borderColor: colors.primary }]}>
                <Ionicons name="pencil-outline" size={12} color={colors.primary} />
                <Text style={[styles.editChipText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <InfoRow icon="mail-outline"           label="Email" value={user?.email ?? ''} colors={colors} />
            {user?.phone ? <InfoRow icon="call-outline" label="Phone" value={user.phone}  colors={colors} /> : null}
            <InfoRow icon="shield-checkmark-outline" label="Role" value="Partner" colors={colors} />
          </View>

          {/* ── Security card ── */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Security</Text>
            <TouchableOpacity onPress={openChangePw} style={styles.securityRow} activeOpacity={0.7}>
              <View style={[styles.securityIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.securityLabel, { color: colors.foreground }]}>Change Password</Text>
                <Text style={[styles.securitySub, { color: colors.mutedForeground }]}>Update your account password</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* ── Sign Out ── */}
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: '#fee2e2', borderRadius: colors.radius }]}
            activeOpacity={0.82}
          >
            <Ionicons name="log-out-outline" size={18} color="#D4183D" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          MODAL: Edit Professional Info
      ══════════════════════════════════════════════════════ */}
      <Modal visible={proModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Professional Info</Text>
              <TouchableOpacity onPress={() => setProModal(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <FormField label="Title / Role *" colors={colors}>
                <TextInput
                  value={proForm.title}
                  onChangeText={(v) => { setProForm((f) => ({ ...f, title: v })); setProErr(''); }}
                  placeholder="e.g. Senior Plumber"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </FormField>

              <FormField label="Bio" colors={colors}>
                <TextInput
                  value={proForm.bio}
                  onChangeText={(v) => setProForm((f) => ({ ...f, bio: v }))}
                  placeholder="Describe your expertise…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline numberOfLines={3} textAlignVertical="top"
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius, minHeight: 72 }]}
                />
              </FormField>

              <FormField label="Base Price (₹) *" colors={colors}>
                <TextInput
                  value={proForm.basePrice}
                  onChangeText={(v) => { setProForm((f) => ({ ...f, basePrice: v })); setProErr(''); }}
                  placeholder="500"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </FormField>

              <FormField label="Price Unit" colors={colors}>
                <TextInput
                  value={proForm.priceUnit}
                  onChangeText={(v) => setProForm((f) => ({ ...f, priceUnit: v }))}
                  placeholder="/visit or /hr"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </FormField>

              <FormField label="Skills / Tags (comma separated)" colors={colors}>
                <TextInput
                  value={proForm.tags}
                  onChangeText={(v) => setProForm((f) => ({ ...f, tags: v }))}
                  placeholder="e.g. Plumbing, AC Repair, Wiring"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />
              </FormField>

              {!!proErr && <Text style={styles.errorText}>{proErr}</Text>}
              {!!proOk  && <Text style={styles.successText}>{proOk}</Text>}

              <TouchableOpacity
                onPress={handleSavePro}
                disabled={updateProMutation.isPending}
                style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: updateProMutation.isPending ? 0.7 : 1, marginTop: 8 }]}
              >
                <Text style={styles.saveBtnText}>{updateProMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Edit Account
      ══════════════════════════════════════════════════════ */}
      <Modal visible={acctModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Edit Account</Text>
              <TouchableOpacity onPress={() => setAcctModal(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <FormField label="Full Name *" colors={colors}>
              <TextInput
                value={acctForm.fullName}
                onChangeText={(v) => { setAcctForm((f) => ({ ...f, fullName: v })); setAcctErr(''); }}
                placeholder="Your full name"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              />
            </FormField>

            <FormField label="Phone" colors={colors}>
              <TextInput
                value={acctForm.phone}
                onChangeText={(v) => setAcctForm((f) => ({ ...f, phone: v }))}
                placeholder="+91 99999 99999"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              />
            </FormField>

            {!!acctErr && <Text style={styles.errorText}>{acctErr}</Text>}
            {!!acctOk  && <Text style={styles.successText}>{acctOk}</Text>}

            <TouchableOpacity
              onPress={handleSaveAcct}
              disabled={updateAcctMutation.isPending}
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: updateAcctMutation.isPending ? 0.7 : 1, marginTop: 8 }]}
            >
              <Text style={styles.saveBtnText}>{updateAcctMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          MODAL: Change Password
      ══════════════════════════════════════════════════════ */}
      <Modal visible={pwModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setPwModal(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <FormField label="Current Password" colors={colors}>
              <TextInput
                value={pwForm.currentPw}
                onChangeText={(v) => { setPwForm((f) => ({ ...f, currentPw: v })); setPwErr(''); }}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              />
            </FormField>

            <FormField label="New Password" colors={colors}>
              <TextInput
                value={pwForm.newPw}
                onChangeText={(v) => { setPwForm((f) => ({ ...f, newPw: v })); setPwErr(''); }}
                placeholder="Min 8 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              />
            </FormField>

            <FormField label="Confirm New Password" colors={colors}>
              <TextInput
                value={pwForm.confirmPw}
                onChangeText={(v) => { setPwForm((f) => ({ ...f, confirmPw: v })); setPwErr(''); }}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
              />
            </FormField>

            {!!pwErr && <Text style={styles.errorText}>{pwErr}</Text>}
            {!!pwOk  && <Text style={styles.successText}>{pwOk}</Text>}

            <TouchableOpacity
              onPress={handleChangePw}
              disabled={changePwMutation.isPending}
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: changePwMutation.isPending ? 0.7 : 1, marginTop: 8 }]}
            >
              <Text style={styles.saveBtnText}>{changePwMutation.isPending ? 'Changing…' : 'Change Password'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, colors }: any) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function FormField({ label, colors, children }: any) {
  return (
    <View style={{ gap: 4, marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerBg:      { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', gap: 6 },
  avatarWrap:    { position: 'relative', marginBottom: 4 },
  avatar:        { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarImg:     { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:    { fontSize: 34, fontWeight: '800' },
  cameraBadge:   { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name:          { color: '#fff', fontSize: 22, fontWeight: '800' },
  email:         { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  ratingRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText:    { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  card:          { padding: 16, borderWidth: 1, gap: 12 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:     { fontSize: 14, fontWeight: '700' },
  editChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  editChipText:  { fontSize: 12, fontWeight: '600' },
  infoRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel:     { fontSize: 13, width: 60 },
  infoValue:     { fontSize: 13, flex: 1 },
  bioRow:        { gap: 4 },
  bioLabel:      { fontSize: 12, fontWeight: '600' },
  bioText:       { fontSize: 13, lineHeight: 19 },
  tagsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:           { paddingHorizontal: 10, paddingVertical: 4 },
  tagText:       { fontSize: 12, fontWeight: '600' },
  securityRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  securityIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  securityLabel: { fontSize: 14, fontWeight: '600' },
  securitySub:   { fontSize: 12 },
  availabilityRow: { flexDirection: 'row', gap: 8 },
  availabilityChip: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  logoutText:    { color: '#D4183D', fontSize: 15, fontWeight: '700' },
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:         { margin: 12, padding: 24, gap: 0, maxHeight: '90%' },
  sheetHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:    { fontSize: 18, fontWeight: '700' },
  fieldLabel:    { fontSize: 12, fontWeight: '600' },
  input:         { padding: 12, fontSize: 14 },
  saveBtn:       { paddingVertical: 14, alignItems: 'center' },
  saveBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorText:     { color: '#D4183D', fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  successText:   { color: '#16A34A', fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
});
