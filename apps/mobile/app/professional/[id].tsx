import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, Platform, FlatList, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { professionalsApi, bookingsApi, favoritesApi } from '@/lib/api';
import { ProCardShimmer } from '@/components/Shimmer';
import { queryClient } from '@/lib/queryClient';

// Generate today + next 13 days (14 total)
function getDates() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isToday(d: Date) {
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isPastSlot(slot: string, date: Date) {
  if (!isToday(date)) return false;
  const now = new Date();
  const [h, rest] = slot.split(':');
  const [min, period] = rest.split(' ');
  let hour = parseInt(h);
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour * 60 + parseInt(min) <= now.getHours() * 60 + now.getMinutes();
}

const TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

function fmtDay(d: Date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}
function fmtDate(d: Date) { return d.getDate(); }
function fmtMonth(d: Date) { return d.toLocaleString('en', { month: 'short' }); }

export default function ProfessionalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id, openBook } = useLocalSearchParams<{ id: string; openBook?: string }>();
  const { accessToken, isAuthenticated } = useAuth();

  const [bookingOpen, setBookingOpen] = useState(openBook === '1');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedDate, setSelectedDate] = useState(getDates()[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isFav, setIsFav] = useState(false);

  const { data: pro, isLoading } = useQuery({
    queryKey: ['/api/professionals', id],
    queryFn: () => professionalsApi.get(id),
    enabled: !!id,
  });

  const favMutation = useMutation({
    mutationFn: () => favoritesApi.toggle(id, accessToken!),
    onSuccess: (data) => setIsFav(data.isFavorite),
  });

  const bookMutation = useMutation({
    mutationFn: () => {
      const [h, rest] = (selectedTime ?? '9:00 AM').split(':');
      const [min, period] = rest.split(' ');
      let hour = parseInt(h);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      const dt = new Date(selectedDate);
      dt.setHours(hour, parseInt(min), 0, 0);
      return bookingsApi.create({ professionalId: id, scheduledAt: dt.toISOString(), notes: notes || undefined }, accessToken!);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setStep(3);
    },
    onError: (e: any) => Alert.alert('Booking Failed', e.message),
  });

  const dates = getDates();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 16, paddingTop: topPad + 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <ProCardShimmer />
      </View>
    );
  }

  if (!pro) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.heroNav, { paddingTop: topPad + 8 }]}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.navBtn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </TouchableOpacity>
            {accessToken && (
              <TouchableOpacity onPress={() => favMutation.mutate()} style={[styles.navBtn, { backgroundColor: 'rgba(0,0,0,0.06)' }]}>
                <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? colors.destructive : colors.foreground} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.heroContent}>
            {pro.avatarUrl ? (
              <Image source={{ uri: pro.avatarUrl }} style={[styles.avatar, { borderRadius: colors.radius }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{pro.name[0]}</Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.foreground }]}>{pro.name}</Text>
                {pro.badge && (
                  <View style={[styles.badge, {
                    backgroundColor: pro.badge === 'Top Rated' ? '#5B3EF5' : pro.badge === 'New' ? '#16A34A' : colors.primary,
                  }]}>
                    <Text style={styles.badgeText}>{pro.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.proTitle, { color: colors.mutedForeground }]}>{pro.title}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#FBBF24" />
                <Text style={[styles.rating, { color: colors.foreground }]}>{pro.rating}</Text>
                <Text style={[styles.reviews, { color: colors.mutedForeground }]}>({pro.reviewCount} reviews)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={[styles.priceBar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Starting at</Text>
          <Text style={[styles.price, { color: colors.primary }]}>₹{pro.basePrice}<Text style={styles.priceUnit}>{pro.priceUnit}</Text></Text>
        </View>

        {/* Tags */}
        {(pro.tags ?? []).length > 0 && (
          <View style={[styles.section, { paddingHorizontal: 16, marginTop: 16 }]}>
            <View style={styles.tags}>
              {(pro.tags ?? []).map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: colors.secondary, borderRadius: 100 }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bio */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{pro.bio}</Text>
        </View>

        {/* Reviews */}
        {(pro.reviews ?? []).length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginHorizontal: 16 }]}>Reviews</Text>
            {(pro.reviews ?? []).slice(0, 3).map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, marginHorizontal: 16 }]}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {[1,2,3,4,5].map((s) => (
                      <Ionicons key={s} name="star" size={12} color={s <= r.rating ? '#FBBF24' : colors.border} />
                    ))}
                  </View>
                  <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                    {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                {r.comment && <Text style={[styles.reviewComment, { color: colors.foreground }]}>{r.comment}</Text>}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky Book Button */}
      <View style={[styles.sticky, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          onPress={() => {
            if (!isAuthenticated) { router.push('/auth'); return; }
            setStep(1); setSelectedTime(null); setNotes(''); setBookingOpen(true);
          }}
          style={[styles.bookBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          activeOpacity={0.85}
        >
          <Ionicons name="calendar-outline" size={18} color="#fff" />
          <Text style={styles.bookBtnText}>Book Now — ₹{pro.basePrice}{pro.priceUnit}</Text>
        </TouchableOpacity>
      </View>

      {/* Booking Modal */}
      <Modal visible={bookingOpen} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            {/* Close */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {step === 1 ? 'Select Date & Time' : step === 2 ? 'Confirm Booking' : 'Booking Confirmed!'}
              </Text>
              {step !== 3 && (
                <TouchableOpacity onPress={() => setBookingOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {step === 1 && (
              <>
                {/* Date picker */}
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Select Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
                    {dates.map((d, i) => {
                      const sel = d.toDateString() === selectedDate.toDateString();
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => { setSelectedDate(d); Haptics.selectionAsync(); }}
                          style={[styles.dateChip, { backgroundColor: sel ? colors.primary : colors.muted, borderRadius: colors.radius }]}
                        >
                          <Text style={[styles.dateDay, { color: sel ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }]}>{fmtDay(d)}</Text>
                          <Text style={[styles.dateNum, { color: sel ? '#fff' : colors.foreground }]}>{fmtDate(d)}</Text>
                          <Text style={[styles.dateMon, { color: sel ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }]}>{fmtMonth(d)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Time slots */}
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Select Time</Text>
                <View style={styles.timeGrid}>
                  {TIME_SLOTS.map((t) => {
                    const sel = selectedTime === t;
                    const past = isPastSlot(t, selectedDate);
                    return (
                      <TouchableOpacity
                        key={t}
                        disabled={past}
                        onPress={() => { if (!past) { setSelectedTime(t); Haptics.selectionAsync(); } }}
                        style={[styles.timeChip, { backgroundColor: past ? colors.border : sel ? colors.primary : colors.muted, borderRadius: colors.radius - 2, opacity: past ? 0.45 : 1 }]}
                      >
                        <Text style={[styles.timeText, { color: past ? colors.mutedForeground : sel ? '#fff' : colors.foreground }]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  disabled={!selectedTime}
                  onPress={() => setStep(2)}
                  style={[styles.nextBtn, { backgroundColor: selectedTime ? colors.primary : colors.muted, borderRadius: colors.radius }]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.nextBtnText, { color: selectedTime ? '#fff' : colors.mutedForeground }]}>Next</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <View style={[styles.confirmCard, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                  {[
                    { label: 'Professional', value: pro.name },
                    { label: 'Service', value: pro.title },
                    { label: 'Date', value: `${fmtDay(selectedDate)}, ${fmtDate(selectedDate)} ${fmtMonth(selectedDate)}` },
                    { label: 'Time', value: selectedTime ?? '' },
                    { label: 'Amount', value: `₹${pro.basePrice}${pro.priceUnit}` },
                  ].map(({ label, value }) => (
                    <View key={label} style={styles.confirmRow}>
                      <Text style={[styles.confirmLabel, { color: colors.mutedForeground }]}>{label}</Text>
                      <Text style={[styles.confirmValue, { color: colors.foreground }]}>{value}</Text>
                    </View>
                  ))}
                </View>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes for the professional (optional)"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={2}
                  style={[styles.notesInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                />

                <View style={styles.confirmActions}>
                  <TouchableOpacity onPress={() => setStep(1)} style={[styles.backBtn, { borderColor: colors.border, borderRadius: colors.radius }]}>
                    <Text style={[styles.backBtnText, { color: colors.foreground }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => bookMutation.mutate()}
                    disabled={bookMutation.isPending}
                    style={[styles.confirmBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.confirmBtnText}>{bookMutation.isPending ? 'Booking…' : 'Confirm Booking'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 3 && (
              <View style={styles.successContent}>
                <View style={[styles.successIcon, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
                </View>
                <Text style={[styles.successTitle, { color: colors.foreground }]}>Booking Confirmed!</Text>
                <Text style={[styles.successText, { color: colors.mutedForeground }]}>
                  Your booking with {pro.name} on {fmtDay(selectedDate)}, {fmtDate(selectedDate)} {fmtMonth(selectedDate)} at {selectedTime} is confirmed.
                </Text>
                <TouchableOpacity
                  onPress={() => { setBookingOpen(false); router.push('/(tabs)/bookings'); }}
                  style={[styles.viewBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewBtnText}>View My Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setBookingOpen(false); setStep(1); }} style={{ marginTop: 8 }}>
                  <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderBottomWidth: 1, paddingBottom: 20 },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroContent: { flexDirection: 'row', paddingHorizontal: 16, gap: 14 },
  avatar: { width: 88, height: 88 },
  avatarPlaceholder: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '700' },
  heroInfo: { flex: 1, gap: 5, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 20, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  proTitle: { fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 13, fontWeight: '700' },
  reviews: { fontSize: 12 },
  priceBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  priceLabel: { fontSize: 13 },
  price: { fontSize: 22, fontWeight: '800' },
  priceUnit: { fontSize: 14, fontWeight: '400' },
  section: {},
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, fontWeight: '600' },
  bio: { fontSize: 14, lineHeight: 22 },
  reviewCard: { padding: 14, marginBottom: 10, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 11 },
  reviewComment: { fontSize: 13, lineHeight: 20 },
  sticky: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { margin: 8, padding: 24, gap: 16, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: -8 },
  dateChip: { width: 56, paddingVertical: 10, alignItems: 'center', gap: 2 },
  dateDay: { fontSize: 10, fontWeight: '600' },
  dateNum: { fontSize: 18, fontWeight: '800' },
  dateMon: { fontSize: 10, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 9 },
  timeText: { fontSize: 13, fontWeight: '600' },
  nextBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  nextBtnText: { fontSize: 15, fontWeight: '700' },
  confirmCard: { padding: 16, gap: 12 },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confirmLabel: { fontSize: 13 },
  confirmValue: { fontSize: 14, fontWeight: '600' },
  notesInput: { padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 70 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  backBtn: { flex: 1, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center' },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { flex: 2, paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successContent: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  successIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800' },
  successText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  viewBtn: { paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  viewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  closeText: { fontSize: 14, fontWeight: '600' },
});
