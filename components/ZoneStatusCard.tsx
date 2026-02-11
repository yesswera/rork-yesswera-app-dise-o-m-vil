import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: COMPONENTE ESTADO DE ZONA
// Muestra el estado de la zona para negocios en desarrollo
// ============================================================================

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Share2,
  Truck,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  Zone,
  getZoneStatusColor,
  getZoneStatusLabel,
  getZoneStatusEmoji,
} from '@/services/zones';

interface ZoneStatusCardProps {
  zone: Zone;
  businessStatus?: 'active' | 'waitlist' | 'pending';
  driversRecruited?: number;
  onShareDriverLink?: () => void;
}

export default function ZoneStatusCard({
  zone,
  businessStatus = 'active',
  driversRecruited = 0,
  onShareDriverLink,
}: ZoneStatusCardProps) {
  const isActive = zone.status === 'active';
  const isDeveloping = zone.status === 'developing';
  const driversNeeded = Math.max(0, zone.minDriversRequired - zone.currentDrivers);

  const handleShareDriverLink = async () => {
    if (onShareDriverLink) {
      onShareDriverLink();
      return;
    }

    try {
      await Share.share({
        message:
          `¡Únete como repartidor en Yesswera! 🛵\n\n` +
          `Estamos buscando repartidores en ${zone.name}.\n` +
          `Gana dinero haciendo entregas en tu zona.\n\n` +
          `Descarga la app: https://yesswera.com/driver\n` +
          `Zona: ${zone.name}`,
        title: 'Únete como repartidor',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isActive) {
    return (
      <View style={styles.activeCard}>
        <View style={styles.activeHeader}>
          <CheckCircle size={24} color={Colors.success} />
          <View>
            <Text style={styles.activeTitle}>Zona Activa</Text>
            <Text style={styles.activeZoneName}>{zone.name}</Text>
          </View>
        </View>
        <View style={styles.activeStats}>
          <View style={styles.activeStat}>
            <Truck size={18} color={Colors.text.secondary} />
            <Text style={styles.activeStatText}>
              {zone.currentDrivers} repartidores disponibles
            </Text>
          </View>
          <View style={styles.activeStat}>
            <MapPin size={18} color={Colors.text.secondary} />
            <Text style={styles.activeStatText}>
              Radio de {zone.radiusKm} km
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Zona en desarrollo o waitlist
  return (
    <View style={styles.developingCard}>
      <LinearGradient
        colors={['#FEF3C7', '#FDE68A']}
        style={styles.warningGradient}
      >
        <View style={styles.developingHeader}>
          <AlertTriangle size={24} color="#D97706" />
          <View style={styles.developingHeaderText}>
            <Text style={styles.developingTitle}>
              {businessStatus === 'waitlist' ? 'En Lista de Espera' : 'Zona en Desarrollo'}
            </Text>
            <Text style={styles.developingZoneName}>{zone.name}</Text>
          </View>
        </View>

        {/* Progreso */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progreso de activación</Text>
            <Text style={styles.progressValue}>
              {Math.round(zone.activationProgress)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, zone.activationProgress)}%` },
              ]}
            />
          </View>
        </View>

        {/* Lo que falta */}
        <View style={styles.requirementsSection}>
          <Text style={styles.requirementsTitle}>Para activar la zona:</Text>

          <View style={styles.requirement}>
            <View
              style={[
                styles.requirementIcon,
                zone.currentDrivers >= zone.minDriversRequired && styles.requirementIconComplete,
              ]}
            >
              {zone.currentDrivers >= zone.minDriversRequired ? (
                <CheckCircle size={16} color={Colors.white} />
              ) : (
                <Truck size={16} color="#D97706" />
              )}
            </View>
            <View style={styles.requirementText}>
              <Text style={styles.requirementLabel}>
                Repartidores: {zone.currentDrivers}/{zone.minDriversRequired}
              </Text>
              {driversNeeded > 0 && (
                <Text style={styles.requirementHint}>
                  Faltan {driversNeeded} repartidor{driversNeeded > 1 ? 'es' : ''}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.requirement}>
            <View
              style={[
                styles.requirementIcon,
                zone.currentBusinesses >= zone.minBusinessesRequired && styles.requirementIconComplete,
              ]}
            >
              {zone.currentBusinesses >= zone.minBusinessesRequired ? (
                <CheckCircle size={16} color={Colors.white} />
              ) : (
                <MapPin size={16} color="#D97706" />
              )}
            </View>
            <View style={styles.requirementText}>
              <Text style={styles.requirementLabel}>
                Negocios: {zone.currentBusinesses}/{zone.minBusinessesRequired}
              </Text>
            </View>
          </View>
        </View>

        {/* CTA para reclutar drivers */}
        {driversNeeded > 0 && (
          <View style={styles.recruitSection}>
            <Text style={styles.recruitText}>
              ¿Conoces repartidores en la zona?{'\n'}
              Ayúdanos a activarla más rápido.
            </Text>
            <TouchableSound
              style={styles.recruitButton}
              onPress={handleShareDriverLink}
            >
              <Share2 size={18} color={Colors.white} />
              <Text style={styles.recruitButtonText}>Invitar Repartidores</Text>
            </TouchableSound>

            {driversRecruited > 0 && (
              <Text style={styles.recruitedCount}>
                Has reclutado {driversRecruited} repartidor{driversRecruited > 1 ? 'es' : ''}
              </Text>
            )}
          </View>
        )}

        {/* Beneficio de esperar */}
        <View style={styles.benefitNote}>
          <Text style={styles.benefitText}>
            Al activarse la zona, serás de los primeros en recibir pedidos
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Active zone styles
  activeCard: {
    backgroundColor: Colors.success + '10',
    borderWidth: 1,
    borderColor: Colors.success + '30',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  activeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    textTransform: 'uppercase',
  },
  activeZoneName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  activeStats: {
    gap: 8,
  },
  activeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeStatText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },

  // Developing zone styles
  developingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  warningGradient: {
    padding: 20,
  },
  developingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  developingHeaderText: {
    flex: 1,
  },
  developingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    textTransform: 'uppercase',
  },
  developingZoneName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D97706',
    borderRadius: 4,
  },
  requirementsSection: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  requirementIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementIconComplete: {
    backgroundColor: Colors.success,
  },
  requirementText: {
    flex: 1,
  },
  requirementLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  requirementHint: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  recruitSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recruitText: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  recruitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D97706',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  recruitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  recruitedCount: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 8,
    fontWeight: '600',
  },
  benefitNote: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    padding: 12,
  },
  benefitText: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
