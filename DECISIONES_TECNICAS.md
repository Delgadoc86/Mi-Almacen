# Decisiones técnicas

## Stack

- **Expo SDK 56 + React Native 0.85** para builds Android/iOS y acceso a EAS.
- **TypeScript estricto** desde el inicio: seguridad en cálculos de precios, modelos Firestore y futuras funciones SaaS.
- **Expo Router** como única estrategia de navegación. No mezclar con React Navigation manual.
- **StyleSheet propio** con componentes reutilizables. Sin React Native Paper ni librerías de UI externas por ahora.
- **@expo/vector-icons (Ionicons)** para íconos de tab bar — incluido en el SDK Expo, sin dependencia extra.

---

## Configuración de app

- `app.config.ts` en lugar de `app.json`: permite lógica dinámica futura (variables de entorno, overrides por ambiente).
- `scheme: 'mialmacen'` configurado para deep linking y Expo Router.
- Splash usa `splash-icon.png` con fondo `#F8FAFB` (mismo que el background del theme).

---

## Path aliases

- `@/*` apunta a `src/*` via `tsconfig.json` (`baseUrl: ".", paths: { "@/*": ["src/*"] }`).
- Con Expo SDK 50+, Metro resuelve los path aliases del tsconfig nativamente sin plugins adicionales.
- Todos los imports usan `@/` en lugar de rutas relativas para escalar sin fricción.

---

## Navegación (Expo Router — grupos de rutas)

- `app/(auth)/` → rutas públicas (login, register). Stack sin header.
- `app/(app)/` → rutas protegidas (tabs). Solo accesible con sesión activa.
- `app/_layout.tsx` → root layout con `AuthProvider` + `RootGuard` que redirige según estado de Auth.
- Los grupos con paréntesis son transparentes en la URL — `/login` y `/(auth)/login` son equivalentes.

---

## Firebase (Fase 2)

### Por qué Firebase JS SDK (modular) y no @react-native-firebase

- El proyecto usa **Expo Managed Workflow** — `@react-native-firebase` requiere bare workflow o prebuild con native modules.
- El **Firebase JS SDK v11/v12 modular** funciona con Metro en Expo sin configuración extra.
- API tree-shakeable, tipado completo, path de upgrade claro.

### Por qué AsyncStorage para persistencia de sesión

- Firebase Auth en React Native no tiene acceso a `localStorage` ni `IndexedDB` (APIs de browser).
- `getReactNativePersistence(AsyncStorage)` es el mecanismo oficial de Firebase para persistir sesión en React Native.
- Sin esto, `onAuthStateChanged` devuelve `null` en cada reinicio de la app.
- `expo-secure-store` agregaría complejidad (implementar `Persistence` custom) sin beneficio concreto en Fase 2.

### Nota de versión: Firebase 12 + getReactNativePersistence

- Se instaló **Firebase 12.15.0** (versión resolvida por npm para Expo SDK 56).
- En Firebase 12, `getReactNativePersistence` NO está en el bundle Node (`dist/node/index.js`).
- Pero **SÍ está en el bundle React Native** (`dist/rn/index.js`) al que Metro resuelve automáticamente usando el campo `"react-native"` del `package.json` de `@firebase/auth`.
- Prueba con `node -e "require('firebase/auth')"` da `undefined` — es normal, usa el resolver Node, no Metro.
- En la app con Expo/Metro, el import `from 'firebase/auth'` resuelve el bundle correcto.

---

## Estructura Firestore

### Por qué businessId === uid en Fase 2

- Relación 1 usuario : 1 negocio en el modelo actual.
- Usar `uid` como `businessId` hace los writes **idempotentes** (mismo path = no duplicados).
- Simplifica las reglas de seguridad: no hace falta un índice adicional para encontrar el negocio del usuario.

### Cómo escalar a multi-negocio en el futuro

- Generar un `businessId` con `doc(collection(db, 'businesses')).id` en lugar de usar `uid`.
- Agregar un array `businessIds: string[]` en `users/{uid}`.
- Actualizar las reglas de seguridad para verificar membresía al array.
- Migración de datos: crear un script que copie el campo `id` de `businesses/{uid}` a `businesses/{nuevoId}` y actualice el user profile.

### Limitaciones actuales (Fase 2)

- Un usuario = un negocio.
- No hay roles ni permisos internos.
- `business.name` viene del formulario de registro; no hay pantalla de edición todavía.
- Sin validación de email (Firebase envía correo de verificación si se configura, pero no está activado).

