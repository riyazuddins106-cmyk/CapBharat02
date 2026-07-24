/**
 * Documents & Verification screen
 * Partners can view, upload, and replace their KYC documents here.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import {
  documentsApi,
  type DocumentTypeConfig,
  type PartnerDocument,
  type PartnerDocumentHistory,
  type DocumentStatus,
} from '@/lib/api';

// ── Status meta ────────────────────────────────────────────────────────────────
const STATUS: Record<DocumentStatus, { label: string; color: string; icon: string }> = {
  pending:            { label: 'Pending Review',    color: '#F59E0B', icon: 'time-outline' },
  under_review:       { label: 'Under Review',      color: '#3B82F6', icon: 'eye-outline' },
  approved:           { label: 'Approved',          color: '#16A34A', icon: 'checkmark-circle-outline' },
  rejected:           { label: 'Rejected',          color: '#EF4444', icon: 'close-circle-outline' },
  re_upload_required: { label: 'Re-upload Required',color: '#F97316', icon: 'alert-circle-outline' },
  expired:            { label: 'Expired',           color: '#8B5CF6', icon: 'alert-outline' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function showAlert(title: string, msg: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

async function requestPermission(type: 'camera' | 'mediaLibrary'): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const perm = type === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  return perm.status === 'granted';
}

// ══════════════════════════════════════════════════════════════════════════════
export default function DocumentsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const colors  = useColors();
  const { accessToken } = useAuth();
  const qc = useQueryClient();

  const [historyType, setHistoryType]       = useState<string | null>(null);
  const [historyData, setHistoryData]       = useState<PartnerDocumentHistory[]>([]);
  const [histLoading, setHistLoading]       = useState(false);
  const [uploadingType, setUploadingType]   = useState<string | null>(null);
  const [msg, setMsg]                       = useState<{ text: string; ok: boolean } | null>(null);

  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ['doc-types', accessToken],
    queryFn: () => documentsApi.listTypes(accessToken!),
    enabled: !!accessToken,
  });

  const { data: docs = [], isLoading: docsLoading, refetch } = useQuery({
    queryKey: ['docs', accessToken],
    queryFn: () => documentsApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id, accessToken!),
    onSuccess: () => { refetch(); setMsg({ text: 'Document removed', ok: true }); },
    onError: (e: any) => setMsg({ text: e.message ?? 'Delete failed', ok: false }),
  });

  const docByType = Object.fromEntries(docs.map(d => [d.document_type, d]));
  const required  = types.filter(t => t.is_mandatory);
  const optional  = types.filter(t => !t.is_mandatory);

  const approvedRequired = docs.filter(
    d => d.status === 'approved' && required.some(t => t.type_key === d.document_type),
  ).length;
  const progress = required.length > 0 ? Math.round((approvedRequired / required.length) * 100) : 0;

  const openHistory = useCallback(async (docType: string) => {
    setHistoryType(docType);
    setHistLoading(true);
    try {
      const h = await documentsApi.getHistory(docType, accessToken!);
      setHistoryData(h);
    } catch {
      setHistoryData([]);
    } finally {
      setHistLoading(false);
    }
  }, [accessToken]);

  const pickAndUpload = useCallback(async (docType: string, source: 'camera' | 'gallery') => {
    const allowed = await requestPermission(source === 'camera' ? 'camera' : 'mediaLibrary');
    if (!allowed) { showAlert('Permission denied', 'Please allow access in your device settings.'); return; }

    let result: ImagePicker.ImagePickerResult;
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    };
    if (source === 'camera') result = await ImagePicker.launchCameraAsync(opts);
    else                     result = await ImagePicker.launchImageLibraryAsync(opts);

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mime = asset.mimeType ?? 'image/jpeg';
    setUploadingType(docType);
    try {
      await documentsApi.upload(docType, asset.uri, mime, accessToken!);
      refetch();
      setMsg({ text: 'Document uploaded successfully', ok: true });
    } catch (e: any) {
      setMsg({ text: e.message ?? 'Upload failed', ok: false });
    } finally {
      setUploadingType(null);
    }
  }, [accessToken, refetch]);

  const promptUpload = (docType: string) => {
    if (Platform.OS === 'web') { pickAndUpload(docType, 'gallery'); return; }
    Alert.alert('Upload Document', 'Choose a source', [
      { text: 'Camera',  onPress: () => pickAndUpload(docType, 'camera') },
      { text: 'Gallery', onPress: () => pickAndUpload(docType, 'gallery') },
      { text: 'Cancel',  style: 'cancel' },
    ]);
  };

  const confirmDelete = (doc: PartnerDocument) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Remove this document?')) deleteMutation.mutate(doc.id);
    } else {
      Alert.alert('Remove Document', 'Are you sure?', [
        { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(doc.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const isLoading = typesLoading || docsLoading;

  // ── History Modal ─────────────────────────────────────────────────────────────
  const histTypeMeta = types.find(t => t.type_key === historyType);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Documents & Verification</Text>
        <View style={{ width: 38 }}/>
      </View>

      {/* History Modal */}
      <Modal visible={!!historyType} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHistoryType(null)}>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => setHistoryType(null)} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {histTypeMeta?.label ?? historyType ?? 'History'}
            </Text>
            <View style={{ width: 38 }}/>
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {histLoading ? (
              <ActivityIndicator color="#5B3EF5" style={{ marginTop: 40 }}/>
            ) : historyData.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>No previous versions.</Text>
            ) : historyData.map(h => {
              const si = STATUS[h.status] ?? STATUS.pending;
              return (
                <View key={h.id} style={[styles.historyCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.row}>
                    <Text style={[styles.histVersion, { color: colors.textSecondary }]}>v{h.version}</Text>
                    <View style={[styles.badge, { backgroundColor: si.color + '22' }]}>
                      <Ionicons name={si.icon as any} size={11} color={si.color}/>
                      <Text style={[styles.badgeText, { color: si.color }]}>{si.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.histDate, { color: colors.textSecondary }]}>
                    Uploaded {new Date(h.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  {h.rejection_reason && (
                    <Text style={styles.reasonText}>{h.rejection_reason}</Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}>
        {/* Feedback message */}
        {msg && (
          <View style={[styles.msgBox, { backgroundColor: msg.ok ? '#16A34A18' : '#EF444418', borderColor: msg.ok ? '#16A34A40' : '#EF444440' }]}>
            <Ionicons name={msg.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={msg.ok ? '#16A34A' : '#EF4444'}/>
            <Text style={[styles.msgText, { color: msg.ok ? '#16A34A' : '#EF4444' }]}>{msg.text}</Text>
            <TouchableOpacity onPress={() => setMsg(null)} hitSlop={8}><Ionicons name="close" size={14} color={colors.textSecondary}/></TouchableOpacity>
          </View>
        )}

        {/* Progress */}
        {!isLoading && required.length > 0 && (
          <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
            <View style={styles.progressRow}>
              <View>
                <Text style={[styles.progressTitle, { color: colors.text }]}>Verification Progress</Text>
                <Text style={[styles.progressSub, { color: colors.textSecondary }]}>
                  {approvedRequired} of {required.length} required documents approved
                </Text>
              </View>
              <Text style={[styles.progressPct, { color: colors.text }]}>{progress}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${progress}%` as any }]}/>
            </View>
            {approvedRequired === required.length && (
              <Text style={styles.allApproved}>✓ All required documents verified!</Text>
            )}
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color="#5B3EF5" style={{ marginTop: 40 }}/>
        ) : types.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No document types configured.</Text>
        ) : (
          <>
            {required.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Required Documents</Text>
                {required.map(t => <DocCard key={t.type_key} docType={t} doc={docByType[t.type_key]} isUploading={uploadingType === t.type_key} onUpload={promptUpload} onDelete={confirmDelete} onHistory={openHistory} colors={colors}/>)}
              </>
            )}
            {optional.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Optional Documents</Text>
                {optional.map(t => <DocCard key={t.type_key} docType={t} doc={docByType[t.type_key]} isUploading={uploadingType === t.type_key} onUpload={promptUpload} onDelete={confirmDelete} onHistory={openHistory} colors={colors}/>)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── DocCard ────────────────────────────────────────────────────────────────────
function DocCard({
  docType, doc, isUploading, onUpload, onDelete, onHistory, colors,
}: {
  docType: DocumentTypeConfig;
  doc?: PartnerDocument;
  isUploading: boolean;
  onUpload: (t: string) => void;
  onDelete: (d: PartnerDocument) => void;
  onHistory: (t: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const si = doc ? (STATUS[doc.status] ?? STATUS.pending) : null;

  return (
    <View style={[styles.docCard, { backgroundColor: colors.surface, borderColor: doc?.status === 'approved' ? '#16A34A30' : doc?.status === 'rejected' || doc?.status === 're_upload_required' ? '#EF444430' : colors.border }]}>
      <View style={styles.docHeader}>
        <Text style={styles.docEmoji}>{docType.emoji}</Text>
        <View style={styles.docHeaderText}>
          <View style={styles.row}>
            <Text style={[styles.docLabel, { color: colors.text }]}>{docType.label}</Text>
            <View style={[styles.badge, { backgroundColor: docType.is_mandatory ? '#F59E0B22' : '#6B728022' }]}>
              <Text style={[styles.badgeText, { color: docType.is_mandatory ? '#F59E0B' : '#9CA3AF', fontSize: 9 }]}>
                {docType.is_mandatory ? 'REQUIRED' : 'OPTIONAL'}
              </Text>
            </View>
          </View>
          {docType.description && <Text style={[styles.docDesc, { color: colors.textSecondary }]}>{docType.description}</Text>}
        </View>
      </View>

      {doc ? (
        <>
          <View style={styles.row}>
            <View style={[styles.badge, { backgroundColor: si!.color + '22' }]}>
              <Ionicons name={si!.icon as any} size={11} color={si!.color}/>
              <Text style={[styles.badgeText, { color: si!.color }]}>{si!.label}</Text>
            </View>
            <TouchableOpacity onPress={() => onHistory(docType.type_key)} hitSlop={8} style={styles.histBtn}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary}/>
            </TouchableOpacity>
          </View>
          {(doc.status === 'rejected' || doc.status === 're_upload_required') && doc.rejection_reason && (
            <Text style={styles.reasonText}>{doc.rejection_reason}</Text>
          )}
          <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
            <TouchableOpacity onPress={() => onUpload(docType.type_key)} disabled={isUploading} style={[styles.actionBtn, { flex: 1, backgroundColor: '#5B3EF515', borderColor: '#5B3EF540' }]}>
              {isUploading
                ? <ActivityIndicator size="small" color="#5B3EF5"/>
                : <><Ionicons name="cloud-upload-outline" size={14} color="#5B3EF5"/><Text style={[styles.actionBtnText, { color: '#5B3EF5' }]}>Re-upload</Text></>
              }
            </TouchableOpacity>
            {doc.status !== 'approved' && (
              <TouchableOpacity onPress={() => onDelete(doc)} style={[styles.actionBtn, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                <Ionicons name="trash-outline" size={14} color="#EF4444"/>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : (
        <TouchableOpacity onPress={() => onUpload(docType.type_key)} disabled={isUploading} style={[styles.uploadBtn, { borderColor: colors.border }]}>
          {isUploading
            ? <ActivityIndicator size="small" color="#5B3EF5"/>
            : <><Ionicons name="cloud-upload-outline" size={18} color={colors.textSecondary}/><Text style={[styles.uploadBtnText, { color: colors.textSecondary }]}>Upload or take photo</Text></>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#00000020' },
  backBtn:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 12 },
  sectionTitle:  { fontSize: 13, fontWeight: '700', marginTop: 8, marginBottom: 2 },
  empty:         { textAlign: 'center', marginTop: 40, fontSize: 14 },
  msgBox:        { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  msgText:       { flex: 1, fontSize: 13 },
  progressCard:  { borderRadius: 16, padding: 14, marginBottom: 4 },
  progressRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: '700' },
  progressSub:   { fontSize: 11, marginTop: 2 },
  progressPct:   { fontSize: 20, fontWeight: '800' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3, backgroundColor: '#5B3EF5' },
  allApproved:   { color: '#16A34A', fontSize: 11, marginTop: 8, fontWeight: '600' },
  docCard:       { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  docHeader:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  docEmoji:      { fontSize: 22 },
  docHeaderText: { flex: 1 },
  docLabel:      { fontSize: 14, fontWeight: '700', marginRight: 6 },
  docDesc:       { fontSize: 11, marginTop: 2, lineHeight: 15 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:     { fontSize: 10, fontWeight: '700' },
  histBtn:       { marginLeft: 'auto' as any },
  reasonText:    { fontSize: 11, color: '#EF4444', lineHeight: 15 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  uploadBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed' },
  uploadBtnText: { fontSize: 13, fontWeight: '500' },
  historyCard:   { borderRadius: 12, padding: 12, marginBottom: 8, gap: 6 },
  histVersion:   { fontSize: 11, fontWeight: '700' },
  histDate:      { fontSize: 11 },
});
