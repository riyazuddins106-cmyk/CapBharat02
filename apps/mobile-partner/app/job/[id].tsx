import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { partnerApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#6B7280', bg: '#F3F4F6' },
  upcoming:    { label: 'Upcoming',    color: '#2563EB', bg: '#DBEAFE' },
  in_progress: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  completed:   { label: 'Completed',   color: '#16A34A', bg: '#DCFCE7' },
  cancelled:   { label: 'Cancelled',   color: '#D4183D', bg: '#FEE2E2' },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function JobDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  // Ref-based lock: guards against rapid-fire barcode events on Android where
  // multiple scan callbacks can fire before the state re-render runs.
  const processingRef = useRef(false);
  const cameraReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: job, refetch } = useQuery({
    queryKey: ['/api/partner/jobs', id, accessToken],
    queryFn: () => partnerApi.getJob(id!, accessToken!),
    enabled: !!accessToken && !!id,
  });

  // Reset both the state and ref lock together so they never diverge.
  const resetScanLock = () => {
    setScanned(false);
    processingRef.current = false;
  };

  const checkInMutation = useMutation({
    mutationFn: (qrToken: string) => partnerApi.checkIn(id!, qrToken, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/jobs'] });
      refetch();
      setShowScanner(false);
      resetScanLock();
    },
    onError: (e: any) => {
      resetScanLock();
      Alert.alert('Check-in Failed', e.message);
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => partnerApi.completeJob(id!, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/jobs'] });
      refetch();
      Alert.alert(
        '✅ Job Completed!',
        'The customer has been notified to complete their payment. You will receive your earnings once payment is confirmed.',
        [{ text: 'OK' }],
      );
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const acceptMutation = useMutation({
    mutationFn: () => partnerApi.acceptJob(id!, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/jobs'] });
      refetch();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () => partnerApi.rejectJob(id!, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ['/api/partner/jobs'] });
      refetch();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    // Double-guard: state check (for UI) + ref check (prevents rapid Android callbacks
    // that fire before the state re-render flushes).
    if (scanned || processingRef.current) return;
    processingRef.current = true;
    setScanned(true);

    // The QR encodes a signed JWT token containing the booking ID
    const scannedToken = data.trim();

    // Tear down the camera view (CameraView/CameraX surface) BEFORE presenting
    // the Alert. Showing a native Alert while the camera surface is still
    // actively capturing frames is a known crash trigger on several Android
    // OEM camera stacks (the alert steals window focus while the camera
    // surface is mid-teardown/reconfiguration). Closing the scanner first
    // avoids that race entirely.
    setShowScanner(false);

    // Give the native camera surface a frame to fully unmount before the
    // Alert takes over the window — avoids overlapping the camera teardown
    // with the alert's window focus change on physical devices.
    setTimeout(() => {
      Alert.alert(
        'Check In',
        'QR scanned! Mark this job as in progress?',
        [
          { text: 'Cancel', style: 'cancel', onPress: resetScanLock },
          { text: 'Check In', onPress: () => checkInMutation.mutate(scannedToken) },
        ],
      );
    }, 250);
  };

  const closeScanner = () => {
    setShowScanner(false);
    resetScanLock();
    setCameraReady(false);
    if (cameraReadyTimer.current) clearTimeout(cameraReadyTimer.current);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to scan the customer QR code.');
        return;
      }
    }
    resetScanLock();
    setCameraReady(false);
    setShowScanner(true);
    if (cameraReadyTimer.current) clearTimeout(cameraReadyTimer.current);
    cameraReadyTimer.current = setTimeout(() => setCameraReady(true), 1200);
  };

  const cfg = job ? (STATUS_CONFIG[job.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.upcoming) : STATUS_CONFIG.upcoming;

  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Ionicons name="hourglass-outline" size={40} color={colors.mutedForeground} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading job…</Text>
      </View>
    );
  }

  // ── QR Scanner overlay ───────────────────────────────────
  if (showScanner) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          zoom={0}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(!scanned && cameraReady) ? handleBarCodeScanned : undefined}
        >
          {/* Overlay */}
          <View style={styles.scanOverlay}>
            <View style={[styles.scanTopBar, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity onPress={closeScanner} style={styles.scanClose}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.scanTitle}>Scan Customer QR</Text>
            </View>

            <View style={styles.scanFrame}>
              <View style={styles.scanTarget}>
                {/* Corner decorators */}
                {['tl', 'tr', 'bl', 'br'].map((pos) => (
                  <View key={pos} style={[styles.corner, {
                    top: pos.startsWith('t') ? 0 : undefined,
                    bottom: pos.startsWith('b') ? 0 : undefined,
                    left: pos.endsWith('l') ? 0 : undefined,
                    right: pos.endsWith('r') ? 0 : undefined,
                    borderTopWidth: pos.startsWith('t') ? 3 : 0,
                    borderBottomWidth: pos.startsWith('b') ? 3 : 0,
                    borderLeftWidth: pos.endsWith('l') ? 3 : 0,
                    borderRightWidth: pos.endsWith('r') ? 3 : 0,
                    borderColor: colors.primary,
                  }]} />
                ))}
              </View>
            </View>

            <View style={styles.scanBottom}>
              <Text style={styles.scanHint}>
                Ask the customer to open their booking and show you the QR code
              </Text>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // ── Job detail ───────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Job Detail</Text>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 100 }}>
        {/* Service info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Service Details</Text>
          <DetailRow icon="construct-outline" label="Service" value={job.serviceName} colors={colors} />
          <DetailRow icon="time-outline" label="Scheduled" value={fmtDate(job.scheduledAt)} colors={colors} />
          <DetailRow icon="cash-outline" label="Earnings" value={`₹${job.price}`} colors={colors} bold />
          {job.notes && <DetailRow icon="document-text-outline" label="Notes" value={job.notes} colors={colors} />}
        </View>

        {/* Customer info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer</Text>
          <DetailRow icon="person-outline" label="Name" value={job.customerName ?? 'N/A'} colors={colors} />
          {job.customerPhone && <DetailRow icon="call-outline" label="Phone" value={job.customerPhone} colors={colors} />}
        </View>

        {/* Workflow guide */}
        {job.status === 'pending' && (
          <View style={[styles.infoBox, { backgroundColor: '#FEF3C7', borderRadius: colors.radius }]}>
            <Ionicons name="time-outline" size={18} color="#D97706" />
            <Text style={[styles.infoText, { color: '#D97706' }]}>
              New booking request! Accept to confirm or reject to decline.
            </Text>
          </View>
        )}
        {job.status === 'upcoming' && (
          <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Scan the customer's booking QR code when you arrive to check in and start the job.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Accept / Reject for pending */}
      {job.status === 'pending' && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border, flexDirection: 'row', gap: 12 }]}>
          <TouchableOpacity
            onPress={() => Alert.alert('Reject Booking', 'Are you sure you want to reject this booking?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate() },
            ])}
            disabled={rejectMutation.isPending || acceptMutation.isPending}
            style={[styles.actionBtn, { flex: 1, backgroundColor: '#EF4444', borderRadius: colors.radius, opacity: rejectMutation.isPending ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>{rejectMutation.isPending ? 'Rejecting…' : 'Reject'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending || rejectMutation.isPending}
            style={[styles.actionBtn, { flex: 1, backgroundColor: '#16A34A', borderRadius: colors.radius, opacity: acceptMutation.isPending ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>{acceptMutation.isPending ? 'Accepting…' : 'Accept'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scan QR for upcoming */}
      {job.status === 'upcoming' && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={openScanner}
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Scan QR to Check In</Text>
          </TouchableOpacity>
        </View>
      )}

      {job.status === 'in_progress' && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Complete Job', 'Mark this job as completed?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Complete', onPress: () => completeMutation.mutate() },
              ])
            }
            disabled={completeMutation.isPending}
            style={[styles.actionBtn, { backgroundColor: colors.success, borderRadius: colors.radius, opacity: completeMutation.isPending ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>{completeMutation.isPending ? 'Completing…' : 'Mark as Completed'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function DetailRow({ icon, label, value, colors, bold }: any) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={colors.mutedForeground} />
      <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground, fontWeight: bold ? '700' : '400' }]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 4 },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: { padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailLabel: { fontSize: 13, width: 70 },
  detailValue: { fontSize: 13, flex: 1 },
  infoBox: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'flex-start' },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18, fontWeight: '600' },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Scanner styles
  scanOverlay: { flex: 1 },
  scanTopBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', gap: 12 },
  scanClose: { padding: 4 },
  scanTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  scanFrame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanTarget: { width: 270, height: 270, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28 },
  scanBottom: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 24, alignItems: 'center' },
  scanHint: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