---

## Anti-duplicados en Firestore

- `createUserAndBusiness`: usa `writeBatch` con `set` limpio (no merge). Se llama UNA VEZ en el registro.
- `repairIncompleteRegistration`: usa lógica diferenciada — si el doc no existe lo crea con `createdAt`; si existe pero el otro doc falta, usa `merge: true` sin tocar `createdAt`.
- El flujo de `login()` llama a `repairIncompleteRegistration` para cubrir registros incompletos (Firestore batch falló, Auth user existe).
- `isRegistering` ref en `AuthContext` previene que `onAuthStateChanged` compita con el flow de registro antes de que el batch esté commiteado.

---

## Componentes

- `ScreenContainer` usa `SafeAreaView` de `react-native-safe-area-context` con `edges={['top','left','right']}` para evitar doble padding en la parte inferior cuando hay tab bar activo.
- Expo Router envuelve la app en `SafeAreaProvider` automáticamente.

---

## Google Play

- Package name: `com.delgadodev.mialmacen`.
- Permisos mínimos: array vacío en `app.config.ts`.
- Sin cámara, ubicación, micrófono ni accesos innecesarios.

---

## Fase 3 — Productos CRUD

### Navegación: Stack sobre Tabs

- `app/(app)/_layout.tsx` se convierte en un **Stack** (en lugar de Tabs directo).
- `app/(app)/(tabs)/_layout.tsx` contiene el Tabs con todas las pestañas.
- `app/(app)/products/new.tsx` y `app/(app)/products/[id].tsx` son pantallas del Stack de `(app)`, por lo que se renderizan **sin tab bar** — experiencia de edición sin distracciones.
- Al navegar de la lista a un formulario, el Stack de `(app)` empuja la pantalla sobre `(tabs)`.

### Categorías — seed idempotente con IDs fijos

- Subcollection: `businesses/{uid}/categories/{id}`.
- IDs fijos: `almacen`, `bebidas`, `lacteos`, `carnes`, `verduleria`, `limpieza`, `higiene`, `panaderia`, `otros`.
- `getOrSeedCategories(businessId)`: si `snap.size >= 9`, devuelve los docs tal cual (sin escribir nada). Si faltan docs (seed interrumpido), corre un `writeBatch` con `setDoc(..., { merge: true })` sobre los 9 IDs fijos.
- `setDoc + merge:true + ID fijo` = **nunca crea duplicados**, aunque se llame N veces. El ID determina el doc.
- El seed se ejecuta en cada montaje de la pantalla Productos, pero el early-exit evita escrituras innecesarias en el caso normal.
- Sin UI de edición de categorías en Fase 3.
- Preparado para Fase futura: `order` ya está en el modelo.

### Redondeo por producto

- Campo `roundTo: RoundTo` en cada producto — valores permitidos: `1 | 5 | 10 | 50 | 100` (ARS).
- Fórmula: `Math.round(precioRaw / roundTo) * roundTo`.
- No hay redondeo global; cada producto decide su granularidad para adaptarse a distintos rubros.

### Cálculo de precio por tipo de producto

**Unidad** (tipo por defecto):
```
precio = round(cost * (1 + margin / 100), roundTo)
```

**Pack** (caja con N unidades):
```
costoUnitario = cost / unitsPerPack
precio = round(costoUnitario * (1 + margin / 100), roundTo)
```
- `unitsPerPack` es obligatorio y debe ser > 0 si type = 'pack'.
- El precio que se muestra y guarda es el **precio unitario de venta** (no el del pack completo).

**Peso** (venta a granel):
- Campos del modelo: `unit: 'kg' | 'g'`, `saleUnitLabel?: string`, `baseWeightGrams?: number`.
- En Fase 3, el cálculo es igual a Unidad (`price = round(cost * (1 + margin/100), roundTo)`).
- Los campos adicionales están en el modelo para preparar el cálculo por fracción (Fase futura).

### Campos `updatedAt` en Firestore

- Todos los productos usan `Timestamp` (no string) para `createdAt` y `updatedAt`.
- `updatedAt` se actualiza automáticamente en `updateProduct` via `serverTimestamp()`.
- Preparado para ordenar por última modificación en Fases futuras.

### Búsqueda y filtrado (local)

