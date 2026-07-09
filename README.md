# Mi Almacén

Aplicación móvil de gestión para almacenes, kioscos, verdulerías y despensas.
Diseñada para propietarios de pequeños comercios que necesitan controlar
su caja diaria, los fiados de clientes y su catálogo de productos.

---

## Características principales

- **Caja** — modelo de sesión de trabajo (no de día): apertura con saldo inicial, registro de ingresos por medio de pago, registro de gastos, cierre con resumen. Reapertura sin pérdida de datos. Alerta para sesiones de más de 36 horas. Historial de cajas con duración, saldo inicial y saldo final. Anulación de movimientos de ingreso y gasto mediante inversión auditada.
- **Dashboard** — card unificado con saldo de caja, deuda de fiados e inventario en tiempo real. Diseño de una sola pasada visual.
- **Fiados** — registro de créditos y cobros por cliente, historial de movimientos. Al cobrar un fiado con caja abierta, el ingreso se registra automáticamente en caja (transacción atómica). Anulación de movimientos mediante inversión auditada: se crea un movimiento inverso y el original queda marcado como ANULADO (no se eliminan datos).
- **Productos** — alta, edición y eliminación. Precio sugerido calculado automáticamente (costo + margen + redondeo) y precio de venta editable de forma independiente. Retrocompatible con productos existentes.
- **Lista de precios PDF** — generación del catálogo agrupado por categoría en formato PDF. Herramienta de control de precios para el dueño del negocio; accesible desde la pantalla Productos. Selector de categoría para generar el catálogo completo (default) o reimprimir una sola categoría (ej. solo "Bebidas"). Tipografía grande pensada para lectura rápida.
- **Lista inicial de productos** — al registrarse con el catálogo vacío, se ofrece importar 90 productos preconfigurados de almacén (costo y precio sugerido +40%). Los productos son reales: editables y borrables. La oferta no vuelve a aparecer después de aceptar o rechazar.
- **Categorías** — 10 categorías del sistema (Almacén, Bebidas, Lácteos, Carnes, Fiambrería, Verdulería, Limpieza, Higiene, Panadería, Otros) + categorías personalizadas
- **Configuración** — nombre del comercio, margen por defecto, redondeo por defecto, categoría por defecto
- **Onboarding inicial** — al registrarse, el usuario ve una guía de 4 pasos (abrir caja, crear cliente fiado, agregar producto, controlar lista de precios). Se muestra una sola vez. Desde Configuración se puede volver a ver sin que aparezca automáticamente.
- **Offline** — banner de sin conexión automático. Firebase encola escrituras simples durante caídas momentáneas y sincroniza al reconectar. Transacciones financieras fallan conscientemente sin red.
- **Exportar datos** — genera un JSON completo (productos, clientes, movimientos de fiados, historial de cajas) compartible por Drive, WhatsApp o email. Recordatorio semanal in-app si hace más de 7 días sin exportar.
- **Solicitud de eliminación de cuenta** — el usuario solicita el borrado desde Configuración; la solicitud queda registrada de forma no destructiva (`deletionRequest`, inmutable) y la cuenta sigue funcionando con normalidad hasta que el equipo de soporte confirme el borrado manualmente. La app no borra datos ni la cuenta de Firebase Auth por sí sola.
- **Identidad visual propia** — paleta de marca (Azul Puerto + Terracota Almacén), tipografía Manrope, sistema de componentes reutilizables (`src/components/ui/`) y diálogos de confirmación propios en reemplazo de las alertas nativas del sistema operativo. Pensada para usuarios de 40-70 años: textos grandes, alto contraste, zonas táctiles amplias. Ver `docs/BRANDING_E_ICONOS.md` para el ícono y los assets derivados.
- **Aviso de actualización** — la versión instalada (binario nativo, no el bundle JS) se muestra siempre en Configuración. Desde el panel admin se puede activar un aviso no bloqueante cuando hay una versión nueva disponible en la web propia (`appConfig/updateInfo` en Firestore, lectura pública / escritura solo admin). El aviso compara versiones numéricamente (no como texto), abre la web de descarga con "Actualizar ahora" y se puede posponer con "Ahora no" sin bloquear el uso de la app.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Expo SDK 54 (React Native 0.81.5) |
| Lenguaje | TypeScript 5.9.3 |
| Navegación | Expo Router 6.x (file-based) |
| Auth | Firebase Auth (Email/Password) |
| Base de datos | Cloud Firestore |
| SDK Firebase | Firebase JS SDK 12.x (modular) |
| PDF | expo-print + expo-sharing |
| Versión de la app | expo-application (con fallback a `Constants.expoConfig.version` en Expo Go/dev) |
| Persistencia local | @react-native-async-storage |
| UI | React Native StyleSheet + sistema de componentes propio (`src/components/ui/`), sin librerías de UI externas |
| Tipografía | Manrope (`@expo-google-fonts/manrope` + `expo-font`) |
| Build | EAS Build (expo-constants) |
| Backend admin | Cloud Functions callable (`functions/`, Node + Admin SDK) — panel admin interno, ver "Estado actual (SaaS)" |

