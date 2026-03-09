import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: PANTALLA DE UPGRADE
// Muestra planes disponibles y permite al negocio mejorar su suscripcion
// ============================================================================

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Crown,
  Check,
  Star,
  Zap,
  BarChart3,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';
import {
  getBusinessSubscription,
  BusinessSubscription,
  PLAN_PRICES,
  getPlanDisplayName,
  getPlanColor,
} from '@/services/subscriptions';

// ============================================================================
// COLORES
// ============================================================================
const COLORS = {
  light: { card: '#FFFFFF', cardAlt: '#F5F5F4', border: '#E7E5E4', text: '#1C1917', textSecondary: '#57534E', textMuted: '#A8A29E' },
  dark: { card: '#292524', cardAlt: '#44403C', border: '#44403C', text: '#FAFAFA', textSecondary: '#D6D3D1', textMuted: '#78716C' },
};

const FIX = {
  primary: '#22C55E',
  accent: '#3B82F6',
  warning: '#F59E0B',
  purple: '#8B5CF6',
};

export default function UpgradeScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<BusinessSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (biz) {
          const sub = await getBusinessSubscription(biz.id);
          setSubscription(sub);
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const currentPlan = subscription?.plan || 'launch';

  const handleSelectPlan = (planId: string) => {
    if (currentPlan === 'launch') {
      Alert.alert(
        'Periodo de Lanzamiento',
        'Actualmente tienes acceso completo a todas las herramientas de forma gratuita durante el periodo de lanzamiento. Cuando este periodo termine, podras elegir tu plan.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    // When ready: integrate Stripe checkout
    Alert.alert(
      'Proximamente',
      `El plan ${PLAN_PRICES[planId]?.name || planId} estara disponible pronto. Te notificaremos cuando puedas suscribirte.`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <ScreenContainer headerGradient="accent" headerIcon={Crown} headerTitle="Planes" headerSubtitle="Cargando...">
        <View style={styles.center}><ActivityIndicator size="large" color={FIX.primary} /></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={Crown}
      headerTitle="Planes Yesswera"
      headerSubtitle="Elige el plan ideal para tu negocio"
    >
      {/* Current Plan Banner */}
      {currentPlan === 'launch' && (
        <View style={[styles.launchBanner, { backgroundColor: FIX.purple + '15' }]}>
          <Zap size={20} color={FIX.purple} />
          <View style={styles.launchBannerText}>
            <Text style={[styles.launchTitle, { color: FIX.purple }]}>Periodo de Lanzamiento</Text>
            <Text style={[styles.launchDesc, { color: theme.textSecondary }]}>
              Tienes acceso completo a todas las herramientas de forma gratuita. Disfruta Yesswera al maximo.
            </Text>
          </View>
        </View>
      )}

      {/* Plan: Basico */}
      <View style={[styles.planCard, { backgroundColor: theme.card, borderColor: currentPlan === 'basic' ? FIX.accent : theme.border }]}>
        {currentPlan === 'basic' && (
          <View style={[styles.currentBadge, { backgroundColor: FIX.accent }]}>
            <Text style={styles.currentBadgeText}>Tu Plan Actual</Text>
          </View>
        )}
        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: FIX.accent + '15' }]}>
            <BarChart3 size={24} color={FIX.accent} />
          </View>
          <View>
            <Text style={[styles.planName, { color: theme.text }]}>Basico</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: theme.text }]}>$99</Text>
              <Text style={[styles.planPeriod, { color: theme.textMuted }]}>/mes MXN</Text>
            </View>
          </View>
        </View>

        <View style={[styles.planDivider, { backgroundColor: theme.border }]} />

        {PLAN_PRICES.basic.features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={16} color={FIX.primary} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature}</Text>
          </View>
        ))}

        <TouchableSound
          style={[styles.selectBtn, {
            backgroundColor: currentPlan === 'basic' ? theme.cardAlt : FIX.accent,
          }]}
          onPress={() => handleSelectPlan('basic')}
          disabled={currentPlan === 'basic'}
        >
          <Text style={[styles.selectBtnText, {
            color: currentPlan === 'basic' ? theme.textMuted : '#FFFFFF',
          }]}>
            {currentPlan === 'basic' ? 'Plan Actual' : currentPlan === 'launch' ? 'Incluido en Lanzamiento' : 'Elegir Basico'}
          </Text>
        </TouchableSound>
      </View>

      {/* Plan: Pro */}
      <View style={[styles.planCard, styles.planCardPro, { backgroundColor: theme.card, borderColor: currentPlan === 'pro' ? FIX.warning : FIX.warning + '40' }]}>
        <View style={[styles.proBadge, { backgroundColor: FIX.warning }]}>
          <Star size={12} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.proBadgeText}>Recomendado</Text>
        </View>

        {currentPlan === 'pro' && (
          <View style={[styles.currentBadge, { backgroundColor: FIX.warning, top: 44 }]}>
            <Text style={styles.currentBadgeText}>Tu Plan Actual</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: FIX.warning + '15' }]}>
            <Crown size={24} color={FIX.warning} />
          </View>
          <View>
            <Text style={[styles.planName, { color: theme.text }]}>Pro</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, { color: theme.text }]}>$249</Text>
              <Text style={[styles.planPeriod, { color: theme.textMuted }]}>/mes MXN</Text>
            </View>
          </View>
        </View>

        <View style={[styles.planDivider, { backgroundColor: theme.border }]} />

        {PLAN_PRICES.pro.features.map((feature, i) => (
          <View key={i} style={styles.featureRow}>
            <Check size={16} color={FIX.warning} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature}</Text>
          </View>
        ))}

        <TouchableSound
          style={[styles.selectBtn, {
            backgroundColor: currentPlan === 'pro' ? theme.cardAlt : FIX.warning,
          }]}
          onPress={() => handleSelectPlan('pro')}
          disabled={currentPlan === 'pro'}
        >
          <Text style={[styles.selectBtnText, {
            color: currentPlan === 'pro' ? theme.textMuted : '#FFFFFF',
          }]}>
            {currentPlan === 'pro' ? 'Plan Actual' : currentPlan === 'launch' ? 'Incluido en Lanzamiento' : 'Elegir Pro'}
          </Text>
        </TouchableSound>
      </View>

      {/* Guarantee */}
      <View style={[styles.guaranteeCard, { backgroundColor: theme.card }]}>
        <Shield size={20} color={FIX.primary} />
        <View style={styles.guaranteeText}>
          <Text style={[styles.guaranteeTitle, { color: theme.text }]}>Sin compromisos</Text>
          <Text style={[styles.guaranteeDesc, { color: theme.textMuted }]}>
            Cancela cuando quieras. Sin cargos ocultos ni penalizaciones.
          </Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },

  // Launch Banner
  launchBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, padding: 16, marginBottom: 20 },
  launchBannerText: { flex: 1 },
  launchTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  launchDesc: { fontSize: 13, lineHeight: 18 },

  // Plan Card
  planCard: { borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2 },
  planCardPro: { borderWidth: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  planName: { fontSize: 20, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  planPrice: { fontSize: 28, fontWeight: '800' },
  planPeriod: { fontSize: 14, marginLeft: 4 },
  planDivider: { height: 1, marginVertical: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featureText: { fontSize: 14, flex: 1 },
  selectBtn: { marginTop: 10, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  selectBtnText: { fontSize: 16, fontWeight: '600' },

  // Badges
  currentBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  currentBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 12 },
  proBadgeText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },

  // Guarantee
  guaranteeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 16 },
  guaranteeText: { flex: 1 },
  guaranteeTitle: { fontSize: 14, fontWeight: '600' },
  guaranteeDesc: { fontSize: 12, marginTop: 2 },
});