- `onSnapshot` mantiene la lista de productos sincronizada en tiempo real.
- El filtrado por nombre, categoría y tipo se hace **en memoria** sobre la lista ya descargada.
- Sin índice compuesto en Firestore: la query solo ordena por `name`. El filtro es local.
- Acceptable para catálogos de hasta ~500 productos; en Fases futuras se puede migrar a query compuesta con índice si el volumen lo justifica.

### Limpieza de campos por tipo al editar

Al guardar cambios en un producto existente, `[id].tsx` limpia campos huérfanos usando `deleteField()` de Firestore:

- **Pack → cualquier otro tipo**: se envía `unitsPerPack: deleteField()` → el campo se elimina del documento.
- **Peso → cualquier otro tipo**: se envían `unit: deleteField()`, `saleUnitLabel: deleteField()`, `baseWeightGrams: deleteField()`.
- `updateProduct` acepta `UpdateData<Product>` (tipo Firebase) que permite `FieldValue` en cualquier campo.
- En la creación (`new.tsx`) no aplica: los campos opcionales simplemente no se incluyen.

### Limitaciones Fase 3

- No se puede editar ni crear categorías desde la UI.
- El tipo 'peso' no calcula por fracción de peso (simplificado igual a 'unidad').
- No hay imagen de producto.
- No hay gestión de stock.

### Preparado para Fase 6 (PDF / lista de precios)

- Cada producto ya tiene `price` calculado y `categoryId` — suficiente para generar un PDF agrupado por categoría.
- El campo `order` en categorías permite ordenar secciones del PDF.
- El tipo `RoundTo` garantiza precios "limpios" en la lista impresa.

### Reglas de seguridad Firestore

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Cada usuario solo accede a su propio perfil
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Negocio: el dueño puede crear, leer y actualizar, NUNCA borrar
    match /businesses/{businessId} {
      allow read, create, update: if request.auth != null && request.auth.uid == businessId;

      // Productos: CRUD completo solo para el dueño
      match /products/{productId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == businessId;
      }

      // Categorías: CRUD completo solo para el dueño
      match /categories/{categoryId} {
        allow read, create, update, delete: if request.auth != null && request.auth.uid == businessId;
      }
    }

    // Catch-all: denegar todo lo que no matchea explícitamente
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Por qué no se puede borrar `businesses`:** Es el doc raíz que contiene el historial del comercio. Un borrado accidental lo dejaría inutilizable. Si en el futuro se necesita "baja de cuenta", se implementa como `status: 'inactive'` en el documento.

---

## Fase 4 — Fiados

### Modelo de datos

**Customer** (`businesses/{uid}/customers/{id}`):
- `name: string` — obligatorio
- `phone?: string` — opcional, para WhatsApp o contacto futuro
- `balance: number` — **siempre ≥ 0**. Positivo = el cliente debe. Cero = al día. Nunca negativo.
- `createdAt: Timestamp`, `updatedAt: Timestamp`

**Movement** (subcollection `customers/{customerId}/movements/{id}`):
- `type: 'fiado' | 'pago'`
- `amount: number` — siempre positivo
- `description?: string` — descripción libre opcional
- `balanceAfter: number` — saldo del cliente DESPUÉS de este movimiento (snapshot del saldo)
- `createdAt: Timestamp`

### Por qué no se permiten saldos negativos

El balance representa deuda del cliente hacia el comercio. Un balance negativo significaría que el comercio le debe al cliente (anticipo). En Fase 4 eso no aplica y genera confusión en comerciantes de la franja etaria objetivo. Bloqueado a nivel de transacción.

### Pagos mayores al saldo: bloqueados en transacción

La validación `if (newBalance < 0)` ocurre DENTRO de `runTransaction`, con el saldo leído en el mismo contexto transaccional. Así no puede haber race condition: si dos pagos concurrentes intentan reducir el saldo, el segundo verá el saldo ya actualizado por el primero y fallará si lo lleva a negativo.

### Por qué runTransaction y no writeBatch

`writeBatch` es ciego: no lee datos antes de escribir. Para calcular `balanceAfter` correctamente y validar que el pago no supere el saldo, se necesita leer el balance actual. `runTransaction` garantiza que la lectura y la escritura son atómicas — si otro cliente modificó el saldo entre la lectura y la escritura, la transacción falla y se reintenta automáticamente.

### Movimientos inmutables

