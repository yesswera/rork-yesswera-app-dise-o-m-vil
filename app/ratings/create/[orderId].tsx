import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import Colors from '@/constants/colors';
import RatingStars from '@/components/RatingStars';
import FormInput from '@/components/FormInput';
import LoadingButton from '@/components/LoadingButton';
import { mockOrders } from '@/mocks/orders';

export default function CreateRatingScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const order = mockOrders.find((o) => o.id === orderId);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '¡Gracias por tu calificación!',
        'Tu opinión nos ayuda a mejorar el servicio',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }, 1500);
  };

  const handleSkip = () => {
    router.back();
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Orden no encontrada</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>¿Cómo fue tu experiencia?</Text>
          <Text style={styles.subtitle}>
            Ayúdanos a mejorar calificando a tu repartidor
          </Text>
        </View>

        <View style={styles.driverSection}>
          <View style={styles.driverAvatar}>
            <User size={40} color={Colors.primary} />
          </View>
          <Text style={styles.driverName}>
            {order.rating?.driverName || 'Repartidor Asignado'}
          </Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Calificación</Text>
          <View style={styles.starsContainer}>
            <RatingStars
              rating={rating}
              onRatingChange={setRating}
              size="large"
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
          <FormInput
            label="Comentario (opcional)"
            value={comment}
            onChangeText={setComment}
            placeholder="Escribe tu opinión sobre el servicio..."
            multiline
            numberOfLines={4}
            style={styles.commentInput}
          />
        </View>

        <View style={styles.buttonsSection}>
          <LoadingButton
            title="Enviar Calificación"
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
          <LoadingButton
            title="Omitir"
            onPress={handleSkip}
            variant="secondary"
            disabled={loading}
          />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
    marginTop: 40,
  },
  header: {
    backgroundColor: Colors.white,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center' as const,
  },
  driverSection: {
    alignItems: 'center' as const,
    paddingVertical: 32,
  },
  driverAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  ratingSection: {
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    marginBottom: 32,
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
    color: Colors.warning,
  },
  commentSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  commentInput: {
    height: 120,
    textAlignVertical: 'top' as const,
  },
  buttonsSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
});
