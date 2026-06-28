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
- **Lista de precios PDF** — generación del catálogo agrupado por categoría en formato PDF. Herramienta de control de precios para el dueño del negocio; accesible desde la pantalla Productos.
- **Lista inicial de productos** — al registrarse con el catálogo vacío, se ofrece importar 90 productos preconfigurados de almacén (costo y precio sugerido +40%). Los productos son reales: editables y borrables. La oferta no vuelve a aparecer después de aceptar o rechazar.
- **Categorías** — 10 categorías del sistema (Almacén, Bebidas, Lácteos, Carnes, Fiambrería, Verdulería, Limpieza, Higiene, Panadería, Otros) + categorías personalizadas
- **Configuración** — nombre del comercio, margen por defecto, redondeo por defecto, categoría por defecto
- **Onboarding inicial** — al registrarse, el usuario ve una guía de 4 pasos (abrir caja, crear cliente fiado, agregar producto, controlar lista de precios). Se muestra una sola vez. Desde Configuración se puede volver a ver sin que aparezca automáticamente.
- **Offline** — banner de sin conexión automático. Firebase encola escrituras simples durante caídas momentáneas y sincroniza al reconectar. Transacciones financieras fallan conscientemente sin red.
- **Exportar datos** — genera un JSON completo (productos, clientes, movimientos de fiados, historial de cajas) compartible por Drive, WhatsApp o email. Recordatorio semanal in-app si hace más de 7 días sin exportar.
- **Eliminar cuenta** — borra todos los documentos de Firestore en lotes y elimina la cuenta de Firebase Auth. Doble confirmación y manejo de sesión expirada.

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
| Persistencia local | @react-native-async-storage |
| UI | React Native StyleSheet (sin librerías de UI externas) |
| Build | EAS Build (expo-constants) |

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

## Reglas de Firestore recomendadas

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /businesses/{businessId} {
      allow read, create, update: if request.auth != null && request.auth.uid == businessId;

      match /products/{productId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == businessId;
      }

      match /categories/{categoryId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == businessId;
      }

      match /customers/{customerId} {
        allow read, create, update: if request.auth != null && request.auth.uid == businessId;

        match /movements/{movementId} {
          allow read, create: if request.auth != null && request.auth.uid == businessId;
        }
      }

      match /cashSessions/{sessionId} {
        allow read, create, update: if request.auth != null && request.auth.uid == businessId;

        match /cashMovements/{movementId} {
          allow read, create: if request.auth != null && request.auth.uid == businessId;
        }
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

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
│   │   └── categories/      # Gestión de categorías
│   ├── onboarding.tsx       # Guía inicial — se muestra una sola vez al registrarse
│   └── _layout.tsx          # Root layout + guard de autenticación
├── src/
│   ├── components/          # Componentes reutilizables (OfflineBanner…)
│   ├── context/             # AuthContext
│   ├── data/                # Datos estáticos (initialAlmacenProducts — lista inicial de 90 productos)
│   ├── hooks/               # useProducts, useCustomers, useCashSession, useNetworkStatus…
│   ├── models/              # Tipos TypeScript (Product, Customer, CashSession…)
│   ├── services/            # Firebase (products, customers, cash, exportData, deleteAccount, importInitialProducts…)
│   ├── theme/               # Paleta de colores y espaciado
│   ├── types/               # Declaraciones de tipos globales (env.d.ts)
│   ├── utils/               # Cálculo de precios, template PDF
│   └── constants/           # Categorías por defecto (10), colecciones Firestore
├── assets/                  # Íconos y splash
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
- Las **reglas de Firestore** son la capa de seguridad real: cada usuario solo puede leer y escribir su propio negocio.

---

## Limitaciones conocidas

- La generación de PDF requiere entorno nativo; no funciona en la versión web.

---

## Historial de versiones

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

## Licencia y derechos de autor

```
Copyright © 2026 Cristian Delgado
Correo: delgadocdev@hotmail.com
Ubicación: Maipú, Mendoza, Argentina

Todos los derechos reservados.

Este software es propiedad exclusiva de Cristian Delgado.
Queda prohibida su reproducción, distribución, modificación o uso
comercial sin autorización escrita previa del autor.
```
