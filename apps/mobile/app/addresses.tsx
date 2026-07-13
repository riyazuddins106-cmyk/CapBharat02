import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { addressesApi, type Address } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

const LABELS = ['Home', 'Work', 'Other'];
const BLANK: Omit<Address, 'id'> = { label: 'Home', line1: '', line2: null, city: '', state: '', postalCode: '', country: 'India', isDefault: false };

export default function AddressesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; address?: Address } | null>(null);
  const [form, setForm] = useState<Omit<Address, 'id'>>(BLANK);

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['/api/addresses', accessToken],
    queryFn: () => addressesApi.list(accessToken!),
    enabled: !!accessToken,
  });

  const createMutation = useMutation({
    mutationFn: () => addressesApi.create({ ...form, line2: form.line2 || undefined } as any, accessToken!),
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); queryClient.invalidateQueries({ queryKey: ['/api/addresses'] }); setModal(null); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => addressesApi.update(id, form, accessToken!),
    onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); queryClient.invalidateQueries({ queryKey: ['/api/addresses'] }); setModal(null); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressesApi.delete(id, accessToken!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/addresses'] }); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => addressesApi.update(id, { isDefault: true }, accessToken!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/addresses'] }); },
  });

  const openAdd = () => { setForm(BLANK); setModal({ mode: 'add' }); };
  const openEdit = (a: Address) => { setForm({ label: a.label, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postalCode, country: a.country, isDefault: a.isDefault }); setModal({ mode: 'edit', address: a }); };

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Saved Addresses</Text>
        <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : addresses.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No addresses yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add your home, work, or other addresses</Text>
          <TouchableOpacity onPress={openAdd} style={[styles.emptyBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
            <Text style={styles.emptyBtnText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
          renderItem={({ item: a }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: a.isDefault ? colors.primary : colors.border, borderRadius: colors.radius }]}>
              <View style={styles.cardTop}>
                <View style={[styles.labelBadge, { backgroundColor: colors.secondary }]}>
                  <Ionicons name={a.label === 'Home' ? 'home-outline' : a.label === 'Work' ? 'briefcase-outline' : 'location-outline'} size={14} color={colors.primary} />
                  <Text style={[styles.labelText, { color: colors.primary }]}>{a.label}</Text>
                </View>
                {a.isDefault && <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}><Text style={styles.defaultText}>Default</Text></View>}
              </View>
              <Text style={[styles.addressLine, { color: colors.foreground }]}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</Text>
              <Text style={[styles.addressCity, { color: colors.mutedForeground }]}>{a.city}, {a.state} – {a.postalCode}</Text>
              <Text style={[styles.addressCountry, { color: colors.mutedForeground }]}>{a.country}</Text>
              <View style={styles.cardActions}>
                {!a.isDefault && (
                  <TouchableOpacity onPress={() => setDefaultMutation.mutate(a.id)} style={[styles.actionChip, { borderColor: colors.border }]}>
                    <Text style={[styles.actionChipText, { color: colors.mutedForeground }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => openEdit(a)} style={[styles.actionChip, { borderColor: colors.border }]}>
                  <Ionicons name="pencil-outline" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.actionChipText, { color: colors.mutedForeground }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Alert.alert('Delete Address', 'Remove this address?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(a.id) },
                  ])}
                  style={[styles.actionChip, { borderColor: colors.border }]}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.destructive} />
                  <Text style={[styles.actionChipText, { color: colors.destructive }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{modal?.mode === 'add' ? 'Add Address' : 'Edit Address'}</Text>
              <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={22} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 12 }}>
              {/* Label picker */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Label</Text>
              <View style={styles.labelRow}>
                {LABELS.map((l) => (
                  <TouchableOpacity key={l} onPress={() => setForm((f) => ({ ...f, label: l }))}
                    style={[styles.labelPill, { backgroundColor: form.label === l ? colors.primary : colors.muted, borderRadius: 100 }]}>
                    <Text style={[styles.labelPillText, { color: form.label === l ? '#fff' : colors.mutedForeground }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {([
                ['line1', 'Street / Flat', false],
                ['line2', 'Apt / Floor (optional)', false],
                ['city', 'City', false],
                ['state', 'State', false],
                ['postalCode', 'Postal Code', false],
                ['country', 'Country', false],
              ] as [keyof typeof form, string, boolean][]).map(([key, placeholder]) => (
                <View key={key} style={{ gap: 4 }}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{placeholder}</Text>
                  <TextInput
                    value={(form[key] as string) ?? ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]}
                  />
                </View>
              ))}

              {/* Default toggle */}
              <TouchableOpacity onPress={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))} style={styles.defaultRow}>
                <View style={[styles.checkbox, { borderColor: colors.primary, backgroundColor: form.isDefault ? colors.primary : 'transparent' }]}>
                  {form.isDefault && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={[styles.defaultLabel, { color: colors.foreground }]}>Set as default address</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => modal?.mode === 'add' ? createMutation.mutate() : updateMutation.mutate(modal!.address!.id)}
                disabled={saving || !form.line1 || !form.city || !form.state || !form.postalCode}
                style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: saving ? 0.7 : 1 }]}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Address'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:       { padding: 4 },
  title:         { flex: 1, fontSize: 20, fontWeight: '700' },
  addBtn:        { padding: 8 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle:    { fontSize: 18, fontWeight: '700' },
  emptyText:     { fontSize: 14, textAlign: 'center' },
  emptyBtn:      { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  emptyBtnText:  { color: '#fff', fontWeight: '700' },
  card:          { padding: 16, borderWidth: 1.5, gap: 6 },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  labelBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  labelText:     { fontSize: 12, fontWeight: '700' },
  defaultBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  defaultText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  addressLine:   { fontSize: 14, fontWeight: '600' },
  addressCity:   { fontSize: 13 },
  addressCountry:{ fontSize: 12 },
  cardActions:   { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actionChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  actionChipText:{ fontSize: 12, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:         { margin: 12, padding: 24, gap: 12, maxHeight: '90%' },
  sheetHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle:    { fontSize: 18, fontWeight: '700' },
  fieldLabel:    { fontSize: 12, fontWeight: '600' },
  labelRow:      { flexDirection: 'row', gap: 8 },
  labelPill:     { paddingHorizontal: 14, paddingVertical: 8 },
  labelPillText: { fontSize: 13, fontWeight: '600' },
  input:         { padding: 12, fontSize: 14 },
  defaultRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox:      { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  defaultLabel:  { fontSize: 14 },
  saveBtn:       { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
});
