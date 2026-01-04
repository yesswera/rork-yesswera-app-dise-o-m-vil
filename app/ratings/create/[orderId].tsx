import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, User as UserIcon } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import Colors from '@/constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { MOCK_ORDERS } from '@/mocks/orders';
import RatingStars from '@/components/RatingStars';
import LoadingButton from '@/components/LoadingButton';

export default function RateDriverScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const order = MOCK_ORDERS.find((o) => o.id === parseInt(orderId));

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  if (!order || !order.driverName) {
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
          <Text style={styles.headerTitle}>Calificar</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se encontró información del repartidor</Text>
        </View>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Calificación Requerida', 'Por favor selecciona una calificación');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        '¡Gracias!',
        'Tu calificación ha sido enviada exitosamente',
        [
          {
            text: 'OK',
            onPress: () => router.push('/orders/history' as any),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'No se pudo enviar la calificación. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.back();
  };

  const driverName = order.driverName || 'Repartidor';

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        <Text style={styles.headerTitle}>Calificar</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>¿Cómo fue tu experiencia?</Text>
        </View>

        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <UserIcon size={40} color={Colors.white} />
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.driverSubtitle}>Tu repartidor</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Tu Calificación</Text>
          <View style={styles.starsContainer}>
            <RatingStars
              rating={rating}
              onRatingChange={setRating}
              size="large"
              readonly={false}
            />
          </View>
          {rating > 0 && (
            <Text style={styles.ratingText}>
              {rating === 1 && 'Muy malo'}
              {rating === 2 && 'Malo'}
              {rating === 3 && 'Regular'}
              {rating === 4 && 'Bueno'}
              {rating === 5 && 'Excelente'}
            </Text>
          )}
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Escribe un comentario (opcional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder="Cuéntanos sobre tu experiencia..."
              placeholderTextColor={Colors.text.muted}
              multiline
              numberOfLines={4}
              maxLength={250}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{comment.length}/250</Text>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <LoadingButton
            title="Enviar Calificación"
            onPress={handleSubmit}
            loading={isLoading}
            variant="primary"
            disabled={rating === 0}
          />

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Omitir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    textAlign: 'center' as const,
  },
  driverCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center' as const,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowColor: Colors.shadow.light,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  driverSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  ratingSection: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center' as const,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 20,
  },
  starsContainer: {
    marginBottom: 16,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  commentSection: {
    marginBottom: 32,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    padding: 16,
  },
  input: {
    fontSize: 15,
    color: Colors.text.primary,
    minHeight: 100,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: 'right' as const,
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border.medium,
    alignItems: 'center' as const,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
});
