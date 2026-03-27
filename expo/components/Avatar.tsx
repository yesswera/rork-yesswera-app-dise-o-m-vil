import { View, Text, StyleSheet, Image } from 'react-native';
import Colors from '@/constants/colors';

interface AvatarProps {
  name?: string;
  imageUri?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
}

export default function Avatar({
  name,
  imageUri,
  size = 'medium',
  color = Colors.primary,
}: AvatarProps) {
  const getSize = () => {
    switch (size) {
      case 'small':
        return 40;
      case 'medium':
        return 56;
      case 'large':
        return 80;
      case 'xlarge':
        return 100;
      default:
        return 56;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'medium':
        return 20;
      case 'large':
        return 32;
      case 'xlarge':
        return 36;
      default:
        return 20;
    }
  };

  const getInitials = () => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const avatarSize = getSize();
  const fontSize = getFontSize();

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{getInitials()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  initials: {
    color: Colors.white,
    fontWeight: '700' as const,
  },
});
