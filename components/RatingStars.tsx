import { View, StyleSheet } from 'react-native';
import TouchableSound from '@/components/TouchableSound';
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
  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 24;
      case 'large':
        return 32;
    }
  };

  const iconSize = getSizeValue();
  const spacing = size === 'small' ? 2 : size === 'medium' ? 4 : 6;

  const handlePress = (starRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <View style={[styles.container, { gap: spacing }]}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= rating;
        const StarComponent = readonly ? View : TouchableSound;
        
        return (
          <StarComponent
            key={star}
            onPress={() => handlePress(star)}
            disabled={readonly}
            activeOpacity={0.7}
          >
            <Star
              size={iconSize}
              color={isFilled ? Colors.gold : Colors.lightGray}
              fill={isFilled ? Colors.gold : 'transparent'}
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
});