Una vez registrado, un movimiento no se edita ni elimina. Si el comerciante cometió un error, registra un nuevo movimiento de corrección (fiado o pago) con descripción explicativa. Esto preserva el historial completo y el `balanceAfter` de cada entrada sigue siendo consistente con la secuencia de movimientos.

### Historial: últimos 50 movimientos

Query: `orderBy('createdAt', 'desc') + limit(50)`. Cubre el uso cotidiano de un comercio pequeño. Si un cliente tiene más de 50 movimientos, los más viejos no se muestran (pero existen en Firestore). Se puede agregar paginación en Fase futura con `startAfter`.

### Reglas Firestore para Fiados

Extender las reglas existentes de `businesses/{businessId}`:

```js
match /customers/{customerId} {
  allow read, create, update: if request.auth != null && request.auth.uid == businessId;
  // delete NOT allowed — preservar historial

  match /movements/{movementId} {
    allow read, create: if request.auth != null && request.auth.uid == businessId;
    // update y delete NOT allowed — movimientos inmutables
  }
}
```

**Por qué no se puede borrar customers:** Borrar un cliente borraría toda su subcollection de movimientos (en Firestore esto requiere borrado manual de cada doc hijo, pero conceptualmente es destructivo). En Fase futura se puede marcar como `archived: true`.

### Navegación

Mismo patrón Stack sobre Tabs que Productos:
- `(tabs)/customers.tsx` — lista con búsqueda y totalizador
- `customers/new.tsx` — formulario de creación (sin tab bar)
- `customers/[id].tsx` — detalle: balance + formulario inline + historial (sin tab bar)

El título del Stack de `customers/[id]` se sobreescribe dinámicamente con `<Stack.Screen options={{ title: customer.name }} />` dentro del componente.

---

## Fase 5 — PDF / Lista de precios

### Por qué expo-print + expo-sharing

- **Expo Managed Workflow**: no se puede usar `react-native-html-to-pdf` ni otras libs nativas sin eject.
- **expo-print**: oficial del SDK Expo, convierte un string HTML a un archivo PDF via WebView del sistema. Devuelve un `uri` (`file://`) listo para compartir.
- **expo-sharing**: abre el share sheet nativo del SO (WhatsApp, Drive, Gmail, etc.) con el archivo.
- No se necesita `expo-file-system`: el `uri` que devuelve `expo-print` puede pasarse directamente a `expo-sharing.shareAsync()`.
- `expo-sharing` requiere el plugin en `app.config.ts` para configurar el FileProvider en Android.

### Por qué incluimos costo y no solo el precio de venta

La lista de precios en este contexto es un documento de trabajo interno del comercio, no un catálogo para el público. El comerciante necesita comparar costo vs venta para:
- Verificar que el margen sigue siendo correcto cuando los precios de costo cambian
- Detectar rápidamente si algún producto tiene un margen inconsistente

Si se necesita una versión pública (sin costos), se implementa en Fase futura como una opción de exportación separada.

### Por qué no mostramos margen por fila

Mostrar margen por fila agregaría una cuarta columna que haría la tabla demasiado densa. La información relevante es costo vs venta — el margen se infiere visualmente. Se muestra en el encabezado solo si es uniforme para todos los productos, como indicador rápido.

### Por qué no mostramos tipo de producto

El tipo (Unidad/Pack/Peso) es ruido visual en una lista de precios. El comerciante ya conoce sus productos. El objetivo del PDF es respuesta rápida a "¿cuánto cuesta esto?", no descripción del producto.

### Estructura del PDF

- Título: `business.name` + "Lista de precios"
- Meta: fecha de generación (día de la generación, no `updatedAt` de ningún doc)
- Secciones: una por categoría, ordenadas por `category.order`, vacías omitidas
- Columnas: Producto (izq) · Costo (der, gris) · Precio venta (der, negrita)
- Productos sin categoría conocida: sección "Sin categoría" al final
- Productos dentro de cada categoría: orden alfabético por nombre
- Footer: "Mi Almacén"
- Sin número de página automático (limitación de expo-print / CSS paged media)

### Limitaciones Fase 5

- Sin vista previa del PDF en pantalla.
- Sin selector de categorías (se incluyen todas).
- Sin guardar el PDF permanentemente en el dispositivo (solo share temporal).
- Sin personalización de columnas, logo ni encabezado adicional.
- Número de página no disponible (expo-print no soporta `counter(page)` CSS en todos los dispositivos).
- El PDF se genera desde los datos ya cargados en memoria (hooks activos); si el comerciante no ha abierto la pantalla de Productos en esta sesión, los datos podrían no estar disponibles. Mitigado: `useProducts` y `useCategories` se ejecutan siempre que la tab está montada.

