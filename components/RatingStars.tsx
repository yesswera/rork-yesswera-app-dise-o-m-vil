import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
}

export default function RatingStars({
  rating,
  onRatingChange,
  size = 'medium',
  readonly = false,
}: RatingStarsProps) {
  const sizes = {
    small: 16,
    medium: 24,
    large: 40,
  };

  const iconSize = sizes[size];
  const isInteractive = !readonly && onRatingChange;

  const handlePress = (value: number) => {
    if (isInteractive) {
      onRatingChange(value);
    }
  };

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        const StarComponent = isInteractive ? TouchableOpacity : View;

        return (
          <StarComponent
            key={star}
            onPress={() => handlePress(star)}
            disabled={!isInteractive}
            activeOpacity={0.7}
            style={styles.star}
          >
            <Star
              size={iconSize}
              color={isFilled ? Colors.warning : Colors.border.medium}
              fill={isFilled ? Colors.warning : 'transparent'}
              strokeWidth={2}
            />
          </StarComponent>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  star: {
    marginHorizontal: 4,
  },
});
