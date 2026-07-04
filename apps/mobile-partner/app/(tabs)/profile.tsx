import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi } from '@/lib/api';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: profile } = useQuery({
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Header */}
        <View style={[styles.headerBg, { paddingTop: topPadding + 12, backgroundColor: colors.primary }]}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(user?.fullName ?? 'P')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.fullName ?? 'Partner'}</Text>
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
              {(profile.tags as string[]).length > 0 && (
                <View style={styles.tagsWrap}>
                  {(profile.tags as string[]).map((tag) => (
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
  headerBg: { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 34, fontWeight: '800' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800' },
  email: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  card: { padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 13, width: 60 },
  infoValue: { fontSize: 13, flex: 1 },
  bioRow: { gap: 4 },
  bioLabel: { fontSize: 12, fontWeight: '600' },
  bioText: { fontSize: 13, lineHeight: 19 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  logoutText: { color: '#D4183D', fontSize: 15, fontWeight: '700' },
});
