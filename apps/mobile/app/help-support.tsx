import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Alert, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { supportApi } from '@/lib/api';

const FAQS = [
  { q: 'How do I book a service?', a: 'Go to the Services tab, choose a category, pick a professional and tap "Book Now". Select your date and time, add your address, and confirm the booking.' },
  { q: 'Can I cancel my booking?', a: 'Yes. Go to Bookings > tap your booking > Cancel. Cancellations made more than 2 hours before the scheduled time are free.' },
  { q: 'How do I reschedule?', a: 'Tap on your booking in the Bookings tab and select "Reschedule". Choose a new time that works for you.' },
  { q: 'When will the professional arrive?', a: 'Professionals are expected to arrive at the scheduled time. You will receive a notification when they are on their way.' },
  { q: 'How do I pay?', a: 'Payment is currently collected by the professional in cash after service completion. Digital payment options will be added soon.' },
  { q: 'How do reviews work?', a: 'After a service is completed, you can leave a rating and review for the professional. Honest reviews help others make better choices.' },
  { q: 'What if I have a problem with a service?', a: 'Contact us through this Help & Support section. Submit a support ticket and our team will respond within 24 hours.' },
];

export default function HelpSupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { accessToken, user } = useAuth();
  const topPadding = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [ticketModal, setTicketModal] = useState(false);
  const [openFaq, setOpenFaq]         = useState<number | null>(null);
  const [form, setForm] = useState({
    name: user?.fullName ?? '',
    email: user?.email ?? '',
    subject: '',
    message: '',
  });

  const ticketMutation = useMutation({
    mutationFn: () => supportApi.createTicket(form, accessToken),
    onSuccess: () => {
      Alert.alert('Ticket Submitted', 'We have received your request and will respond within 24 hours.');
      setTicketModal(false);
      setForm({ name: user?.fullName ?? '', email: user?.email ?? '', subject: '', message: '' });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.subject || !form.message) return Alert.alert('Error', 'All fields are required.');
    ticketMutation.mutate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPadding + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}>
        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickCard icon="ticket-outline" label="Submit Ticket" color={colors.primary} onPress={() => setTicketModal(true)} colors={colors} />
          <QuickCard icon="mail-outline" label="Email Us" color="#16A34A" onPress={() => Linking.openURL('mailto:support@servenow.in')} colors={colors} />
          <QuickCard icon="chatbubble-outline" label="WhatsApp" color="#25D366" onPress={async () => {
            const waDeep = 'whatsapp://send?phone=919999999999';
            const waWeb  = 'https://wa.me/919999999999';
            try {
              const ok = await Linking.canOpenURL(waDeep);
              await Linking.openURL(ok ? waDeep : waWeb);
            } catch { await Linking.openURL(waWeb); }
          }} colors={colors} />
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={[styles.faqCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {FAQS.map((faq, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <TouchableOpacity onPress={() => setOpenFaq(openFaq === i ? null : i)} style={styles.faqRow} activeOpacity={0.7}>
                <Text style={[styles.faqQ, { color: colors.foreground, flex: 1 }]}>{faq.q}</Text>
                <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              {openFaq === i && (
                <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{faq.a}</Text>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Contact */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CONTACT INFORMATION</Text>
        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <ContactRow icon="mail-outline" label="Email" value="support@servenow.in" onPress={() => Linking.openURL('mailto:support@servenow.in')} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ContactRow icon="call-outline" label="Phone" value="+91 99999 99999" onPress={() => Linking.openURL('tel:+919999999999')} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ContactRow icon="time-outline" label="Hours" value="Mon–Sat, 9 AM – 6 PM IST" colors={colors} />
        </View>
      </ScrollView>

      {/* Submit Ticket Modal */}
      <Modal visible={ticketModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.card, borderRadius: colors.radius * 2 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Submit Support Ticket</Text>
              <TouchableOpacity onPress={() => setTicketModal(false)}><Ionicons name="close" size={22} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 12 }}>
              {([['name', 'Your Name'], ['email', 'Email Address'], ['subject', 'Subject']] as [keyof typeof form, string][]).map(([key, label]) => (
                <View key={key} style={{ gap: 4 }}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
                  <TextInput value={form[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={label} placeholderTextColor={colors.mutedForeground}
                    keyboardType={key === 'email' ? 'email-address' : 'default'}
                    style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius }]} />
                </View>
              ))}
              <View style={{ gap: 4 }}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Message</Text>
                <TextInput value={form.message} onChangeText={(v) => setForm((f) => ({ ...f, message: v }))}
                  placeholder="Describe your issue in detail…" placeholderTextColor={colors.mutedForeground}
                  multiline numberOfLines={5} textAlignVertical="top"
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: colors.radius, minHeight: 100 }]} />
              </View>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={ticketMutation.isPending}
                style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: colors.radius, opacity: ticketMutation.isPending ? 0.7 : 1 }]}
              >
                <Text style={styles.saveBtnText}>{ticketMutation.isPending ? 'Submitting…' : 'Submit Ticket'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function QuickCard({ icon, label, color, onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]} activeOpacity={0.8}>
      <View style={[styles.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ContactRow({ icon, label, value, onPress, colors }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.contactRow} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <Ionicons name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.contactLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.contactValue, { color: onPress ? colors.primary : colors.foreground }]}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:     { padding: 4 },
  title:       { flex: 1, fontSize: 20, fontWeight: '700' },
  sectionTitle:{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: -8 },
  quickRow:    { flexDirection: 'row', gap: 10 },
  quickCard:   { flex: 1, alignItems: 'center', padding: 14, gap: 8, borderWidth: 1 },
  quickIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel:  { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  faqCard:     { borderWidth: 1, overflow: 'hidden' },
  divider:     { height: 1 },
  faqRow:      { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  faqQ:        { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  faqA:        { fontSize: 13, lineHeight: 19, paddingHorizontal: 14, paddingBottom: 14 },
  contactCard: { borderWidth: 1, overflow: 'hidden' },
  contactRow:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  contactLabel:{ fontSize: 13, width: 50 },
  contactValue:{ fontSize: 13, flex: 1 },
  backdrop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { margin: 12, padding: 24, gap: 12, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle:  { fontSize: 18, fontWeight: '700' },
  fieldLabel:  { fontSize: 12, fontWeight: '600' },
  input:       { padding: 12, fontSize: 14 },
  saveBtn:     { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
