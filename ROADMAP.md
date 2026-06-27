# Roadmap

## ✅ Fase 1 — Proyecto base Expo
- Expo + TypeScript
- Expo Router
- Estrategia UI con StyleSheet propio
- Estructura de carpetas escalable
- Theme global base
- Pantallas placeholder
- Navegación funcional

## ✅ Fase 2 — Firebase/Auth
- Conexión con Firebase
- Login / Registro
- Sesión persistente
- Logout

## ✅ Fase 3 — Productos
- CRUD de productos
- Cálculos de precio
- Redondeo
- Categorías
- Búsqueda

## ✅ Fase 4 — Fiados
- Clientes
- Movimientos
- Saldos
- Transacciones Firestore

## ✅ Fase 5 — PDF
- Lista de precios
- Agrupado por categoría
- Compartir/guardar PDF

## ✅ Fase 6 — Configuración
- Datos del comercio
- Margen por defecto
- Categorías
- Preferencias

## ✅ Fase 7 — Caja (v1.0)
- Apertura con saldo inicial
- Registro de ingresos con medio de pago (efectivo / Mercado Pago / transferencia / otro)
- Registro de egresos con descripción obligatoria
- Cierre con resumen detallado y efectivo en cajón
- Historial de movimientos en tiempo real

## ✅ Fase 8 — Caja (v2.0) — Sesión de trabajo
- Modelo rediseñado: la caja representa una sesión, no un día
- Una sola caja abierta por negocio en todo momento
- Reapertura de caja sin crear nuevos documentos ni duplicar movimientos
- Información de apertura, cierre y duración con timestamps reales
- Alerta no bloqueante para cajas con más de 36 horas abiertas
- Pantalla de historial de cajas con numeración, estado, duración y saldo final
- Soporte para negocios nocturnos (una sesión puede cruzar la medianoche)
- Sin cambios en estructura de Firestore

## ✅ Fase 9 — Integración Fiados + Caja
- Al cobrar un fiado, registrar automáticamente en la caja abierta
- Selector de medio de pago en el flujo de cobro (ya existía, se reutilizó)
- Aviso inline cuando no hay caja abierta al cobrar un fiado
- Movimiento vinculado: "Cobro fiado · [Nombre cliente]"
- Transacción atómica única: fiado + caja se actualizan juntos o no se actualiza ninguno

## ✅ Fase 10 — UX / Diseño global
- Rediseño del flujo de apertura de caja: sin autoFocus, acción primero, monto tappable con display visual
- Vista "caja cerrada" con resumen compacto y detalle colapsable (en lugar de pared de datos)
- Rediseño del Home: card unificado con tres filas (Caja · Fiados · Inventario), sin etiquetas de sección redundantes
- Tab bar: pill sólido azul con ícono blanco para el tab activo — diferencia clara activo/inactivo

## ✅ Fase 11 — Datos y privacidad
- Banner offline automático: detecta pérdida de conexión con expo-network, desaparece al reconectar
- Exportación de datos en JSON: productos, clientes con sus movimientos, historial completo de cajas — compartible por Drive / WhatsApp / email
- Recordatorio semanal in-app: alerta si hace más de 7 días sin exportar, con registro local de la última exportación
- Eliminación de cuenta: doble confirmación → borrado en lotes de todos los documentos Firestore (subcollections primero) → eliminación de cuenta Firebase Auth. Manejo del caso sesión expirada.

## ✅ Fase 12 — Onboarding inicial
- Pantalla de bienvenida al registrarse: 4 pasos explicativos (Caja · Fiados · Productos · Lista de precios)
- Se muestra automáticamente una sola vez (campo `onboarding.completed` en `users/{uid}`)
- Botón "Empezar" — marca completado y va al Home
- Botón "No mostrar más" — marca completado con `skipped: true` y va al Home
- Desde Configuración → AYUDA → "Ver guía inicial" para volver a verla sin que reaparezca sola
- Compatible con usuarios existentes sin el campo: se trata como no completado
- Error no bloqueante: si falla Firestore, el usuario llega al Home igual (actualización optimista en contexto)

## ✅ Fase 13 — Lista inicial de productos
- 90 productos preconfigurados de almacén (8 categorías: Almacén, Bebidas, Lácteos, Carnes, Fiambrería, Panadería, Limpieza, Higiene)
- Al registrarse con el catálogo vacío, se ofrece cargar la lista o empezar desde cero
- Detección de duplicados por nombre normalizado (sin tildes, minúsculas) — idempotente
- Productos importados son reales: editables, borrables, sin ninguna restricción
- Flag `importedInitialProducts` en el doc del negocio — la oferta no se repite

## ✅ Fase 14 — Navegación y categorías
- Fiambrería como 10ª categoría del sistema (ID: `fiambreria`, inmutable, `system: true`, `locked: true`)
- Pestaña "Precios" eliminada — navegación reducida a 5 tabs (Inicio, Caja, Fiados, Productos, Config)
- Lista de precios movida como pantalla Stack dentro de Productos (`/products/prices`)
- Acceso desde un botón compacto siempre visible en la pantalla Productos

## 🔲 Por definir
- Estadísticas y reportes
- Notificaciones push (recordatorios de deuda)
- Multi-usuario / empleados
- Versión Pro
