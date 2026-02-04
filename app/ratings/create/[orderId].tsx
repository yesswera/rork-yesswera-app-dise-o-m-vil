import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Star } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import Avatar from '@/components/Avatar';
import LoadingButton from '@/components/LoadingButton';
import { Toast } from '@/utils/toast';
import { HapticFeedback } from '@/utils/haptics';
import { StatusBar } from 'expo-status-bar';
import { getOrderById } from '@/services/orders';
import { createRating } from '@/services/ratings';
import { Order } from '@/constants/types';
import ErrorState from '@/components/ErrorState';

export default function CreateRatingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { user, token } = useAuth();
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

  if (isLoadingOrder) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calificar Servicio</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calificar Servicio</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorState message={error || 'Orden no encontrada'} onRetry={() => router.back()} />
      </View>
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
      Toast.error('Por favor selecciona una calificación');
      return;
    }

    if (!token || !driverId) {
      HapticFeedback.error();
      Toast.error('Información faltante');
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
      
      HapticFeedback.success();
      Toast.success('¡Gracias por tu calificación!');
      router.back();
    } catch (error) {
      console.error('Submit rating error:', error);
      HapticFeedback.error();
      Toast.error('No se pudo enviar la calificación. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    HapticFeedback.light();
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calificar Servicio</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>¿Cómo fue tu experiencia?</Text>
          <Text style={styles.subtitle}>
            Orden #{orderId || '0001'}
          </Text>

          <View style={styles.driverCard}>
            <Avatar name={driverName} imageUri={undefined} size="large" />
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.driverLabel}>Tu repartidor</Text>
          </View>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRatingPress(star)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Star
                  size={48}
                  color={star <= rating ? Colors.gold : Colors.border.medium}
                  fill={star <= rating ? Colors.gold : 'transparent'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ratingLabel}>
            {rating === 0 && 'Toca una estrella para calificar'}
            {rating === 1 && 'Muy malo'}
            {rating === 2 && 'Malo'}
            {rating === 3 && 'Regular'}
            {rating === 4 && 'Bueno'}
            {rating === 5 && 'Excelente'}
          </Text>

          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>
              Escribe un comentario (opcional)
            </Text>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Cuéntanos sobre tu experiencia..."
                placeholderTextColor={Colors.text.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
                editable={!isSubmitting}
              />
              <Text style={styles.commentCounter}>
                {comment.length}/200
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <LoadingButton
              title="Enviar Calificación"
              onPress={handleSubmit}
              loading={isSubmitting}
              variant="primary"
              disabled={rating === 0}
            />

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>Omitir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    backgroundColor: Colors.black,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  driverCard: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginTop: 12,
  },
  driverLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
    marginBottom: 32,
    minHeight: 24,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  commentInputContainer: {
    position: 'relative' as const,
  },
  commentInput: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 120,
  },
  commentCounter: {
    position: 'absolute' as const,
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: Colors.text.muted,
  },
  buttonContainer: {
    gap: 12,
  },
  skipButton: {
    backgroundColor: Colors.background.tertiary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
});
