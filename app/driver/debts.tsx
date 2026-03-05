import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: DEUDAS DEL REPARTIDOR
// Pantalla completa para ver deudas pendientes, liquidar y ver historial
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, AlertTriangle, CheckCircle, Clock, CreditCard, Banknote } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer, { ScreenCard } from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';
import {
  getDriverAllDebts,
  createSettlement,
  getDriverSettlements,
} from '@/services/driver-debt';
import { DriverDebtSummary, DebtSettlement } from '@/constants/types';
import { Toast } from '@/utils/toast';
import { SoundFeedback } from '@/services/sounds';

export default function DriverDebtsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, radius, space } = useTheme();

  const [driverId, setDriverId] = useState<string | null>(null);
  const [debts, setDebts] = useState<DriverDebtSummary[]>([]);
  const [settlements, setSettlements] = useState<DebtSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<DriverDebtSummary | null>(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    const loadDriverId = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (data) setDriverId(data.id);
      } catch {
        console.log('Driver record not found');
      }
    };
    loadDriverId();
  }, [user]);

  const loadData = useCallback(async () => {
    if (!driverId) return;
    try {
      const [debtData, settlementData] = await Promise.all([
        getDriverAllDebts(driverId),
        getDriverSettlements(driverId, 10),
      ]);
      setDebts(debtData);
      setSettlements(settlementData);
    } catch (error) {
      console.error('Error loading debts:', error);
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    if (driverId) loadData();
  }, [driverId, loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSettle = (debt: DriverDebtSummary) => {
    setSelectedBusiness(debt);
    setShowSettleModal(true);
  };

  const confirmSettle = async (method: 'cash' | 'transfer') => {
    if (!driverId || !selectedBusiness) return;
    setSettling(true);
    try {
      await createSettlement(driverId, selectedBusiness.businessId, method);
      SoundFeedback.success();
      Toast.success(`Liquidacion creada: $${selectedBusiness.totalPending.toFixed(2)} (${method === 'cash' ? 'Efectivo' : 'Transferencia'})`);
      setShowSettleModal(false);
      setSelectedBusiness(null);
      await loadData();
    } catch (error: any) {
      SoundFeedback.error();
      Alert.alert('Error', error.message || 'No se pudo crear la liquidacion');
    } finally {
      setSettling(false);
    }
  };

  const totalDebt = debts.reduce((sum, d) => sum + d.totalPending, 0);

  const getStatusColor = (percent: number) => {
    if (percent >= 90) return colors.error;
    if (percent >= 70) return colors.warning;
    return colors.success;
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      new: 'Nuevo',
      trusted: 'Confiable',
      verified: 'Verificado',
      blocked: 'Bloqueado',
    };
    return labels[tier] || tier;
  };

  const getTierColor = (tier: string) => {
    if (tier === 'blocked') return colors.error;
    if (tier === 'verified') return colors.success;
    if (tier === 'trusted') return colors.primary;
    return colors.text.secondary;
  };

  return (
    <ScreenContainer
      headerGradient="secondary"
      headerIcon={DollarSign}
      headerTitle="Mis Deudas"
      headerSubtitle={totalDebt > 0 ? `Total pendiente: $${totalDebt.toFixed(2)}` : 'Sin deudas pendientes'}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {/* Settlement Modal */}
      <Modal
        visible={showSettleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderRadius: radius.lg }]}>
            <ThemedText variant="h3" style={{ color: colors.text.primary, marginBottom: space.md }}>
              Liquidar Deuda
            </ThemedText>
            {selectedBusiness && (
              <>
                <ThemedText variant="body" style={{ color: colors.text.secondary, marginBottom: space.xs }}>
                  {selectedBusiness.businessName}
                </ThemedText>
                <ThemedText variant="h2" style={{ color: colors.error, marginBottom: space.lg }}>
                  ${selectedBusiness.totalPending.toFixed(2)} MXN
                </ThemedText>
                <ThemedText variant="label" style={{ color: colors.text.secondary, marginBottom: space.sm }}>
                  Metodo de pago:
                </ThemedText>

                <TouchableSound
                  style={[styles.paymentOption, { backgroundColor: colors.success + '15', borderColor: colors.success, borderRadius: radius.md }]}
                  onPress={() => confirmSettle('cash')}
                  disabled={settling}
                >
                  <Banknote size={24} color={colors.success} />
                  <View style={{ flex: 1, marginLeft: space.sm }}>
                    <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>Efectivo</ThemedText>
                    <ThemedText variant="caption" style={{ color: colors.text.secondary }}>Pagas directamente en el negocio</ThemedText>
                  </View>
                </TouchableSound>

                <TouchableSound
                  style={[styles.paymentOption, { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderRadius: radius.md }]}
                  onPress={() => confirmSettle('transfer')}
                  disabled={settling}
                >
                  <CreditCard size={24} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: space.sm }}>
                    <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>Transferencia</ThemedText>
                    <ThemedText variant="caption" style={{ color: colors.text.secondary }}>Transferencia bancaria al negocio</ThemedText>
                  </View>
                </TouchableSound>
              </>
            )}

            <TouchableSound
              style={[styles.cancelBtn, { borderColor: colors.text.secondary, borderRadius: radius.md }]}
              onPress={() => setShowSettleModal(false)}
              disabled={settling}
            >
              <ThemedText variant="body" style={{ color: colors.text.secondary }}>Cancelar</ThemedText>
            </TouchableSound>
          </View>
        </View>
      </Modal>

      {/* Total Summary */}
      {totalDebt > 0 && (
        <ScreenCard style={{ marginBottom: space.lg }}>
          <View style={styles.totalHeader}>
            <AlertTriangle size={24} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: space.sm }}>
              <ThemedText variant="label" style={{ color: colors.text.secondary }}>
                Deuda Total Pendiente
              </ThemedText>
              <ThemedText variant="h2" style={{ color: colors.error }}>
                ${totalDebt.toFixed(2)} MXN
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="caption" style={{ color: colors.text.muted, marginTop: space.sm }}>
            Liquida tus deudas a tiempo para mantener tu nivel de confianza
          </ThemedText>
        </ScreenCard>
      )}

      {/* Debts by Business */}
      <ThemedText variant="h3" style={{ color: colors.text.primary, marginBottom: space.sm }}>
        Deudas por Negocio
      </ThemedText>

      {loading ? (
        <ThemedText variant="body" style={{ color: colors.text.secondary, textAlign: 'center', paddingVertical: 24 }}>
          Cargando...
        </ThemedText>
      ) : debts.length === 0 ? (
        <ScreenCard style={{ alignItems: 'center', padding: space.xl }}>
          <CheckCircle size={48} color={colors.success} />
          <ThemedText variant="subtitle" bold style={{ color: colors.text.primary, marginTop: space.md }}>
            Sin deudas pendientes
          </ThemedText>
          <ThemedText variant="caption" style={{ color: colors.text.secondary, marginTop: space.xs }}>
            Todas tus cuentas estan al dia
          </ThemedText>
        </ScreenCard>
      ) : (
        debts.map((debt) => {
          const barColor = getStatusColor(debt.percentUsed);
          return (
            <View
              key={debt.businessId}
              style={[styles.debtCard, {
                backgroundColor: colors.card,
                borderRadius: radius.lg,
                padding: space.md,
                marginBottom: space.sm,
                borderLeftWidth: 4,
                borderLeftColor: barColor,
              }]}
            >
              <View style={styles.debtCardHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>
                    {debt.businessName}
                  </ThemedText>
                  <View style={[styles.tierBadge, { backgroundColor: getTierColor(debt.trustTier) + '20' }]}>
                    <ThemedText variant="caption" bold style={{ color: getTierColor(debt.trustTier) }}>
                      {getTierLabel(debt.trustTier)}
                    </ThemedText>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText variant="h3" style={{ color: colors.error }}>
                    ${debt.totalPending.toFixed(2)}
                  </ThemedText>
                  <ThemedText variant="caption" style={{ color: colors.text.secondary }}>
                    {debt.debtsCount} orden(es)
                  </ThemedText>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressBarBg, { backgroundColor: colors.background.secondary, borderRadius: radius.sm }]}>
                <View
                  style={[styles.progressBarFill, {
                    backgroundColor: barColor,
                    width: `${Math.min(debt.percentUsed, 100)}%`,
                    borderRadius: radius.sm,
                  }]}
                />
              </View>
              <ThemedText variant="caption" style={{ color: colors.text.muted, marginTop: 4 }}>
                ${debt.totalPending.toFixed(0)} / ${debt.maxDebtAmount.toFixed(0)} ({Math.round(debt.percentUsed)}%)
              </ThemedText>

              {/* Settle Button */}
              <TouchableSound
                style={[styles.settleBtn, {
                  backgroundColor: debt.isBlocked ? colors.error : colors.primary,
                  borderRadius: radius.md,
                  marginTop: space.sm,
                }]}
                onPress={() => handleSettle(debt)}
              >
                <DollarSign size={18} color="#fff" />
                <ThemedText variant="label" color="white" bold>
                  Liquidar ${debt.totalPending.toFixed(2)}
                </ThemedText>
              </TouchableSound>
            </View>
          );
        })
      )}

      {/* Settlement History */}
      {settlements.length > 0 && (
        <>
          <ThemedText variant="h3" style={{ color: colors.text.primary, marginTop: space.lg, marginBottom: space.sm }}>
            Historial de Liquidaciones
          </ThemedText>

          {settlements.map((s) => (
            <View
              key={s.id}
              style={[styles.settlementCard, {
                backgroundColor: colors.card,
                borderRadius: radius.md,
                padding: space.md,
                marginBottom: space.sm,
              }]}
            >
              <View style={styles.settlementHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subtitle" bold style={{ color: colors.text.primary }}>
                    {s.businessName || 'Negocio'}
                  </ThemedText>
                  <ThemedText variant="caption" style={{ color: colors.text.secondary }}>
                    {s.ordersCount} orden(es) - {s.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                  </ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <ThemedText variant="h3" style={{ color: colors.success }}>
                    ${s.totalAmount.toFixed(2)}
                  </ThemedText>
                  <View style={[styles.statusBadge, {
                    backgroundColor: s.status === 'confirmed' ? colors.success + '20' :
                                     s.status === 'disputed' ? colors.error + '20' : colors.warning + '20',
                  }]}>
                    <ThemedText variant="caption" bold style={{
                      color: s.status === 'confirmed' ? colors.success :
                             s.status === 'disputed' ? colors.error : colors.warning,
                    }}>
                      {s.status === 'confirmed' ? 'Confirmado' :
                       s.status === 'disputed' ? 'Disputado' : 'Pendiente'}
                    </ThemedText>
                  </View>
                </View>
              </View>
              <ThemedText variant="caption" style={{ color: colors.text.muted, marginTop: space.xs }}>
                {new Date(s.createdAt).toLocaleString('es-MX', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </ThemedText>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    padding: 24,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  debtCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  settlementCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
});
