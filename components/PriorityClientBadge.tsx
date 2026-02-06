/**
 * Badge Cliente Prioritario - Yesswera
 * Muestra al negocio que este cliente tuvo una mala experiencia previa
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface PriorityClientBadgeProps {
  reason?: string;
  expanded?: boolean;
  onToggle?: () => void;
  compact?: boolean;
}

export default function PriorityClientBadge({
  reason,
  expanded = false,
  onToggle,
  compact = false,
}: PriorityClientBadgeProps) {
  if (compact) {
    return (
      <View style={styles.compactBadge}>
        <AlertTriangle size={14} color={Colors.warning} />
        <Text style={styles.compactText}>Cliente Prioritario</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggle}
      activeOpacity={onToggle ? 0.8 : 1}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={20} color={Colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>CLIENTE PRIORITARIO</Text>
          <Text style={styles.subtitle}>Atiendelo con prioridad</Text>
        </View>
        {onToggle && (
          expanded ? (
            <ChevronUp size={20} color={Colors.warning} />
          ) : (
            <ChevronDown size={20} color={Colors.warning} />
          )
        )}
      </View>

      {expanded && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Este cliente tuvo una mala experiencia con otro negocio que no pudo
            completar su pedido.
          </Text>

          {reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Motivo:</Text>
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          )}

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Por favor:</Text>
            <Text style={styles.tipItem}>• Atiendelo con prioridad</Text>
            <Text style={styles.tipItem}>• Cuida la calidad de su pedido</Text>
            <Text style={styles.tipItem}>• Cumple el tiempo estimado</Text>
          </View>

          <View style={styles.motivationContainer}>
            <Text style={styles.motivationText}>
              ¡Es tu oportunidad de ganar un nuevo cliente fiel!
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 2,
    borderColor: Colors.warning,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  content: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 158, 11, 0.2)',
  },
  description: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: 12,
  },
  reasonContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: Colors.text.primary,
    fontStyle: 'italic',
  },
  tips: {
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  tipItem: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
    paddingLeft: 4,
  },
  motivationContainer: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    padding: 10,
  },
  motivationText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warning,
  },
});
