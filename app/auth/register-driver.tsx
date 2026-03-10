import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: REGISTRO DE REPARTIDOR
// Registro + onboarding explicativo + seleccion de vehiculo
// Cap de repartidores con lista de espera
// ============================================================================

import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bike,
  Car,
  Footprints,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Shield,
  Clock,
  MapPin,
  CheckCircle,
  UserPlus,
  Zap,
  Package,
  Users,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { ThemedText, ThemedInput } from '@/components/themed';
import ScreenContainer from '@/components/ScreenContainer';
import { AuthSounds, SoundFeedback } from '@/services/sounds';
import { supabase } from '@/constants/supabase';

const { width } = Dimensions.get('window');

// ============================================================================
// CONSTANTS
// ============================================================================

const VEHICLES = [
  { id: 'moto', label: 'Moto', icon: Bike, desc: 'Entregas rapidas' },
  { id: 'bicicleta', label: 'Bicicleta', icon: Bike, desc: 'Entregas ecologicas' },
  { id: 'auto', label: 'Auto', icon: Car, desc: 'Paquetes grandes' },
  { id: 'pie', label: 'A pie', icon: Footprints, desc: 'Entregas cercanas' },
];

const COLORS = {
  light: {
    card: '#FFFFFF',
    cardAlt: '#F5F5F4',
    border: '#E7E5E4',
    borderMedium: '#D6D3D1',
  },
  dark: {
    card: '#292524',
    cardAlt: '#44403C',
    border: '#44403C',
    borderMedium: '#57534E',
  },
};

// ============================================================================
// ONBOARDING SLIDES
// ============================================================================