---

## Requisitos

- Node.js 18 o superior
- npm 9 o superior
- Expo Go (SDK 54) instalado en el dispositivo Android o iOS
- Proyecto en Firebase con Auth y Firestore habilitados

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd MiNegocio
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Completar `.env` con las credenciales del proyecto Firebase:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=tu_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 4. Ejecutar la aplicación

```bash
npx expo start -c
```

Escanear el código QR con Expo Go desde el dispositivo móvil.

---

## Estado actual (SaaS)

Mi Almacén ya no es solo la app operativa — cada negocio tiene un plan que
determina qué puede hacer:

| Plan | Puede operar (crear/editar/borrar/registrar) |
|---|---|
| **Trial** (30 días desde el alta) | Sí, mientras esté vigente |
| **Pro** | Sí, sin vencimiento (mientras no tenga `proExpiresAt`) |
| **Solo lectura** | No — puede ver todos sus datos, no puede escribir |
| **Suspendido** | No — puede consultar, debe contactar soporte |

El plan pertenece al **negocio** (`businesses/{businessId}.plan`), no al
usuario. El enforcement real ocurre en Firestore Rules (no solo en la UI) —
ver `firestore.rules`, que es la única fuente de verdad del archivo de
reglas (no se copia su contenido en ningún documento).

Existe además un **panel de administración interno**, dentro de la misma
APK, visible solo para la cuenta con el custom claim `admin: true`
(concepto totalmente separado del plan Pro). Permite activar Pro, extender
trial, pasar a solo lectura, suspender o reactivar cualquier negocio, con
motivo obligatorio y auditoría de cada acción. El backend son 5 Cloud
Functions callable, ya desplegadas.

Detalle completo de arquitectura, decisiones y qué falta: `docs/SAAS_ROADMAP.md`.
Guía de operación/deploy: `docs/OPERACION_ADMIN_Y_DESPLIEGUE.md`.

---

## Estructura del proyecto