---

## Fase 6 — Configuración

### Categorías del sistema (locked)

Las 9 categorías por defecto tienen `system: true` y `locked: true` en Firestore (IDs: almacen, bebidas, lacteos, carnes, verduleria, limpieza, higiene, panaderia, otros).

**Por qué son inmutables:** Mantienen consistencia en todo el sistema. Futuras funcionalidades (reportes, métricas, filtros) pueden asumir que estas categorías siempre existen.

**Detección en cliente:** Se verifica con `DEFAULT_CATEGORY_IDS.has(cat.id) || cat.system === true`. Los IDs fijos son la fuente de verdad; el campo `system` en Firestore es secundario para retrocompatibilidad.

**Visualización:** Ícono de candado (`lock-closed-outline`) en lugar de botón de borrar.

### Categorías personalizadas

El usuario puede crear categorías propias via `createCategory(businessId, name)`:
- `system: false`, `locked: false`
- `order` = máximo orden existente + 1 (siempre al final de la lista)

**Borrado bloqueado con productos:** `getCategoryProductCount(businessId, categoryId)` cuenta productos con ese `categoryId`. Si count > 0, se muestra el mensaje con el conteo exacto y se bloquea el borrado. No se mueven productos automáticamente — el comerciante decide a qué categoría reasignarlos.

**Por qué no reasignar automáticamente a "Otros":** Un cambio masivo invisible puede silenciar errores de organización. El comerciante debe tomar la decisión explícitamente.

### Business model — campos nuevos

```typescript
type Business = {
  defaultMargin?: number;      // 0-500, % de margen por defecto para nuevos productos
  defaultRoundTo?: RoundTo;    // 1|5|10|50|100, redondeo por defecto
  defaultCategoryId?: string;  // ID de categoría por defecto
  plan?: Plan;                 // 'free' | 'pro' — preparado para SaaS, no usado aún
};
```

Todos los campos nuevos son **opcionales** para mantener compatibilidad con documentos existentes.

### Preferencias por defecto — flujo

1. Comerciante configura valores en Settings → se guardan en `businesses/{uid}`
2. Al abrir "Nuevo producto", los `useState` se inicializan desde `business.defaultMargin`, `business.defaultRoundTo`, `business.defaultCategoryId`
3. El producto creado puede tener valores diferentes (el usuario puede cambiarlos en el form)
4. Las preferencias son **valores iniciales**, no restricciones

**Limpieza de valores obsoletos:** `updateBusinessPreferences` usa `deleteField()` cuando el usuario deja un campo vacío o deselecciona. Esto evita que valores stale permanezcan en Firestore indefinidamente.

### Límite de margen por defecto

- Mínimo: 0% (sin margen negativo)
- Máximo: 500% (`DEFAULT_MARGIN_MAX`)
- Razón: un margen > 500% es casi siempre un error de tipeo. No existe validación de máximo en los márgenes por producto, pero el default tiene un tope razonable.

### refreshBusiness en AuthContext

`refreshBusiness()` re-fetches `getBusiness(uid)` desde Firestore y actualiza el estado local del contexto. Se llama desde Settings después de cualquier `updateBusiness` o `updateBusinessPreferences`.

No se usa `onSnapshot` en el business document porque el negocio solo se edita desde Settings (un único punto de escritura) y un re-fetch explícito post-save es suficiente.

### useCategories — onSnapshot

`useCategories` se migró de one-shot a `getOrSeedCategories → subscribeToCategories → onSnapshot`. Así, al agregar o eliminar una categoría custom, la lista en `new.tsx`, `products.tsx` y `settings.tsx` se actualiza en tiempo real.

### Navegación — pantalla de categorías

`app/(app)/categories/index.tsx` se registra en el Stack de `(app)` como `name="categories/index"`. Acceso desde settings: `router.push('/categories')`. Sin tab bar, mismo patrón que productos y clientes.

### Reglas Firestore

Las reglas no cambian en Fase 6. La protección de categorías locked es **client-side**. Si en el futuro se requiere server-side, agregar en las rules: `allow delete: if !resource.data.locked;`

