import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth';
import { DS } from '@/constants/design';
import BigButton from '@/components/ui/BigButton';
import YAvatar from '@/components/ui/YAvatar';
import { getOrderById } from '@/services/orders';
import { createRating } from '@/services/ratings';
import { Order } from '@/constants/types';
import { Toast } from '@/utils/toast';
import { HapticFeedback } from '@/utils/haptics';

const RATING_LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

export default function CreateRatingScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { user, token } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !orderId) return;
    getOrderById(orderId as string)
      .then(setOrder)
      .catch(() => Toast.error('No se pudo cargar la orden'))
      .finally(() => setLoading(false));
  }, [orderId, token]);

  if (!user) {
    router.replace('/login' as any);
    return null;
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      Toast.error('Selecciona una calificacion');
      return;
    }
    const driverId = order?.driverId;
    if (!driverId) return;

    setSubmitting(true);
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
      Toast.success('Gracias por tu calificacion!');
      router.back();
    } catch {
      Toast.error('No se pudo enviar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={DS.colors.green} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  const driverName = order?.driverName || 'Repartidor';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Como fue tu experiencia?</Text>
        <Text style={styles.subtitle}>Tu opinion nos ayuda a mejorar</Text>

        {/* Driver */}
        <View style={styles.driverCard}>
          <YAvatar name={driverName} size={72} color={DS.colors.green} />
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.driverLabel}>Tu repartidor</Text>
        </View>

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => { setRating(s); HapticFeedback.light(); }}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Star
                size={48}
                color={s <= rating ? '#EAB308' : DS.colors.hairline}
                fill={s <= rating ? '#EAB308' : 'transparent'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingLabel}>
          {rating > 0 ? RATING_LABELS[rating] : 'Toca una estrella'}
        </Text>

        {/* Comment */}
        <Text style={styles.commentTitle}>Comentario (opcional)</Text>
        <View style={styles.commentBox}>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Cuentanos tu experiencia..."
            placeholderTextColor={DS.colors.placeholder}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={200}
          />
          <Text style={styles.counter}>{comment.length}/200</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <BigButton
            title="Enviar Calificacion"
            color={DS.colors.green}
            onPress={handleSubmit}
            loading={submitting}
            disabled={rating === 0}
          />
          <TouchableOpacity style={styles.skipBtn} onPress={() => router.back()}>
            <Text style={styles.skipText}>Omitir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.colors.bg },
  scroll: { padding: DS.space.xl, paddingBottom: 40 },
  title: { ...DS.fonts.title, color: DS.colors.dark, textAlign: 'center', marginTop: DS.space.xl },
  subtitle: { ...DS.fonts.body, color: DS.colors.muted, textAlign: 'center', marginBottom: DS.space.xxxl },
  driverCard: { alignItems: 'center', marginBottom: DS.space.xxxl },
  driverName: { ...DS.fonts.section, color: DS.colors.dark, marginTop: DS.space.md },
  driverLabel: { ...DS.fonts.small, color: DS.colors.muted, marginTop: 2 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: DS.space.sm, marginBottom: DS.space.lg },
  ratingLabel: { ...DS.fonts.bodyMed, color: DS.colors.dark, textAlign: 'center', marginBottom: DS.space.xxxl },
  commentTitle: { ...DS.fonts.label, color: DS.colors.dark, marginBottom: DS.space.sm },
  commentBox: {
    backgroundColor: DS.colors.card,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.hairline,
    marginBottom: DS.space.xxl,
  },
  commentInput: { ...DS.fonts.body, color: DS.colors.dark, padding: DS.space.lg, minHeight: 120 },
  counter: { ...DS.fonts.small, color: DS.colors.muted, position: 'absolute', bottom: 10, right: 14 },
  actions: { gap: DS.space.md },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    backgroundColor: DS.colors.divider,
    borderRadius: DS.radius.lg,
  },
  skipText: { ...DS.fonts.bodyMed, color: DS.colors.body },
});
