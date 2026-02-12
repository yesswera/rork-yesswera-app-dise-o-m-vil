// ============================================================================
// YESSWERA: PANTALLA DE BILLETERA
// Usa ScreenContainer para diseño unificado
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, TrendingUp, TrendingDown, Clock, Wallet } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { supabase } from '@/constants/supabase';
import ScreenContainer from '@/components/ScreenContainer';

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

interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'payment' | 'refund' | 'bonus' | 'cashback';
  amount: number;
  description: string;
  createdAt: string;
  orderId?: string;
}

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  transactions: Transaction[];
}

export default function WalletScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    if (!user || !token) {
      setLoading(false);
      return;
    }

    try {
      if (user.userType === 'driver') {
        // Get driver balance and completed orders as transactions
        const { data: driver } = await supabase
          .from('drivers')
          .select('id, balance')
          .eq('user_id', user.id)
          .maybeSingle();

        const driverId = driver?.id;
        const balance = Number(driver?.balance) || 0;

        // Get recent delivered orders as earning transactions
        let transactions: Transaction[] = [];
        if (driverId) {
          const { data: orders } = await supabase
            .from('orders')
            .select('id, order_number, delivery_fee, delivered_at')
            .eq('driver_id', driverId)
            .eq('status', 'delivered')
            .order('delivered_at', { ascending: false })
            .limit(20);

          transactions = (orders || []).map((order: any) => ({
            id: order.id,
            type: 'earning' as const,
            amount: Number(order.delivery_fee) || 0,
            description: `Entrega completada - Orden #${order.order_number || order.id.slice(0, 6)}`,
            createdAt: order.delivered_at || new Date().toISOString(),
            orderId: order.id,
          }));
        }

        const totalEarnings = transactions.reduce((sum, t) => sum + t.amount, 0);

        setWalletData({
          balance,
          pendingBalance: 0,
          totalEarnings,
          transactions,
        });
      } else {
        // Clients don't have wallet yet
        setWalletData({
          balance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          transactions: [],
        });
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      setWalletData({
        balance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        transactions: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWalletData();
  }, []);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
      case 'bonus':
      case 'cashback':
      case 'refund':
        return <TrendingUp size={20} color={colors.success || '#22C55E'} />;
      case 'withdrawal':
      case 'payment':
        return <TrendingDown size={20} color={colors.error || '#EF4444'} />;
      default:
        return <DollarSign size={20} color={theme.textSecondary} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earning':
      case 'bonus':
      case 'cashback':
      case 'refund':
        return colors.success || '#22C55E';
      case 'withdrawal':
      case 'payment':
        return colors.error || '#EF4444';
      default:
        return theme.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Hace unos minutos';
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#1C1917' : '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando saldo...</Text>
      </View>
    );
  }

  // Header content for inside gradient
  const headerContent = (
    <View style={styles.headerContentContainer}>
      {/* Balance Info */}
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Saldo Disponible</Text>
        <Text style={styles.balanceAmount}>${walletData?.balance.toFixed(2)} MXN</Text>

        <View style={styles.pendingBalanceRow}>
          <Clock size={16} color="rgba(255, 255, 255, 0.8)" />
          <Text style={styles.pendingBalanceText}>
            ${walletData?.pendingBalance.toFixed(2)} pendiente
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ganancias Totales</Text>
          <Text style={styles.statValue}>${walletData?.totalEarnings.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={Wallet}
      headerTitle="Mi Billetera"
      headerSubtitle="Gestiona tus ganancias y retiros"
      headerContent={headerContent}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Transactions Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Transacciones Recientes</Text>
      </View>

      {walletData?.transactions && walletData.transactions.length > 0 ? (
        walletData.transactions.map((transaction) => (
          <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: theme.card }]}>
            <View style={[styles.transactionIcon, { backgroundColor: theme.cardAlt }]}>
              {getTransactionIcon(transaction.type)}
            </View>

            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionDescription, { color: theme.text }]}>
                {transaction.description}
              </Text>
              <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                {formatDate(transaction.createdAt)}
              </Text>
            </View>

            <Text style={[styles.transactionAmount, { color: getTransactionColor(transaction.type) }]}>
              {['earning', 'bonus', 'cashback', 'refund'].includes(transaction.type) ? '+' : '-'}
              ${transaction.amount.toFixed(2)}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <DollarSign size={48} color={theme.textMuted} />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            No hay transacciones recientes
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerContentContainer: {
    marginTop: 16,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  pendingBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingBalanceText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
  },
});
