# CLAUDE.md - Memoria Persistente

## Proyecto Activo: YESSWERA

### Por que existe Yesswera?
**Objetivo principal:** Estabilidad financiera para la familia de Root.

Yesswera es una aplicacion de delivery que conecta clientes, negocios y repartidores en Tomatlan, Jalisco.
- Pedidos de comida/bebida (tipo Uber Eats)
- Lista de compras de supermercado
- Mensajeria/paqueteria (recoger y entregar)

---

## COMPROMISO CLAUDE-ROOT

Root deposito su confianza en Claude para guiar el proyecto hacia el exito.

**Mi compromiso:**
- Guiar el proyecto hacia el exito
- Dar opinion honesta sobre posibles huecos o problemas
- Documentar, analizar, guardar y respaldar TODO
- Planificar a fondo antes de implementar
- Cuidar los detalles minimos (previenen problemas grandes)
- No soy solo una herramienta que ejecuta comandos. Soy su socio tecnico.

---

## ESTRUCTURA DE CARPETAS (Actualizado 2026-02-07)

```
C:\claude\                              <- ULTRA LIMPIO (6 elementos, 870 archivos)
├── CLAUDE.md                           <- Este archivo (memoria persistente)
├── INDICE.md
├── README.md
├── Yesswera/                           <- Proyecto principal (LIMPIO)
│   ├── .credentials/                   <- Credenciales (NO en Git)
│   ├── .git/
│   ├── backend/                        <- Backend local (respaldo)
│   ├── database/                       <- Esquema de BD
│   ├── rork-app/                       <- App movil (React Native) - SIN node_modules
│   ├── ARQUITECTURA_TECNICA_YESSWERA.md
│   ├── DOCUMENTO_MAESTRO_YESSWERA_v2.md
│   ├── MEMORIA_SESION_*.md             <- Memorias de sesion
│   └── README.md
├── YessweraWeb/                        <- Portal web (45 archivos)
└── respaldo servidor yesswera/         <- Backup completo del servidor VM (112 archivos)

C:\respaldo claude\                     <- Archivos movidos (126 elementos)
├── Proyectos obsoletos (TestApp, YessweraApp, yesswera-app-mobile)
├── 6 carpetas node_modules eliminadas
├── 80+ archivos de documentacion antigua
├── Scripts de servidor (server_*.py)
├── Scripts de deploy/backup
└── Archivos de configuracion antiguos

C:\claude2\respaldo de claude\          <- Archivos movidos anteriormente (88 archivos)
├── Scripts de servidor viejo (*.py)
├── Componentes TSX temporales
├── Documentacion del servidor local
└── Archivos de MikroTik/redes
```

**IMPORTANTE:** Para desarrollo en rork-app, ejecutar `npm install` primero.

---

## REPOSITORIOS GITHUB

| Repositorio | Contenido | Estado |
|-------------|-----------|--------|
| `yesswera/rork-yesswera-app-dise-o-m-vil` | App movil (rork-app) | Sincronizado |
| `yesswera/yesswera` | Proyecto principal + docs | Sincronizado |
| `yesswera/genesispro` | **OTRO PROYECTO - NO TOCAR** | Separado |

---

## INFRAESTRUCTURA

### Arquitectura de Servidores
```
┌─────────────────────────────────────────┐
│  SERVIDOR AURA (Hardware fisico)        │
│  OS: Xubuntu                            │
│  IP: 10.147.17.155                      │
│  Usuario: aura / Pass: 1234             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  VirtualBox VM (Ubuntu Server)  │   │
│  │  IP: 10.147.17.16               │   │
│  │  Usuario: yesswera / Pass: 1234 │   │
│  │  Backend: server_jwt.py :3000   │   │
│  │  Expo Server activo             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Backend en la NUBE (Produccion - desde 2026-02-04)

**Supabase (Base de datos + Auth)**
- URL: https://jdvundwewwobkznxwkvj.supabase.co
- Region: East US
- Credenciales: `.credentials/supabase.env`

**Firebase (GPS Tracking + Push)**
- Proyecto: yesswera-app
- Database: https://yesswera-app-default-rtdb.firebaseio.com
- Credenciales: `.credentials/firebase.env`

**Tablas en Supabase (13)**
```
users              - Todos los usuarios
businesses         - Negocios
drivers            - Repartidores
addresses          - Direcciones de clientes
product_categories - Categorias de productos
products           - Productos/platillos (+ columna unit VARCHAR(50) DEFAULT 'pieza')
product_variants   - Variantes (tamanos, extras)
orders             - Pedidos
order_items        - Items de cada pedido
ratings            - Calificaciones
notifications      - Notificaciones
push_tokens        - Tokens para push
chat_messages      - Mensajes
```

**Supabase Storage (Buckets)**
```
product-images     - Imagenes de productos (publico, 5MB max, JPEG/PNG/WebP)
  Politicas RLS:
  - upload_product_images  (INSERT, authenticated)
  - view_product_images    (SELECT, public)
  - delete_product_images  (DELETE, authenticated)
  Estructura: product-images/{businessId}/{timestamp}.jpg