### Limitaciones Fase 6

- No se pueden renombrar categorías (ni sistema ni custom).
- No se puede reordenar categorías manualmente.
- `plan` está en el modelo pero no se usa en UI ni lógica de negocio todavía.

---

## Fase 7 — Auth, Login y Seguridad

### Persistencia de sesión

- `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` reemplaza `getAuth(app)` en `firebase.ts`.
- Con `getAuth`, Firebase usaba persistencia en-memoria: `onAuthStateChanged` devolvía `null` en cada reinicio.
- Con `initializeAuth + AsyncStorage`, la sesión sobrevive reinicios de app. El usuario no necesita escribir email/contraseña en cada apertura.
- Hot-reload: `initializeAuth` lanza `auth/already-initialized` si se llama dos veces sobre el mismo `app`. Se captura y se llama `getAuth(app)` como fallback para obtener la instancia ya inicializada.

### Verificación de email

- `registerWithEmail` llama `sendEmailVerification(user)` después de `createUserWithEmailAndPassword`.
- Los docs de Firestore (`users`, `businesses`) se crean inmediatamente (sin esperar verificación) para que el negocio esté listo cuando el usuario activa la cuenta.
- `RootGuard` en `app/_layout.tsx` detecta `firebaseUser && !emailVerified` y redirige a `/(auth)/verify-email`.
- La pantalla `verify-email.tsx` ofrece: "Ya verifiqué" (llama `reloadUser()` + `recheckEmailVerified()`), "Reenviar" (con cooldown de 60s), "Usar otra cuenta" (logout).
- Usuarios existentes sin verificar quedarán en `verify-email` hasta que activen su correo — es el comportamiento correcto.

### Recuperación de contraseña

- `sendPasswordReset(email)` envuelve `sendPasswordResetEmail(auth, email)` de Firebase.
- En `login.tsx`: link "Olvidé mi contraseña" en el campo contraseña (right-aligned) abre un formulario inline dentro de la misma pantalla (sin nueva ruta).
- El formulario prellenado con el email del campo login. Muestra success/error inline sin Alert.
- Firebase envía el email de recuperación directamente — no hay lógica adicional del lado del cliente.

### Último ingreso

- `updateLastLogin(uid)` hace `updateDoc` con `lastLoginAt: serverTimestamp()` en `users/{uid}`.
- Se llama en `login()` del AuthContext (fire-and-forget con `.catch(() => {})` para no bloquear el login si falla).
- `UserProfile.lastLoginAt?: Timestamp` — opcional para compatibilidad con docs existentes.
- Se muestra en la sección CUENTA de Settings como "Último ingreso: hoy 17:10 / ayer 09:30 / DD/MM HH:MM".
- No se actualiza en el registro (primera sesión coincide con `createdAt`).

### Biometría mediante sistema operativo

- Paquetes: `expo-local-authentication` (biometric prompt) + `expo-secure-store` (almacenamiento seguro).
- Al hacer login con email/contraseña, se guarda el email en SecureStore con clave `biometric_user_email`. Se borra al hacer logout.
- En la pantalla login, se verifica: `LocalAuthentication.hasHardwareAsync()` + `isEnrolledAsync()` + `SecureStore tiene email guardado`. Si los tres son true → se muestra el botón "Entrar con huella".
- El botón lanza `LocalAuthentication.authenticateAsync()`. Si tiene éxito → llama `refreshSession()` que verifica si `auth.currentUser` tiene sesión activa en Firebase. Si la sesión persiste (no hubo logout explícito) → el usuario entra sin tipear nada.
- Si la sesión venció (logout explícito o token expirado) → mensaje "La sesión venció. Ingresá con tu contraseña." — sin reintentos con credenciales guardadas porque NO se guardan contraseñas.
- iOS: `NSFaceIDUsageDescription` configurado en `app.config.ts`.
- Android: permisos `USE_BIOMETRIC` y `USE_FINGERPRINT` manejados automáticamente por el plugin.

### No se guarda la contraseña

- Solo se almacena el **email** en SecureStore (para prellenar el campo y mostrar la opción biométrica).
- Ningún token de Firebase, ninguna contraseña, ningún refresh token se guarda manualmente — Firebase los gestiona internamente via AsyncStorage.

### Mapeo de errores Firebase → mensajes usuario

