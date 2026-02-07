import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { HelpCircle, MessageSquare } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SupportButtonProps {
  orderId?: string;
  variant?: 'floating' | 'inline' | 'banner';
  label?: string;
}

export default function SupportButton({
  orderId,
  variant = 'inline',
  label = '¿Necesitas ayuda?',
}: SupportButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (orderId) {
      router.push(`/support?orderId=${orderId}` as any);
    } else {
      router.push('/support' as any);
    }
  };

  if (variant === 'floating') {
    return (
      <TouchableOpacity style={styles.floatingButton} onPress={handlePress}>
        <HelpCircle size={24} color={Colors.white} />
      </TouchableOpacity>
    );
  }

  if (variant === 'banner') {
    return (
      <TouchableOpacity style={styles.banner} onPress={handlePress}>
        <View style={styles.bannerContent}>
          <MessageSquare size={20} color={Colors.primary} />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{label}</Text>
            <Text style={styles.bannerSubtitle}>Contacta a soporte</Text>
          </View>
        </View>
        <Text style={styles.bannerAction}>Ayuda →</Text>
      </TouchableOpacity>
    );
  }

  // Default: inline
  return (
    <TouchableOpacity style={styles.inlineButton} onPress={handlePress}>
      <HelpCircle size={18} color={Colors.primary} />
      <Text style={styles.inlineText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Floating
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: {
    gap: 2,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  bannerAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Inline
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  inlineText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});
