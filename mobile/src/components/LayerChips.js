import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

const LAYERS = [
  { id: 'spots', label: 'Spots' },
  { id: 'hospedagem', label: 'Hospedagem' },
  { id: 'gastronomia', label: 'Gastronomia' },
];

export default function LayerChips({ active, onToggle }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {LAYERS.map((l) => {
        const on = !!active[l.id];
        return (
          <Pressable
            key={l.id}
            onPress={() => onToggle(l.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{l.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: 'rgba(230,220,196,0.22)',
    backgroundColor: 'rgba(230,220,196,0.06)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: 'rgba(227,61,107,0.55)', backgroundColor: 'rgba(227,61,107,0.15)' },
  chipText: { color: '#cfc5b4', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  chipTextOn: { color: '#ebe3cf' },
});
