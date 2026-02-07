// ============================================================================
// YESSWERA: PANTALLA MIS REFERIDOS
// Usa ScreenContainer para diseño unificado
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Gift,
  Users,
  Wallet,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  Share2,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import ReferralQRCard from '@/components/ReferralQRCard';
import RaffleBanner from '@/components/RaffleBanner';
import {
  getMyReferralCode,
  getMyReferrals,
  getMyReferralStats,
  getMyCreditBalance,
  getMyCredits,
  getShareMessage,
  getCreditStatusColor,
  getCreditStatusLabel,
  trackCodeShared,
  Referral,
  ReferralStats,
  UserCredit,
  CreditBalance,
} from '@/services/referrals';

// Colores explícitos para modo oscuro
const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#A8A29E',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    text: '#FAFAFA',
    textSecondary: '#D6D3D1',
    textMuted: '#78716C',
  },
};

export default function ReferralsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [credits, setCredits] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'referrals' | 'credits'>('referrals');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [code, referralStats, balance, myReferrals, myCredits] = await Promise.all([
        getMyReferralCode(),
        getMyReferralStats(),
        getMyCreditBalance(),
        getMyReferrals(),
        getMyCredits(),
      ]);

      setReferralCode(code?.code || '');
      setStats(referralStats);
      setCreditBalance(balance);
      setReferrals(myReferrals);
      setCredits(myCredits);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleShare = async () => {
    if (!referralCode) return;

    try {
      const message = getShareMessage(referralCode);
      await Share.share({ message, title: 'Únete a Yesswera' });
      trackCodeShared();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} color={colors.success || '#22C55E'} />;
      case 'first_order':
        return <Clock size={16} color={colors.warning || '#F59E0B'} />;
      default:
        return <AlertCircle size={16} color={theme.textMuted} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Usuario activo';
      case 'first_order':
        return 'Hizo primer pedido';
      case 'registered':
        return 'Registrado';
      default:
        return status;
    }
  };

  // Header content with stats
  const headerContent = stats ? (
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <Users size={22} color="#FFFFFF" />
        <Text style={styles.statValue}>{stats.totalReferrals}</Text>
        <Text style={styles.statLabel}>Referidos</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Wallet size={22} color="#FFFFFF" />
        <Text style={styles.statValue}>${stats.totalCreditsEarned}</Text>
        <Text style={styles.statLabel}>Ganados</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <Trophy size={22} color="#FFFFFF" />
        <Text style={styles.statValue}>{stats.raffleEntries}</Text>
        <Text style={styles.statLabel}>Entradas</Text>
      </View>
    </View>
  ) : null;

  return (
    <ScreenContainer
      headerGradient="tertiary"
      headerIcon={Gift}
      headerTitle="Mis Referidos"
      headerSubtitle="Invita amigos y gana recompensas"
      headerContent={headerContent}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* QR Card */}
      <ReferralQRCard onShare={loadData} />

      {/* Raffle Banner */}
      <RaffleBanner showEntries={true} />

      {/* Credit Balance Card */}
      {creditBalance && creditBalance.availableBalance > 0 && (
        <View style={[styles.balanceCard, { backgroundColor: theme.card }]}>
          <View style={styles.balanceHeader}>
            <Wallet size={24} color={colors.success || '#22C55E'} />
            <View>
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Créditos disponibles</Text>
              <Text style={[styles.balanceValue, { color: colors.success || '#22C55E' }]}>
                ${creditBalance.availableBalance.toFixed(2)} MXN
              </Text>
            </View>
          </View>
          {creditBalance.expiringSoonCount > 0 && (
            <View style={[styles.expiringWarning, { backgroundColor: (colors.warning || '#F59E0B') + '15' }]}>
              <AlertCircle size={14} color={colors.warning || '#F59E0B'} />
              <Text style={[styles.expiringText, { color: colors.warning || '#F59E0B' }]}>
                {creditBalance.expiringSoonCount} crédito(s) por expirar pronto
              </Text>
            </View>
          )}
          <Text style={[styles.balanceHint, { color: theme.textMuted }]}>
            Se aplican automáticamente en tu próximo pedido
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.cardAlt }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'referrals' && [styles.tabActive, { backgroundColor: theme.card }]]}
          onPress={() => setActiveTab('referrals')}
        >
          <Users size={18} color={activeTab === 'referrals' ? colors.primary : theme.textSecondary} />
          <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'referrals' && { color: colors.primary }]}>
            Referidos ({referrals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'credits' && [styles.tabActive, { backgroundColor: theme.card }]]}
          onPress={() => setActiveTab('credits')}
        >
          <Gift size={18} color={activeTab === 'credits' ? colors.primary : theme.textSecondary} />
          <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'credits' && { color: colors.primary }]}>
            Créditos ({credits.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on tab */}
      {activeTab === 'referrals' ? (
        <View style={styles.listContainer}>
          {referrals.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Aún no tienes referidos</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Comparte tu código y gana $20 por cada amigo que se registre
              </Text>
              <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={handleShare}>
                <Share2 size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Compartir Código</Text>
              </TouchableOpacity>
            </View>
          ) : (
            referrals.map((referral, index) => (
              <View key={referral.id || index} style={[styles.referralCard, { backgroundColor: theme.card }]}>
                <View style={[styles.referralAvatar, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.referralAvatarText, { color: colors.primary }]}>
                    {referral.referredName?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.referralInfo}>
                  <Text style={[styles.referralName, { color: theme.text }]}>
                    {referral.referredName || 'Usuario'}
                  </Text>
                  <View style={styles.referralStatus}>
                    {getStatusIcon(referral.status)}
                    <Text style={[styles.referralStatusText, { color: theme.textSecondary }]}>
                      {getStatusLabel(referral.status)}
                    </Text>
                  </View>
                  <Text style={[styles.referralDate, { color: theme.textMuted }]}>
                    {new Date(referral.referredAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                {referral.creditEarned && referral.creditEarned > 0 && (
                  <View style={[styles.creditEarned, { backgroundColor: (colors.success || '#22C55E') + '15' }]}>
                    <Text style={[styles.creditEarnedText, { color: colors.success || '#22C55E' }]}>
                      +${referral.creditEarned}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      ) : (
        <View style={styles.listContainer}>
          {credits.length === 0 ? (
            <View style={styles.emptyState}>
              <Gift size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin créditos aún</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Refiere amigos para ganar créditos que puedes usar en tus pedidos
              </Text>
            </View>
          ) : (
            credits.map((credit, index) => (
              <View key={credit.id || index} style={[styles.creditCard, { backgroundColor: theme.card }]}>
                <View style={styles.creditLeft}>
                  <View
                    style={[
                      styles.creditIcon,
                      { backgroundColor: getCreditStatusColor(credit.status) + '20' },
                    ]}
                  >
                    <Gift size={20} color={getCreditStatusColor(credit.status)} />
                  </View>
                  <View style={styles.creditInfo}>
                    <Text style={[styles.creditDescription, { color: theme.text }]}>
                      {credit.description || credit.creditType}
                    </Text>
                    <View style={styles.creditMeta}>
                      <View
                        style={[
                          styles.creditStatusBadge,
                          { backgroundColor: getCreditStatusColor(credit.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.creditStatusText,
                            { color: getCreditStatusColor(credit.status) },
                          ]}
                        >
                          {getCreditStatusLabel(credit.status)}
                        </Text>
                      </View>
                      {credit.expiresAt && credit.status === 'active' && (
                        <Text style={[styles.creditExpires, { color: theme.textMuted }]}>
                          Expira:{' '}
                          {new Date(credit.expiresAt).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.creditRight}>
                  <Text
                    style={[
                      styles.creditAmount,
                      { color: colors.success || '#22C55E' },
                      credit.status !== 'active' && [styles.creditAmountInactive, { color: theme.textMuted }],
                    ]}
                  >
                    ${credit.amount.toFixed(2)}
                  </Text>
                  {credit.usedAmount > 0 && (
                    <Text style={[styles.creditUsed, { color: theme.textMuted }]}>
                      -${credit.usedAmount.toFixed(2)} usado
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* How it works */}
      <View style={[styles.howItWorks, { backgroundColor: theme.card }]}>
        <Text style={[styles.howItWorksTitle, { color: theme.text }]}>¿Cómo funciona?</Text>
        <View style={styles.step}>
          <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Comparte tu código</Text>
            <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
              Envía tu código o QR a amigos y familiares
            </Text>
          </View>
        </View>
        <View style={styles.step}>
          <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Ellos se registran</Text>
            <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
              Usan tu código al crear su cuenta en Yesswera
            </Text>
          </View>
        </View>
        <View style={styles.step}>
          <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Ambos ganan</Text>
            <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
              Tú recibes $20 y ellos $15 de crédito + entradas al sorteo
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  balanceCard: {
    marginVertical: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  expiringWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  expiringText: {
    fontSize: 12,
  },
  balanceHint: {
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  referralAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  referralAvatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  referralStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  referralStatusText: {
    fontSize: 12,
  },
  referralDate: {
    fontSize: 11,
  },
  creditEarned: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  creditEarnedText: {
    fontSize: 14,
    fontWeight: '700',
  },
  creditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  creditLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creditIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  creditInfo: {
    flex: 1,
  },
  creditDescription: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  creditMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creditStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  creditStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  creditExpires: {
    fontSize: 11,
  },
  creditRight: {
    alignItems: 'flex-end',
  },
  creditAmount: {
    fontSize: 17,
    fontWeight: '700',
  },
  creditAmountInactive: {
    textDecorationLine: 'line-through',
  },
  creditUsed: {
    fontSize: 11,
    marginTop: 2,
  },
  howItWorks: {
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
  },
  howItWorksTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
