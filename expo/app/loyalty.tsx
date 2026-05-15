// ============================================================================
// YESSWERA: LOYALTY / MIS PUNTOS — Vecino Amigo DS
// Customer loyalty/rewards screen — Phase 1 (view-only, no redemption)
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/constants/supabase';
import { DS } from '@/constants/design';
import YCard from '@/components/ui/YCard';
import SectionHeader from '@/components/ui/SectionHeader';
import StatBox from '@/components/ui/StatBox';

// -- Level definitions -------------------------------------------------------
interface LoyaltyLevel {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
  icon: keyof typeof Feather.glyphMap;
  message: string;
}

const LEVELS: LoyaltyLevel[] = [
  {
    name: 'Vecino Nuevo',
    minPoints: 0,
    maxPoints: 99,
    color: DS.colors.green,
    icon: 'user',
    message: 'Bienvenido a Yesswera! Cada pedido te acerca a grandes beneficios.',
  },
  {
    name: 'Vecino Frecuente',
    minPoints: 100,
    maxPoints: 499,
    color: DS.colors.blue,
    icon: 'smile',
    message: 'Ya eres parte de la familia! Sigue pidiendo para subir de nivel.',
  },
  {
    name: 'Vecino VIP',
    minPoints: 500,
    maxPoints: 999,
    color: DS.colors.orange,
    icon: 'award',
    message: 'Eres un cliente estrella! Tu lealtad no pasa desapercibida.',
  },
  {
    name: 'Vecino Leyenda',
    minPoints: 1000,
    maxPoints: Infinity,
    color: '#EAB308',
    icon: 'star',
    message: 'Leyenda de Tomatlan! Eres de los clientes mas fieles.',
  },
];

function getLevel(points: number): LoyaltyLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(points: number): LoyaltyLevel | null {
  const current = getLevel(points);
  const idx = LEVELS.indexOf(current);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

// -- How to earn item --------------------------------------------------------
function EarnItem({
  icon,
  text,
  points,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  points: string;
}) {
  return (
    <View style={earnStyles.row}>
      <View style={earnStyles.iconWrap}>
        <Feather name={icon} size={18} color={DS.colors.green} />
      </View>
      <Text style={earnStyles.text}>{text}</Text>
      <Text style={earnStyles.points}>{points}</Text>
    </View>
  );
}

const earnStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    gap: DS.space.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...DS.fonts.body,
    color: DS.colors.dark,
    flex: 1,
  },
  points: {
    ...DS.fonts.label,
    color: DS.colors.green,
  },
});

