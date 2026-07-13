import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { notificationsApi, type AppNotification } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const TYPE_ICON: Record<string, string> = {
  booking_update: 'calendar-outline',
  promo:          'gift-outline',
  system:         'information-circle-outline',
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: items = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['/api/notifications', accessToken],
    queryFn: () => notificationsApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(accessToken!),
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id, accessToken!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] }),
  });

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-outline" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          renderItem={({ item: n }) => (
            <TouchableOpacity
              onPress={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
              style={[styles.item, { backgroundColor: n.isRead ? colors.background : colors.secondary, borderBottomColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: n.isRead ? colors.muted : colors.primary + '22' }]}>
                <Ionicons name={(TYPE_ICON[n.type] ?? 'notifications-outline') as any} size={20} color={n.isRead ? colors.mutedForeground : colors.primary} />
              </View>
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, { color: colors.foreground, fontWeight: n.isRead ? '500' : '700' }]}>{n.title}</Text>
                <Text style={[styles.itemBody, { color: colors.mutedForeground }]} numberOfLines={2}>{n.body}</Text>
                <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>{fmtTime(n.createdAt)}</Text>
              </View>
              {!n.isRead && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
              <TouchableOpacity onPress={() => deleteMutation.mutate(n.id)} style={styles.deleteBtn}>
                <Ionicons name="close" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:     { padding: 4 },
  title:       { flex: 1, fontSize: 20, fontWeight: '700' },
  markAllText: { fontSize: 13, fontWeight: '600' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:  { fontSize: 18, fontWeight: '700' },
  emptyText:   { fontSize: 14 },
  item:        { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  iconWrap:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  itemContent: { flex: 1, gap: 3 },
  itemTitle:   { fontSize: 14 },
  itemBody:    { fontSize: 13, lineHeight: 18 },
  itemTime:    { fontSize: 11, marginTop: 2 },
  dot:         { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  deleteBtn:   { padding: 4, flexShrink: 0 },
});
