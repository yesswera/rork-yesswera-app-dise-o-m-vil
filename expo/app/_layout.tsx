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
  const headerDefaults = {
    headerBackTitle: "Atras",
    headerStyle: { backgroundColor: DS.colors.bg },
  };

  return (
    <Stack screenOptions={headerDefaults}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="food/restaurants" options={{ title: "Pedir Comida" }} />
      <Stack.Screen name="food/menu/[businessId]" options={{ title: "Menu" }} />
      <Stack.Screen name="food/checkout" options={{ title: "Confirmar Pedido" }} />
      <Stack.Screen name="shopping" options={{ title: "Lista de Compras" }} />
      <Stack.Screen name="delivery/create" options={{ title: "Enviar Paquete" }} />
      <Stack.Screen name="tracking/[orderId]" options={{ title: "Seguimiento" }} />
      <Stack.Screen name="orders/history" options={{ title: "Historial" }} />
      <Stack.Screen name="orders/[orderId]" options={{ title: "Detalle de Orden" }} />
      <Stack.Screen name="profile" options={{ title: "Mi Perfil" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Editar Perfil" }} />
      <Stack.Screen name="password-recovery/request" options={{ title: "Recuperar Contrasena" }} />
      <Stack.Screen name="password-recovery/verify" options={{ title: "Verificar Codigo" }} />
      <Stack.Screen name="password-recovery/reset" options={{ title: "Nueva Contrasena" }} />
      <Stack.Screen name="business/dashboard" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="business/products" options={{ title: "Productos" }} />
      <Stack.Screen name="business/products/add" options={{ title: "Nuevo Producto" }} />
      <Stack.Screen name="business/profile" options={{ title: "Mi Negocio" }} />
      <Stack.Screen name="business/onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="driver/dashboard" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="driver/active-order" options={{ title: "Entrega Activa" }} />
      <Stack.Screen name="driver/profile" options={{ title: "Mi Perfil" }} />
      <Stack.Screen name="driver/waiting" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register-driver" options={{ headerShown: false }} />
      <Stack.Screen name="business/analytics" options={{ title: "Analitica" }} />
      <Stack.Screen name="loyalty" options={{ title: "Mis Puntos" }} />
      <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="admin/orders" options={{ title: "Ordenes" }} />
      <Stack.Screen name="admin/drivers" options={{ title: "Repartidores" }} />
      <Stack.Screen name="ratings/create/[orderId]" options={{ title: "Calificar" }} />
      <Stack.Screen name="yessi" options={{ title: "Yessi", headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
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
