import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export default function ScanTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [active, setActive] = useState(false);
  const processingRef = useRef(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Activate camera only while this tab is focused — saves battery
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      setScanned(false);
      processingRef.current = false;
      if (permission?.granted) {
        readyTimer.current = setTimeout(() => setCameraReady(true), 1000);
      }
      return () => {
        setActive(false);
        setCameraReady(false);
        setTorch(false);
        if (readyTimer.current) clearTimeout(readyTimer.current);
      };
    }, [permission?.granted]),
  );

  const resetScan = () => {
    setScanned(false);
    processingRef.current = false;
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || processingRef.current) return;
    processingRef.current = true;
    setScanned(true);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const trimmed = data.trim();
    const isUrl = /^https?:\/\//i.test(trimmed);

    Alert.alert(
      '✅ QR Scanned',
      isUrl ? `Open this link?\n\n${trimmed}` : trimmed,
      [
        { text: 'Close', style: 'cancel', onPress: resetScan },
        isUrl
          ? {
              text: 'Open Link',
              onPress: () => {
                Linking.openURL(trimmed).catch(() =>
                  Alert.alert('Error', 'Could not open the link.'),
                );
                resetScan();
              },
            }
          : { text: 'Scan Again', onPress: resetScan },
      ],
    );
  };

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // ── Permission not yet determined ────────────────────────
  if (!permission) {
    return <View style={[styles.center, { backgroundColor: '#000' }]} />;
  }

  // ── Permission denied ─────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.permBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.permIcon, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="camera-outline" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.permTitle, { color: colors.foreground }]}>Camera Access Needed</Text>
          <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
            Allow camera access to scan QR codes for bookings, services, and offers.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={18} color="#fff" />
            <Text style={styles.permBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Live camera view ──────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {active && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          zoom={0}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(!scanned && cameraReady) ? handleBarCodeScanned : undefined}
        />
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <Text style={styles.topTitle}>Scan QR Code</Text>
        <TouchableOpacity
          onPress={() => setTorch(t => !t)}
          style={[styles.torchBtn, torch && styles.torchActive]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={torch ? 'flashlight' : 'flashlight-outline'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Viewfinder frame */}
      <View style={styles.frame}>
        {/* Dim sides */}
        <View style={styles.dimRow}>
          <View style={[styles.dim, { width: '10%' }]} />
          <View style={styles.target}>
            {/* Corner brackets */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
              <View
                key={pos}
                style={[
                  styles.corner,
                  {
                    top:               pos.startsWith('t') ? 0 : undefined,
                    bottom:            pos.startsWith('b') ? 0 : undefined,
                    left:              pos.endsWith('l')   ? 0 : undefined,
                    right:             pos.endsWith('r')   ? 0 : undefined,
                    borderTopWidth:    pos.startsWith('t') ? 3 : 0,
                    borderBottomWidth: pos.startsWith('b') ? 3 : 0,
                    borderLeftWidth:   pos.endsWith('l')   ? 3 : 0,
                    borderRightWidth:  pos.endsWith('r')   ? 3 : 0,
                  },
                ]}
              />
            ))}
            {/* Scan line indicator */}
            {cameraReady && !scanned && (
              <View style={styles.scanLine} />
            )}
          </View>
          <View style={[styles.dim, { width: '10%' }]} />
        </View>
      </View>

      {/* Bottom hint */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 28 }]}>
        <Ionicons name="qr-code-outline" size={20} color="rgba(255,255,255,0.6)" />
        <Text style={styles.hint}>
          {scanned ? 'Processing…' : 'Point at a QR code to scan it'}
        </Text>
        {scanned && (
          <TouchableOpacity onPress={resetScan} style={styles.rescanBtn} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.rescanText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  permBox: {
    width: '100%', borderRadius: 24, borderWidth: 1,
    padding: 28, alignItems: 'center', gap: 14,
  },
  permIcon: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  permTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  permSub:   { fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 280 },
  permBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 4, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, width: '100%', justifyContent: 'center',
  },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  torchBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  torchActive: { backgroundColor: 'rgba(91,62,245,0.75)' },

  frame: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dimRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  dim:    { height: 260, backgroundColor: 'rgba(0,0,0,0.55)' },

  target: {
    width: 260, height: 260, position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: '#5B3EF5',
  },
  scanLine: {
    position: 'absolute',
    left: 12, right: 12,
    top: '50%',
    height: 2,
    backgroundColor: '#5B3EF5',
    opacity: 0.9,
    borderRadius: 1,
    shadowColor: '#5B3EF5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: 20, paddingHorizontal: 24,
    alignItems: 'center', gap: 10,
  },
  hint: {
    color: 'rgba(255,255,255,0.8)', fontSize: 14,
    textAlign: 'center', lineHeight: 20,
  },
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#5B3EF5', borderRadius: 12,
    marginTop: 4,
  },
  rescanText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
