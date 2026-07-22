import React, { useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Platform, RefreshControl, ScrollView, ActivityIndicator, Linking } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { bookingsApi, reviewsApi, getPaymentConfig, API_BASE, type Booking, type Payment } from '@/lib/api';
import { BookingCard } from '@/components/BookingCard';
import { queryClient } from '@/lib/queryClient';

/* ── Payment bottom-sheet ─────────────────────────────────────────── */
function PaymentSheet({ booking, token, onClose, onPaid }: {
  booking: Booking;
  token: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const colors = useColors();
  const [config, setConfig] = useState<{ methods: string[]; upiVpa: string | null; razorpayKeyId: string | null; stripePublishableKey: string | null } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [upiRef, setUpiRef] = useState('');
  const [paid, setPaid] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  React.useEffect(() => {
    bookingsApi.getPayment(booking.id, token).then(p => {
      if (p?.status === 'paid') setPaid(true);
    }).catch(() => {});

    getPaymentConfig().then(cfg => {
      setConfig(cfg);
      if (cfg.methods.length) setSelected(cfg.methods[0]);
    }).catch(() => setConfig({ methods: ['cash'], upiVpa: null, razorpayKeyId: null, stripePublishableKey: null }));
  }, [booking.id, token]);

  /* ── Gateway WebView checkout ──────────────────────────────────── */
  const openGatewayCheckout = async () => {
    if (!selected) return;
    setCheckoutLoading(true);
    try {
      if (selected === 'razorpay') {
        const order = await bookingsApi.createRazorpayOrder(booking.id, token);
        const params = new URLSearchParams({
          orderId:     order.orderId,
          amount:      String(order.amount),
          keyId:       order.keyId,
          bookingId:   order.bookingId,
          name:        order.businessName,
          description: booking.serviceName ?? 'Service',
        });
        setCheckoutUrl(`${API_BASE}/api/payments/razorpay/checkout?${params.toString()}`);
      } else if (selected === 'stripe') {
        const session = await bookingsApi.createStripeSession(booking.id, token);
        setCheckoutUrl(session.checkoutUrl);
      }
    } catch (e: any) {
      Alert.alert('Payment error', e.message ?? 'Could not start payment. Try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* ── Handle WebView navigation (deep-link interception) ────────── */
  const handleWebViewNav = (navState: WebViewNavigation) => {
    const url = navState.url ?? '';
    if (url.startsWith('servenow://payment-success')) {
      setCheckoutUrl(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaid(true);
      setTimeout(() => { onPaid(); onClose(); }, 1500);
      return false; // stop navigation
    }
    if (url.startsWith('servenow://payment-cancel')) {
      setCheckoutUrl(null);
      return false;
    }
    return true;
  };

  /* ── Cash / UPI submit ─────────────────────────────────────────── */
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select a payment method');
      return bookingsApi.submitPayment(booking.id, { method: selected, notes: upiRef || undefined }, token);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaid(true);
      setTimeout(() => { onPaid(); onClose(); }, 1500);
    },
    onError: (e: any) => Alert.alert('Payment failed', e.message ?? 'Please try again'),
  });

  const METHOD_INFO: Record<string, { icon: any; label: string; desc: string }> = {
    cash:       { icon: 'cash-outline', label: 'Cash on Delivery',   desc: 'Pay the professional in cash' },
    upi_manual: { icon: 'phone-portrait-outline', label: 'UPI Payment',        desc: config?.upiVpa ? `Pay to ${config.upiVpa}` : 'Pay via UPI app' },
    razorpay:   { icon: 'card-outline', label: 'Razorpay',           desc: 'Cards, Net Banking, Wallets & UPI' },
    stripe:     { icon: 'globe-outline', label: 'Card (International)',desc: 'Visa, Mastercard & more via Stripe' },
  };

  /* ── Gateway WebView modal ─────────────────────────────────────── */
  if (checkoutUrl) {
    return (
      <View style={[styles.sheet, { backgroundColor: '#000', paddingTop: 0 }]}>
        <View style={styles.webviewHeader}>
          <Text style={styles.webviewTitle}>Secure Checkout</Text>
          <TouchableOpacity onPress={() => setCheckoutUrl(null)} style={styles.webviewClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <WebView
          source={{ uri: checkoutUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={handleWebViewNav}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url.startsWith('servenow://')) {
              handleWebViewNav(req as any);
              return false;
            }
            return true;
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webviewLoader}>
              <ActivityIndicator size="large" color="#5B3EF5" />
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
        />
      </View>
    );
  }

  if (paid) {
    return (
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={styles.paidSuccess}>
          <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
          <Text style={[styles.paidTitle, { color: colors.foreground }]}>Payment Recorded!</Text>
          <Text style={[styles.paidSub, { color: colors.mutedForeground }]}>Thank you for using ServeNow</Text>
        </View>
      </View>
    );
  }

  const isGateway = selected === 'razorpay' || selected === 'stripe';

  return (
    <View style={[styles.sheet, { backgroundColor: colors.card }]}>
      {/* Handle bar */}
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      {/* Header */}
      <View style={styles.sheetHeader}>
        <View>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Complete Payment</Text>
          <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>{booking.serviceName} · {booking.proName}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Amount pill */}
      <View style={[styles.amountPill, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[styles.amountText, { color: colors.primary }]}>₹{booking.price}</Text>
        <Text style={[styles.amountLabel, { color: colors.primary + '88' }]}>total due</Text>
      </View>

      {/* Payment methods */}
      <Text style={[styles.methodsLabel, { color: colors.mutedForeground }]}>CHOOSE PAYMENT METHOD</Text>

      {!config ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.methodsList}>
          {config.methods.map(method => {
            const info = METHOD_INFO[method] ?? { icon: 'card-outline', label: method, desc: '' };
            const isSelected = selected === method;
            return (
              <TouchableOpacity
                key={method}
                onPress={() => setSelected(method)}
                activeOpacity={0.7}
                style={[
                  styles.methodRow,
                  { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary + '0F' : colors.muted }
                ]}
              >
                <Ionicons name={info.icon} size={24} color={colors.primary} style={{ width: 28, textAlign: 'center' }} />
                <View style={styles.methodInfo}>
                  <Text style={[styles.methodName, { color: colors.foreground }]}>{info.label}</Text>
                  <Text style={[styles.methodDesc, { color: colors.mutedForeground }]}>{info.desc}</Text>
                </View>
                <View style={[styles.radio, { borderColor: isSelected ? colors.primary : colors.border }]}>
                  {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* UPI Payment — QR + VPA */}
      {selected === 'upi_manual' && config?.upiVpa && (
        <View style={[styles.upiBox, { backgroundColor: '#EFF6FF' }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              const upiUrl = `upi://pay?pa=${encodeURIComponent(config.upiVpa!)}&pn=ServeNow&am=${booking.price}&cu=INR`;
              Linking.openURL(upiUrl).catch(() => {});
            }}
          >
            <View style={styles.upiQrWrap}>
              <QRCode
                value={`upi://pay?pa=${config.upiVpa}&pn=ServeNow&am=${booking.price}&cu=INR`}
                size={150}
                color="#1E3A8A"
                backgroundColor="transparent"
              />
            </View>
          </TouchableOpacity>
          <Text style={styles.upiQrHint}>Scan with any UPI app  •  Tap to open directly</Text>
          <View style={styles.upiVpaRow}>
            <Text style={styles.upiLabel}>UPI ID</Text>
            <Text style={styles.upiVpa} selectable>{config.upiVpa}</Text>
          </View>
          <Text style={styles.upiHint}>₹{booking.price} will be pre-filled. Enter UTR/transaction ID below after payment.</Text>
        </View>
      )}

      {selected === 'upi_manual' && (
        <TextInput
          value={upiRef}
          onChangeText={setUpiRef}
          placeholder="UPI transaction ID / UTR (optional)"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.upiInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 12 }]}
        />
      )}

      {/* Gateway info banner */}
      {selected === 'razorpay' && (
        <View style={[styles.gatewayBanner, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
          <Text style={[styles.gatewayBannerText, { color: '#92400E' }]}>
            You'll be redirected to Razorpay's secure checkout to pay by card, net banking, wallet, or UPI.
          </Text>
        </View>
      )}
      {selected === 'stripe' && (
        <View style={[styles.gatewayBanner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
          <Text style={[styles.gatewayBannerText, { color: '#1E40AF' }]}>
            You'll be redirected to Stripe's secure checkout. Supports Visa, Mastercard, and international cards.
          </Text>
        </View>
      )}

      {/* Pay button */}
      <TouchableOpacity
        onPress={isGateway ? openGatewayCheckout : () => submitMutation.mutate()}
        disabled={!selected || submitMutation.isPending || checkoutLoading || !config}
        activeOpacity={0.85}
        style={[styles.payBtn, { backgroundColor: colors.primary, opacity: (!selected || submitMutation.isPending || checkoutLoading || !config) ? 0.5 : 1 }]}
      >
        {(submitMutation.isPending || checkoutLoading) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>
            {selected === 'cash'       ? 'Confirm Cash Payment'
            : selected === 'upi_manual' ? 'Confirm UPI Payment'
            : selected === 'razorpay'   ? `Pay ₹${booking.price} via Razorpay`
            : selected === 'stripe'     ? `Pay ₹${booking.price} via Stripe`
            : `Pay ₹${booking.price}`}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [reviewModal, setReviewModal] = useState<Booking | null>(null);
  const [payModal, setPayModal] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['/api/bookings', accessToken],
    queryFn: () => bookingsApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancel(id, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewsApi.create({ bookingId: reviewModal!.id, rating, comment }, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setReviewModal(null);
      setComment('');
      setRating(5);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const UPCOMING = ['upcoming', 'in_progress'];
  const filtered = (bookings ?? []).filter((b) =>
    tab === 'upcoming' ? UPCOMING.includes(b.status) : !UPCOMING.includes(b.status),
  );

  if (!isAuthenticated) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPadding }]}>
        <Ionicons name="calendar-outline" size={56} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your bookings</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Sign in to view and manage your bookings</Text>
        <TouchableOpacity
          onPress={() => router.push('/auth')}
          style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
          activeOpacity={0.85}
        >
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Bookings</Text>
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.muted, borderRadius: 100 }]}>
          {(['upcoming', 'past'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, { backgroundColor: tab === t ? colors.card : 'transparent', borderRadius: 100 }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: tab === t ? colors.foreground : colors.mutedForeground, fontWeight: tab === t ? '700' : '500' }]}>
                {t === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No {tab} bookings</Text>
              {tab === 'upcoming' && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/services')} style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
                  <Text style={styles.signInBtnText}>Browse Services</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onCancel={(id) => Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
              { text: 'Keep', style: 'cancel' },
              { text: 'Cancel Booking', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
            ])}
            onReview={(b) => setReviewModal(b)}
            onPay={(b) => setPayModal(b)}
          />
        )}
      />

      {/* Review Modal */}
      <Modal visible={!!reviewModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.reviewSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.reviewHeader}>
              <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Rate Your Experience</Text>
              <TouchableOpacity onPress={() => setReviewModal(null)}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.reviewPro, { color: colors.mutedForeground }]}>{reviewModal?.proName}</Text>

            {/* Star rating */}
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => { setRating(s); Haptics.selectionAsync(); }}>
                  <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={32} color={s <= rating ? '#FBBF24' : colors.border} />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience (optional)..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              style={[styles.reviewInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
            />

            <TouchableOpacity
              onPress={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              style={[styles.reviewSubmit, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              activeOpacity={0.85}
            >
              <Text style={styles.reviewSubmitText}>
                {reviewMutation.isPending ? 'Submitting…' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={!!payModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          {payModal && accessToken && (
            <PaymentSheet
              booking={payModal}
              token={accessToken}
              onClose={() => setPayModal(null)}
              onPaid={() => {
                setPayModal(null);
                queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  tabs: { flexDirection: 'row', padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  tabText: { fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  signInBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  signInBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reviewSheet: { margin: 16, padding: 24, gap: 16 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTitle: { fontSize: 18, fontWeight: '700' },
  reviewPro: { fontSize: 13, marginTop: -8 },
  stars: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  reviewInput: { padding: 12, fontSize: 14, textAlignVertical: 'top', minHeight: 80 },
  reviewSubmit: { paddingVertical: 14, alignItems: 'center' },
  reviewSubmitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Payment sheet
  sheet: { marginHorizontal: 0, paddingHorizontal: 20, paddingBottom: 40, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 0 },
  webviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  webviewTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  webviewClose: { padding: 6 },
  webviewLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  gatewayBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  gatewayBannerText: { fontSize: 12, lineHeight: 18 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSub: { fontSize: 12, marginTop: 3 },
  amountPill: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  amountText: { fontSize: 28, fontWeight: '800' },
  amountLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  methodsLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  methodsList: { gap: 10, marginBottom: 16 },
  methodRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 2, gap: 12 },
  methodIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 14, fontWeight: '700' },
  methodDesc: { fontSize: 12, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  upiBox: { borderRadius: 14, padding: 14, marginBottom: 12, alignItems: 'center', gap: 6 },
  upiQrWrap: { padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 4 },
  upiQrHint: { fontSize: 11, color: '#3B82F6', textAlign: 'center' },
  upiVpaRow: { alignItems: 'center', gap: 2 },
  upiLabel: { fontSize: 11, fontWeight: '600', color: '#1D4ED8', textTransform: 'uppercase' },
  upiVpa: { fontSize: 15, fontWeight: '700', color: '#1E3A8A', letterSpacing: 0.3 },
  upiHint: { fontSize: 11, color: '#3B82F6', textAlign: 'center' },
  upiInput: { padding: 12, fontSize: 14, marginBottom: 16 },
  payBtn: { paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 4 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  paidSuccess: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  paidIcon: { fontSize: 52 },
  paidTitle: { fontSize: 22, fontWeight: '800' },
  paidSub: { fontSize: 14 },
});
