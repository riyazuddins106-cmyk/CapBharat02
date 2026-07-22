import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { cartApi, addressesApi, type Cart, type Address } from '@/lib/api';

const TIME_SLOTS = ['9 AM - 11 AM', '11 AM - 1 PM', '2 PM - 4 PM', '4 PM - 6 PM'];
const SLOT_HOURS: Record<string, number> = {
  '9 AM - 11 AM': 9, '11 AM - 1 PM': 11, '2 PM - 4 PM': 14, '4 PM - 6 PM': 16,
};

function buildScheduledAt(dateLabel: string, slotLabel: string): string {
  const hour = SLOT_HOURS[slotLabel] ?? 9;
  const base = new Date();
  if (dateLabel === 'Tomorrow') {
    base.setDate(base.getDate() + 1);
  } else if (dateLabel !== 'Today') {
    const match = dateLabel.match(/(\d+)\s+(\w+)/);
    if (match) {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const day = parseInt(match[1]);
      const monthIdx = months.indexOf(match[2]);
      if (monthIdx !== -1) {
        const year = base.getFullYear();
        const proposed = new Date(year, monthIdx, day);
        if (proposed < new Date()) proposed.setFullYear(year + 1);
        base.setFullYear(proposed.getFullYear(), proposed.getMonth(), proposed.getDate());
      }
    }
  }
  base.setHours(hour, 0, 0, 0);
  return base.toISOString();
}

