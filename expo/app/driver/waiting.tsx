import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: PANTALLA DE ESPERA DEL REPARTIDOR
// Muestra estado de documentos, posicion en waitlist, y tips
// El driver nunca se siente ignorado
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Clock,
  FileCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  MapPin,
  Bike,
  Shield,
  Bell,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { supabase } from '@/constants/supabase';

// ============================================================================
// COLORS
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
  error: '#EF4444',
};

// ============================================================================
// TIPS FOR WAITING DRIVERS
// ============================================================================

const TIPS = [
  { icon: MapPin, color: FIX.accent, title: 'Conoce las zonas', desc: 'Familiarizate con las calles principales de Tomatlan para entregas mas rapidas.' },
  { icon: Bike, color: FIX.primary, title: 'Prepara tu vehiculo', desc: 'Asegurate de que tu vehiculo este en buen estado para cuando empieces.' },
  { icon: Shield, color: FIX.purple, title: 'Seguridad primero', desc: 'Siempre usa casco y respeta las senales de transito.' },
  { icon: Bell, color: FIX.warning, title: 'Activa notificaciones', desc: 'Te avisaremos por notificacion cuando haya un lugar disponible.' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function DriverWaitingScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, space, radius, isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [refreshing, setRefreshing] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);
  const [docStatus, setDocStatus] = useState<{
    total: number;
    uploaded: number;
    approved: number;
    rejected: number;
  }>({ total: 0, uploaded: 0, approved: 0, rejected: 0 });

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Load driver record
      const { data: driver } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driver) {
        setDriverData(driver);

        // If driver is approved, redirect to dashboard
        if (driver.registration_status === 'approved') {
          router.replace('/driver/dashboard' as any);
          return;
        }

        // If driver has documents pending but not waitlisted, redirect to documents
        if (driver.registration_status === 'pending_documents') {
          router.replace('/driver/documents' as any);
          return;
        }

        // Load document status
        const { data: docs } = await supabase
          .from('driver_documents')
          .select('status')
          .eq('driver_id', driver.id);

        if (docs) {
          const total = docs.length;
          const uploaded = docs.filter(d => d.status !== 'missing').length;
          const approved = docs.filter(d => d.status === 'approved').length;
          const rejected = docs.filter(d => d.status === 'rejected').length;
          setDocStatus({ total, uploaded, approved, rejected });
        }
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isWaitlisted = driverData?.registration_status === 'waitlisted';
  const isDocumentsSubmitted = driverData?.registration_status === 'documents_submitted';
  const isRejected = driverData?.registration_status === 'rejected';
  const waitlistPosition = driverData?.waitlist_position || 0;

  // ---- Status Card ----

  const renderStatusCard = () => {
    let icon = Clock;
    let iconColor = FIX.warning;
    let title = 'En revision';
    let description = 'Estamos revisando tu informacion. Te avisaremos pronto.';

    if (isWaitlisted) {
      icon = Users;
      iconColor = FIX.purple;
      title = 'En lista de espera';
      description = `Estas en la posicion #${waitlistPosition}. Cuando haya mas pedidos, abriremos un lugar para ti. ¡No pierdes tu lugar!`;
    } else if (isDocumentsSubmitted) {
      icon = FileCheck;
      iconColor = FIX.accent;
      title = 'Documentos en revision';
      description = 'Tu equipo Yesswera esta verificando tus documentos. Esto puede tomar hasta 24 horas.';
    } else if (isRejected) {
      icon = AlertCircle;
      iconColor = FIX.error;
      title = 'Documentos rechazados';
      description = driverData?.rejection_reason || 'Algunos documentos necesitan correccion. Revisa los detalles abajo.';
    }

    const IconComp = icon;

    return (
      <View style={[styles.statusCard, { backgroundColor: iconColor + '10', borderColor: iconColor + '30' }]}>
        <View style={[styles.statusIconWrap, { backgroundColor: iconColor + '20' }]}>
          <IconComp size={32} color={iconColor} />
        </View>
        <ThemedText variant="title" bold style={[styles.statusTitle, { color: theme.text }]}>
          {title}
        </ThemedText>
        <ThemedText variant="body" center style={{ color: theme.textSecondary, lineHeight: 22 }}>
          {description}
        </ThemedText>
      </View>
    );
  };

  // ---- Document Progress ----

  const renderDocProgress = () => {
    if (isWaitlisted && docStatus.total === 0) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText variant="subtitle" bold style={{ color: theme.text, marginBottom: 12 }}>
          Estado de documentos
        </ThemedText>

        {docStatus.total === 0 ? (
          <View style={styles.docRow}>
            <Clock size={18} color={FIX.warning} />
            <ThemedText variant="body" style={{ color: theme.textSecondary, flex: 1 }}>
              Aun no has subido documentos
            </ThemedText>
          </View>
        ) : (
          <>
            {docStatus.approved > 0 && (
              <View style={styles.docRow}>
                <CheckCircle size={18} color={FIX.primary} />
                <ThemedText variant="body" style={{ color: theme.textSecondary, flex: 1 }}>
                  {docStatus.approved} documento{docStatus.approved > 1 ? 's' : ''} aprobado{docStatus.approved > 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
            {(docStatus.uploaded - docStatus.approved - docStatus.rejected) > 0 && (
              <View style={styles.docRow}>
                <Clock size={18} color={FIX.warning} />
                <ThemedText variant="body" style={{ color: theme.textSecondary, flex: 1 }}>
                  {docStatus.uploaded - docStatus.approved - docStatus.rejected} en revision
                </ThemedText>
              </View>
            )}
            {docStatus.rejected > 0 && (
              <View style={styles.docRow}>
                <XCircle size={18} color={FIX.error} />
                <ThemedText variant="body" style={{ color: theme.textSecondary, flex: 1 }}>
                  {docStatus.rejected} rechazado{docStatus.rejected > 1 ? 's' : ''} — sube de nuevo
                </ThemedText>
              </View>
            )}
          </>
        )}

        {(isRejected || (isWaitlisted && docStatus.total === 0) || isDocumentsSubmitted) && (
          <TouchableSound
            style={[styles.docsBtn, { backgroundColor: FIX.accent, borderRadius: radius.md, marginTop: 12 }]}
            onPress={() => router.push('/driver/documents' as any)}
          >
            <ThemedText variant="body" color="white" bold>
              {isRejected ? 'Corregir documentos' : docStatus.total === 0 ? 'Subir documentos' : 'Ver documentos'}
            </ThemedText>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableSound>
        )}
      </View>
    );
  };

  // ---- Tips Section ----

  const renderTips = () => (
    <View>
      <ThemedText variant="subtitle" bold style={{ color: theme.text, marginBottom: 12 }}>
        Mientras esperas...
      </ThemedText>
      {TIPS.map((tip, i) => {
        const TipIcon = tip.icon;
        return (
          <View key={i} style={[styles.tipCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.tipIconWrap, { backgroundColor: tip.color + '15' }]}>
              <TipIcon size={20} color={tip.color} />
            </View>
            <View style={styles.tipText}>
              <ThemedText variant="label" bold style={{ color: theme.text }}>
                {tip.title}
              </ThemedText>
              <ThemedText variant="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {tip.desc}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );

  // ---- Motivational Message ----

  const renderMotivation = () => (
    <View style={[styles.motivationCard, { backgroundColor: FIX.primary + '10', borderColor: FIX.primary + '30' }]}>
      <ThemedText variant="body" bold center style={{ color: FIX.primary, marginBottom: 4 }}>
        Tomatlan esta creciendo
      </ThemedText>
      <ThemedText variant="caption" center style={{ color: theme.textSecondary, lineHeight: 18 }}>
        Cada semana mas negocios se unen a Yesswera. Tu eres parte de este crecimiento y tu lugar esta asegurado.
      </ThemedText>
    </View>
  );

  // ---- Main Render ----

  return (
    <ScreenContainer
      headerGradient="accent"
      headerIcon={Clock}
      headerTitle="Tu Estado"
      headerSubtitle={user?.name || 'Repartidor'}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {renderStatusCard()}

      {renderDocProgress()}

      {renderTips()}

      {renderMotivation()}

      {/* Contact Support */}
      <TouchableSound
        style={[styles.supportBtn, { backgroundColor: theme.card, borderColor: theme.border, borderRadius: radius.md }]}
        onPress={() => Linking.openURL('https://wa.me/523221000000?text=Hola, soy repartidor en espera de Yesswera')}
      >
        <ThemedText variant="body" color="secondary">
          ¿Tienes preguntas?{' '}
          <ThemedText variant="body" color="accent" bold>Contacta soporte</ThemedText>
        </ThemedText>
      </TouchableSound>

      {/* Logout */}
      <TouchableSound
        style={[styles.logoutBtn, { marginTop: space.md }]}
        onPress={logout}
      >
        <LogOut size={16} color={theme.textMuted} />
        <ThemedText variant="caption" color="muted">
          Cerrar sesion
        </ThemedText>
      </TouchableSound>

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  docsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
  },
  motivationCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
  },
  supportBtn: {
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
});
