import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View, Easing } from 'react-native';
import { CheckCircle, XCircle, Info, AlertTriangle, Sparkles } from 'lucide-react-native';
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
  const scale = useRef(new Animated.Value(0.8)).current;
  const progressWidth = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

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
    // Reset animations
    progressWidth.setValue(1);
    scale.setValue(0.8);
    iconScale.setValue(0);

    // Haptic feedback based on type
    if (toast.type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (toast.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 60,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      // Icon bounce animation
      Animated.sequence([
        Animated.delay(150),
        Animated.spring(iconScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 6,
        }),
      ]),
    ]).start();

    // Progress bar animation
    Animated.timing(progressWidth, {
      toValue: 0,
      duration: toast.duration,
      useNativeDriver: false,
      easing: Easing.linear,
    }).start();

    setTimeout(() => {
      hideToast();
    }, toast.duration);
  }, [translateY, opacity, scale, iconScale, progressWidth, hideToast]);

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
    const size = 20;
    switch (currentToast.type) {
      case 'success': return <CheckCircle size={size} color={iconColor} />;
      case 'error': return <XCircle size={size} color={iconColor} />;
      case 'warning': return <AlertTriangle size={size} color={iconColor} />;
      default: return <Info size={size} color={iconColor} />;
    }
  };

  const getIconBgColor = () => {
    switch (currentToast.type) {
      case 'success': return 'rgba(255,255,255,0.25)';
      case 'error': return 'rgba(255,255,255,0.25)';
      case 'warning': return 'rgba(255,255,255,0.25)';
      default: return 'rgba(255,255,255,0.25)';
    }
  };

  const getProgressColor = () => {
    return 'rgba(255,255,255,0.4)';
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        getToastStyle(),
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Animated.View style={[styles.toastIcon, { backgroundColor: getIconBgColor(), transform: [{ scale: iconScale }] }]}>
        {getIcon()}
      </Animated.View>
      <Text style={styles.toastText}>{currentToast.message}</Text>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: getProgressColor(),
              width: progressWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 16,
    right: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    paddingBottom: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
    overflow: 'hidden' as const,
  },
  toastIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
    lineHeight: 20,
  },
  progressContainer: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  successToast: {
    backgroundColor: '#059669', // Emerald-600
  },
  errorToast: {
    backgroundColor: '#DC2626', // Red-600
  },
  warningToast: {
    backgroundColor: '#D97706', // Amber-600
  },
  infoToast: {
    backgroundColor: '#0891B2', // Cyan-600
  },
});