```
MiNegocio/
├── app/
│   ├── (auth)/              # Pantallas de login y registro
│   ├── (app)/
│   │   ├── (tabs)/          # Tabs: Inicio, Caja, Fiados, Productos, Config (5 tabs)
│   │   ├── cash/            # Caja: ingreso, gasto, cierre, movimientos, historial
│   │   ├── products/        # Alta, edición y Lista de precios (Stack screen)
│   │   ├── customers/       # Alta y detalle de cliente
│   │   ├── categories/      # Gestión de categorías
│   │   └── admin/           # Panel admin interno (solo custom claim admin:true) — resumen, negocios, detalle, configurar actualización
│   ├── onboarding.tsx       # Guía inicial — se muestra una sola vez al registrarse
│   ├── account-issue.tsx    # Pantalla de recuperación si users/businesses quedan inconsistentes
│   └── _layout.tsx          # Root layout + guard de autenticación + UpdateModal global
├── src/
│   ├── components/          # Componentes de dominio (CustomerCard, ProductCard, MovementItem, OfflineBanner, EmptyState, SearchBar, PlanBanner, UpdateModal…)
│   │   └── ui/               # Design system: Button, TextField, Card, Chip, IconChip, InlineMessage, ListRow, AmountDisplay, ConfirmDialog, Toast, ScreenHeader
│   ├── context/             # AuthContext (sesión, negocio en tiempo real, plan, admin)
│   ├── data/                # Datos estáticos (initialAlmacenProducts — lista inicial de 90 productos)
│   ├── hooks/               # useProducts, useCustomers, useCashSession, useNetworkStatus, usePlanStatus, useWriteGuard, useAppUpdateCheck…
│   ├── models/              # Tipos TypeScript (Product, Customer, CashSession, BusinessPlan, Admin*, AppUpdateInfo…)
│   ├── services/            # Firebase (products, customers, cash, exportData, deleteAccount, importInitialProducts, admin, appUpdate.service…)
│   ├── theme/               # Design tokens: paleta, tipografía (Manrope), spacing, radios, sombras
│   ├── types/               # Declaraciones de tipos globales (env.d.ts)
│   ├── utils/               # Cálculo de precios, template PDF, estado de plan (planStatus.ts), comparación de versiones (versionUtils.ts) y versión instalada (appVersion.ts)
│   └── constants/           # Categorías por defecto (10), colecciones Firestore
├── functions/               # Cloud Functions callable del panel admin (Node + Admin SDK, paquete npm separado)
├── scripts/                 # bootstrap-admin.mjs, migrate-existing-plans.mjs, generate-icons.html, tests de Rules y de Functions
├── docs/                    # Documentación profunda: SaaS, operación/deploy, branding
├── assets/                  # Íconos, splash e ícono maestro (icon.svg) — ver docs/BRANDING_E_ICONOS.md
├── firestore.rules          # Reglas de seguridad (fuente única de verdad, versionadas)
├── firestore.indexes.json   # Índices de Firestore
├── firebase.json            # Configuración de Firebase CLI (Rules, Functions, emuladores)
├── .env                     # Variables de entorno (no subir al repo)
├── .env.example             # Plantilla de variables
├── app.config.ts            # Configuración de Expo
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## Scripts disponibles

```bash
npm start          # Inicia el servidor de desarrollo (Expo Go)
npm run android    # Inicia apuntando a Android
npm run ios        # Inicia apuntando a iOS
```

Tests y emuladores (Firestore Rules, Cloud Functions) — detalle completo en
`docs/OPERACION_ADMIN_Y_DESPLIEGUE.md`:

```bash
npm run test:unit               # Tests unitarios puros
npm run test:rules:emulator     # Tests de Firestore Rules contra el emulador
npm run test:functions:emulator # Tests de Cloud Functions contra el emulador
```

---

## Build para distribución (EAS)

Requiere `eas-cli` instalado y sesión activa en Expo:

```bash
npm install -g eas-cli
eas login
```

### Generar APK (distribución interna)

```bash
eas build --profile preview --platform android
```

El APK resultante se descarga desde el dashboard de EAS y se instala directamente en el dispositivo (no requiere Play Store).

---

## Consideraciones de seguridad

- El archivo `.env` **no debe subirse al repositorio**. Está incluido en `.gitignore`.
- Las variables `EXPO_PUBLIC_*` quedan incluidas en el bundle compilado; son equivalentes a las credenciales de cliente web de Firebase (comportamiento estándar del Firebase JS SDK).
- Las **reglas de Firestore** (`firestore.rules`) son la capa de seguridad real: cada negocio solo puede leer y escribir sus propios datos, y solo puede escribir si su plan está activo (Pro o Trial vigente) — la UI bloquea antes por experiencia, pero el servidor rechaza igual si algo se salta la UI.
- El campo `plan` de un negocio es inmutable desde el cliente bajo cualquier circunstancia — solo se modifica vía las Cloud Functions del panel admin, nunca escribiendo Firestore directo desde la app.
- El custom claim `admin` (panel administrativo) solo lo asigna `scripts/bootstrap-admin.mjs` con credenciales fuera del repo — ningún cliente puede otorgárselo a sí mismo.
- `appConfig/updateInfo` (aviso de actualización) es de lectura pública a propósito — cualquier usuario, incluso sin sesión iniciada, necesita poder chequear si hay una versión nueva. La escritura está restringida al mismo custom claim `admin` que protege el panel administrativo.

---

## Limitaciones conocidas

- La generación de PDF requiere entorno nativo; no funciona en la versión web.
- Lista completa de pendientes reales del SaaS (panel web, cobro, multiusuario, etc.): ver `docs/SAAS_ROADMAP.md`.

---

## Historial de versiones

### v1.4.0 — 2026-07-08
- **Aviso de actualización** — nueva colección `appConfig/updateInfo` en Firestore (independiente de `businesses/`, sin owner): lectura pública, escritura solo con el custom claim `admin`. La versión instalada (`expo-application` → `Application.nativeApplicationVersion`, con fallback a `Constants.expoConfig.version` para Expo Go/dev) se muestra siempre en Configuración. Cuando el aviso está activo y la versión instalada es menor a la publicada (comparación numérica por partes, no como texto — `src/utils/versionUtils.ts`), aparece un diálogo no bloqueante (`UpdateModal`, montado globalmente en `app/_layout.tsx`) con botón "Actualizar ahora" (abre la web de descarga, nunca descarga directo desde la app) y "Ahora no" (lo oculta hasta el próximo reinicio). Configurable desde el panel admin en una pantalla nueva (`/admin/update-config`). Ver detalle en `DECISIONES_TECNICAS.md`, Fase 17.
- **Corrección — exportación de datos rota en SDK 54** — `expo-file-system` v19 reemplazó su API por defecto (nuevo modelo `File`/`Directory`) y movió la API anterior (`cacheDirectory`, `EncodingType`, `writeAsStringAsync`, que usa `exportBusinessData`) a `expo-file-system/legacy`. El import desactualizado rompía "Exportar mis datos (JSON)" con `Cannot read property 'UTF8' of undefined`. Corregido cambiando el import a `expo-file-system/legacy`.

### v1.3.0 — 2026-07-03
- **Rediseño UI/UX completo** — identidad visual propia sin modificar lógica de negocio ni navegación. Paleta nueva (primary `#0F4C81` "Azul Puerto", accent `#C2542D` "Terracota Almacén"), tipografía Manrope, escala tipográfica más grande para usuarios de 40-70 años, tokens de spacing/radio/sombra unificados. Sistema de componentes nuevo en `src/components/ui/` (Button, TextField, Card, Chip, IconChip, InlineMessage, ListRow, AmountDisplay, ConfirmDialog, Toast, ScreenHeader) que reemplaza estilos duplicados en cada pantalla. Las alertas nativas del sistema operativo (`Alert.alert`) se reemplazaron por `ConfirmDialog` propio en las confirmaciones destructivas (mismos flujos de negocio, distinta UI). Ver detalle completo en `DECISIONES_TECNICAS.md`.
- **Lista de precios por categoría** — nuevo selector en la pantalla de Lista de precios: por defecto genera el catálogo completo, o se puede elegir una sola categoría (ej. reimprimir solo "Bebidas") sin regenerar todo.
- **Tipografía del PDF más grande** — el nombre del producto y los precios se agrandaron en los tres niveles de escala automática (catálogos chicos, medianos y grandes), priorizando legibilidad rápida sobre entrar en menos páginas.
- **PDF con la identidad de marca** — la plantilla HTML del PDF (`pdfTemplate.ts`) pasó a usar los mismos tokens de color que la app en lugar de una paleta propia desconectada.

