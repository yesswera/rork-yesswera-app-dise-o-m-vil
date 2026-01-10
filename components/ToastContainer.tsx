import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { registerToastCallback, ToastType } from '@/utils/toast';

interface QueuedToast {
  message: string;
  type: ToastType;
  duration: number;
}

export default function ToastContainer() {
  const [toastQueue, setToastQueue] = useState<QueuedToast[]>([]);
  const [currentToast, setCurrentToast] = useState<QueuedToast | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    registerToastCallback((toast) => {
      setToastQueue((prev) => [...prev, toast]);
    });
  }, []);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback((toast: QueuedToast) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 60,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      hideToast();
    }, toast.duration);
  }, [translateY, opacity, hideToast]);

  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      setToastQueue((prev) => prev.slice(1));
      setCurrentToast(nextToast);
      showToast(nextToast);
    }
  }, [toastQueue, currentToast, showToast]);

  if (!currentToast) return null;

  const getToastStyle = () => {
    switch (currentToast.type) {
      case 'success': return styles.successToast;
      case 'error': return styles.errorToast;
      case 'warning': return styles.warningToast;
      default: return styles.infoToast;
    }
  };

  const getIcon = () => {
    const iconColor = Colors.white;
    switch (currentToast.type) {
      case 'success': return <CheckCircle size={22} color={iconColor} />;
      case 'error': return <XCircle size={22} color={iconColor} />;
      case 'warning': return <AlertTriangle size={22} color={iconColor} />;
      default: return <Info size={22} color={iconColor} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        getToastStyle(),
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.toastIcon}>{getIcon()}</View>
      <Text style={styles.toastText}>{currentToast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    shadowColor: Colors.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  toastIcon: {
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  successToast: {
    backgroundColor: '#10B981',
  },
  errorToast: {
    backgroundColor: Colors.error,
  },
  warningToast: {
    backgroundColor: Colors.warning,
  },
  infoToast: {
    backgroundColor: Colors.primary,
  },
});