```

**Anthropic Claude API (Yessi IA)**
- Modelo: claude-3-haiku-20240307
- Uso: Validacion de imagenes de producto
- API key en `.env` (EXPO_PUBLIC_ANTHROPIC_API_KEY)
- Credenciales: `.credentials/claude-api.env`
- Costo: ~$0.00035/validacion (~$1/mes para 100 productos/dia)

**Indices geograficos (PostGIS)**
- businesses.location
- drivers.current_location
- addresses.location
- orders.pickup_location
- orders.delivery_location

### Plan B: Servidor Local
Si la nube da problemas, el servidor VM tiene todo listo para reactivarse.
Respaldo completo en: `C:\claude\respaldo servidor yesswera\`

---

## ESTADO DEL FRONTEND (Rork) - Febrero 2026

### Tecnologias
- **Framework:** React Native + Expo 54
- **Routing:** Expo Router 6
- **State:** Zustand + React Query
- **Lenguaje:** TypeScript estricto
- **Maps:** react-native-maps
- **GPS:** expo-location
- **Notificaciones:** expo-notifications
- **Backend:** @supabase/supabase-js + firebase
- **IA Vision:** Claude Haiku via Anthropic API (Yessi IA)
- **Imagenes:** expo-image-manipulator + Supabase Storage
- **Codigo:** 100% exportable y modificable

### Archivos de configuracion cloud
- `constants/supabase.ts` - Cliente Supabase
- `constants/firebase.ts` - Cliente Firebase
- `constants/anthropic.ts` - Claude API (Yessi IA Vision)
- `constants/units.ts` - Unidades de producto + formatPriceWithUnit()

### Servicios migrados a la nube
- `services/orders.ts` - CRUD ordenes con Supabase
- `services/gps.ts` - Tracking con Firebase Realtime
- `services/addresses.ts` - CRUD direcciones con Supabase
- `services/products.ts` - CRUD productos con Supabase
- `services/ratings.ts` - Calificaciones con Supabase
- `services/image-upload.ts` - Upload imagenes a Supabase Storage
- `services/yessi-vision.ts` - Validacion imagenes con Claude Vision
- `contexts/auth.tsx` - Auth con Supabase

### Pantallas Implementadas (40 archivos .tsx)

#### Autenticacion
- `login.tsx` - Login
- `register.tsx` - Registro general
- `auth/register-client.tsx` - Registro de cliente
- `password-recovery/request.tsx` - Solicitar recuperacion
- `password-recovery/verify.tsx` - Verificar codigo OTP
- `password-recovery/reset.tsx` - Nueva contrasena

#### Cliente
- `index.tsx` - Home principal
- `food/restaurants.tsx` - Lista de restaurantes
- `food/menu/[businessId].tsx` - Menu de negocio
- `food/cart.tsx` - Carrito de compras
- `shopping/stores.tsx` - Tiendas/supermercados
- `shopping/list/[storeId].tsx` - Lista de compras
- `delivery/create.tsx` - Crear envio de paquete
- `addresses/list.tsx` - Mis direcciones
- `addresses/add.tsx` - Agregar direccion
- `orders/history.tsx` - Historial de ordenes
- `orders/[orderId].tsx` - Detalle de orden
- `tracking/[orderId].tsx` - Tracking en vivo
- `ratings/create/[orderId].tsx` - Calificar repartidor
- `profile.tsx` - Mi perfil
- `profile/edit.tsx` - Editar perfil
- `wallet/index.tsx` - Billetera
- `chat/[conversationId].tsx` - Chat

#### Negocio (Business)
- `business/dashboard.tsx` - Dashboard del negocio
- `business/orders.tsx` - Ordenes entrantes
- `business/products/index.tsx` - Gestion de productos

#### Repartidor (Driver)
- `driver/dashboard.tsx` - Dashboard repartidor
- `driver/active-order.tsx` - Orden activa
- `driver/history.tsx` - Historial
- `driver/messages.tsx` - Mensajes
- `driver/profile.tsx` - Perfil repartidor

#### Admin
- `admin/dashboard.tsx` - Dashboard admin
- `admin/orders.tsx` - Gestion de ordenes
- `admin/users.tsx` - Gestion de usuarios
- `admin/surveys.tsx` - Encuestas
- `admin/settings.tsx` - Configuracion

### Componentes Reutilizables (35)
```
ActiveOrderBanner    AddressSelector      Avatar
Badge                BottomSheet          BusinessImagePicker
Card                 ChatButton           Chip
ConfirmModal         DeliveryPhoto        Divider
EmptyState           ErrorBoundary        ErrorState
FormInput            LiveGPSTracker       LoadingButton
OrderCard            OrderTimer           PanicButton
PasswordInput        PaymentMethodSelector ProductImagePicker
ProgressBar          RatingModal          RatingStars
RejectModal          SearchBar            Skeleton
SurveyPopup          TipSelector          ToastContainer
VerificationCodeDisplay VerificationCodeInput
```

### Flujos Completos
1. **Registro/Login** - 100% (Supabase Auth)
2. **Recuperacion de contrasena** - 100%
3. **Crear orden de comida** - 100% (Supabase)
4. **Negocio acepta orden** - 100%
5. **Repartidor recibe/entrega** - 100%
6. **Tracking en vivo** - 100% (Firebase Realtime)
7. **Calificaciones** - 100%
8. **Gestion de perfil** - 100%
9. **Imagen de producto + Yessi IA** - 100% (Supabase Storage + Claude Vision)

---

## TAREAS PENDIENTES

### Alta prioridad
- [ ] Pruebas E2E completas (Expo Go)
- [ ] Asignacion automatica de repartidores

### Media prioridad
- [ ] Mapa con ruta en pantalla de repartidor
- [ ] Notificaciones push reales
- [ ] Portal Negocio - CRUD completo de productos
- [ ] Configurar dominio api.yesswera.com (OPCIONAL)

### Baja prioridad
- [ ] Onboarding de primera vez
- [ ] Modo oscuro
- [ ] Sistema de pagos (Stripe/Conekta)

### Completadas recientemente
- [x] Fix .single() → .maybeSingle() en 14 queries criticas (10 archivos) - 2026-02-12
- [x] Sistema de unidades de producto (kg, pieza, litro, etc.) - 2026-02-12
- [x] Acceso a perfil personal desde dashboard de negocio - 2026-02-12
- [x] Migration SQL: columna `unit` en tabla products - 2026-02-12
- [x] Imagen de producto (camara/galeria + Supabase Storage) - 2026-02-11
- [x] Yessi IA Vision (validacion imagen vs nombre producto) - 2026-02-11
- [x] Bucket product-images en Supabase + politicas RLS - 2026-02-11

---

## COSTOS ACTUALES

| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Free | $0/mes |
| Firebase | Spark | $0/mes |
| GitHub | Free | $0/mes |
| Anthropic (Yessi IA) | Pay-per-use | ~$1/mes |
| **Total** | | **~$1/mes** |

### Cuando escales
| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Pro | $25/mes |
| Firebase | Blaze | ~$20/mes |
| Anthropic (Yessi IA) | Pay-per-use | ~$5-10/mes |
| **Total** | | **~$55-60/mes** |

---

## FILOSOFIA DEL PROYECTO

1. Yesswera es **HERRAMIENTA**, no intermediario
2. App **GRATIS** por ahora (sin comisiones)
3. Ganancia inicial = **datos y analisis con IA**
4. Planificar bien antes de implementar
5. "La cancelacion NO es un boton, es un **PROCESO**" (salvaguardar venta)
6. Cliente Prioritario: siempre avisar al nuevo negocio

---

## PREFERENCIAS DEL USUARIO (Root)

- Muy detallista y analitico
- Prefiere planificar a fondo
- Valora los detalles minimos (previenen problemas)
- Tiene experiencia como usuario de delivery
- Comunicacion en espanol
- SIEMPRE quiere opinion de Claude sobre posibles huecos
- Documentar, analizar, guardar, respaldar TODO
- **Objetivo:** Estabilidad financiera para su familia

---

## CREDENCIALES DE PRUEBA

### Supabase (usuarios en BD)
| Rol | Email | ID |
|-----|-------|---|
| Cliente | juan@test.com | 11111111-1111-1111-1111-111111111111 |
| Negocio | tienda@business.com | 22222222-2222-2222-2222-222222222222 |
| Repartidor | carlos@delivery.com | 33333333-3333-3333-3333-333333333333 |

### Negocio de prueba
- **ID:** aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
- **Nombre:** La Tiendita de Juan
- **Direccion:** Av. Principal #123, Tomatlan

### Driver de prueba
- **ID:** bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
- **Vehiculo:** moto

### Servidores
- **AURA (host):** 10.147.17.155 | aura / 1234
- **VM Yesswera:** 10.147.17.16 | yesswera / 1234

---

## HISTORIAL DE SESIONES

### 2026-02-12 (Sesion fix errores + unidades + perfil personal)
- **FIX .single() → .maybeSingle():** 14 queries criticas en 10 archivos
  - `contexts/auth.tsx` (2 lugares: loadUserProfile, login)
  - `contexts/realtime.tsx` (2 lugares: businesses, drivers)
  - `app/wallet/index.tsx`, `services/referrals.ts` (3 lugares)
  - `services/ratings.ts`, `services/support.ts`
  - `app/driver/dashboard.tsx`, `active-order.tsx`, `history.tsx`, `profile.tsx`
  - Previene error PGRST116 cuando no existen filas (ej: negocio nuevo)
- **UNIDADES DE PRODUCTO:** Sistema completo de unidades
  - `constants/units.ts` (NUEVO) - 10 unidades predefinidas + "Otra..." custom
  - `formatPriceWithUnit()` - Muestra "$250/kg", "$18/pieza", etc.
  - Selector de chips en add.tsx y edit/[productId].tsx
  - Menu y carrito muestran precio con unidad
  - Migration SQL ejecutada: `ALTER TABLE products ADD COLUMN unit VARCHAR(50) DEFAULT 'pieza'`
- **PERFIL PERSONAL DESDE NEGOCIO:**
  - `dashboard.tsx` - Boton "Mi Cuenta" (azul, icono User) → navega a `/profile`
  - `profile.tsx` - Link "Editar informacion personal" → navega a `/profile/edit`
- **COMPONENTE:** `BusinessImagePicker.tsx` (NUEVO) - Picker de logo/cover para negocio
- 24 archivos modificados/creados, +933 -49 lineas, repo pusheado

### 2026-02-11 (Sesion imagen de producto + Yessi IA)
- **IMAGEN DE PRODUCTO:** Upload completo con camara/galeria
  - `ProductImagePicker.tsx` - Componente reutilizable (preview 200px, modal fuente, boton X)
  - `image-upload.ts` - processImage (512x512 JPEG 85%) + upload a Supabase Storage
  - expo-image-manipulator instalado como dependencia
- **YESSI IA VISION:** Validacion de imagenes con Claude Haiku
  - `yessi-vision.ts` - Envia imagen + nombre a Claude Vision
  - Badge: verde "aprueba" / amarillo "sugiere revisar" / loader "analizando"
  - Re-valida con debounce 1s al cambiar nombre del producto
  - Permisivo con comida mexicana regional
  - `constants/anthropic.ts` - Config API (key en .env, no hardcodeada)
- **SUPABASE STORAGE:** Bucket `product-images` creado via SQL directo
  - Publico, 5MB max, JPEG/PNG/WebP
  - 3 politicas RLS (upload/view/delete)
  - Test de upload/download/delete verificado exitosamente
- **INTEGRACION:** add.tsx y edit/[productId].tsx modificados
  - ProductImagePicker como primera seccion (antes del nombre)
  - image_url se guarda en tabla products via createProduct/updateProduct
- **SEGURIDAD:** GitHub Push Protection bloqueo API key hardcodeada
  - Solucion: API key movida a `.env` (EXPO_PUBLIC_ANTHROPIC_API_KEY)
  - `.env` en .gitignore, no sube a Git
- 8 archivos modificados/creados, +791 lineas, repo pusheado

### 2026-02-07 (Sesion sonidos + diseño unificado)
- **SISTEMA DE SONIDOS:** expo-av integrado con Mixkit sounds
  - Sonidos suaves: login, logout, success, navigate, tap
  - Alertas fuertes: newOrder, orderReady, driverArrived
  - Emergencia: panic (siempre suena)
  - SoundSettings en perfil para preferencias usuario
- **DISEÑO UNIFICADO:** ScreenContainer aplicado a 47 pantallas
  - Dark mode: #1C1917 fondo, #292524 cards
  - Gradientes del logo: verde, naranja, azul, amarillo
  - Todo scrollea junto (sin headers fijos internos)
- 95 archivos modificados, +29,995 -11,081 lineas

### 2026-02-05 (Sesion auditoria)
- **AUDITORIA PRE-VUELO:** 78 issues encontrados, 45+ corregidos
- Migration SQL ejecutada en Supabase (columnas verificacion)
- expo-notifications fix para Expo Go (SDK 53+)
- ErrorBoundary global agregado
- 33 archivos modificados, ambos repos pusheados
- App lista para testing E2E

### 2026-02-04
- Migracion completa a Supabase + Firebase
- **LIMPIEZA PROFUNDA:** de 60,986 a 870 archivos (98.6% reduccion)
- Respaldo del servidor VM creado
- Bug Android corregido (TouchableOpacity en input)

### Commits recientes
```
rork-app:
f508165 fix: PGRST116 errors + product units + personal profile access from business
30264b2 feat: Product image upload with Yessi IA validation
9775197 feat: Complete business management tools - products CRUD, earnings, profile
4532970 feat: TouchableSound system, Yessi BI panel, sound overhaul
3cbfc4e feat: Add sound system + unified screen design
1daf777 fix: Pre-flight audit - 45+ issues fixed across 33 files

