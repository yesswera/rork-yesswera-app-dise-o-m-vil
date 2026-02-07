// ============================================================================
// YESSWERA: COMPONENTE QR DE REFERIDO
// Tarjeta con código QR personal para compartir
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Share,
  Alert,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { QrCode, Share2, Copy, Gift, Users, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  getMyReferralCode,
  getMyReferralStats,
  getShareMessage,
  generateReferralLink,
  trackCodeShared,
  ReferralCode,
  ReferralStats,
} from '@/services/referrals';

interface ReferralQRCardProps {
  compact?: boolean;
  onShare?: () => void;
}

export default function ReferralQRCard({ compact = false, onShare }: ReferralQRCardProps) {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [code, referralStats] = await Promise.all([
        getMyReferralCode(),
        getMyReferralStats(),
      ]);
      setReferralCode(code);
      setStats(referralStats);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;

    try {
      const message = getShareMessage(referralCode.code);

      const result = await Share.share({
        message,
        title: 'Únete a Yesswera',
      });

      if (result.action === Share.sharedAction) {
        trackCodeShared();
        onShare?.();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'No se pudo compartir');
    }
  };

  const handleCopyCode = () => {
    if (!referralCode) return;

    Clipboard.setString(referralCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (!referralCode) return;

    const link = generateReferralLink(referralCode.code);
    Clipboard.setString(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!referralCode) {
    return null;
  }

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactCard} onPress={handleShare}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactContent}>
            <Gift size={24} color={Colors.white} />
            <View style={styles.compactText}>
              <Text style={styles.compactTitle}>Invita amigos, gana premios</Text>
              <Text style={styles.compactSubtitle}>Tu código: {referralCode.code}</Text>
            </View>
            <Share2 size={20} color={Colors.white} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Gift size={28} color={Colors.white} />
          <Text style={styles.headerTitle}>Invita y Gana</Text>
        </View>

        <Text style={styles.headerSubtitle}>
          Comparte tu código y ambos ganan créditos + entradas al sorteo
        </Text>

        {/* QR Placeholder - En producción usar librería de QR */}
        <View style={styles.qrContainer}>
          <View style={styles.qrPlaceholder}>
            <QrCode size={80} color={Colors.primary} strokeWidth={1.5} />
            <Text style={styles.qrHint}>Escanea para unirte</Text>
          </View>
        </View>

        {/* Código */}
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Tu código:</Text>
          <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
            <Text style={styles.codeText}>{referralCode.code}</Text>
            {copied ? (
              <CheckCircle size={20} color={Colors.success} />
            ) : (
              <Copy size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={18} color={Colors.white} />
              <Text style={styles.statValue}>{stats.totalReferrals}</Text>
              <Text style={styles.statLabel}>Referidos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Gift size={18} color={Colors.white} />
              <Text style={styles.statValue}>${stats.totalCreditsEarned}</Text>
              <Text style={styles.statLabel}>Ganados</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <QrCode size={18} color={Colors.white} />
              <Text style={styles.statValue}>{stats.raffleEntries}</Text>
              <Text style={styles.statLabel}>Entradas</Text>
            </View>
          </View>
        )}

        {/* Botón compartir */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={20} color={Colors.primary} />
          <Text style={styles.shareButtonText}>Compartir Invitación</Text>
        </TouchableOpacity>

        {/* Recompensas */}
        <View style={styles.rewardsInfo}>
          <Text style={styles.rewardText}>
            <Text style={styles.rewardHighlight}>Tú ganas:</Text> $20 crédito + 1 entrada al sorteo
          </Text>
          <Text style={styles.rewardText}>
            <Text style={styles.rewardHighlight}>Tu amigo gana:</Text> $15 crédito + 1 entrada al sorteo
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  containerCompact: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
  },
  qrHint: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  codeSection: {
    width: '100%',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  rewardsInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    width: '100%',
  },
  rewardText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 4,
  },
  rewardHighlight: {
    fontWeight: '700',
    color: Colors.white,
  },
  // Compact styles
  compactCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  compactGradient: {
    padding: 16,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactText: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  compactSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});
