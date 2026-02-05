import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { DollarSign, TrendingUp, TrendingDown, Clock, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';

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
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

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
          .single();

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
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
      case 'bonus':
      case 'cashback':
      case 'refund':
        return <TrendingUp size={20} color={Colors.success} />;
      case 'withdrawal':
      case 'payment':
        return <TrendingDown size={20} color={Colors.error} />;
      default:
        return <DollarSign size={20} color={Colors.text.secondary} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earning':
      case 'bonus':
      case 'cashback':
      case 'refund':
        return Colors.success;
      case 'withdrawal':
      case 'payment':
        return Colors.error;
      default:
        return Colors.text.secondary;
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando saldo...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.success, '#059669']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.white} />
        </TouchableOpacity>

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

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Ganancias Totales</Text>
            <Text style={styles.statValue}>${walletData?.totalEarnings.toFixed(2)}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
          </View>

          {walletData?.transactions && walletData.transactions.length > 0 ? (
            walletData.transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionIcon}>
                  {getTransactionIcon(transaction.type)}
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>{transaction.description}</Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                </View>

                <Text style={[
                  styles.transactionAmount,
                  { color: getTransactionColor(transaction.type) }
                ]}>
                  {['earning', 'bonus', 'cashback', 'refund'].includes(transaction.type) ? '+' : '-'}
                  ${transaction.amount.toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <DollarSign size={48} color={Colors.text.disabled} />
              <Text style={styles.emptyStateText}>No hay transacciones recientes</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    color: Colors.white,
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
    color: Colors.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.secondary,
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
    color: Colors.text.primary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: Colors.text.secondary,
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
    color: Colors.text.secondary,
    marginTop: 16,
  },
});
