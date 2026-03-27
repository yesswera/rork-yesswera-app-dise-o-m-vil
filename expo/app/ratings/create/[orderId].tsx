import TouchableSound from '@/components/TouchableSound';
// ============================================================================
// YESSWERA: CREAR CALIFICACION
// Pantalla para calificar al repartidor despues de una entrega
// Actualizado para usar ScreenContainer
// ============================================================================

import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import Avatar from '@/components/Avatar';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { HapticFeedback } from '@/utils/haptics';
import { getOrderById } from '@/services/orders';
import { OrderSounds, SoundFeedback } from '@/services/sounds';
import { createRating } from '@/services/ratings';
import { Order } from '@/constants/types';
import ErrorState from '@/components/ErrorState';
import ScreenContainer from '@/components/ScreenContainer';
import { useTheme } from '@/contexts/theme';

// ============================================================================
// COLORES EXPLICITOS PARA MODO OSCURO
// ============================================================================

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

const STATUS_COLORS = {
  gold: '#EAB308',
};

export default function CreateRatingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { user, token } = useAuth();
  const { isDark, colors } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!token || !orderId) return;

      try {
        const orderData = await getOrderById(orderId as string);
        setOrder(orderData);
        setError(null);
      } catch (err) {
        console.error('Error cargando orden:', err);
        setError('No se pudo cargar la orden');
      } finally {
        setIsLoadingOrder(false);
      }
    };

    loadOrder();
  }, [orderId, token]);

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  // Loading state
  if (isLoadingOrder) {
    return (
      <ScreenContainer
        headerGradient="tertiary"
        headerIcon={Star}
        headerTitle="Calificar Servicio"
        headerSubtitle="Cargando informacion..."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <ScreenContainer
        headerGradient="tertiary"
        headerIcon={Star}
        headerTitle="Calificar Servicio"
        headerSubtitle="Ocurrio un problema"
      >
        <ErrorState message={error || 'Orden no encontrada'} onRetry={() => router.back()} />
      </ScreenContainer>
    );
  }

  const driverName = order.driverName || 'Repartidor';
  const driverId = order.driverId || '';

  const handleRatingPress = (value: number) => {
    setRating(value);
    HapticFeedback.light();
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      HapticFeedback.error();
      Toast.error('Por favor selecciona una calificacion');
      return;
    }

    if (!token || !driverId) {
      HapticFeedback.error();
      Toast.error('Informacion faltante');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRating({
        orderId: orderId as string,
        raterId: user.id,
        ratedId: driverId,
        ratedType: 'driver',
        stars: rating,
        comment: comment || undefined,
      });

      // Play success sound for rating submission
      SoundFeedback.success();
      HapticFeedback.success();
      Toast.success('Gracias por tu calificacion!');
      router.back();
    } catch (error) {
      console.error('Submit rating error:', error);
      HapticFeedback.error();
      Toast.error('No se pudo enviar la calificacion. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    HapticFeedback.light();
    router.back();
  };

  const getRatingLabel = () => {
    switch (rating) {
      case 0:
        return 'Toca una estrella para calificar';
      case 1:
        return 'Muy malo';
      case 2:
        return 'Malo';
      case 3:
        return 'Regular';
      case 4:
        return 'Bueno';
      case 5:
        return 'Excelente';
      default:
        return '';
    }
  };

  // Footer con botones
  const renderFooter = () => (
    <View style={styles.buttonContainer}>
      <LoadingButton
        title="Enviar Calificacion"
        onPress={handleSubmit}
        loading={isSubmitting}
        variant="primary"
        disabled={rating === 0}
      />

      <TouchableSound
        style={[styles.skipButton, { backgroundColor: theme.cardAlt }]}
        onPress={handleSkip}
        disabled={isSubmitting}
        activeOpacity={0.8}
      >
        <Text style={[styles.skipButtonText, { color: theme.text }]}>Omitir</Text>
      </TouchableSound>
    </View>
  );

  return (
    <ScreenContainer
      headerGradient="tertiary"
      headerIcon={Star}
      headerTitle="Calificar Servicio"
      headerSubtitle={`Orden #${orderId || '0001'}`}
      footer={renderFooter()}
      footerPadding={140}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Como fue tu experiencia?</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Tu opinion nos ayuda a mejorar
        </Text>

        {/* Driver Card */}
        <View style={styles.driverCard}>
          <Avatar name={driverName} imageUri={undefined} size="large" />
          <Text style={[styles.driverName, { color: theme.text }]}>{driverName}</Text>
          <Text style={[styles.driverLabel, { color: theme.textSecondary }]}>Tu repartidor</Text>
        </View>

        {/* Stars */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableSound
              key={star}
              onPress={() => handleRatingPress(star)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Star
                size={48}
                color={star <= rating ? STATUS_COLORS.gold : theme.border}
                fill={star <= rating ? STATUS_COLORS.gold : 'transparent'}
                strokeWidth={2}
              />
            </TouchableSound>
          ))}
        </View>

        {/* Rating Label */}
        <Text style={[styles.ratingLabel, { color: theme.text }]}>
          {getRatingLabel()}
        </Text>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={[styles.commentLabel, { color: theme.text }]}>
            Escribe un comentario (opcional)
          </Text>
          <View style={[styles.commentInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.commentInput, { color: theme.text }]}
              value={comment}
              onChangeText={setComment}
              placeholder="Cuentanos sobre tu experiencia..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
              editable={!isSubmitting}
            />
            <Text style={[styles.commentCounter, { color: theme.textMuted }]}>
              {comment.length}/200
            </Text>
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  content: {
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  driverCard: {
    alignItems: 'center',
    marginBottom: 32,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  driverLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
    minHeight: 24,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentInputContainer: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 12,
  },
  commentInput: {
    padding: 16,
    fontSize: 15,
    minHeight: 120,
  },
  commentCounter: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
  },
  buttonContainer: {
    gap: 12,
  },
  skipButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
