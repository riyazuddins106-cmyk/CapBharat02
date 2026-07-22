import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, Pressable, StyleSheet,
  ScrollView, TextInput, Alert, Modal, Platform, ActivityIndicator, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { profileApi, pointsApi, bookingsApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const MENU_ITEMS = [
  { icon: 'location-outline',          label: 'Saved Addresses',   route: '/addresses' },
  { icon: 'heart-outline',             label: 'Wishlist',           route: '/wishlist' },
  { icon: 'gift-outline',              label: 'Points & Rewards',   route: '/points' },
  { icon: 'shield-checkmark-outline',  label: 'Privacy & Security', route: '/privacy-security' },
  { icon: 'notifications-outline',     label: 'Notifications',      route: '/notifications' },
  { icon: 'star-outline',              label: 'Rate the App',       route: null },
  { icon: 'help-circle-outline',       label: 'Help & Support',     route: '/help-support' },
];

async function handleRateApp() {
  const iosUrl = 'itms-apps://itunes.apple.com/app/id0000000000';
  const androidUrl = 'market://details?id=com.servenow.app';
  const url = Platform.OS === 'ios' ? iosUrl : androidUrl;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Coming Soon', 'ServeNow will be available on app stores soon. Thank you for your support! ');
    }
  } catch {
    Alert.alert('Coming Soon', 'ServeNow will be available on app stores soon. Thank you for your support! ');
  }
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, accessToken, isAuthenticated, logout, updateUser } = useAuth();

  const { data: pointsSummary } = useQuery({
    queryKey: ['/api/points', accessToken],
    queryFn: () => pointsApi.getSummary(accessToken!),
    enabled: !!accessToken,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['/api/bookings', accessToken],
    queryFn: () => bookingsApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const bookingCount = bookings.length;
  const reviewCount = bookings.filter((b) => b.reviewed).length;
  const [editModal,  setEditModal]  = useState(false);
  const [fullName,   setFullName]   = useState(user?.fullName ?? '');
  const [phone,      setPhone]      = useState(user?.phone ?? '');
  const [localAvatar, setLocalAvatar] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploading,  setUploading]  = useState(false);

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const updateMutation = useMutation({
    mutationFn: () => profileApi.update({ fullName, phone: phone || undefined }, accessToken!),
    onSuccess: (updatedUser) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateUser(updatedUser);
      setEditModal(false);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const pickAndUploadAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library to update your profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      setUploading(true);
      const updated = await profileApi.uploadAvatar(uri, accessToken!);
      setLocalAvatar(updated.avatarUrl);
      updateUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not update photo.');
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <View style={[styles.avatarLg, { backgroundColor: colors.secondary }]}>
          <Ionicons name="person" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.foreground }]}>Sign in to ServeNow</Text>
        <Text style={[styles.guestText, { color: colors.mutedForeground }]}>Book services, track your history, and manage your account</Text>
        <TouchableOpacity
          onPress={() => router.push('/auth')}
          style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          activeOpacity={0.85}
        >
          <Text style={styles.signInBtnText}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayAvatar = localAvatar ?? user?.avatarUrl;
  const initials = (user?.fullName ?? '')
    .split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.profileHeader, { paddingTop: topPadding + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Tappable avatar */}
        <TouchableOpacity onPress={pickAndUploadAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarLg, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
          {/* Camera badge */}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            {uploading
              ? <ActivityIndicator size={12} color="#fff" />
              : <Ionicons name="camera" size={12} color="#fff" />}
          </View>
        </TouchableOpacity>

        <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.fullName ?? ''}</Text>
        <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{user?.email ?? ''}</Text>
        {user?.phone && <Text style={[styles.profilePhone, { color: colors.mutedForeground }]}>{user.phone}</Text>}

        <TouchableOpacity
          onPress={() => { setFullName(user?.fullName ?? ''); setPhone(user?.phone ?? ''); setEditModal(true); }}
          style={[styles.editBtn, { borderColor: colors.primary, borderRadius: 100 }]}
          activeOpacity={0.8}
        >
          <Ionicons name="pencil-outline" size={14} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={[styles.stats, { backgroundColor: colors.card, borderBottomColor: colors.border, borderTopColor: colors.border }]}>
        {[{ label: 'Bookings', value: String(bookingCount) }, { label: 'Reviews', value: String(reviewCount) }, { label: 'Points', value: String(pointsSummary?.balance ?? 0) }].map(({ label, value }) => (
          <TouchableOpacity
            key={label}
            style={styles.stat}
            activeOpacity={label === 'Points' ? 0.7 : 1}
            disabled={label !== 'Points'}
            onPress={() => router.push('/points')}
          >
            <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Menu */}
      <View style={[styles.menu, { borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 16 }]}>
        {MENU_ITEMS.map(({ icon, label, route }, i) => {
          const isFirst = i === 0;
          const isLast  = i === MENU_ITEMS.length - 1;
          const radius = {
            borderTopLeftRadius:     isFirst ? colors.radius : 0,
            borderTopRightRadius:    isFirst ? colors.radius : 0,
            borderBottomLeftRadius:  isLast  ? colors.radius : 0,
            borderBottomRightRadius: isLast  ? colors.radius : 0,
          };
          return (
            <React.Fragment key={label}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  radius,
                  { backgroundColor: pressed ? colors.muted : colors.card },
                ]}
                onPress={() => route ? router.push(route as any) : handleRateApp()}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.secondary }]}>
                  <Ionicons name={icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              </Pressable>
              {i < MENU_ITEMS.length - 1 && (
                <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Sign out */}
      <TouchableOpacity
        onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
        ])}
        style={[styles.signOutBtn, { borderColor: colors.destructive, borderRadius: colors.radius, marginHorizontal: 16, marginTop: 12, marginBottom: 32 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.editSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.editSheetHeader}>
              <Text style={[styles.editSheetTitle, { color: colors.foreground }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Full Name</Text>
            <TextInput
              value={fullName} onChangeText={setFullName}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
            />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Phone</Text>
            <TextInput
              value={phone} onChangeText={setPhone} keyboardType="phone-pad"
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
            />
            <TouchableOpacity
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  avatarWrap:       { position: 'relative', marginBottom: 4 },
  avatarLg:         { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarImg:        { width: 88, height: 88, borderRadius: 44 },
  avatarText:       { fontSize: 32, fontWeight: '700' },
  cameraBadge:      { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  profileHeader:    { alignItems: 'center', paddingBottom: 20, paddingHorizontal: 16, borderBottomWidth: 1, gap: 6 },
  profileName:      { fontSize: 22, fontWeight: '700', marginTop: 4 },
  profileEmail:     { fontSize: 13 },
  profilePhone:     { fontSize: 13 },
  editBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, marginTop: 8 },
  editBtnText:      { fontSize: 13, fontWeight: '600' },
  stats:            { flexDirection: 'row', justifyContent: 'space-around', padding: 16, borderTopWidth: 1, borderBottomWidth: 1 },
  stat:             { alignItems: 'center', gap: 4 },
  statValue:        { fontSize: 20, fontWeight: '700' },
  statLabel:        { fontSize: 12 },
  menu:             { borderWidth: 1 },
  menuItem:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon:         { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuLabel:        { flex: 1, fontSize: 14, fontWeight: '500' },
  menuDivider:      { height: 1, marginLeft: 60 },
  signOutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, paddingVertical: 14 },
  signOutText:      { fontSize: 15, fontWeight: '700' },
  guestTitle:       { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  guestText:        { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  signInBtn:        { paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  signInBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalBackdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  editSheet:        { margin: 16, padding: 24, gap: 12 },
  editSheetHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  editSheetTitle:   { fontSize: 18, fontWeight: '700' },
  fieldLabel:       { fontSize: 13, fontWeight: '600', marginBottom: -4 },
  input:            { padding: 12, fontSize: 14 },
  saveBtn:          { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});
