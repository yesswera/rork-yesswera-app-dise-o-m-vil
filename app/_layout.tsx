import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/auth";
import { CartProvider } from "@/contexts/cart";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: "Iniciar Sesión", presentation: "modal" }} />
      <Stack.Screen name="register" options={{ title: "Crear Cuenta", presentation: "modal" }} />
      <Stack.Screen name="food/restaurants" options={{ title: "Restaurantes" }} />
      <Stack.Screen name="food/menu/[businessId]" options={{ title: "Menú" }} />
      <Stack.Screen name="food/cart" options={{ title: "Carrito" }} />
      <Stack.Screen name="shopping/stores" options={{ title: "Tiendas" }} />
      <Stack.Screen name="shopping/list/[storeId]" options={{ title: "Lista de Compras" }} />
      <Stack.Screen name="delivery/create" options={{ title: "Coger y Entregar" }} />
      <Stack.Screen name="tracking/[orderId]" options={{ title: "Seguimiento" }} />
      <Stack.Screen name="driver/dashboard" options={{ title: "Portal Repartidor" }} />
      <Stack.Screen name="business/dashboard" options={{ title: "Portal Negocio" }} />
      <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <CartProvider>
            <RootLayoutNav />
          </CartProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
