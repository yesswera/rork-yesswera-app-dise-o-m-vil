import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/auth";
import { CartProvider } from "@/contexts/cart";
import { QueryProvider } from "@/providers/QueryProvider";
import ToastContainer from "@/components/ToastContainer";

SplashScreen.preventAutoHideAsync();

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
      <Stack.Screen name="profile" options={{ title: "Mi Perfil" }} />
      <Stack.Screen name="profile/edit" options={{ title: "Editar Perfil" }} />
      <Stack.Screen name="orders/history" options={{ title: "Historial de Órdenes" }} />
      <Stack.Screen name="orders/[orderId]" options={{ title: "Detalles de Orden" }} />
      <Stack.Screen name="ratings/create/[orderId]" options={{ title: "Calificar Servicio" }} />
      <Stack.Screen name="password-recovery/request" options={{ title: "Recuperar Contraseña", presentation: "modal" }} />
      <Stack.Screen name="password-recovery/verify" options={{ title: "Verificar Código" }} />
      <Stack.Screen name="password-recovery/reset" options={{ title: "Nueva Contraseña" }} />
      <Stack.Screen name="+not-found" options={{ title: "Oops!" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);
  }, []);

  return (
    <QueryProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <CartProvider>
            <View style={{ flex: 1 }}>
              <RootLayoutNav />
              <ToastContainer />
            </View>
          </CartProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryProvider>
  );
}
