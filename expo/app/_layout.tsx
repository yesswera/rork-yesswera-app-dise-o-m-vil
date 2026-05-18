import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { CartProvider } from "@/contexts/cart";
import { ThemeProvider } from "@/contexts/theme";
import { RealtimeProvider } from "@/contexts/realtime";
import { QueryProvider } from "@/providers/QueryProvider";
import ToastContainer from "@/components/ToastContainer";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  registerForPushNotifications,
  addNotificationResponseReceivedListener,
} from "@/services/notifications";
import { DS } from "@/constants/design";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import OfflineBanner from "@/components/ui/OfflineBanner";

SplashScreen.preventAutoHideAsync();

function NotificationHandler() {
  const { user } = useAuth();
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (user && !registered.current) {
      registered.current = true;
      registerForPushNotifications(user.id).catch(console.error);
    }
    if (!user) {
      registered.current = false;
    }
  }, [user]);

  useEffect(() => {
    const sub = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.orderId) {
        router.push(`/orders/${data.orderId}` as any);
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="food/restaurants" />
      <Stack.Screen name="food/menu/[businessId]" />
      <Stack.Screen name="food/checkout" />
      <Stack.Screen name="shopping" />
      <Stack.Screen name="delivery/create" />
      <Stack.Screen name="tracking/[orderId]" />
      <Stack.Screen name="orders/history" />
      <Stack.Screen name="orders/[orderId]" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="password-recovery/request" />
      <Stack.Screen name="password-recovery/verify" />
      <Stack.Screen name="password-recovery/reset" />
      <Stack.Screen name="business/dashboard" options={{ gestureEnabled: false }} />
      <Stack.Screen name="business/products" />
      <Stack.Screen name="business/products/add" />
      <Stack.Screen name="business/profile" />
      <Stack.Screen name="business/onboarding" />
      <Stack.Screen name="driver/dashboard" options={{ gestureEnabled: false }} />
      <Stack.Screen name="driver/active-order" />
      <Stack.Screen name="driver/profile" />
      <Stack.Screen name="driver/waiting" />
      <Stack.Screen name="auth/register-driver" />
      <Stack.Screen name="business/analytics" />
      <Stack.Screen name="loyalty" />
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen name="admin/orders" />
      <Stack.Screen name="admin/drivers" />
      <Stack.Screen name="ratings/create/[orderId]" />
      <Stack.Screen name="yessi" />
      <Stack.Screen name="+not-found" options={{ title: "Oops!", headerShown: true }} />
    </Stack>
  );
}

function ThemedApp() {
  const { isConnected, retry } = useNetworkStatus();

  return (
    <View style={{ flex: 1, backgroundColor: DS.colors.bg }}>
      {!isConnected && <OfflineBanner onRetry={retry} />}
      <NotificationHandler />
      <RootLayoutNav />
      <ToastContainer />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);
  }, []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <AuthProvider>
              <RealtimeProvider>
                <CartProvider>
                  <ThemedApp />
                </CartProvider>
              </RealtimeProvider>
            </AuthProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryProvider>
    </ErrorBoundary>
  );
}
