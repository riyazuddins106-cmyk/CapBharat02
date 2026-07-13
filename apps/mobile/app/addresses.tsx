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

const MAX_ADDRESSES = 4;

const LABELS: { key: string; icon: any; title: string; desc: string }[] = [
  { key: 'Home',  icon: 'home',      title: 'Home',  desc: 'Your residence' },
  { key: 'Work',  icon: 'briefcase', title: 'Work',  desc: 'Office or workplace' },
  { key: 'Hotel', icon: 'bed',       title: 'Hotel', desc: 'Hotel or guest stay' },
  { key: 'Other', icon: 'location',  title: 'Other', desc: 'Any other location' },
];

const BLANK: Omit<Address, 'id'> = {
  label: 'Home', line1: '', line2: null, city: '', state: '', postalCode: '', country: 'India', isDefault: false,
};

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
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      setModal(null);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) =>
      addressesApi.update(id, { ...form, line2: form.line2 || undefined } as any, accessToken!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['/api/addresses'] });
      setModal(null);
    },
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

  const openAdd = () => {
    if (addresses.length >= MAX_ADDRESSES) {
      Alert.alert('Limit reached', `You can save up to ${MAX_ADDRESSES} addresses. Please delete one to add another.`);
      return;
    }
    setForm(BLANK);
    setModal({ mode: 'add' });
  };

  const openEdit = (a: Address) => {
    setForm({ label: a.label, line1: a.line1, line2: a.line2, city: a.city, state: a.state, postalCode: a.postalCode, country: a.country, isDefault: a.isDefault });
    setModal({ mode: 'edit', address: a });
  };

  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const saving = createMutation.isPending || updateMutation.isPending;
  const canAdd = addresses.length < MAX_ADDRESSES;

  const getLabelMeta = (key: string) => LABELS.find(l => l.key === key) ?? LABELS[3];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Saved Addresses</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {addresses.length}/{MAX_ADDRESSES} addresses saved
          </Text>
        </View>
        {canAdd && (
          <TouchableOpacity onPress={openAdd} style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : addresses.length === 0 ? (
        /* Empty state */
        <View style={styles.center}>
          <View style={[styles.emptyIllustration, { backgroundColor: colors.secondary }]}>
            <Ionicons name="location-outline" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No addresses saved yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add your home, work, hotel, or other addresses for faster booking
          </Text>

          {/* 4 type chips */}
          <View style={styles.typeChips}>
            {LABELS.map((l) => (
              <View key={l.key} style={[styles.typeChip, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
                <Ionicons name={l.icon as any} size={14} color={colors.primary} />
                <Text style={[styles.typeChipText, { color: colors.foreground }]}>{l.title}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={openAdd} style={[styles.emptyBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.emptyBtnText}>Add First Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}
          renderItem={({ item: a }) => {
            const meta = getLabelMeta(a.label);
            return (
              <View style={[styles.card, {
                backgroundColor: colors.card,
                borderColor: a.isDefault ? colors.primary : colors.border,
                borderRadius: colors.radius,
              }]}>
                {/* Card top row */}
                <View style={styles.cardTop}>
                  <View style={[styles.iconCircle, { backgroundColor: a.isDefault ? colors.primary : colors.secondary }]}>
                    <Ionicons name={meta.icon as any} size={18} color={a.isDefault ? '#fff' : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.labelRow}>
                      <Text style={[styles.labelText, { color: colors.foreground }]}>{a.label}</Text>
                      {a.isDefault && (
                        <View style={[styles.defaultPill, { backgroundColor: colors.primary }]}>
                          <Text style={styles.defaultPillText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.addressLine, { color: colors.foreground }]} numberOfLines={1}>
                      {a.line1}{a.line2 ? `, ${a.line2}` : ''}
                    </Text>
                    <Text style={[styles.addressCity, { color: colors.mutedForeground }]}>
                      {a.city}, {a.state} – {a.postalCode}
                    </Text>
                  </View>
                  {/* Edit icon top-right */}
                  <TouchableOpacity onPress={() => openEdit(a)} style={[styles.editIconBtn, { backgroundColor: colors.muted }]}>
                    <Ionicons name="pencil" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                {/* Actions row */}
                <View style={styles.actionsRow}>
                  {!a.isDefault && (
                    <TouchableOpacity
                      onPress={() => setDefaultMutation.mutate(a.id)}
                      style={[styles.actionBtn, { borderColor: colors.border }]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
                      <Text style={[styles.actionBtnText, { color: colors.primary }]}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Delete address?', `Remove your ${a.label} address?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(a.id) },
                      ])
                    }
                    style={[styles.actionBtn, { borderColor: colors.border }]}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                    <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            canAdd ? (
              <TouchableOpacity
                onPress={openAdd}
                style={[styles.addMoreBtn, { borderColor: colors.primary, borderRadius: colors.radius, marginTop: 4 }]}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addMoreText, { color: colors.primary }]}>Add another address</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.limitBanner, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.limitText, { color: colors.mutedForeground }]}>
                  Maximum {MAX_ADDRESSES} addresses saved
                </Text>
              </View>
            )
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {modal?.mode === 'add' ? 'Add Address' : 'Edit Address'}
              </Text>
              <TouchableOpacity onPress={() => setModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Address type selector — Urban Company style */}
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ADDRESS TYPE</Text>
              <View style={styles.typeGrid}>
                {LABELS.map((l) => {
                  const selected = form.label === l.key;
                  return (
                    <TouchableOpacity
                      key={l.key}
                      onPress={() => setForm((f) => ({ ...f, label: l.key }))}
                      style={[styles.typeCard, {
                        backgroundColor: selected ? colors.primary + '18' : colors.muted,
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                      }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={l.icon as any} size={20} color={selected ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.typeCardLabel, { color: selected ? colors.primary : colors.foreground }]}>
                        {l.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ gap: 12, marginTop: 4 }}>
                {([
                  ['line1',      'Street / Flat / Building *', false],
                  ['line2',      'Apt / Floor / Landmark (optional)', false],
                  ['city',       'City *', false],
                  ['state',      'State *', false],
                  ['postalCode', 'Postal Code *', false],
                  ['country',    'Country', false],
                ] as [keyof typeof form, string, boolean][]).map(([key, label]) => (
                  <View key={key}>
                    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>
                    <TextInput
                      value={(form[key] as string) ?? ''}
                      onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                      placeholder={label.replace(' *', '')}
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.input, {
                        backgroundColor: colors.muted,
                        color: colors.foreground,
                        borderRadius: colors.radius,
                        borderColor: colors.border,
                      }]}
                    />
                  </View>
                ))}

                {/* Default toggle */}
                <TouchableOpacity
                  onPress={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
                  style={[styles.defaultRow, { backgroundColor: colors.muted, borderRadius: colors.radius }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.toggle, {
                    backgroundColor: form.isDefault ? colors.primary : colors.border,
                    borderRadius: 12,
                  }]}>
                    <View style={[styles.toggleThumb, { transform: [{ translateX: form.isDefault ? 18 : 2 }] }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.defaultLabel, { color: colors.foreground }]}>Set as default address</Text>
                    <Text style={[styles.defaultSub, { color: colors.mutedForeground }]}>Used for bookings by default</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => modal?.mode === 'add' ? createMutation.mutate() : updateMutation.mutate(modal!.address!.id)}
                disabled={saving || !form.line1 || !form.city || !form.state || !form.postalCode}
                style={[styles.saveBtn, {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  opacity: (saving || !form.line1 || !form.city || !form.state || !form.postalCode) ? 0.55 : 1,
                  marginTop: 16,
                  marginBottom: 8,
                }]}
                activeOpacity={0.85}
              >
                <Ionicons name={modal?.mode === 'add' ? 'add-circle' : 'checkmark-circle'} size={18} color="#fff" />
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : modal?.mode === 'add' ? 'Save Address' : 'Update Address'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:        { padding: 4 },
  title:          { fontSize: 20, fontWeight: '700' },
  subtitle:       { fontSize: 12, marginTop: 1 },
  addBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyIllustration: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:     { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyText:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  typeChips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 },
  typeChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  typeChipText:   { fontSize: 12, fontWeight: '600' },
  emptyBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13, marginTop: 8 },
  emptyBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  // Card
  card:           { borderWidth: 1.5, overflow: 'hidden' },
  cardTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  iconCircle:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  labelRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  labelText:      { fontSize: 15, fontWeight: '700' },
  defaultPill:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  defaultPillText:{ color: '#fff', fontSize: 10, fontWeight: '700' },
  addressLine:    { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  addressCity:    { fontSize: 12 },
  editIconBtn:    { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardDivider:    { height: 1, marginHorizontal: 14 },
  actionsRow:     { flexDirection: 'row', gap: 8, padding: 10, paddingHorizontal: 14 },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  actionBtnText:  { fontSize: 12, fontWeight: '600' },
  addMoreBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 14 },
  addMoreText:    { fontSize: 14, fontWeight: '600' },
  limitBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 4 },
  limitText:      { fontSize: 13 },
  // Modal
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { margin: 0, padding: 20, paddingBottom: 32, maxHeight: '92%' },
  sheetHandle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle:     { fontSize: 18, fontWeight: '700' },
  fieldLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  typeGrid:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeCard:       { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 6, borderWidth: 1.5 },
  typeCardLabel:  { fontSize: 12, fontWeight: '700' },
  input:          { padding: 12, fontSize: 14, borderWidth: 1 },
  defaultRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  toggle:         { width: 40, height: 24, justifyContent: 'center' },
  toggleThumb:    { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  defaultLabel:   { fontSize: 14, fontWeight: '600' },
  defaultSub:     { fontSize: 11, marginTop: 1 },
  saveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  saveBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
});