interface OnboardingSlide {
  icon: any;
  iconColor: string;
  title: string;
  description: string;
  bullets: string[];
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: Package,
    iconColor: '#22C55E',
    title: '¿Como funciona Yesswera?',
    description: 'Conectamos negocios con repartidores locales en Tomatlan.',
    bullets: [
      'Recibes pedidos de negocios cercanos',
      'Recoges en el negocio y entregas al cliente',
      'Tu decides cuando estar disponible',
      'Sin horarios fijos — trabaja cuando quieras',
    ],
  },
  {
    icon: DollarSign,
    iconColor: '#F59E0B',
    title: '¿Como ganas dinero?',
    description: 'Tu ingreso es transparente y justo.',
    bullets: [
      'Te quedas con la tarifa de entrega + propinas',
      'El pago de la comida genera una deuda temporal',
      'Liquidas con el negocio cuando te convenga',
      'Yesswera es tu respaldo ante los negocios',
    ],
  },
  {
    icon: Shield,
    iconColor: '#3B82F6',
    title: '¿Como empiezas?',
    description: 'El proceso es rapido y sencillo.',
    bullets: [
      '1. Completa tu registro (datos + vehiculo)',
      '2. Sube tus documentos (INE, licencia)',
      '3. Nuestro equipo los verifica',
      '4. Activa tu modo EN LINEA y recibe pedidos',
    ],
  },
  {
    icon: Users,
    iconColor: '#8B5CF6',
    title: 'Tomatlan esta creciendo',
    description: 'Somos un equipo selecto de repartidores.',
    bullets: [
      'Empezamos con un grupo pequeno para dar buen servicio',
      'Conforme crezcan los pedidos, abrimos mas lugares',
      'Si hay cupo, empiezas de inmediato',
      'Si no hay cupo, te avisamos cuando se abra uno',
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function RegisterDriverScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors, space, radius, isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  // Steps: 0-3 = onboarding, 4 = form, 5 = vehicle
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingCap, setCheckingCap] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [errors, setErrors] = useState({
    name: '', email: '', password: '', phone: '', vehicle: '',
  });

  const totalSteps = 6; // 4 onboarding + form + vehicle
  const isOnboarding = step < 4;
  const isForm = step === 4;
  const isVehicle = step === 5;

  // ---- Validation ----

  const validateForm = () => {
    const nameErr = !name.trim() ? 'El nombre es requerido' :
      name.trim().length < 3 ? 'Minimo 3 caracteres' : '';
    const emailErr = !email ? 'El email es requerido' :
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Email invalido' : '';
    const passErr = !password ? 'La contrasena es requerida' :
      password.length < 6 ? 'Minimo 6 caracteres' : '';
    const phoneErr = !phone ? 'El telefono es requerido' :
      phone.replace(/\D/g, '').length < 10 ? 'Minimo 10 digitos' : '';

    setErrors({ name: nameErr, email: emailErr, password: passErr, phone: phoneErr, vehicle: '' });
    return !nameErr && !emailErr && !passErr && !phoneErr;
  };

  // ---- Navigation ----

  const handleNext = () => {
    if (isForm && !validateForm()) return;
    if (isVehicle) {
      if (!vehicle) {
        setErrors(p => ({ ...p, vehicle: 'Selecciona un vehiculo' }));
        return;
      }
      handleRegister();
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep(s => s - 1);
    }
  };

  // ---- Registration ----

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      // 1. Check driver cap
      setCheckingCap(true);
      const capResult = await checkDriverCap();
      setCheckingCap(false);

      // 2. Register user
      await register(name, email, password, phone, 'driver');

      // 3. Update driver record with vehicle type and waitlist status
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const updateData: any = {
          vehicle_type: vehicle,
        };

        if (!capResult.hasSpace) {
          updateData.waitlist_position = capResult.waitlistPosition;
          updateData.registration_status = 'waitlisted';
        } else {
          updateData.registration_status = 'pending_documents';
        }

        await supabase
          .from('drivers')
          .update(updateData)
          .eq('user_id', session.user.id);
      }

      AuthSounds.login();

      // 4. Navigate based on cap
      if (capResult.hasSpace) {
        router.replace('/driver/documents' as any);
      } else {
        router.replace('/driver/waiting' as any);
      }
    } catch (error: any) {
      console.error('Register driver error:', error);
      SoundFeedback.error();
      let msg = 'No se pudo crear la cuenta. Intenta nuevamente.';
      if (error?.message?.includes('already registered') || error?.message?.includes('already exists')) {
        msg = 'Este correo ya esta registrado. Intenta iniciar sesion.';
      }
      Alert.alert('Error al registrar', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDriverCap = async (): Promise<{ hasSpace: boolean; waitlistPosition: number }> => {
    try {
      // Count active/approved drivers
      const { count: activeCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .in('registration_status', ['approved', 'pending_documents', 'documents_submitted']);

      // Get max drivers config (default: 8 = double of initial 4)
      const { data: config } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'max_drivers')
        .maybeSingle();

      const maxDrivers = config?.value ? parseInt(config.value) : 8;
      const current = activeCount || 0;

      if (current < maxDrivers) {
        return { hasSpace: true, waitlistPosition: 0 };
      }

      // Count waitlisted drivers for position
      const { count: waitlistCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('registration_status', 'waitlisted');

      return {
        hasSpace: false,
        waitlistPosition: (waitlistCount || 0) + 1,
      };
    } catch (error) {
      console.error('Error checking driver cap:', error);
      // Default: allow registration
      return { hasSpace: true, waitlistPosition: 0 };
    }
  };

  // ---- Render Onboarding Slide ----

  const renderOnboardingSlide = (slide: OnboardingSlide) => {
    const IconComp = slide.icon;
    return (
      <View style={styles.slideContainer}>
        <View style={[styles.slideIconWrap, { backgroundColor: slide.iconColor + '15' }]}>
          <IconComp size={48} color={slide.iconColor} />
        </View>
        <ThemedText variant="title" bold style={styles.slideTitle}>
          {slide.title}
        </ThemedText>
        <ThemedText variant="body" color="secondary" center style={styles.slideDesc}>
          {slide.description}
        </ThemedText>
        <View style={[styles.bulletCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {slide.bullets.map((bullet, i) => (
            <View key={i} style={styles.bulletRow}>
              <CheckCircle size={16} color={slide.iconColor} />
              <ThemedText variant="body" style={styles.bulletText}>
                {bullet}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ---- Render Form ----

  const renderForm = () => (
    <View>
      <ThemedText variant="title" bold style={styles.sectionTitle}>
        Tus datos
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginBottom: space.lg }}>
        Informacion basica para crear tu cuenta de repartidor.
      </ThemedText>

      <ThemedInput
        label="Nombre Completo *"
        value={name}
        onChangeText={(v) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
        error={errors.name}
        placeholder="Juan Perez"
        autoCapitalize="words"
        editable={!isLoading}
      />
      <View style={{ height: space.md }} />

      <ThemedInput
        label="Correo Electronico *"
        value={email}
        onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
        error={errors.email}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
      />
      <View style={{ height: space.md }} />

      <ThemedInput
        label="Telefono *"
        value={phone}
        onChangeText={(v) => { setPhone(v); setErrors(p => ({ ...p, phone: '' })); }}
        error={errors.phone}
        placeholder="3331234567"
        keyboardType="phone-pad"
        editable={!isLoading}
      />
      <View style={{ height: space.md }} />

      <ThemedInput
        label="Contrasena *"
        value={password}
        onChangeText={(v) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
        error={errors.password}
        placeholder="Minimo 6 caracteres"
        isPassword
        autoCapitalize="none"
        editable={!isLoading}
      />
    </View>
  );

  // ---- Render Vehicle Selection ----

  const renderVehicle = () => (
    <View>
      <ThemedText variant="title" bold style={styles.sectionTitle}>
        Tu vehiculo
      </ThemedText>
      <ThemedText variant="body" color="secondary" style={{ marginBottom: space.lg }}>
        Esto determina los documentos que necesitaras y el tipo de entregas que puedes hacer.
      </ThemedText>

      <View style={{ gap: space.sm }}>
        {VEHICLES.map((v) => {
          const IconComp = v.icon;
          const selected = vehicle === v.id;
          return (
            <TouchableSound
              key={v.id}
              style={[
                styles.vehicleCard,
                {
                  padding: space.md,
                  borderRadius: radius.md,
                  borderColor: selected ? colors.primary : theme.border,
                  backgroundColor: selected
                    ? (isDark ? colors.primary + '20' : colors.primary + '10')
                    : theme.card,
                  borderWidth: selected ? 2 : 1.5,
                },
              ]}
              onPress={() => { setVehicle(v.id); setErrors(p => ({ ...p, vehicle: '' })); }}
              disabled={isLoading}
            >
              <View style={styles.vehicleRow}>
                <View style={[styles.vehicleIconWrap, { backgroundColor: selected ? colors.primary + '20' : theme.cardAlt }]}>
                  <IconComp size={24} color={selected ? colors.primary : colors.text || '#78716C'} />
                </View>
                <View style={styles.vehicleText}>
                  <ThemedText variant="subtitle" bold color={selected ? 'accent' : 'primary'}>
                    {v.label}
                  </ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    {v.desc}
                  </ThemedText>
                </View>
                {selected && <CheckCircle size={22} color={colors.primary} />}
              </View>
            </TouchableSound>
          );
        })}
      </View>
      {errors.vehicle ? (
        <ThemedText variant="caption" color="error" style={{ marginTop: space.sm }}>
          {errors.vehicle}
        </ThemedText>
      ) : null}
    </View>
  );

  // ---- Progress Dots ----

  const renderProgress = () => (
    <View style={styles.progressRow}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i === step ? colors.primary : theme.border,
              width: i === step ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  // ---- Main Render ----

  return (
    <ScreenContainer
      headerGradient="primary"
      headerIcon={UserPlus}
      headerTitle="Unete como Repartidor"
      headerSubtitle={isOnboarding ? `Paso ${step + 1} de ${totalSteps}` : isForm ? 'Tus datos' : 'Tu vehiculo'}
    >
      {renderProgress()}

      <View style={{ minHeight: 360 }}>
        {isOnboarding && renderOnboardingSlide(ONBOARDING_SLIDES[step])}
        {isForm && renderForm()}
        {isVehicle && renderVehicle()}
      </View>

      {/* Navigation Buttons */}
      <View style={[styles.navRow, { marginTop: space.xl }]}>
        <TouchableSound
          style={[styles.backBtn, { borderColor: theme.border, borderRadius: radius.md }]}
          onPress={handleBack}
          disabled={isLoading}
        >
          <ChevronLeft size={20} color={colors.text || '#78716C'} />
          <ThemedText variant="body" color="secondary">
            {step === 0 ? 'Cancelar' : 'Atras'}
          </ThemedText>
        </TouchableSound>

        <TouchableSound
          style={[styles.nextBtn, {
            backgroundColor: isLoading ? theme.border : colors.primary,
            borderRadius: radius.md,
            flex: 1,
          }]}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <ThemedText variant="subtitle" color="white" bold>
                {isVehicle ? 'Crear Cuenta' : 'Siguiente'}
              </ThemedText>
              {!isVehicle && <ChevronRight size={20} color="#FFFFFF" />}
            </>
          )}
        </TouchableSound>
      </View>

      {/* Already have account */}
      {(isForm || step === 0) && (
        <TouchableSound
          style={styles.loginPrompt}
          onPress={() => router.push('/login' as any)}
          disabled={isLoading}
        >
          <ThemedText variant="body" color="secondary" center style={{ marginTop: space.lg }}>
            ¿Ya tienes cuenta?{' '}
            <ThemedText variant="body" color="accent" bold>
              Inicia Sesion
            </ThemedText>
          </ThemedText>
        </TouchableSound>
      )}

      <View style={{ height: 40 }} />
    </ScreenContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  slideContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  slideIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  slideTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  slideDesc: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  bulletCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletText: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  vehicleCard: {
    borderWidth: 1.5,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleText: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginPrompt: {
    alignItems: 'center',
  },
});
