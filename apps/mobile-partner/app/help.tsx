import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';

const guides = [
  ['Before you start', 'Confirm the address, review customer notes, and take a clear before-service photo when the job needs evidence.'],
  ['Check-in safely', 'Ask the customer to show the booking QR. Do not start work or request payment before check-in.'],
  ['Professional conduct', 'Use the in-app contact details, arrive within the scheduled window, and explain any extra work before proceeding.'],
  ['If something goes wrong', 'Open the job and report the exact issue. Choose urgent only for safety or emergency situations.'],
];
export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={22} color={colors.foreground} /></TouchableOpacity>
      <Text style={[styles.title, { color: colors.foreground }]}>Help & Training</Text>
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }}>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Practical guidance for every ServeNow service visit.</Text>
      {guides.map(([title, body]) => <View key={title} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text>
      </View>)}
      <TouchableOpacity onPress={() => Linking.openURL('mailto:support@servenow.in')} style={[styles.contact, { backgroundColor: colors.primary, borderRadius: colors.radius }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800' }}>Contact Partner Support</Text>
      </TouchableOpacity>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 19, fontWeight: '800' },
  intro: { fontSize: 14, lineHeight: 21, marginBottom: 14 },
  card: { padding: 16, borderWidth: 1, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 7 },
  body: { lineHeight: 20, fontSize: 13 },
  contact: { padding: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 6 },
});