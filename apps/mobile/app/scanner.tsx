import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
  Linking, Vibration,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const processingRef = useRef(false);
  const cameraReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Warm up camera after mount
  React.useEffect(() => {
    if (permission?.granted) {
      if (cameraReadyTimer.current) clearTimeout(cameraReadyTimer.current);
      cameraReadyTimer.current = setTimeout(() => setCameraReady(true), 1000);
    }
    return () => {
      if (cameraReadyTimer.current) clearTimeout(cameraReadyTimer.current);
    };
  }, [permission?.granted]);

  const resetScan = () => {
    setScanned(false);
    processingRef.current = false;
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || processingRef.current) return;
    processingRef.current = true;
    setScanned(true);

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const trimmed = data.trim();

    // Try to open URLs automatically
    const isUrl = /^https?:\/\//i.test(trimmed);

    Alert.alert(
      '✅ QR Scanned',
      isUrl ? `Open this link?\n\n${trimmed}` : trimmed,
      [
        {
          text: 'Close',
          style: 'cancel',
          onPress: resetScan,
        },
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
          : {
              text: 'Scan Again',
              onPress: resetScan,
            },
      ],
    );
  };

  // ── Permission not yet determined ─────────────────────────
  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="camera-outline" size={48} color={colors.mutedForeground} />
      </View>
    );
  }

  // ── Permission denied ──────────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.permBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="camera-outline" size={52} color={colors.primary} />
          <Text style={[styles.permTitle, { color: colors.foreground }]}>Camera Access Needed</Text>
          <Text style={[styles.permSub, { color: colors.mutedForeground }]}>
            ServeNow needs camera access to scan QR codes for bookings and services.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.permBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.permBack}
            activeOpacity={0.7}
          >
            <Text style={[styles.permBackText, { color: colors.mutedForeground }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Camera scanner ─────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        zoom={0}
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(!scanned && cameraReady) ? handleBarCodeScanned : undefined}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan QR Code</Text>
          <TouchableOpacity
            onPress={() => setTorch(t => !t)}
            style={[styles.iconBtn, torch && styles.torchActive]}
          >
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Viewfinder */}
        <View style={styles.frame}>
          <View style={styles.target}>
            {/* Corner brackets */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
              <View
                key={pos}
                style={[
                  styles.corner,
                  {
                    top:          pos.startsWith('t') ? 0 : undefined,
                    bottom:       pos.startsWith('b') ? 0 : undefined,
                    left:         pos.endsWith('l')   ? 0 : undefined,
                    right:        pos.endsWith('r')   ? 0 : undefined,
                    borderTopWidth:    pos.startsWith('t') ? 3 : 0,
                    borderBottomWidth: pos.startsWith('b') ? 3 : 0,
                    borderLeftWidth:   pos.endsWith('l')   ? 3 : 0,
                    borderRightWidth:  pos.endsWith('r')   ? 3 : 0,
                    borderColor: '#5B3EF5',
                  },
                ]}
              />
            ))}
            {/* Scan line */}
            {cameraReady && !scanned && (
              <View style={styles.scanLine} />
            )}
          </View>
        </View>

        {/* Bottom hint */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
          <Ionicons name="qr-code-outline" size={22} color="rgba(255,255,255,0.7)" />
          <Text style={styles.hint}>
            {scanned
              ? 'Processing…'
              : 'Point your camera at a QR code to scan it'}
          </Text>
          {scanned && (
            <TouchableOpacity onPress={resetScan} style={styles.rescanBtn}>
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  permBox: {
    width: '100%', borderRadius: 20, borderWidth: 1,
    padding: 28, alignItems: 'center', gap: 12,
  },
  permTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permSub:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permBtn:   {
    marginTop: 8, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 14, width: '100%', alignItems: 'center',
  },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  permBack:    { paddingVertical: 8 },
  permBackText: { fontSize: 14 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  torchActive: { backgroundColor: 'rgba(91,62,245,0.7)' },

  frame: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  target: {
    width: 260, height: 260, position: 'relative',
  },
  corner: {
    position: 'absolute', width: 30, height: 30,
  },
  scanLine: {
    position: 'absolute',
    left: 8, right: 8,
    top: '50%',
    height: 2,
    backgroundColor: '#5B3EF5',
    opacity: 0.8,
    borderRadius: 1,
  },

  bottomBar: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 20, paddingHorizontal: 24,
    alignItems: 'center', gap: 10,
  },
  hint: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14,
    textAlign: 'center', lineHeight: 20,
  },
  rescanBtn: {
    marginTop: 4, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: '#5B3EF5', borderRadius: 12,
  },
  rescanText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
