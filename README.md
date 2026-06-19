# Mi Almacén

Aplicación móvil de gestión para almacenes, kioscos y despensas.
Diseñada para propietarios de pequeños comercios que necesitan controlar
su catálogo de productos, los fiados de clientes y su lista de precios.

---

## Características principales

- **Dashboard** — resumen de deuda total, clientes que deben y estado del catálogo
- **Productos** — alta, edición y eliminación con precio de venta automático (costo + margen + redondeo)
- **Fiados** — registro de créditos y cobros por cliente, historial de movimientos
- **Lista de precios PDF** — generación y compartición del catálogo agrupado por categoría
- **Categorías** — 9 categorías del sistema + categorías personalizadas
- **Configuración** — nombre del comercio, margen por defecto, redondeo por defecto, categoría por defecto

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

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /businesses/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
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
│   │   ├── (tabs)/          # Tabs: Inicio, Productos, Fiados, PDF, Config
│   │   ├── products/        # Alta y edición de producto
│   │   ├── customers/       # Alta y detalle de cliente
│   │   └── categories/      # Gestión de categorías
│   └── _layout.tsx          # Root layout + guard de autenticación
├── src/
│   ├── components/          # Componentes reutilizables
│   ├── context/             # AuthContext
│   ├── hooks/               # useProducts, useCustomers, useCategories…
│   ├── models/              # Tipos TypeScript (Product, Customer, etc.)
│   ├── services/            # Acceso a Firebase (products, customers…)
│   ├── theme/               # Paleta de colores y espaciado
│   ├── utils/               # Cálculo de precios, template PDF
│   └── constants/           # Categorías por defecto, colecciones Firestore
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

## Consideraciones de seguridad

- El archivo `.env` **no debe subirse al repositorio**. Está incluido en `.gitignore`.
- Las variables `EXPO_PUBLIC_*` quedan incluidas en el bundle compilado; son equivalentes a las credenciales de cliente web de Firebase (comportamiento estándar del Firebase JS SDK).
- Las **reglas de Firestore** son la capa de seguridad real: cada usuario solo puede leer y escribir su propio negocio.

---

## Limitaciones conocidas

- El error `getReactNativePersistence not exported` aparece solo en `tsc --noEmit` (tipado en entorno Node.js). En Metro/Expo Go funciona correctamente.
- La generación de PDF requiere entorno nativo; no funciona en la versión web.

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
