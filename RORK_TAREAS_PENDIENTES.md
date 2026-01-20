# Tareas Pendientes para Rork - Yesswera App

## Estado Actual
El flujo E2E de órdenes funciona casi completamente:
- Cliente crea orden OK
- Negocio acepta orden OK
- Repartidor ve orden asignada OK
- Repartidor muestra código de recogida al negocio OK
- Negocio valida código OK
- **PENDIENTE: Input de código de entrega no responde**

## Bugs Críticos a Resolver

### 1. Input de Código de Entrega No Funciona
**Archivo:** `app/driver/active-order.tsx` (líneas 244-253)
**Problema:** El TextInput para ingresar el código de entrega no responde al toque en Android.
**Síntomas:**
- El campo aparece visualmente correcto
- Al tocar no abre el teclado
- No se puede escribir nada

**Posibles causas:**
- Conflicto con ScrollView
- KeyboardAvoidingView faltante
- Problema de z-index con el contenedor

### 2. Asignación Automática de Repartidores
**Archivo:** Backend `server_jwt.py` en 192.168.100.3
**Situación actual:** Las órdenes se asignan manualmente
**Requerido:** Sistema automático basado en:
- Disponibilidad del repartidor (online/offline)
- Calificación promedio
- Distancia al punto de recogida
- Carga actual de órdenes

### 3. Mapa para Ubicación de Recogida
**Archivo:** `app/driver/active-order.tsx`
**Faltante:** Mostrar mapa con ruta desde ubicación actual del repartidor hasta:
- Punto de recogida (negocio)
- Punto de entrega (cliente)

## Mejoras de UX Sugeridas

### 4. Notificaciones Push
- Notificar al negocio cuando llega orden nueva
- Notificar al repartidor cuando se le asigna orden
- Notificar al cliente sobre cambios de estado

### 5. Historial de Ganancias del Repartidor
- Mostrar ganancias del día/semana/mes
- Desglose por órdenes completadas

## Credenciales de Prueba
- **Cliente:** juan@test.com / cliente123
- **Negocio:** tienda@business.com / business123
- **Repartidor:** carlos@delivery.com / driver123

## Servidor
- **IP:** 192.168.100.3
- **Puerto:** 3000
- **Comando:** `python3 server_jwt.py 3000 --no-ssl`

## Archivos Clave Modificados Recientemente
1. `app/food/cart.tsx` - Creación de órdenes
2. `app/business/orders.tsx` - Aceptación de órdenes
3. `app/driver/active-order.tsx` - Gestión de órdenes activas
4. `app/tracking/[orderId].tsx` - Tracking del cliente
5. `app/orders/[orderId].tsx` - Detalle de orden

## Notas Técnicas
- Alert.prompt NO funciona en Android, usar Alert.alert
- deliveryLocation puede ser string u objeto con {latitude, longitude}
- Los estados de orden son: pending → accepted → assigned → picked_up → in_transit → delivered
