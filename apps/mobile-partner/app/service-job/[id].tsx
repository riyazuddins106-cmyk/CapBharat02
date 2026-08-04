import React, { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi } from '@/lib/api';

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

export default function ServiceJobDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const processingRef = useRef(false);
  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['/api/partner/order-item-jobs/detail', id, accessToken],
    queryFn: () => partnerApi.getOrderItemJob(id!, accessToken!),
    enabled: !!id && !!accessToken,
  });

  const action = useMutation({
    mutationFn: async ({ kind, qrToken }: {
      kind: 'accept' | 'reject' | 'checkin' | 'complete';
      qrToken?: string;
    }) => {
      if (kind === 'accept') return partnerApi.acceptOrderItemJob(job!.requestId!, accessToken!);
      if (kind === 'reject') return partnerApi.rejectOrderItemJob(job!.requestId!, accessToken!);
      if (kind === 'checkin') {
        if (!qrToken) throw new Error('Scan the customer QR code before checking in.');
        return partnerApi.checkInOrderItem(id!, qrToken, accessToken!);
      }
      return partnerApi.completeOrderItem(id!, accessToken!);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/partner/order-item-jobs'] });
      await refetch();
    },
    onError: (error: any) => Alert.alert('Unable to update service', error.message),
  });

  const resetScanner = () => {
    setScanned(false);
    setCameraReady(false);
    processingRef.current = false;
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to scan the customer QR code.');
        return;
      }
    }
    resetScanner();
    setShowScanner(true);
    setTimeout(() => setCameraReady(true), 700);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!cameraReady || scanned || processingRef.current) return;
    processingRef.current = true;
    setScanned(true);
    setShowScanner(false);
    setTimeout(() => {
      Alert.alert('Check In', 'Use this customer QR code to confirm your arrival?', [
        { text: 'Cancel', style: 'cancel', onPress: resetScanner },
        {
          text: 'Check In',
          onPress: () => {
            action.mutate({
              kind: 'checkin',
              // The mutation is keyed by kind; pass the token through this
              // one-shot ref so no direct check-in button can bypass scanning.
              qrToken: data.trim(),
            });
          },
        },
      ]);
    }, 250);
  };

  if (isLoading || !job) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Loading service job…</Text></View>;
  }

  if (showScanner) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(!scanned && cameraReady) ? handleBarcodeScanned : undefined}
        >
          <View style={styles.scanOverlay}>
            <View style={[styles.scanHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={() => { setShowScanner(false); resetScanner(); }} style={styles.scanClose}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scanTitle}>Scan Customer QR</Text>
            </View>
            <View style={styles.scanFrame}><View style={[styles.scanTarget, { borderColor: colors.primary }]} /></View>
            <Text style={styles.scanHint}>Ask the customer to open this service order and show their QR code.</Text>
          </View>
        </CameraView>
      </View>
    );
  }

  const canCheckIn = job.status === 'partner_accepted';
  const canComplete = ['payment_completed', 'service_started'].includes(job.status ?? '');
  const canRespond = !!job.requestId;
  const address = job.address
    ? `${job.address.line1}${job.address.line2 ? `, ${job.address.line2}` : ''}, ${job.address.city}, ${job.address.state} ${job.address.postalCode}`
    : 'Address not provided';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.foreground} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{job.serviceName}</Text>
          <Text style={{ color: colors.mutedForeground }}>Service order · {job.orderId.slice(0, 8)}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
        <View style={[styles.statusCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <Text style={[styles.status, { color: colors.primary }]}>{(job.status ?? 'assigned').replaceAll('_', ' ')}</Text>
          <Text style={{ color: colors.mutedForeground }}>{formatDate(job.scheduledAt)} · {job.durationMinutes} minutes</Text>
          <Text style={[styles.payout, { color: colors.foreground }]}>₹{job.partnerPayout} partner payout</Text>
        </View>

        <InfoCard title="Customer" colors={colors}>
          <InfoRow icon="person-outline" label="Name" value={job.customer.name} colors={colors} />
          {job.customer.phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${job.customer.phone}`)}>
              <InfoRow icon="call-outline" label="Phone" value={job.customer.phone} colors={colors} />
            </TouchableOpacity>
          )}
        </InfoCard>
        <InfoCard title="Service location" colors={colors}>
          <InfoRow icon="location-outline" label="Address" value={address} colors={colors} />
          {job.address && <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}>
            <Text style={[styles.mapLink, { color: colors.primary }]}>Open in Maps</Text>
          </TouchableOpacity>}
        </InfoCard>
        <InfoCard title="Payment" colors={colors}>
          <InfoRow icon="card-outline" label="Status" value={job.payment?.status === 'paid' ? 'Paid' : 'Awaiting customer payment'} colors={colors} />
          <InfoRow icon="cash-outline" label="Customer amount" value={`₹${job.customerPrice ?? job.payment?.amount ?? 0}`} colors={colors} />
        </InfoCard>
        {job.orderNotes && <InfoCard title="Customer notes" colors={colors}><Text style={{ color: colors.foreground }}>{job.orderNotes}</Text></InfoCard>}
        {canRespond && <View style={styles.responseRow}>
          <TouchableOpacity onPress={() => action.mutate({ kind: 'reject' })} style={[styles.secondaryButton, { borderColor: '#FCA5A5' }]}><Text style={{ color: '#DC2626', fontWeight: '800' }}>Reject Request</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => action.mutate({ kind: 'accept' })} style={[styles.primaryButton, { flex: 1, backgroundColor: colors.primary }]}><Text style={styles.buttonText}>Accept Request</Text></TouchableOpacity>
        </View>}
        {canCheckIn && <TouchableOpacity onPress={openScanner} style={[styles.primaryButton, { backgroundColor: colors.primary }]}><Ionicons name="qr-code-outline" size={18} color="#fff" /><Text style={styles.buttonText}>Scan QR to Check In</Text></TouchableOpacity>}
        {canComplete && <TouchableOpacity onPress={() => action.mutate({ kind: 'complete' })} style={[styles.primaryButton, { backgroundColor: '#16A34A' }]}><Text style={styles.buttonText}>Complete Service</Text></TouchableOpacity>}
      </ScrollView>
    </View>
  );
}

function InfoCard({ title, colors, children }: any) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}><Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>{children}</View>;
}

function InfoRow({ icon, label, value, colors }: any) {
  return <View style={styles.row}><Ionicons name={icon} size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{label}</Text><Text style={{ color: colors.foreground, fontSize: 14, marginTop: 2 }}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700' },
  statusCard: { padding: 16, marginBottom: 14, gap: 6 },
  status: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  payout: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  card: { borderWidth: 1, padding: 14, marginBottom: 12, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  mapLink: { fontWeight: '700', marginLeft: 27 },
  primaryButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  secondaryButton: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginTop: 4 },
  responseRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '800' },
  scanOverlay: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.15)' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanClose: { padding: 4 },
  scanTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scanFrame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanTarget: { width: 270, height: 270, borderWidth: 3, borderRadius: 18 },
  scanHint: { color: '#fff', textAlign: 'center', padding: 24, lineHeight: 20, backgroundColor: 'rgba(0,0,0,0.65)' },
});