import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [uploading, setUploading] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ['/api/partner/profile', accessToken],
    queryFn: () => partnerApi.getProfile(accessToken!),
    enabled: !!accessToken,
  });

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

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
      setUploading(true);
      await partnerApi.uploadAvatar(result.assets[0].uri, accessToken!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
      refetch();
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not update photo.');
    } finally {
      setUploading(false);
    }
  };

  const displayName = profile?.name ?? user?.fullName ?? 'Partner';
  const displayAvatar = profile?.avatarUrl;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Header */}
        <View style={[styles.headerBg, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
          {/* Tappable avatar */}
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
            {/* Camera badge */}
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
          {/* Professional info */}
          {profile && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Professional Info</Text>
              <InfoRow icon="briefcase-outline" label="Title" value={profile.title} colors={colors} />
              <InfoRow icon="pricetag-outline" label="Rate" value={`₹${profile.basePrice}${profile.priceUnit}`} colors={colors} />
              <InfoRow icon="star-outline" label="Rating" value={`${profile.rating.toFixed(1)} (${profile.reviewCount} reviews)`} colors={colors} />
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

          {/* Account */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account</Text>
            <InfoRow icon="mail-outline" label="Email" value={user?.email ?? ''} colors={colors} />
            {user?.phone ? <InfoRow icon="call-outline" label="Phone" value={user.phone} colors={colors} /> : null}
            <InfoRow icon="shield-checkmark-outline" label="Role" value="Partner" colors={colors} />
          </View>

          {/* Sign out */}
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
    </View>
  );
}

function InfoRow({ icon, label, value, colors }: any) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBg:     { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', gap: 6 },
  avatarWrap:   { position: 'relative', marginBottom: 4 },
  avatar:       { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarImg:    { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText:   { fontSize: 34, fontWeight: '800' },
  cameraBadge:  { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name:         { color: '#fff', fontSize: 22, fontWeight: '800' },
  email:        { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText:   { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  card:         { padding: 16, borderWidth: 1, gap: 12 },
  cardTitle:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel:    { fontSize: 13, width: 60 },
  infoValue:    { fontSize: 13, flex: 1 },
  bioRow:       { gap: 4 },
  bioLabel:     { fontSize: 12, fontWeight: '600' },
  bioText:      { fontSize: 13, lineHeight: 19 },
  tagsWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:          { paddingHorizontal: 10, paddingVertical: 4 },
  tagText:      { fontSize: 12, fontWeight: '600' },
  logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  logoutText:   { color: '#D4183D', fontSize: 15, fontWeight: '700' },
});