const STEP_TITLES = ['Your Cart', 'Select Address', 'Select Date', 'Select Time Slot', 'Booking Summary'];

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (i === 0) return 'Today';
    if (i === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  });
  const [selectedDate, setSelectedDate] = useState('Today');
  const [selectedSlot, setSelectedSlot] = useState('9 AM - 11 AM');
  const [done, setDone] = useState(false);

  const { data: cart, isLoading: cartLoading } = useQuery({
    queryKey: ['/api/cart', accessToken],
    queryFn: () => cartApi.get(accessToken!),
    enabled: !!accessToken,
  });

  const { data: addresses = [], isLoading: addrsLoading } = useQuery({
    queryKey: ['/api/addresses', accessToken],
    queryFn: () => addressesApi.list(accessToken!),
    enabled: !!accessToken && step >= 1,
  });

  useEffect(() => {
    if (addresses.length && !selectedAddressId) {
      const def = addresses.find((a: Address) => a.isDefault);
      setSelectedAddressId(def?.id ?? addresses[0]?.id ?? null);
    }
  }, [addresses]);

  const cartUpdateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      quantity > 0 ? cartApi.update(itemId, quantity, accessToken!) : cartApi.remove(itemId, accessToken!),
    onSuccess: (next) => queryClient.setQueryData(['/api/cart', accessToken], next),
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      cartApi.checkout(
        {
          scheduledAt: buildScheduledAt(selectedDate, selectedSlot),
          addressId: selectedAddressId ?? undefined,
        },
        accessToken!,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart', accessToken] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings', accessToken] });
      setDone(true);
      setStep(5);
    },
    onError: (e: any) => {
      Alert.alert('Booking failed', e?.message ?? 'Please try again.');
    },
  });

  const selectedAddress = addresses.find((a: Address) => a.id === selectedAddressId);
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  if (!accessToken) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.mutedForeground }}>Please sign in to checkout.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => step > 0 && !done ? setStep(step - 1) : router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {done ? 'Booking Confirmed!' : STEP_TITLES[step]}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Progress bar */}
      {!done && (
        <View style={[styles.progressRow, { backgroundColor: colors.card }]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.progressDot, {
              width: i === step ? 24 : 8,
              backgroundColor: i <= step ? colors.primary : colors.border,
            }]} />
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Step 0: Cart review ── */}
        {step === 0 && (
          cartLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : !cart || cart.items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🛒</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add services to continue</Text>
              <TouchableOpacity onPress={() => router.back()} style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}>
                <Text style={styles.primaryBtnText}>Browse Services</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {cart.items.map((item) => (
                <View key={item.id} style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                      ₹{item.unitPrice} · {item.duration} min
                    </Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      onPress={() => cartUpdateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                      style={[styles.qtyBtn, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.foreground, fontSize: 16 }}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => cartUpdateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                      style={[styles.qtyBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    >
                      <Text style={{ color: '#fff', fontSize: 16 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={[styles.totalRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>Subtotal</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>₹{cart.total.toLocaleString('en-IN')}</Text>
              </View>

              <TouchableOpacity onPress={() => setStep(1)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.primaryBtnText}>Proceed to Checkout →</Text>
              </TouchableOpacity>
            </>
          )
        )}

        {/* ── Step 1: Address ── */}
        {step === 1 && (
          <>
            {addrsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : addresses.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📍</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No addresses saved</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add an address for service delivery</Text>
              </View>
            ) : (
              addresses.map((a: Address) => {
                const selected = selectedAddressId === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => setSelectedAddressId(a.id)}
                    style={[styles.addressCard, {
                      backgroundColor: selected ? colors.primary + '15' : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    }]}
                  >
                    <View style={[styles.addressIcon, { backgroundColor: selected ? colors.primary : colors.muted }]}>
                      <Ionicons name="location-outline" size={14} color={selected ? '#fff' : colors.mutedForeground} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.addressLabel, { color: selected ? colors.primary : colors.mutedForeground }]}>
                        {a.label ?? 'Address'}
                      </Text>
                      <Text style={[styles.addressLine, { color: colors.foreground }]}>{a.line1}</Text>
                      {a.line2 ? <Text style={[styles.addressMeta, { color: colors.mutedForeground }]}>{a.line2}</Text> : null}
                      <Text style={[styles.addressMeta, { color: colors.mutedForeground }]}>
                        {[a.city, a.state].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected ? colors.primary : colors.border}
                    />
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              onPress={() => router.push('/addresses')}
              style={[styles.outlineBtn, { borderColor: colors.primary }]}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Add New Address</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep(2)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 2: Date ── */}
        {step === 2 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Choose a preferred date</Text>
            <View style={styles.dateGrid}>
              {dates.map((d) => {
                const selected = selectedDate === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setSelectedDate(d)}
                    style={[styles.dateChip, {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    }]}
                  >
                    <Text style={[styles.dateChipText, { color: selected ? '#fff' : colors.foreground }]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setStep(3)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3: Time Slot ── */}
        {step === 3 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Pick a time for {selectedDate}
            </Text>
            <View style={styles.slotGrid}>
              {TIME_SLOTS.map((slot) => {
                const selected = selectedSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    style={[styles.slotChip, {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    }]}
                  >
                    <Ionicons name="time-outline" size={16} color={selected ? '#fff' : colors.mutedForeground} />
                    <Text style={[styles.slotText, { color: selected ? '#fff' : colors.foreground }]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setStep(4)} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 4: Summary ── */}
        {step === 4 && cart && (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryCardTitle, { color: colors.mutedForeground }]}>SERVICES</Text>
              {cart.items.map((item) => (
                <View key={item.id} style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.foreground }]}>
                    {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
                  </Text>
                  <Text style={[styles.summaryVal, { color: colors.foreground }]}>₹{item.lineTotal.toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>

            {[
              { label: 'Date', value: selectedDate },
              { label: 'Time', value: selectedSlot },
              { label: 'Address', value: selectedAddress ? `${selectedAddress.line1}, ${selectedAddress.city}` : 'Not selected' },
            ].map((r) => (
              <View key={r.label} style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{r.label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>{r.value}</Text>
              </View>
            ))}

            <View style={[styles.totalRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>₹{cart.total.toLocaleString('en-IN')}</Text>
            </View>

            <TouchableOpacity
              onPress={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: checkoutMutation.isPending ? 0.6 : 1 }]}
            >
              <Text style={styles.primaryBtnText}>
                {checkoutMutation.isPending ? 'Confirming…' : 'Confirm Booking'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 5: Success ── */}
        {step === 5 && (
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color="#16A34A" />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Booking Confirmed!</Text>
            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
              We're finding the best professional for your service.
            </Text>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, width: '100%' }]}>
              <Text style={[styles.summaryCardTitle, { color: colors.mutedForeground }]}>BOOKING DETAILS</Text>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground, marginBottom: 2 }]}>Date · Time</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{selectedDate} · {selectedSlot}</Text>
              {selectedAddress && (
                <>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground, marginTop: 8, marginBottom: 2 }]}>Address</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>
                    {selectedAddress.line1}, {selectedAddress.city}
                  </Text>
                </>
              )}
              <Text style={[styles.infoLabel, { color: '#D97706', marginTop: 8 }]}>Status: Searching Professional</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/bookings')}
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
            >
              <Text style={styles.primaryBtnText}>View My Bookings</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 10 },
  progressDot: { height: 6, borderRadius: 4 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
  itemName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemMeta: { fontSize: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14 },
  totalLabel: { fontSize: 15, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '900' },
  primaryBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed' },
  outlineBtnText: { fontWeight: '700', fontSize: 14 },
  addressCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 2, borderRadius: 14, padding: 14 },
  addressIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addressLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  addressLine: { fontSize: 14, fontWeight: '600' },
  addressMeta: { fontSize: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 2, minWidth: '45%', alignItems: 'center' },
  dateChipText: { fontSize: 13, fontWeight: '700' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  slotChip: { flexDirection: 'column', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 14, borderWidth: 2, minWidth: '44%' },
  slotText: { fontSize: 13, fontWeight: '700' },
  summaryCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  summaryCardTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  summaryKey: { fontSize: 14, fontWeight: '600', flex: 1 },
  summaryVal: { fontSize: 14, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 8 },
  success: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800' },
  successSub: { fontSize: 13, textAlign: 'center' },
});
