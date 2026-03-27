import { StyleSheet, Text, View } from 'react-native';
import TouchableSound from '@/components/TouchableSound';
import { useRouter } from 'expo-router';
import { MessageCircle, User, Truck, Store } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface OrderChatButtonProps {
  orderId: string;
  targetType?: 'client' | 'driver' | 'business';
  targetId?: string;
  targetName?: string;
  variant?: 'icon' | 'button' | 'card';
  unreadCount?: number;
}

export default function OrderChatButton({
  orderId,
  targetType,
  targetId,
  targetName,
  variant = 'button',
  unreadCount = 0,
}: OrderChatButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    let url = `/chat/order/${orderId}`;
    if (targetType && targetId) {
      url += `?targetType=${targetType}&targetId=${targetId}`;
    }
    router.push(url as any);
  };

  const getIcon = () => {
    switch (targetType) {
      case 'client': return <User size={18} color={variant === 'icon' ? Colors.primary : Colors.white} />;
      case 'driver': return <Truck size={18} color={variant === 'icon' ? Colors.accent : Colors.white} />;
      case 'business': return <Store size={18} color={variant === 'icon' ? Colors.success : Colors.white} />;
      default: return <MessageCircle size={18} color={variant === 'icon' ? Colors.primary : Colors.white} />;
    }
  };

  const getLabel = () => {
    if (targetName) return `Chat con ${targetName}`;
    switch (targetType) {
      case 'client': return 'Chat con Cliente';
      case 'driver': return 'Chat con Repartidor';
      case 'business': return 'Chat con Negocio';
      default: return 'Abrir Chat';
    }
  };

  if (variant === 'icon') {
    return (
      <TouchableSound style={styles.iconButton} onPress={handlePress}>
        {getIcon()}
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableSound>
    );
  }

  if (variant === 'card') {
    return (
      <TouchableSound style={styles.cardButton} onPress={handlePress}>
        <View style={styles.cardIcon}>
          {getIcon()}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{getLabel()}</Text>
          <Text style={styles.cardSubtitle}>Enviar mensaje</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableSound>
    );
  }

  // Default: button
  return (
    <TouchableSound style={styles.button} onPress={handlePress}>
      <MessageCircle size={18} color={Colors.white} />
      <Text style={styles.buttonText}>{getLabel()}</Text>
      {unreadCount > 0 && (
        <View style={styles.buttonBadge}>
          <Text style={styles.buttonBadgeText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableSound>
  );
}

const styles = StyleSheet.create({
  // Icon variant
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  // Button variant
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  buttonBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  buttonBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
  // Card variant
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  cardBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
});