| Código Firebase              | Mensaje visible                               |
|------------------------------|-----------------------------------------------|
| `auth/invalid-credential`    | Email o contraseña incorrectos.               |
| `auth/too-many-requests`     | Demasiados intentos. Intentá más tarde.       |
| `auth/user-not-found`        | No existe una cuenta con ese email.           |
| `auth/wrong-password`        | Contraseña incorrecta.                        |
| `auth/invalid-email`         | Email inválido.                               |
| `auth/network-request-failed`| Sin conexión. Verificá tu internet.           |
| `auth/user-disabled`         | Esta cuenta fue desactivada.                  |
| `auth/email-already-in-use`  | Ya existe una cuenta con ese email.           |
| `auth/weak-password`         | La contraseña es muy débil (mín. 6 chars).    |
| Cualquier otro               | Ocurrió un error. Intentá de nuevo.           |

Los errores se muestran inline en el formulario (no como `Alert.alert`).

### Intentos fallidos

- Contador local `failedAttempts` en `login.tsx`, incrementado en cada `catch`.
- Después de 3 intentos fallidos, se muestra un hint con fondo ámbar: "¿Olvidaste tu contraseña? Podés recuperarla aquí." con link al formulario de recuperación.
- Sin bloqueo de cuenta manual — Firebase maneja `auth/too-many-requests` automáticamente.
- El contador se resetea implícitamente al montar la pantalla (no persiste entre sesiones).

### Nuevas dependencias

| Paquete                  | Versión (SDK 54) | Uso                                       |
|--------------------------|-----------------|-------------------------------------------|
| `expo-local-authentication` | compatible SDK 54 | Biometric prompt nativo                |
| `expo-secure-store`      | compatible SDK 54  | Email guardado de forma segura            |

---

## Mejoras Módulo Fiados (post Fase 4)

### `Customer.reference` — nota de identificación (opcional)

Campo `reference?: string` en el modelo `Customer`.

Permite agregar una referencia libre para identificar al cliente en un negocio de barrio donde el nombre solo puede no ser suficiente.  
Ejemplos: "Doña Pocha, vecina de la esquina", "hijo de Marta", "mecánico del taller".

- Máximo 80 caracteres (validado en formulario).
- No es obligatorio; clientes existentes sin `reference` funcionan sin cambios.
- Se muestra en la tarjeta de detalle del cliente, debajo del teléfono, solo si existe.

---

### `Movement.paymentMethod` — método de cobro (solo pagos)

Tipo `PaymentMethod = 'efectivo' | 'transferencia' | 'mercado_pago' | 'otro'`.

Campo `paymentMethod?: PaymentMethod` en el modelo `Movement`.

- Solo se guarda en Firestore cuando `type === 'pago'`. Los fiados no lo incluyen.
- El selector aparece únicamente en el formulario de cobro.
- Valor por defecto al abrir el formulario: `'efectivo'`. Se resetea al cerrar.

**Métodos iniciales soportados:**

| Valor interno   | Etiqueta visible    |
|-----------------|---------------------|
| `efectivo`      | Efectivo            |
| `transferencia` | Transferencia       |
| `mercado_pago`  | Mercado Pago / QR   |
| `otro`          | Otro                |

**Compatibilidad con datos existentes:**

- Clientes sin `reference`: campo ausente en Firestore → `undefined` en TypeScript → UI no renderiza nada. Sin migración.
- Movimientos viejos sin `paymentMethod`: campo ausente → `MovementItem` muestra "Pago" sin método. Sin migración.
- No se modificaron reglas de Firestore.

---

## Caja Diaria (Fase 8)

### Modelo de datos

**CashSession** (`businesses/{uid}/cashSessions/{id}`):
- `date: string` — `"YYYY-MM-DD"`. Clave de búsqueda del día. Un solo doc por día (validado al abrir).
- `openingBalance: number` — monto en caja al momento de abrir.
- `status: 'open' | 'closed'`
- `summary` — totales denormalizados, actualizados con `increment()` en cada movimiento:
  - `totalIngresos`, `totalEgresos`
  - `efectivo`, `mercadoPago`, `transferencia`, `otro` (desglose de ingresos por medio de pago)
  - `movementsCount`
- `closedAt?: Timestamp` — se escribe al cerrar.
- `createdAt: Timestamp`

