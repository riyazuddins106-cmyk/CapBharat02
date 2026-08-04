import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useLanguage, LOCALE_LABELS } from '@/context/LanguageContext';

export function LanguagePicker() {
  const { locale, enabledLocales, setLocale, t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t('language.select')} onPress={() => setOpen(true)} style={styles.button}>
        <Text style={styles.buttonText}>文A</Text>
        <Text style={styles.current}>{LOCALE_LABELS[locale]}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.title}>{t('language.select')}</Text>
            {enabledLocales.map((item) => (
              <Pressable key={item} onPress={() => { void setLocale(item); setOpen(false); }} style={[styles.option, item === locale && styles.selected]}>
                <Text style={styles.optionText}>{LOCALE_LABELS[item]}</Text>
                {item === locale && <Text style={styles.check}>✓</Text>}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', top: 12, right: 16, zIndex: 30, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(91,62,245,0.1)' },
  buttonText: { fontSize: 13, fontWeight: '800', color: '#5B3EF5' },
  current: { fontSize: 11, fontWeight: '700', color: '#374151' },
  backdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 55, paddingRight: 16, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { width: 210, borderRadius: 16, padding: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, elevation: 8 },
  title: { marginBottom: 8, fontSize: 15, fontWeight: '800', color: '#111827' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 11, borderRadius: 10 },
  selected: { backgroundColor: '#EDE9FE' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  check: { fontSize: 16, fontWeight: '800', color: '#5B3EF5' },
});