### v1.2.0 — 2026-06-28
- **Precio de venta editable** — los productos tienen ahora dos precios diferenciados: `suggestedPrice` (calculado automáticamente por costo + margen + redondeo, solo lectura) y `salePrice` (editable por el dueño). Al crear o editar un producto, el precio de venta se sincroniza automáticamente con el sugerido a menos que el usuario lo modifique. Se muestra un botón para volver al sugerido en cualquier momento. El PDF y las tarjetas de producto usan `salePrice`. Retrocompatible con productos existentes.
- **Anulación de movimientos** — tanto los movimientos de fiado/cobro (clientes) como los de ingreso/gasto (caja) se pueden anular. La anulación crea un movimiento inverso en la misma subcolección, marca el original con `annulled: true` y corrige el saldo en una transacción atómica. Los movimientos anulados muestran el badge **ANULADO** en gris. No se eliminan datos del historial.
- **Corrección de onboarding** — el paso 4 dejaba de entender que el PDF era para compartir con clientes. Ahora describe correctamente que la lista de precios es una herramienta de control del dueño del negocio.

### v1.1.2
- Lista inicial de 90 productos preconfigurados de almacén con costo y precio sugerido (+40% margen)
- Tab Fiambrería
- Navegación con 5 tabs

### v1.1.1
- Caja v2: modelo de sesión de trabajo (no de día), reapertura sin pérdida de datos, alerta para sesiones de más de 36 horas, historial de cajas

### v1.0.1
- Caja Diaria v1: apertura, registro de ingresos y gastos, cierre con resumen, historial de movimientos

---

## Documentación más profunda

| Documento | Contenido |
|---|---|
| `docs/SAAS_ROADMAP.md` | Fuente de verdad del SaaS: fases, arquitectura de planes, Rules, Cloud Functions, panel admin, estado de despliegue, pendientes reales. |
| `DECISIONES_TECNICAS.md` | Por qué se tomó cada decisión técnica, fase por fase. |
| `docs/OPERACION_ADMIN_Y_DESPLIEGUE.md` | Cómo correr emuladores, tests, desplegar y operar el panel admin. |
| `docs/BRANDING_E_ICONOS.md` | Identidad visual, ícono maestro y cómo regenerar los assets derivados. |
| `MANUAL_USUARIO.md` | Manual para el usuario final de la app. |
| `ROADMAP.md` | Historial de fases del producto (features de la app, no del SaaS). |

---

## Licencia y derechos de autor

```
Copyright © 2026 Cristian Delgado
Web: www.delgadodev.com.ar
Ubicación: Maipú, Mendoza, Argentina

Todos los derechos reservados.

Este software es propiedad exclusiva de Cristian Delgado.
Queda prohibida su reproducción, distribución, modificación o uso
comercial sin autorización escrita previa del autor.
```
