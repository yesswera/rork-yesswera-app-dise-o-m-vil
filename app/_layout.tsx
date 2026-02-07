import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { View, AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { CartProvider } from "@/contexts/cart";
import { AnalyticsProvider } from "@/contexts/analytics";
import { ThemeProvider, useTheme } from "@/contexts/theme";
import { RealtimeProvider } from "@/contexts/realtime";
import { QueryProvider } from "@/providers/QueryProvider";
import ToastContainer from "@/components/ToastContainer";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  registerForPushNotifications,
  addNotificationResponseReceivedListener,
} from "@/services/notifications";
import { initializeSounds, cleanupSounds } from "@/services/sounds";

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
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Iniciar Sesión", presentation: "modal" }} />
      <Stack.Screen name="register" options={{ title: "Crear Cuenta", presentation: "modal" }} />
      <Stack.Screen name="food/restaurants" options={{ title: "Restaurantes" }} />
      <Stack.Screen name="food/menu/[businessId]" options={{ title: "Menú" }} />
      <Stack.Screen name="food/cart" options={{ title: "Carrito" }} />
      <Stack.Screen name="shopping/index" options={{ title: "Lista de Compras", headerShown: false }} />
      <Stack.Screen name="shopping/general-list" options={{ title: "Lista General" }} />
      <Stack.Screen name="shopping/stores" options={{ title: "Tiendas" }} />
      <Stack.Screen name="shopping/nearby" options={{ title: "Comercios Cercanos", headerShown: false }} />
      <Stack.Screen name="shopping/list/[storeId]" options={{ title: "Lista de Compras" }} />
      <Stack.Screen name="delivery/create" options={{ title: "Coger y Entregar" }} />
      <Stack.Screen name="tracking/[orderId]" options={{ title: "Seguimiento" }} />
      <Stack.Screen name="admin" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="driver/dashboard" options={{ title: "Portal Repartidor", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="business/dashboard" options={{ title: "Portal Negocio", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="business/comanda/[orderId]" options={{ title: "Comanda", headerShown: false }} />
      <Stack.Screen name="business/comanda-mode" options={{ title: "Modo Comanda", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="driver/earnings" options={{ title: "Mis Ganancias", headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: "Mi Perfil" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Editar Perfil" }} />
      <Stack.Screen name="orders/history" options={{ title: "Historial de Órdenes" }} />
      <Stack.Screen name="orders/[orderId]" options={{ title: "Detalles de Orden" }} />
      <Stack.Screen name="orders/cancel/[orderId]" options={{ title: "Cancelar Pedido", headerShown: false }} />
      <Stack.Screen name="orders/cancel-request/[orderId]" options={{ title: "Solicitar Cancelación", headerShown: false }} />
      <Stack.Screen name="ratings/create/[orderId]" options={{ title: "Calificar Servicio" }} />
      <Stack.Screen name="support/index" options={{ title: "Centro de Ayuda" }} />
      <Stack.Screen name="chat/order/[orderId]" options={{ title: "Chat", headerShown: false }} />
      <Stack.Screen name="password-recovery/request" options={{ title: "Recuperar Contraseña", presentation: "modal" }} />
      <Stack.Screen name="password-recovery/verify" options={{ title: "Verificar Código" }} />
      <Stack.Screen name="password-recovery/reset" options={{ title: "Nueva Contraseña" }} />
      <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
    </Stack>
  );
}

function ThemedApp() {
  const { colors, isDark } = useTheme();

  // Colores explícitos para el fondo de la app
  const backgroundColor = isDark ? '#1C1917' : '#FFFFFF';

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <NotificationHandler />
      <RootLayoutNav />
      <ToastContainer />
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Inicializar sistema de sonidos
    initializeSounds().catch(console.error);

    // Escuchar cambios de estado de la app
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        // Limpiar sonidos cuando la app va al background
        // cleanupSounds(); // Comentado: mantener cache para mejor performance
      }
    });

    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);

    return () => {
      subscription.remove();
      cleanupSounds();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider>
            <AuthProvider>
              <RealtimeProvider>
                <AnalyticsProvider>
                  <CartProvider>
                    <ThemedApp />
                  </CartProvider>
                </AnalyticsProvider>
              </RealtimeProvider>
            </AuthProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryProvider>
    </ErrorBoundary>
  );
}
