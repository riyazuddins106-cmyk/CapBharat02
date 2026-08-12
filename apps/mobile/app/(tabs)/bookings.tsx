import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, Platform, RefreshControl, ScrollView, ActivityIndicator, Linking, AppState } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { bookingConfigApi, bookingsApi, ordersApi, reviewsApi, getPaymentConfig, testPay, API_BASE, type Booking, type BookingConfig, type Order, type OrderItem, type Payment, type PaymentConfig } from '@/lib/api';
import { consumePendingPayId } from '@/lib/pendingPayment';
import { BookingCard } from '@/components/BookingCard';
import { queryClient } from '@/lib/queryClient';

function calculateCancellationFee(
  rateValue: unknown,
  minValue: unknown,
  maxValue: unknown,
  applicableAmount: number,
  fallbackRate: number,
) {
  const rate = Number(rateValue);
  const configuredMin = Number(minValue);
  const configuredMax = Number(maxValue);
  const min = Number.isFinite(configuredMin) ? Math.max(0, Math.round(configuredMin)) : 0;
  const max = Number.isFinite(configuredMax) ? Math.max(min, Math.round(configuredMax)) : Number.MAX_SAFE_INTEGER;
  const percentage = Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : fallbackRate;
  const calculated = Math.round(Math.max(0, Number(applicableAmount) || 0) * percentage / 100);
  return Math.max(min, Math.min(max, calculated));
}

/* ── Payment bottom-sheet ─────────────────────────────────────────── */
function PaymentSheet({ booking, token, onClose, onPaid }: {
  booking: Booking;
  token: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const colors = useColors();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [upiRef, setUpiRef] = useState('');
  const [paid, setPaid] = useState(false);
  const [upiPending, setUpiPending] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  React.useEffect(() => {
    bookingsApi.getPayment(booking.id, token).then(p => {
      if (p?.status === 'paid') setPaid(true);
    }).catch(() => {});

    getPaymentConfig().then(cfg => {
      setConfig(cfg);
      if (cfg.methods.length) setSelected(cfg.methods[0]);
    }).catch(() => setConfig({ testMode: false, methods: ['cash'], upiVpa: null, razorpayKeyId: null, stripePublishableKey: null }));
  }, [booking.id, token]);

  /* ── Test-mode instant pay ─────────────────────────────────────── */
  const testPayMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select a payment method');
      return testPay(booking.id, selected, token);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPaid(true);
      setTimeout(() => { onPaid(); onClose(); }, 1500);
    },
    onError: (e: any) => Alert.alert('Test payment failed', e.message ?? 'Please try again'),
  });

  /* ── Gateway WebView checkout ──────────────────────────────────── */
  const openGatewayCheckout = async () => {
    if (!selected) return;
    // In test mode: bypass gateway, mark paid directly
    if (config?.testMode) { testPayMutation.mutate(); return; }
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
      // In test mode cash/upi also go through test-pay for consistency
      if (config?.testMode) return testPay(booking.id, selected, token);
      return bookingsApi.submitPayment(booking.id, { method: selected, notes: upiRef || undefined }, token);
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (data.status === 'paid') {
        // Cash confirmed immediately — close sheet after brief success flash
        setPaid(true);
        setTimeout(() => { onPaid(); onClose(); }, 1500);
      } else {
        // UPI manual — server records status='created'; awaiting partner confirmation
        setUpiPending(true);
      }
    },
    onError: (e: any) => Alert.alert('Payment failed', e.message ?? 'Please try again'),
  });

  const METHOD_INFO: Record<string, { icon: any; label: string; desc: string }> = {
    cash:       { icon: 'cash-outline', label: 'Cash on Delivery',   desc: 'Pay on delivery in cash' },
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
        <TouchableOpacity onPress={onClose} style={styles.sheetCloseTopRight}>
          <Ionicons name="close" size={24} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.paidSuccess}>
          <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
          <Text style={[styles.paidTitle, { color: colors.foreground }]}>Payment Recorded!</Text>
          <Text style={[styles.paidSub, { color: colors.mutedForeground }]}>Thank you for using ServeNow</Text>
        </View>
      </View>
    );
  }

  if (upiPending) {
    return (
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={styles.paidSuccess}>
          <Ionicons name="time-outline" size={48} color="#F59E0B" />
          <Text style={[styles.paidTitle, { color: colors.foreground }]}>UPI Payment Submitted</Text>
          <Text style={[styles.paidSub, { color: colors.mutedForeground }]}>
            Your payment is pending partner confirmation.{'\n'}
            Share your UTR/transaction ID with the partner to confirm receipt.
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{ marginTop: 16, paddingHorizontal: 28, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isGateway = selected === 'razorpay' || selected === 'stripe';

  return (
    <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: 0, maxHeight: '88%' }]}>
      {/* Handle bar */}
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      {/* Header — pinned */}
      <View style={styles.sheetHeader}>
        <View>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Complete Payment</Text>
          <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>{booking.serviceName} · {booking.proName}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Amount pill */}
        <View style={[styles.amountPill, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.amountText, { color: colors.primary }]}>₹{booking.price}</Text>
          <Text style={[styles.amountLabel, { color: colors.primary + '88' }]}>total due</Text>
        </View>

        {/* Test mode banner */}
        {config?.testMode && (
          <View style={styles.testBanner}>
            <Text style={styles.testBannerTitle}>🧪 Test Mode Active</Text>
            <Text style={styles.testBannerSub}>Configured methods are simulated · no real charge is made.</Text>
          </View>
        )}

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
         {config && !config.methods.includes('upi_manual') && (
           <Text style={{ color: '#92400E', backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginTop: 10, fontSize: 11, lineHeight: 16 }}>
             UPI is not configured. Choose another payment method or ask Admin to add a UPI ID.
           </Text>
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
      </ScrollView>

      {/* Pay button — pinned at bottom */}
      <View style={[styles.payBtnWrap, { borderTopColor: colors.border }]}>
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
    </View>
  );
}

function formatOrderTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function OrderItemPaymentSheet({ order, item, token, onClose, onPaid }: {
  order: Order;
  item: OrderItem;
  token: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const colors = useColors();
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPaymentConfig().then((value) => {
      setConfig(value);
      setSelected(value.methods[0] ?? 'cash');
    }).catch(() => setConfig({ testMode: false, methods: ['cash'], upiVpa: null, razorpayKeyId: null, stripePublishableKey: null }));
  }, []);

  const complete = () => {
    setCheckoutUrl(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPaid();
  };

  const submit = async () => {
    if (!selected || !config) return;
    setBusy(true);
    try {
      if (config.testMode) {
        await ordersApi.testPayItem(order.id, item.id, selected, token);
        complete();
      } else if (selected === 'cash' || selected === 'upi_manual') {
        await ordersApi.payItem(order.id, item.id, selected, undefined, token);
        complete();
      } else if (selected === 'razorpay') {
        const gatewayOrder = await ordersApi.createRazorpayOrder(order.id, item.id, token);
        const params = new URLSearchParams({
          orderId: gatewayOrder.orderId,
          amount: String(gatewayOrder.amount),
          keyId: gatewayOrder.keyId,
          bookingId: order.id,
          itemId: item.id,
          name: 'ServeNow',
          description: item.serviceName ?? gatewayOrder.serviceName,
        });
        setCheckoutUrl(`${API_BASE}/api/payments/razorpay/checkout?${params.toString()}`);
      } else {
        const session = await ordersApi.createStripeSession(order.id, item.id, token);
        if (!session.checkoutUrl) throw new Error('Stripe checkout is not available.');
        setCheckoutUrl(session.checkoutUrl);
      }
    } catch (error: any) {
      Alert.alert('Payment error', error.message ?? 'Could not start payment.');
      setBusy(false);
    }
  };

  if (checkoutUrl) {
    return <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={[styles.webviewHeader, { paddingTop: 18 }]}>
        <Text style={styles.webviewTitle}>Pay ₹{item.customerPrice}</Text>
        <TouchableOpacity onPress={() => { setCheckoutUrl(null); setBusy(false); }} style={styles.webviewClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
      </View>
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={(state) => {
          if (state.url.startsWith('servenow://payment-success')) complete();
          if (state.url.startsWith('servenow://payment-cancel')) { setCheckoutUrl(null); setBusy(false); }
        }}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" />}
      />
    </View>;
  }

  return <View style={[styles.sheet, { backgroundColor: colors.card }]}>
    <View style={styles.handle} />
    <View style={styles.sheetHeader}>
      <View><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Pay for {item.serviceName ?? 'Service'}</Text><Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>Payment is required to start this service</Text></View>
      <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.mutedForeground} /></TouchableOpacity>
    </View>
    <View style={[styles.amountPill, { backgroundColor: colors.muted }]}><Text style={[styles.amountText, { color: colors.primary }]}>₹{item.customerPrice}</Text><Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>Service amount</Text></View>
    <Text style={[styles.methodsLabel, { color: colors.mutedForeground }]}>CHOOSE PAYMENT METHOD</Text>
    <View style={styles.methodsList}>
      {(config?.methods.length ? config.methods : ['cash']).map((method) => (
        <TouchableOpacity key={method} onPress={() => setSelected(method)} style={[styles.methodRow, { borderColor: selected === method ? colors.primary : colors.border, backgroundColor: selected === method ? colors.secondary : colors.card }]}>
          <Text style={styles.methodIcon}>{method === 'cash' ? '💵' : method === 'upi_manual' ? '📱' : method === 'stripe' ? '💳' : '🔒'}</Text>
          <View style={styles.methodInfo}><Text style={[styles.methodName, { color: colors.foreground }]}>{method.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Text><Text style={[styles.methodDesc, { color: colors.mutedForeground }]}>{method === 'cash' ? 'Pay the partner in cash' : `Secure ${method} checkout`}</Text></View>
          <View style={[styles.radio, { borderColor: selected === method ? colors.primary : colors.border }]}>{selected === method && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}</View>
        </TouchableOpacity>
      ))}
    </View>
    <TouchableOpacity onPress={submit} disabled={!selected || !config || busy} style={[styles.payBtn, { backgroundColor: colors.primary, opacity: (!selected || !config || busy) ? 0.5 : 1 }]}><Text style={styles.payBtnText}>{busy ? 'Processing…' : `Pay ₹${item.customerPrice}`}</Text></TouchableOpacity>
  </View>;
}

function OrderServiceCard({ order, item, bookingConfig, onAction, busy, now }: {
  order: Order;
  item: OrderItem;
  bookingConfig?: BookingConfig;
  onAction: (action: 'cancel' | 'continue' | 'pay', orderId: string, itemId: string, reason?: string) => void;
  busy: string | null;
  now: number;
}) {
  const colors = useColors();
  const { accessToken } = useAuth();
  const canCancel = !['cancelled', 'service_started', 'service_completed'].includes(item.status);
  const fallbackSearchStart = item.updatedAt ?? item.createdAt;
  const searchDeadline = item.dispatchDeadline
    ?? (fallbackSearchStart ? new Date(new Date(fallbackSearchStart).getTime() + 10 * 60_000).toISOString() : null);
  const searchSecondsRemaining = searchDeadline
    ? Math.max(0, Math.ceil((new Date(searchDeadline).getTime() - now) / 1000))
    : null;
  const searchExpired = item.status === 'waiting_operation'
    || (item.status === 'searching_partner' && searchSecondsRemaining !== null && searchSecondsRemaining <= 0);
  const activelySearching = item.status === 'searching_partner' && !searchExpired;
  const canContinue = !item.partnerId && searchExpired && item.status !== 'cancelled';
  const cashReported = item.payment?.method === 'cash' && !!item.payment.cashReportedAt && item.payment.status !== 'paid';
  // Cash is a two-step flow: the customer reports the cash, then the partner
  // confirms receipt. Once reported, it must not remain in "Pay Now" or look
  // like an unknown payment due.
  const needsPayment = ['partner_arrived', 'payment_pending'].includes(item.status)
    && item.payment?.status !== 'paid'
    && !cashReported;
  const actionKey = (action: string) => `${action}:${item.id}`;
  const [showDetails, setShowDetails] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const canShowQr = ['partner_accepted', 'partner_arrived', 'payment_pending', 'payment_completed', 'service_started'].includes(item.status);
  const cancellationFeeAmount = item.status === 'partner_accepted'
    ? calculateCancellationFee(
      bookingConfig?.cancellationFeeAfterAcceptancePercent,
      bookingConfig?.cancellationFeeAfterAcceptanceMinAmount,
      bookingConfig?.cancellationFeeAfterAcceptanceMaxAmount,
      item.customerPrice,
      20,
    )
    : ['partner_arrived', 'payment_pending', 'payment_completed'].includes(item.status)
      ? calculateCancellationFee(
        bookingConfig?.cancellationFeeAfterCheckinPercent,
        bookingConfig?.cancellationFeeAfterCheckinMinAmount,
        bookingConfig?.cancellationFeeAfterCheckinMaxAmount,
        item.customerPrice,
        20,
      )
      : 0;
  const estimatedFee = Math.min(item.customerPrice, cancellationFeeAmount);
  const paymentConfirmed = item.payment?.status === 'paid';
  const paymentMissingBeforeCompletion = ['service_started', 'service_completed'].includes(item.status) && !paymentConfirmed;
  const statusSteps = [
    { key: 'searching_partner', label: 'Finding a partner' },
    { key: 'partner_accepted', label: 'Partner accepted' },
    { key: 'partner_arrived', label: 'Partner checked in' },
    { key: 'payment_completed', label: paymentMissingBeforeCompletion ? 'Payment pending' : 'Payment confirmed' },
    { key: 'service_started', label: 'Service in progress' },
    { key: 'service_completed', label: 'Service completed' },
  ];
  const currentStep = item.status === 'cancelled'
    ? -1
    : paymentMissingBeforeCompletion
      ? 2
    : Math.max(0, statusSteps.findIndex((step) => step.key === item.status));

  const openQr = async () => {
    if (!accessToken) return;
    setShowDetails(true);
    if (qrToken) return;
    setQrLoading(true);
    try {
      const data = await ordersApi.getItemQr(order.id, item.id, accessToken);
      setQrToken(data.qrToken);
    } catch (error: any) {
      Alert.alert('QR unavailable', error?.message ?? 'The customer QR code could not be loaded.');
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <>
    <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={styles.orderHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.orderLabel, { color: colors.primary }]}>SERVICE ORDER</Text>
          <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>{formatOrderTime(order.scheduledAt)} · ₹{order.totalAmount}</Text>
          <Text style={[styles.orderMeta, { color: colors.mutedForeground }]} numberOfLines={1}>Order ID: {order.id}</Text>
        </View>
        <Text style={[styles.orderStatus, { color: colors.primary }]}>{order.status.replaceAll('_', ' ')}</Text>
      </View>
      <View style={[styles.orderItem, { backgroundColor: colors.muted }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.orderServiceName, { color: colors.foreground }]}>{item.serviceName ?? 'Service'}</Text>
          <Text style={[styles.orderDetail, { color: colors.mutedForeground }]}>
            {item.partnerName ? `Partner: ${item.partnerName}` : 'Partner: searching'}
          </Text>
          <Text style={[styles.orderDetail, { color: colors.mutedForeground }]}>
            {formatOrderTime(item.startTime)} – {formatOrderTime(item.endTime)}
          </Text>
        </View>
        <Text style={[styles.orderItemStatus, { color: colors.foreground }]}>
          {activelySearching ? 'Searching' : searchExpired ? 'Search paused' : item.status.replaceAll('_', ' ')}
        </Text>
      </View>
      {activelySearching && (
        <Text style={[styles.searchTimer, { color: colors.primary, backgroundColor: colors.muted }]}>
          Searching for a partner · {Math.floor((searchSecondsRemaining ?? 0) / 60)}:{String((searchSecondsRemaining ?? 0) % 60).padStart(2, '0')} remaining
        </Text>
      )}
      {searchExpired && !item.partnerId && (
        <Text style={[styles.searchPaused, { color: '#92400E', backgroundColor: '#FEF3C7' }]}>
          Search paused. Continue searching when you’re ready.
        </Text>
      )}
      {cancellationFeeAmount > 0 && canCancel && (
        <Text style={[styles.cancellationNotice, { color: '#92400E', backgroundColor: '#FFFBEB' }]}>
          Cancelling now may incur a cancellation fee of ₹{estimatedFee}.
        </Text>
      )}
       <TouchableOpacity onPress={() => setShowDetails(true)} style={styles.detailsLink}>
         <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
         <Text style={[styles.detailsLinkText, { color: colors.primary }]}>View service details & tracking</Text>
       </TouchableOpacity>
      {(canContinue || needsPayment || canCancel) && (
        <View style={styles.orderActions}>
          {canContinue && (
            <TouchableOpacity
              onPress={() => onAction('continue', order.id, item.id)}
              disabled={busy === actionKey('continue')}
              style={[styles.orderActionBtn, { borderColor: colors.primary }]}
            >
              <Text style={[styles.orderActionText, { color: colors.primary }]}>
                {busy === actionKey('continue') ? 'Searching…' : 'Continue Searching'}
              </Text>
            </TouchableOpacity>
          )}
          {needsPayment && !cashReported && (
            <TouchableOpacity
              onPress={() => onAction('pay', order.id, item.id)}
              disabled={busy === actionKey('pay')}
              style={[styles.orderActionBtn, { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}
            >
              <Text style={[styles.orderActionText, { color: '#fff' }]}>
                {busy === actionKey('pay') ? 'Paying…' : `Pay ₹${item.customerPrice}`}
              </Text>
            </TouchableOpacity>
          )}
          {cashReported && (
            <View style={[styles.orderActionBtn, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
              <Text style={[styles.orderActionText, { color: '#92400E' }]}>Cash reported · Awaiting partner</Text>
            </View>
          )}
          {canCancel && (
            <TouchableOpacity
               onPress={() => setShowCancel(true)}
              disabled={busy === actionKey('cancel')}
              style={[styles.orderActionBtn, { borderColor: '#FCA5A5' }]}
            >
              <Text style={[styles.orderActionText, { color: '#DC2626' }]}>
                {busy === actionKey('cancel') ? 'Cancelling…' : 'Cancel Service'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
     <Modal visible={showDetails} transparent animationType="slide" onRequestClose={() => setShowDetails(false)}>
       <View style={styles.modalBackdrop}>
         <View style={[styles.orderDetailSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
           <View style={styles.reviewHeader}>
             <View style={{ flex: 1 }}>
               <Text style={[styles.reviewTitle, { color: colors.foreground }]}>{item.serviceName ?? 'Service'}</Text>
               <Text style={[styles.orderMeta, { color: colors.mutedForeground }]}>Order ID: {order.id}</Text>
             </View>
             <TouchableOpacity onPress={() => setShowDetails(false)}>
               <Ionicons name="close" size={23} color={colors.mutedForeground} />
             </TouchableOpacity>
           </View>
           <View style={[styles.detailSummary, { backgroundColor: colors.muted }]}>
             <Text style={[styles.detailSummaryTitle, { color: colors.foreground }]}>Service details</Text>
             <Text style={[styles.orderDetail, { color: colors.mutedForeground }]}>Scheduled: {formatOrderTime(item.startTime)}</Text>
             <Text style={[styles.orderDetail, { color: colors.mutedForeground }]}>Duration: {item.durationMinutes} minutes · Quantity: {item.quantity}</Text>
             <Text style={[styles.orderDetail, { color: colors.mutedForeground }]}>Partner: {item.partnerName ?? 'Searching for a partner'}</Text>
             <Text style={[styles.orderDetail, { color: colors.foreground, fontWeight: '700' }]}>Amount: ₹{item.customerPrice}</Text>
           </View>
           <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Booking tracking</Text>
           <View style={styles.timeline}>
             {statusSteps.map((step, index) => {
                const done = currentStep >= index;
                const active = item.status === step.key || (paymentMissingBeforeCompletion && step.key === 'payment_completed');
               return (
                 <View key={step.key} style={styles.timelineRow}>
                   <View style={[styles.timelineDot, { backgroundColor: done ? colors.primary : colors.border }]}>
                     {done && <Ionicons name={active ? 'radio-button-on' : 'checkmark'} size={11} color="#fff" />}
                   </View>
                   <Text style={[styles.timelineLabel, { color: done ? colors.foreground : colors.mutedForeground, fontWeight: active ? '700' : '500' }]}>{step.label}</Text>
                 </View>
               );
             })}
           </View>
           {item.status === 'cancelled' && (
             <View style={[styles.cancelledBox, { backgroundColor: '#FEF2F2' }]}>
               <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Service cancelled</Text>
               {item.cancellationReason && <Text style={{ color: '#991B1B', fontSize: 12 }}>Reason: {item.cancellationReason}</Text>}
               {!!item.cancellationFee && <Text style={{ color: '#991B1B', fontSize: 12 }}>Cancellation fee: ₹{item.cancellationFee}</Text>}
             </View>
           )}
           {canShowQr && (
             <View style={[styles.customerQrBox, { borderColor: colors.border }]}>
               <Text style={[styles.timelineTitle, { color: colors.foreground }]}>Customer check-in QR</Text>
               {qrLoading ? <ActivityIndicator color={colors.primary} style={{ height: 150 }} />
                 : qrToken ? <QRCode value={qrToken} size={150} color={colors.foreground} backgroundColor={colors.card} />
                 : <TouchableOpacity onPress={openQr} style={[styles.qrLoadButton, { backgroundColor: colors.primary }]}><Ionicons name="qr-code-outline" size={17} color="#fff" /><Text style={styles.qrLoadText}>Show QR code</Text></TouchableOpacity>}
               <Text style={[styles.orderDetail, { color: colors.mutedForeground, textAlign: 'center' }]}>Show this code to your partner when they arrive.</Text>
             </View>
           )}
         </View>
       </View>
     </Modal>
     <Modal visible={showCancel} transparent animationType="fade" onRequestClose={() => setShowCancel(false)}>
       <View style={styles.modalBackdrop}>
         <View style={[styles.cancelSheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
           <Text style={[styles.reviewTitle, { color: colors.foreground }]}>Cancel this service?</Text>
           <Text style={[styles.orderDetail, { color: colors.mutedForeground }]}>
             {cancellationFeeAmount > 0
               ? `A cancellation fee of ₹${estimatedFee} may apply because the partner has ${item.status === 'partner_accepted' ? 'accepted this service' : 'checked in'}.`
               : 'There is no cancellation fee before a partner accepts this service.'}
           </Text>
           <TextInput
             value={reason}
             onChangeText={setReason}
             placeholder="Cancellation reason (optional)"
             placeholderTextColor={colors.mutedForeground}
             style={[styles.cancelInput, { backgroundColor: colors.muted, color: colors.foreground }]}
             multiline
           />
           <View style={styles.cancelActions}>
             <TouchableOpacity onPress={() => setShowCancel(false)} style={[styles.orderActionBtn, { borderColor: colors.border }]}><Text style={[styles.orderActionText, { color: colors.foreground }]}>Keep service</Text></TouchableOpacity>
             <TouchableOpacity onPress={() => { setShowCancel(false); onAction('cancel', order.id, item.id, reason); setReason(''); }} style={[styles.orderActionBtn, { backgroundColor: '#DC2626', borderColor: '#DC2626' }]}><Text style={[styles.orderActionText, { color: '#fff' }]}>Cancel service</Text></TouchableOpacity>
           </View>
         </View>
       </View>
     </Modal>
    </>
  );
}

export default function BookingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken, isAuthenticated } = useAuth();
  const { payId: urlPayId } = useLocalSearchParams<{ payId?: string }>();
  // Consume from the module-level store set by the checkout Pay Now button.
  // router.replace from a Stack modal to a nested tab route does not reliably
  // deliver URL params in Expo Router SDK 54, so we use a synchronous store.
  const [payId] = useState<string | undefined>(() => urlPayId || consumePendingPayId() || undefined);
  const [tab, setTab] = useState<'searching' | 'upcoming' | 'awaitingPayment' | 'past'>('upcoming');
  const [reviewModal, setReviewModal] = useState<Booking | null>(null);
  const [payModal, setPayModal] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [orderActionBusy, setOrderActionBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [itemPayment, setItemPayment] = useState<{ order: Order; item: OrderItem } | null>(null);
  const { data: bookingConfig } = useQuery<BookingConfig>({
    queryKey: ['/api/booking-config'],
    queryFn: bookingConfigApi.get,
    staleTime: 60_000,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: bookings, isLoading: bookingsLoading, refetch } = useQuery({
    queryKey: ['/api/bookings', accessToken],
    queryFn: () => bookingsApi.list(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 10_000,
  });
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['/api/orders', accessToken],
    queryFn: () => ordersApi.list(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 10_000,
  });

  // Rehydrate immediately when the app returns from the background so a
  // partner acceptance, cancellation, or payment change is visible at once.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && accessToken) {
        void refetch();
        void refetchOrders();
      }
    });
    return () => subscription.remove();
  }, [accessToken, refetch, refetchOrders]);

  // When arriving from checkout with a payId, force-refresh bookings (cache may be stale)
  // and switch to the searching tab so the pending booking is visible.
  useEffect(() => {
    if (!payId) return;
    setTab('searching');
    refetch();
  }, [payId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open payment modal once fresh bookings data contains the target booking.
  // If not found on the first response (the booking was just created and the
  // server cache may not have settled yet), schedule one retry after 1.5 s.
  useEffect(() => {
    if (!payId || !bookings) return;
    const target = bookings.find((b) => b.id === payId);
    if (target) {
      setPayModal(target);
      if (target.status === 'pending') setTab('searching');
      else if (target.status === 'upcoming' || (target.status === 'in_progress' && target.paymentStatus === 'paid')) setTab('upcoming');
      else if (['in_progress', 'completed'].includes(target.status) && target.paymentStatus !== 'paid') setTab('awaitingPayment');
    } else {
      // Booking not in list yet — refetch once after a short delay.
      const timer = setTimeout(() => refetch(), 1500);
      return () => clearTimeout(timer);
    }
  }, [payId, bookings]); // eslint-disable-line react-hooks/exhaustive-deps

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
    await Promise.all([refetch(), refetchOrders()]);
    setRefreshing(false);
  };

  const handleOrderAction = async (action: 'cancel' | 'continue' | 'pay', orderId: string, itemId: string, reason?: string) => {
    const key = `${action}:${itemId}`;
    setOrderActionBusy(key);
    try {
       if (action === 'cancel') await ordersApi.cancelItem(orderId, itemId, reason, accessToken!);
      if (action === 'continue') await ordersApi.continueSearching(orderId, itemId, accessToken!);
      if (action === 'pay') {
        const order = orders.find((candidate) => candidate.id === orderId);
        const item = order?.items.find((candidate) => candidate.id === itemId);
        if (order && item) setItemPayment({ order, item });
        return;
      }
      await refetchOrders();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Could not update service', e?.message ?? 'Please try again.');
    } finally {
      setOrderActionBusy(null);
    }
  };

  const handleLegacyContinue = async (bookingId: string) => {
    setOrderActionBusy(`legacy:${bookingId}`);
    try {
      await bookingsApi.continueSearching(bookingId, accessToken!);
      await refetch();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Could not continue searching', e?.message ?? 'Please try again.');
    } finally {
      setOrderActionBusy(null);
    }
  };

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const allBookings = bookings ?? [];
  const searchingBookings       = allBookings.filter((b) => b.status === 'pending');
  const upcomingBookings        = allBookings.filter((b) => b.status === 'upcoming' || (b.status === 'in_progress' && b.paymentStatus === 'paid'));
  const awaitingPaymentBookings = allBookings.filter((b) => ['in_progress', 'completed'].includes(b.status) && b.paymentStatus !== 'paid');
  const pastBookings            = allBookings.filter((b) =>
    b.status === 'cancelled' || (b.status === 'completed' && b.paymentStatus === 'paid'),
  );
  const filteredLegacy = tab === 'searching'       ? searchingBookings
                 : tab === 'upcoming'        ? upcomingBookings
                 : tab === 'awaitingPayment' ? awaitingPaymentBookings
                 : pastBookings;

  type OrderRow = { kind: 'order'; order: Order; item: OrderItem };
  type BookingRow = { kind: 'booking'; booking: Booking };
  const allOrderRows: OrderRow[] = orders.flatMap((order) =>
    order.items.map((item) => ({ kind: 'order' as const, order, item })),
  );
  const searchingOrderRows = allOrderRows.filter(({ item }) => ['searching_partner', 'waiting_operation', 'assigned'].includes(item.status));
  const activeOrderRows = allOrderRows.filter(({ item }) =>
    ['partner_accepted', 'partner_arrived', 'payment_pending', 'payment_completed', 'service_started'].includes(item.status),
  );
  const awaitingPaymentOrderRows = allOrderRows.filter(({ item }) =>
    ['partner_arrived', 'payment_pending'].includes(item.status)
      && item.payment?.status !== 'paid'
      && !(item.payment?.method === 'cash' && !!item.payment.cashReportedAt),
  );
  const pastOrderRows = allOrderRows.filter(({ item }) => ['service_completed', 'cancelled'].includes(item.status));
  const filteredOrderRows = tab === 'searching' ? searchingOrderRows
    : tab === 'upcoming' ? activeOrderRows
    : tab === 'awaitingPayment' ? awaitingPaymentOrderRows
    : pastOrderRows;
  // The legacy booking API is still supported for older bookings, but a
  // multi-service order must be rendered from its individual order items.
  // Otherwise two services collapse into one booking and the tab state becomes
  // incorrect.
  const listRows: Array<OrderRow | BookingRow> = allOrderRows.length > 0
    ? filteredOrderRows
    : filteredLegacy.map((booking) => ({ kind: 'booking' as const, booking }));

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
          {(['searching', 'upcoming', 'awaitingPayment', 'past'] as const).map((t) => {
            const label = t === 'searching' ? 'Search' : t === 'upcoming' ? 'Active' : t === 'awaitingPayment' ? 'Pay Now' : 'Past';
            const count = allOrderRows.length > 0
              ? t === 'searching' ? searchingOrderRows.length
                : t === 'upcoming' ? activeOrderRows.length
                : t === 'awaitingPayment' ? awaitingPaymentOrderRows.length
                : pastOrderRows.length
              : t === 'searching' ? searchingBookings.length
                : t === 'upcoming' ? upcomingBookings.length
                : t === 'awaitingPayment' ? awaitingPaymentBookings.length
                : pastBookings.length;
            const isActive = tab === t;
            const tabColor = t === 'searching' ? '#7C3AED' : t === 'awaitingPayment' ? '#D97706' : colors.foreground;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[styles.tab, { backgroundColor: isActive ? colors.card : 'transparent', borderRadius: 100 }]}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.tabText, { color: isActive ? tabColor : colors.mutedForeground, fontWeight: isActive ? '700' : '500' }]}>
                    {label}
                  </Text>
                  {count > 0 && (
                    <View style={{ backgroundColor: t === 'searching' ? '#7C3AED' : t === 'awaitingPayment' ? '#D97706' : colors.primary, borderRadius: 99, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{count}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={listRows}
        keyExtractor={(row) => row.kind === 'order' ? row.item.id : row.booking.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {tab === 'searching' ? (
              <View style={[styles.searchingBanner, { backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }]}>
                <View style={styles.searchingRow}>
                  <ActivityIndicator size="small" color="#7C3AED" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.searchingTitle}>Finding your service provider</Text>
                    <Text style={styles.searchingText}>We're matching the best available service provider to your booking. You'll get a notification once confirmed.</Text>
                  </View>
                </View>
              </View>
             ) : tab === 'awaitingPayment' && awaitingPaymentOrderRows.length > 0 ? (
              <View style={[styles.searchingBanner, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <View style={styles.searchingRow}>
                  <Ionicons name="wallet-outline" size={20} color="#D97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.searchingTitle, { color: '#D97706' }]}>Service Payment Due</Text>
                     <Text style={[styles.searchingText, { color: '#92400E' }]}>
                        {awaitingPaymentOrderRows.map(({ item }) => `${item.serviceName ?? 'Service'} · ₹${item.customerPrice}`).join('  •  ')}
                     </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          (bookingsLoading || ordersLoading) ? (
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              {tab === 'searching' ? (
                <>
                  <Ionicons name="search-outline" size={44} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No pending bookings</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Bookings being matched to a provider will appear here</Text>
                </>
              ) : tab === 'upcoming' ? (
                <>
                  <Ionicons name="calendar-outline" size={44} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No upcoming bookings</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/services')} style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
                    <Text style={styles.signInBtnText}>Browse Services</Text>
                  </TouchableOpacity>
                </>
              ) : tab === 'awaitingPayment' ? (
                <>
                  <Ionicons name="checkmark-circle-outline" size={44} color="#16A34A" />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All payments up to date!</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Completed bookings waiting for payment will appear here</Text>
                </>
              ) : (
                <>
                  <Ionicons name="time-outline" size={44} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No past bookings</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Paid and cancelled bookings will appear here</Text>
                </>
              )}
            </View>
          )
        }
        renderItem={({ item: row }) => row.kind === 'order' ? (
          <OrderServiceCard
            order={row.order}
            item={row.item}
            bookingConfig={bookingConfig}
            busy={orderActionBusy}
            now={now}
            onAction={handleOrderAction}
          />
        ) : (
          <BookingCard
            booking={row.booking}
            now={now}
            onContinue={handleLegacyContinue}
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
      <Modal visible={!!itemPayment} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          {itemPayment && accessToken && (
            <OrderItemPaymentSheet
              order={itemPayment.order}
              item={itemPayment.item}
              token={accessToken}
              onClose={() => setItemPayment(null)}
              onPaid={() => {
                setItemPayment(null);
                refetchOrders();
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  orderCard: { padding: 12, marginBottom: 12, borderWidth: 1 },
  orderHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  orderLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  orderMeta: { fontSize: 11, marginTop: 3 },
  orderStatus: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize', maxWidth: 100, textAlign: 'right' },
  orderItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: 10 },
  orderServiceName: { fontSize: 14, fontWeight: '700' },
  orderDetail: { fontSize: 11, marginTop: 4 },
  searchTimer: { fontSize: 11, fontWeight: '700', marginTop: 9, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  searchPaused: { fontSize: 11, fontWeight: '700', marginTop: 9, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  cancellationNotice: { fontSize: 11, fontWeight: '600', marginTop: 9, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  detailsLinkText: { fontSize: 12, fontWeight: '700' },
  orderDetailSheet: { width: '100%', maxWidth: 390, padding: 20, gap: 14, maxHeight: '90%' },
  detailSummary: { padding: 13, borderRadius: 12, gap: 5 },
  detailSummaryTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  timelineTitle: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  timeline: { gap: 9 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  timelineLabel: { fontSize: 13 },
  customerQrBox: { alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 12, padding: 14 },
  qrLoadButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9 },
  qrLoadText: { color: '#fff', fontWeight: '700' },
  cancelledBox: { padding: 11, borderRadius: 10, gap: 4 },
  cancelSheet: { width: '100%', maxWidth: 390, padding: 20, gap: 13 },
  cancelInput: { minHeight: 74, padding: 12, borderRadius: 10, textAlignVertical: 'top', fontSize: 13 },
  cancelActions: { flexDirection: 'row', gap: 8 },
  orderItemStatus: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize', maxWidth: 90, textAlign: 'right' },
  orderActions: { flexDirection: 'row', gap: 7, marginTop: 10 },
  orderActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 34, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1 },
  orderActionText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  searchingBanner: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  searchingRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  searchingTitle:  { fontSize: 13, fontWeight: '700', color: '#7C3AED', marginBottom: 3 },
  searchingText:   { fontSize: 12, color: '#6D28D9', lineHeight: 17 },
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
  // Test mode banner
  testBanner: { backgroundColor: '#78350F22', borderWidth: 1, borderColor: '#F59E0B44', borderRadius: 14, padding: 12, marginBottom: 12 },
  testBannerTitle: { fontSize: 13, fontWeight: '700', color: '#F59E0B', marginBottom: 3 },
  testBannerSub: { fontSize: 11, color: '#D97706', lineHeight: 16 },
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
  payBtnWrap: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, borderTopWidth: StyleSheet.hairlineWidth },
  payBtn: { paddingVertical: 16, borderRadius: 18, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sheetCloseTopRight: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4 },
  paidSuccess: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  paidIcon: { fontSize: 52 },
  paidTitle: { fontSize: 22, fontWeight: '800' },
  paidSub: { fontSize: 14 },
});
