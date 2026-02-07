// ============================================================================
// YESSWERA: BANNER DE SORTEO
// Muestra información del sorteo activo y entradas del usuario
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, Clock, Trophy, ChevronRight, Ticket } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import {
  getActiveRaffle,
  getMyRaffleEntries,
  getTimeUntilDraw,
  Raffle,
  MyRaffleEntry,
} from '@/services/raffles';

interface RaffleBannerProps {
  compact?: boolean;
  showEntries?: boolean;
  onPress?: () => void;
}

export default function RaffleBanner({
  compact = false,
  showEntries = true,
  onPress,
}: RaffleBannerProps) {
  const router = useRouter();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [myEntries, setMyEntries] = useState<MyRaffleEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, isExpired: false });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!raffle) return;

    // Actualizar countdown cada minuto
    const updateCountdown = () => {
      const time = getTimeUntilDraw(raffle.drawDate);
      setCountdown(time);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [raffle]);

  const loadData = async () => {
    try {
      const [activeRaffle, entries] = await Promise.all([
        getActiveRaffle(),
        showEntries ? getMyRaffleEntries() : null,
      ]);
      setRaffle(activeRaffle);
      setMyEntries(entries);
    } catch (error) {
      console.error('Error loading raffle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/raffle' as any);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator color={Colors.gold} size="small" />
      </View>
    );
  }

  if (!raffle) {
    return null;
  }

  const totalPrizeValue = raffle.prizes.reduce(
    (sum, p) => sum + (p.estimatedValue || 0),
    0
  );

  if (compact) {
    return (
      <TouchableOpacity onPress={handlePress}>
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.compactBanner}
        >
          <View style={styles.compactLeft}>
            <Trophy size={20} color={Colors.white} />
            <View>
              <Text style={styles.compactTitle}>Sorteo Activo</Text>
              <Text style={styles.compactPrizes}>
                {raffle.prizes.length} premios disponibles
              </Text>
            </View>
          </View>
          <View style={styles.compactRight}>
            {myEntries && myEntries.totalEntries > 0 && (
              <View style={styles.entryBadge}>
                <Ticket size={12} color="#D97706" />
                <Text style={styles.entryBadgeText}>{myEntries.totalEntries}</Text>
              </View>
            )}
            <ChevronRight size={20} color={Colors.white} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <LinearGradient
        colors={['#F59E0B', '#D97706', '#B45309']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Icono decorativo */}
        <View style={styles.iconContainer}>
          <Trophy size={48} color="rgba(255,255,255,0.2)" />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Gift size={24} color={Colors.white} />
          <Text style={styles.title}>Sorteo del Mes</Text>
        </View>

        <Text style={styles.raffleName}>{raffle.title}</Text>

        {/* Premios */}
        <View style={styles.prizesRow}>
          <Text style={styles.prizesCount}>{raffle.prizes.length} premios</Text>
          {totalPrizeValue > 0 && (
            <Text style={styles.prizesValue}>
              Valor total: ${totalPrizeValue.toLocaleString()}
            </Text>
          )}
        </View>

        {/* Lista de premios (primeros 3) */}
        <View style={styles.prizesList}>
          {raffle.prizes.slice(0, 3).map((prize, index) => (
            <View key={prize.id} style={styles.prizeItem}>
              <Text style={styles.prizeEmoji}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </Text>
              <Text style={styles.prizeName} numberOfLines={1}>
                {prize.title}
              </Text>
              <Text style={styles.prizeBusiness}>{prize.businessName}</Text>
            </View>
          ))}
          {raffle.prizes.length > 3 && (
            <Text style={styles.morePrizes}>
              +{raffle.prizes.length - 3} premios más
            </Text>
          )}
        </View>

        {/* Countdown */}
        <View style={styles.countdownSection}>
          <Clock size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.countdownLabel}>Termina en:</Text>
          <View style={styles.countdownValues}>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>{countdown.days}</Text>
              <Text style={styles.countdownUnit}>días</Text>
            </View>
            <Text style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>{countdown.hours}</Text>
              <Text style={styles.countdownUnit}>hrs</Text>
            </View>
            <Text style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text style={styles.countdownNumber}>{countdown.minutes}</Text>
              <Text style={styles.countdownUnit}>min</Text>
            </View>
          </View>
        </View>

        {/* Mis entradas */}
        {showEntries && myEntries && (
          <View style={styles.myEntriesSection}>
            <View style={styles.myEntriesBox}>
              <Ticket size={20} color={Colors.gold} />
              <View style={styles.myEntriesInfo}>
                <Text style={styles.myEntriesLabel}>Mis entradas</Text>
                <Text style={styles.myEntriesValue}>{myEntries.totalEntries}</Text>
              </View>
            </View>
            <View style={styles.entriesBreakdown}>
              <Text style={styles.breakdownText}>
                {myEntries.registrationEntries} por registro
              </Text>
              <Text style={styles.breakdownText}>
                {myEntries.referralEntries} por referidos
              </Text>
            </View>
          </View>
        )}

        {/* Participantes */}
        <View style={styles.participantsRow}>
          <Text style={styles.participantsText}>
            {raffle.totalParticipants} participantes • {raffle.totalEntries} entradas
          </Text>
        </View>

        {/* Call to action */}
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Refiere amigos para más entradas</Text>
          <ChevronRight size={18} color={Colors.white} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  containerCompact: {
    borderRadius: 12,
    marginVertical: 8,
  },
  gradient: {
    padding: 20,
    position: 'relative',
  },
  iconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  raffleName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 12,
  },
  prizesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  prizesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prizesValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  prizesList: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  prizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  prizeEmoji: {
    fontSize: 16,
  },
  prizeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  prizeBusiness: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  morePrizes: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  countdownSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  countdownLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  countdownValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countdownNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  countdownUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  countdownSeparator: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  myEntriesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  myEntriesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myEntriesInfo: {},
  myEntriesLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  myEntriesValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#D97706',
  },
  entriesBreakdown: {
    alignItems: 'flex-end',
  },
  breakdownText: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  participantsRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  participantsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  // Compact styles
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  compactPrizes: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  entryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
});