// -- Main Screen -------------------------------------------------------------
export default function LoyaltyScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [deliveryCount, setDeliveryCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadLoyaltyData();
  }, [user]);

  async function loadLoyaltyData() {
    if (!user) return;
    setLoading(true);
    try {
      // Get all delivered orders for this customer
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, order_type')
        .eq('customer_id', user.id)
        .eq('status', 'delivered');

      if (error) throw error;

      const list = orders || [];
      setTotalOrders(list.length);
      setTotalSpent(list.reduce((sum, o) => sum + (o.total || 0), 0));
      setDeliveryCount(
        list.filter((o) => o.order_type === 'delivery' || o.order_type === 'package').length
      );
    } catch (e) {
      console.error('loadLoyaltyData error:', e);
    } finally {
      setLoading(false);
    }
  }

  // Calculate points: 1 point per $10 MXN + 5 bonus per delivery/package
  const spendPoints = Math.floor(totalSpent / 10);
  const deliveryPoints = deliveryCount * 5;
  const totalPoints = spendPoints + deliveryPoints;

  const level = getLevel(totalPoints);
  const nextLevel = getNextLevel(totalPoints);
  const pointsToNext = nextLevel ? nextLevel.minPoints - totalPoints : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="arrow-left" size={24} color={DS.colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Puntos</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ===== LOADING ===== */}
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={DS.colors.green} />
            <Text style={styles.loadingText}>Cargando puntos...</Text>
          </View>
        )}

        {!loading && (
          <>
            {/* ===== POINTS DISPLAY ===== */}
            <View style={[styles.pointsCard, { backgroundColor: level.color }]}>
              <Feather name="star" size={40} color="rgba(255,255,255,0.3)" />
              <Text style={styles.pointsNumber}>{totalPoints}</Text>
              <Text style={styles.pointsLabel}>puntos</Text>
            </View>

            {/* ===== LEVEL CARD ===== */}
            <YCard style={styles.levelCard}>
              <View style={styles.levelHeader}>
                <View style={[styles.levelIcon, { backgroundColor: `${level.color}20` }]}>
                  <Feather name={level.icon} size={24} color={level.color} />
                </View>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelName, { color: level.color }]}>
                    {level.name}
                  </Text>
                  {nextLevel ? (
                    <Text style={styles.levelProgress}>
                      {pointsToNext} puntos para {nextLevel.name}
                    </Text>
                  ) : (
                    <Text style={styles.levelProgress}>Nivel maximo alcanzado</Text>
                  )}
                </View>
              </View>

              {/* Progress bar to next level */}
              {nextLevel && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: level.color,
                          width: `${Math.min(
                            ((totalPoints - level.minPoints) /
                              (nextLevel.minPoints - level.minPoints)) *
                              100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressText}>{level.minPoints}</Text>
                    <Text style={styles.progressText}>{nextLevel.minPoints}</Text>
                  </View>
                </View>
              )}

              <Text style={styles.levelMessage}>{level.message}</Text>
            </YCard>

            {/* ===== STATS ===== */}
            <View style={styles.statsRow}>
              <StatBox
                value={`${totalOrders}`}
                label="Total Pedidos"
                color={DS.colors.blue}
              />
              <StatBox
                value={formatMoney(totalSpent)}
                label="Total Gastado"
                color={DS.colors.green}
              />
            </View>

            {/* ===== HOW TO EARN ===== */}
            <SectionHeader title="Como ganar puntos" />
            <YCard>
              <EarnItem
                icon="shopping-bag"
                text="Pedir comida"
                points="1 pt / $10"
              />
              <View style={styles.earnDivider} />
              <EarnItem
                icon="shopping-cart"
                text="Lista de compras"
                points="1 pt / $10"
              />
              <View style={styles.earnDivider} />
              <EarnItem
                icon="package"
                text="Envio de paquete"
                points="5 pts"
              />
            </YCard>

            {/* ===== COMING SOON ===== */}
            <SectionHeader title="Proximamente" />
            <YCard style={styles.comingSoonCard}>
              <View style={styles.comingSoonInner}>
                <Feather name="gift" size={24} color={DS.colors.placeholder} />
                <Text style={styles.comingSoonText}>
                  Pronto podras canjear tus puntos por descuentos y beneficios
                  exclusivos en tus negocios favoritos.
                </Text>
              </View>
            </YCard>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// -- Styles ------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DS.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: DS.space.lg,
    gap: DS.space.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: DS.touch.min,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...DS.fonts.title,
    color: DS.colors.dark,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: DS.space.xxxl * 2,
    gap: DS.space.md,
  },
  loadingText: {
    ...DS.fonts.body,
    color: DS.colors.muted,
  },

  // Points card
  pointsCard: {
    alignItems: 'center',
    paddingVertical: DS.space.xxxl,
    borderRadius: DS.radius.xl,
    gap: DS.space.xs,
  },
  pointsNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 56,
  },
  pointsLabel: {
    ...DS.fonts.bodyMed,
    color: 'rgba(255,255,255,0.8)',
  },

  // Level card
  levelCard: {
    gap: DS.space.lg,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  levelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
  },
  levelName: {
    ...DS.fonts.section,
  },
  levelProgress: {
    ...DS.fonts.small,
    color: DS.colors.muted,
    marginTop: 2,
  },

  // Progress bar
  progressWrap: {
    gap: DS.space.xs,
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.colors.divider,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    ...DS.fonts.tiny,
    color: DS.colors.placeholder,
  },

  levelMessage: {
    ...DS.fonts.body,
    color: DS.colors.body,
    fontStyle: 'italic',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
  },

  // Earn divider
  earnDivider: {
    height: 1,
    backgroundColor: DS.colors.divider,
    marginVertical: 2,
  },

  // Coming soon
  comingSoonCard: {},
  comingSoonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  comingSoonText: {
    ...DS.fonts.body,
    color: DS.colors.muted,
    flex: 1,
  },
});
