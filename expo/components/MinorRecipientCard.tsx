import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';

export interface MinorRecipientData {
  isMinor: boolean;
  name: string;
  age: string;
  relationship: string;
}

interface Props {
  value: MinorRecipientData;
  onChange: (data: MinorRecipientData) => void;
}

const RELATIONSHIPS = ['Hijo(a)', 'Sobrino(a)', 'Nieto(a)', 'Vecino(a)', 'Otro'];

export default function MinorRecipientCard({ value, onChange }: Props) {
  const toggle = () => {
    onChange({
      ...value,
      isMinor: !value.isMinor,
      name: !value.isMinor ? value.name : '',
      age: !value.isMinor ? value.age : '',
      relationship: !value.isMinor ? value.relationship : '',
    });
  };

  return (
    <YCard style={styles.card}>
      <View style={styles.sectionHeader}>
        <Feather name="users" size={18} color={DS.colors.green} />
        <Text style={styles.sectionTitle}>Quien recibe?</Text>
      </View>

      <TouchableOpacity style={styles.toggleRow} onPress={toggle} activeOpacity={0.7}>
        <View style={[styles.checkbox, value.isMinor && styles.checkboxActive]}>
          {value.isMinor && <Feather name="check" size={14} color="#FFF" />}
        </View>
        <Text style={styles.toggleText}>Recibe un menor de edad</Text>
      </TouchableOpacity>

      {value.isMinor && (
        <View style={styles.fields}>
          <Text style={styles.notice}>
            Por seguridad, el repartidor verificara que haya un adulto presente al momento de la entrega.
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nombre del menor</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Sofia"
              placeholderTextColor={DS.colors.placeholder}
              value={value.name}
              onChangeText={(t) => onChange({ ...value, name: t })}
              maxLength={50}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Edad aproximada</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 12"
              placeholderTextColor={DS.colors.placeholder}
              value={value.age}
              onChangeText={(t) => onChange({ ...value, age: t.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Parentesco contigo</Text>
            <View style={styles.chipRow}>
              {RELATIONSHIPS.map((rel) => {
                const active = value.relationship === rel;
                return (
                  <TouchableOpacity
                    key={rel}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => onChange({ ...value, relationship: rel })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{rel}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </YCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: DS.colors.dark },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: DS.colors.hairline,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: DS.colors.orange, borderColor: DS.colors.orange },
  toggleText: { fontSize: 14, color: DS.colors.body, fontWeight: '500' },
  fields: { marginTop: 14, gap: 12 },
  notice: {
    fontSize: 12, color: DS.colors.orange, lineHeight: 17,
    backgroundColor: 'rgba(234,88,12,0.08)', padding: 10, borderRadius: 8,
  },
  field: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: DS.colors.dark },
  input: {
    borderWidth: 1, borderColor: DS.colors.hairline, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: DS.colors.dark,
    backgroundColor: DS.colors.bg,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16,
    backgroundColor: DS.colors.bg, borderWidth: 1, borderColor: DS.colors.hairline,
  },
  chipActive: { backgroundColor: DS.colors.orange, borderColor: DS.colors.orange },
  chipText: { fontSize: 13, color: DS.colors.body },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
});