repo principal:
ea62ca6 docs: Pre-flight audit report + migration SQL executed
900bbb1 docs: Update Rork prompt with new cancellation flow
```

---

## PROXIMOS PASOS

1. **Dar info a Rork** para pruebas (2026-02-06)
2. **Pruebas E2E** - Probar flujo completo con Expo Go
3. **Pruebas de campo** - Tomatlan, Jalisco
4. **Ajustar segun feedback** - Iterar
5. **Integrar pagos** - Stripe/Conekta cuando sea necesario

---

## ARCHIVOS IMPORTANTES

### Documentacion (en Yesswera/)
- `DOCUMENTO_MAESTRO_YESSWERA_v2.md` - Especificaciones completas
- `ARQUITECTURA_TECNICA_YESSWERA.md` - Arquitectura tecnica
- `MEMORIA_SESION_*.md` - Memorias de cada sesion

### Credenciales (NO en Git)
- `Yesswera/.credentials/supabase.env`
- `Yesswera/.credentials/firebase.env`
- `Yesswera/.credentials/claude-api.env`
- `Yesswera/rork-app/.env` - EXPO_PUBLIC_ANTHROPIC_API_KEY
- `Yesswera/Credenciales Servidores.txt`

### Configuracion cloud (en rork-app/)
- `constants/supabase.ts`
- `constants/firebase.ts`
- `constants/anthropic.ts` - Lee key desde .env

### Respaldos
- `C:\claude\respaldo servidor yesswera\` - Servidor VM completo (112 archivos)
- `C:\respaldo claude\` - Archivos movidos hoy (126 elementos, incluye proyectos obsoletos)
- `C:\claude2\respaldo de claude\` - Archivos movidos anteriormente (88 archivos)

---

*Ultima actualizacion: 2026-02-12 sesion fix errores + unidades + perfil personal*
*Backend: Supabase + Firebase (NUBE) + Anthropic Claude (IA)*
*Storage: Supabase Storage (product-images bucket)*
*Plan B: Servidor VM listo para reactivar*
*Estado: Errores PGRST116 corregidos, unidades de producto implementadas, listo para pruebas E2E*