**CashMovement** (subcollection `cashSessions/{sessionId}/cashMovements/{id}`):
- `type: 'ingreso' | 'egreso'`
- `amount: number` — siempre positivo
- `medioPago?: PaymentMethod` — solo en ingresos
- `description?: string` — obligatoria en egresos, opcional en ingresos
- `createdAt: Timestamp`

### Por qué `date` es string y no Timestamp

La query del día es `where('date', '==', today)` donde `today = "YYYY-MM-DD"`. Un Timestamp requeriría comparar rangos (`>= inicio del día` y `< inicio del día siguiente`) con conversión de zona horaria. El string ISO es determinista, simple y evita el drift horario en Argentina (UTC-3).

### Por qué denormalizar el summary con `increment()`

Alternativa descartada: sumar todos los movimientos en el cliente.
- Requiere leer N documentos de movimientos para mostrar el saldo actual.
- `increment()` actualiza el summary en el mismo `writeBatch` que crea el movimiento — 2 writes atómicos, costo fijo.
- Leer la pantalla principal de Caja = 1 doc de sesión + hasta 5 docs de movimientos (últimos 5). Sin aggregations en cliente.

### Por qué `writeBatch` para movimientos (no `runTransaction`)

- Al registrar un movimiento no se necesita leer antes de escribir: se crea el doc del movimiento y se aplica `increment()` al summary.
- `writeBatch` es atómico y no tiene overhead de reintentos de `runTransaction`.
- `runTransaction` se reserva para cuando se deba validar una condición antes de escribir (e.g., futura funcionalidad "cobrar fiado desde Caja" necesita verificar el balance del cliente).

### Sesión del día — una sola por día

`openCashSession` verifica primero `where('date', '==', today)` con `limit(1)`. Si ya existe un doc, lanza error. Esto previene doble apertura incluso si el usuario toca el botón dos veces (race condition mitigada en UI con flag `opening`).

### Cierre de caja — solo cambia status

`closeCashSession` solo actualiza `status: 'closed'` y `closedAt: serverTimestamp()`. Los movimientos de la subcollection no se tocan. El summary ya contiene todos los totales al momento del cierre.

**Por qué no se puede reabrir:** Evita que el comerciante agregue movimientos a un día ya cerrado y altere el historial. Si hubo un error al cerrar, se registra una corrección en el próximo día.

### Saldo actual

```
saldo = openingBalance + totalIngresos - totalEgresos
```

No se guarda como campo independiente — se calcula en el cliente. Así no hay posibilidad de inconsistencia entre el saldo guardado y el summary.

### Efectivo en cajón (pantalla de cierre)

```
efectivoEnCajon = openingBalance + summary.efectivo - summary.totalEgresos
```

Los gastos se restan del efectivo porque en un almacén típico los pagos a proveedores y gastos operativos se sacan de la caja física.

### Navegación

Mismo patrón Stack sobre Tabs:
- `(tabs)/cash.tsx` — pantalla principal con 3 sub-vistas: apertura / caja abierta / caja cerrada
- `cash/new-income.tsx` — registrar ingreso (sin tab bar)
- `cash/new-expense.tsx` — registrar gasto (sin tab bar)
- `cash/close.tsx` — pantalla de cierre con resumen
- `cash/movements.tsx` — listado completo del día (hasta 100 movimientos)

### UX — principio guía

Máximo 2 acciones para registrar cualquier movimiento. Para un ingreso: (1) elegir medio de pago, (2) ingresar monto → GUARDAR. Para un gasto: (1) ingresar monto, (2) ingresar descripción → GUARDAR. Descripción de gasto es obligatoria para mantener el historial útil.

### Reglas Firestore para Caja Diaria

Agregar dentro de `businesses/{businessId}`:

```js
match /cashSessions/{sessionId} {
  allow read, create, update: if request.auth != null && request.auth.uid == businessId;
  // delete NOT allowed — preservar historial de días anteriores

  match /cashMovements/{movementId} {
    allow read, create: if request.auth != null && request.auth.uid == businessId;
    // update y delete NOT allowed — movimientos inmutables
  }
}
```

### Limitaciones Fase 8

- No se puede reabrir una sesión cerrada.
- No hay historial de días anteriores en UI (datos en Firestore, pantalla pendiente).
- No hay cobro de fiado desde Caja (requeriría `runTransaction` cross-collection — Fase futura).
- Los gastos no tienen medio de pago (todos se asumen efectivo para el cálculo de "efectivo en cajón").
- Sin exportación ni reporte mensual de Caja.

---

