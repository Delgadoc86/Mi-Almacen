# Mi Almacén → SaaS: Roadmap técnico

Este documento es la **fuente de verdad del SaaS**: qué se implementó, qué
está desplegado y qué falta. Usa su propia numeración de fases (1-6),
independiente de la de `ROADMAP.md` (que trackea features del producto).

---

## Estado actual (resumen ejecutivo)

**Fases completadas (implementadas y probadas contra emulador):** 1, 2, 3,
4, 4.1, 5, 5.1, 6, 7 — modelo de plan en Firestore, helper central de estado
de plan, banner visual, modo solo lectura en la UI, sincronización en tiempo
real del negocio, enforcement real en Firestore Rules (incluido el
documento raíz del negocio), panel admin móvil interno con Cloud Functions
callable, y contacto/activación manual (link a soporte en banner, modal de
bloqueo y Configuración).

**Qué está desplegado hoy:**
- Firebase Blaze activo en el proyecto.
- `firestore.rules` desplegadas (incluye el enforcement de planes de Fase 5/5.1 y el bloqueo de `adminAuditLogs` de Fase 6).
- `firestore.indexes.json` desplegados.
- Las 5 Cloud Functions del panel admin desplegadas.
- Custom claim `admin: true` ya asignado a la cuenta administradora.

Detalle de credenciales, procedimiento de deploy y operación:
`docs/OPERACION_ADMIN_Y_DESPLIEGUE.md`. Ese documento es la referencia
vigente para desplegar — las instrucciones de deploy dentro de las
secciones "Resultado" de cada fase más abajo son el registro histórico del
momento en que se implementó cada una, no siempre reflejan que ya se
desplegó.

**Qué falta (pendientes reales, sin maquillar):**
- Validación manual end-to-end del panel admin móvil desde la APK real con `admin: true`.
- Flujo comercial/manual para cobrar Pro (no hay cobro automático).
- Mercado Pago: no implementado.
- Panel web: no existe todavía (el panel admin es 100% móvil, dentro de la APK).
- Multi-usuario por negocio: no existe (1 usuario : 1 negocio).
- Procesamiento automático de `deletionRequest`: no existe — sigue siendo manual por soporte.
- Backup propio / restauración administrada: no existe (se depende de la infraestructura de Firebase).
- Exportación en CSV: no existe (solo JSON completo).
- Soporte/chat/push: no existe (Fase 7 agregó un link de contacto a la web, no un chat en vivo ni notificaciones push).
- Runtime de Cloud Functions: revisar antes de que Node 20 deje de poder desplegarse (Firebase fue mostrando ese aviso en otros proyectos con este runtime; no bloqueante hoy).

**Riesgos conocidos:**
- Los errores preexistentes de `src/services/exportData.ts` en `tsc --noEmit` (2, no relacionados con el SaaS) siguen sin resolverse — deliberadamente, para no mezclar ese fix con el trabajo de cada fase.
- El panel admin todavía no se probó end-to-end en un dispositivo real con el claim `admin` asignado — todo lo validado hasta ahora es contra emuladores.

---

> ## HISTÓRICO / SUPERADO
>
> Las secciones **1 a 15** que siguen son la **planificación original** de
> este roadmap, escrita **antes** de implementar nada (2026-07-04). Varias
> cosas ahí quedaron superadas por lo que realmente se construyó — en
> particular: la sección 12 planteaba un panel admin **web** (React + Vite)
> y la sección 13 decía explícitamente "no hacer `onSnapshot` reactivo
> sobre el plan"; ambas decisiones se revirtieron durante la
> implementación (Fase 4.1 sí agregó sincronización en tiempo real, y Fase
> 6 terminó siendo un panel **móvil** dentro de la APK, no web). **Para el
> estado real de cada fase, ver su sección "— Resultado" más abajo**, no
> esta planificación inicial. Se conserva por su valor histórico (muestra
> el razonamiento original y por qué se decidió lo contrario en algunos
> puntos), no como referencia vigente.

## 1. Estado actual detectado

Basado en el código real del repo (no en memoria de sesiones anteriores):

- **`Business.plan` ya existe pero está muerto.** `src/models/index.ts` define `plan?: 'free' | 'pro'` en `Business`, y `src/services/userProfile.ts` lo escribe (`plan: 'free'`) en `createUserAndBusiness` y `repairIncompleteRegistration`. Pero **ningún archivo del código lo lee** (`grep` de `.plan` en toda la app: 0 resultados fuera de esas dos escrituras). Es un campo decorativo hoy. Esto es bueno: podemos rediseñar su forma sin romper nada que dependa de él.
- **Las Firestore Security Rules no están en este repo como archivo desplegable.** No hay `firestore.rules`, `firebase.json` ni `.firebaserc`. Las reglas solo existen como bloque de texto documentado en `DECISIONES_TECNICAS.md`, presumiblemente pegadas a mano en la consola de Firebase. Esto es un riesgo operativo real: no hay forma de versionar, revisar en PR, ni desplegar por CLI lo que hoy protege los datos de todos los negocios. **Esto se resuelve en la Fase 1**, es un prerrequisito, no un detalle.
- Las reglas actuales solo verifican `request.auth.uid == businessId` — cero lógica de plan/estado.
- **No hay Cloud Functions en el proyecto** (no existe carpeta `functions/`). Todo es Firestore JS SDK cliente → Firestore directo. Esto es la razón concreta por la que las acciones del panel admin (activar Pro, suspender, etc.) necesitan infraestructura nueva, no solo una pantalla.
- `AuthContext` (`src/context/AuthContext.tsx`) ya mantiene `business` en estado y expone `refreshBusiness()` — es el punto natural para colgar el estado de plan sin tocar su forma general.
- `RootGuard` en `app/_layout.tsx` es el único gate de navegación hoy (auth → verify-email → onboarding). Es el lugar natural para enterarse de `readonly`/`suspended`, pero **no debe usarse para bloquear pantallas** — bloquea navegación, no aporta el detalle "por qué esta acción está bloqueada" que sí necesita el modo solo lectura.
- Las escrituras están concentradas en un set finito y ya identificado de funciones de servicio (no en cada pantalla): `products.ts` (createProduct, updateProduct, deleteProduct), `customers.ts` (createCustomer, updateCustomer, deleteCustomer, registerMovement, annulMovement), `cash.ts` (openCashSession, reopenCashSession, addCashMovement, closeCashSession, annulCashMovement), `categories.ts` (createCategory, deleteCategory), `userProfile.ts` (updateBusiness, updateBusinessPreferences), `importInitialProducts.ts`. Esto simplifica mucho el bloqueo: la lógica de "no escribir" se puede centralizar en un solo lugar de UI (no hay que tocar 40 pantallas, hay que tocar los botones que llaman a estas ~15 funciones).
- Ya existe una librería de componentes UI (`src/components/ui/`: Button, Card, Chip, ConfirmDialog, InlineMessage, Toast) — el banner de estado de plan y el aviso de solo-lectura deben reusar `InlineMessage`/`ConfirmDialog`, no inventar un componente visual nuevo.
- No existe ningún panel web. Es 100% construcción nueva, separada del proyecto Expo.

---

## 2. Archivos que probablemente habrá que modificar

**Modelo y datos:**
- `src/models/index.ts` — tipo `Business.plan` (cambia de string simple a objeto anidado)
- `src/services/userProfile.ts` — `createUserAndBusiness`, `repairIncompleteRegistration` (default trial al crear), nueva función `updatePlanStatus` (para uso del panel admin vía Cloud Function, no del cliente)
- `src/constants/index.ts` — agregar `TRIAL_DURATION_DAYS = 30`

**Lógica de plan (nueva):**
- `src/utils/planStatus.ts` — nuevo, helper centralizado `getPlanStatus(plan)`
- `src/hooks/usePlanStatus.ts` — nuevo, wrapper de conveniencia sobre `useAuth().business.plan`

**Contexto y guards:**
- `src/context/AuthContext.tsx` — sin cambios estructurales grandes; se apoya en el `business` que ya carga
- `app/_layout.tsx` (`RootGuard`) — sin nuevos redirects duros; en el peor caso, un flag de contexto

**UI de estado:**
- Nuevo: `src/components/ui/PlanBanner.tsx`
- Nuevo: `src/components/ui/ReadonlyGuard.tsx` (o `useCanWrite` + modal reusable)
- `app/(app)/(tabs)/index.tsx` — banner de estado (home es donde más se ve)
- `app/(app)/(tabs)/settings.tsx` — sección "Mi plan" (reemplaza espacio donde hoy no hay nada equivalente)

**Bloqueo de escritura (botones/acciones, no pantallas enteras):**
- `app/(app)/products/new.tsx`, `app/(app)/products/[id].tsx` (crear/editar/eliminar)
- `app/(app)/customers/new.tsx`, `app/(app)/customers/[id].tsx`, `app/(app)/customers/[id]/edit.tsx` (crear cliente, registrar fiado/pago)
- `app/(app)/cash/new-income.tsx`, `new-expense.tsx`, `close.tsx`, `movements.tsx` (abrir/cerrar caja, ingresos, gastos, anular)
- `app/(app)/categories/index.tsx` (crear/eliminar categoría)
- `app/(app)/(tabs)/settings.tsx` (guardar nombre/preferencias — bloquear; exportar/eliminar cuenta — permitir siempre, no dependen del plan)

**Reglas:**
- Nuevo (traído a versión de control): `firestore.rules`, `firebase.json`, `.firebaserc`

**Panel admin:** proyecto nuevo, separado (ver sección 12).

---

## 3. Modelo de datos propuesto

```ts
export type PlanType = 'trial' | 'pro';
export type PlanStatus = 'active' | 'readonly' | 'suspended';

export type BusinessPlan = {
  type: PlanType;
  status: PlanStatus;
  trialStartedAt: Timestamp;
  trialEndsAt: Timestamp;
  proActivatedAt?: Timestamp;
  proExpiresAt?: Timestamp;
  updatedAt: Timestamp;
};

export type Business = {
  // ...campos existentes sin tocar...
  plan: BusinessPlan; // reemplaza el `plan?: 'free' | 'pro'` actual
};
```

Se elimina el tipo `Plan = 'free' | 'pro'` actual (no lo usa nadie, confirmado en punto 1) y se reemplaza por `PlanType`/`PlanStatus`/`BusinessPlan`.

`status` es la fuente de verdad para "¿puedo escribir?". `type` es informativo (para mostrar "Trial" vs "Pro" en UI y para saber si al vencer corresponde pasar a `readonly` o si ya es Pro y por ende no debería vencer nunca por trial). `suspended` es siempre una decisión manual del admin, nunca automática.

---

## 4. Campos nuevos en Firestore

En `businesses/{uid}`, agregar el objeto `plan` completo (reemplaza el campo `plan` string actual — mismo nombre, forma nueva).

**Negocios nuevos:** se crea con `plan.type = 'trial'`, `status = 'active'`, `trialStartedAt = now`, `trialEndsAt = now + 30 días`.

**Negocios existentes (migración):** cualquier `business` sin `plan` (objeto) o con `plan` como string legacy recibe, la primera vez que se lee, un trial de 30 días contado desde *hoy* (no desde su `createdAt` original) — para no penalizar a nadie que ya estaba usando la app de antes. Esto se resuelve con una función de "reparación" análoga a `repairIncompleteRegistration`, ejecutada una sola vez por negocio (ver Fase 1).

No se toca ningún otro documento (`products`, `customers`, `movements`, `cashSessions`, `cashMovements` quedan exactamente igual).

---

## 5. Cambios necesarios en AuthContext

Mínimos, a propósito. `AuthContext` ya carga `business` completo (incluyendo el nuevo `plan`) porque ya llama a `getBusiness(uid)` en cuatro puntos (`onAuthStateChanged`, `register`, `refreshBusiness`, `refreshSession`). **No hace falta agregar ningún método nuevo al contexto.**

Lo único nuevo: cuando el admin cambia el plan de un negocio desde el panel, el cambio se refleja en la app en la próxima lectura de `business` (login, refresh, o un `onSnapshot` si se decide hacerlo reactivo — ver riesgo en Fase 2). Con `getDoc` puntual (como está hoy) el usuario ve el cambio recién en su próximo `refreshBusiness()`/reinicio de sesión — aceptable para v0, se documenta como limitación conocida, no se resuelve ahora.

---

## 6. Cambios necesarios en Business/Profile

- `Business.plan` cambia de forma (sección 3).
- `getBusiness()` sin cambios de firma.
- Nueva función interna `ensureBusinessPlan(businessId, business)` en `userProfile.ts`: si el negocio no tiene `plan` con la forma nueva, se lo asigna (trial de 30 días desde hoy) y lo persiste. Se llama desde el mismo punto donde hoy se llama `repairIncompleteRegistration` — incidental, no requiere un nuevo flujo.
- **No se toca `UserProfile`** — el plan vive en `Business`, no en el usuario, porque es el negocio el que se suscribe, no la persona (coherente con `businessId === uid` de Fase 2).

---

## 7. Cambios necesarios en Firestore Rules

Regla general, expresada como función reusable (evita repetir la misma lógica en cada `match`):

```js
function planIsActive(businessId) {
  let plan = get(/databases/$(database)/documents/businesses/$(businessId)).data.plan;
  return plan.status == 'active'
    && (plan.type == 'pro' || (plan.type == 'trial' && request.time < plan.trialEndsAt));
}

function isOwner(businessId) {
  return request.auth != null && request.auth.uid == businessId;
}
```

Y en cada subcolección con escritura (`products`, `categories`, `customers`, `customers/movements`, `cashSessions`, `cashMovements`):

```js
allow read: if isOwner(businessId);
allow create, update, delete: if isOwner(businessId) && planIsActive(businessId);
```

El documento `businesses/{businessId}` en sí sigue permitiendo `read` siempre al dueño (así ve su propio estado de plan aunque esté suspendido), y `update` solo de campos que no sean `plan` — el negocio nunca debe poder escribirse su propio plan. Eso requiere separar la regla de update de `businesses/{businessId}` para excluir el campo `plan`:

```js
allow update: if isOwner(businessId)
  && !("plan" in request.resource.data.diff(resource.data).affectedKeys());
```

**Riesgo técnico real (no el que se sospechaba):** comparar fechas con `request.time < plan.trialEndsAt` funciona perfecto y es seguro — `request.time` lo pone el servidor de Firestore, no se puede falsificar desde el cliente. El riesgo real es otro: **cada escritura a una subcolección dispara un `get()` extra** para leer el `plan` del negocio padre. Eso es una lectura facturable adicional por cada operación de escritura, y hay que repetirla en 6 `match` distintos. La función `planIsActive()` de arriba mitiga la duplicación de *código*, no el costo — es aceptable (una lectura extra por escritura es estándar en este patrón), pero hay que dejarlo documentado para que no sorprenda en la factura de Firebase cuando haya 50+ negocios activos.

**Prerrequisito no pedido explícitamente pero necesario:** hoy no hay `firestore.rules`/`firebase.json`/`.firebaserc` en el repo. Antes de poder versionar y desplegar este cambio por CLI (`firebase deploy --only firestore:rules`), hay que inicializar eso. Se hace en Fase 1, es trabajo de una tarde, no una fase aparte.

---

## 8. Cómo se implementará el modo solo lectura

**No a nivel de pantalla completa — a nivel de acción.** El usuario en modo solo lectura sigue navegando por toda la app (products, customers, cash, history); lo que cambia es que los botones de escritura quedan deshabilitados o, al tocarlos, muestran un modal explicando por qué.

Mecanismo:
1. `getPlanStatus(business.plan)` (helper puro, sección 9) devuelve `{ canWrite: boolean, ... }`.
2. Hook `useCanWrite()` en `src/hooks/` que envuelve `useAuth().business` + `getPlanStatus`.
3. Componente `ReadonlyGuard` / función `showReadonlyModal()`: se llama en el `onPress` de cada botón de escritura, *antes* de ejecutar la acción real. Si `canWrite` es `false`, muestra el modal ("Tu prueba finalizó. Activá Pro para seguir registrando.") y no ejecuta nada. Si es `true`, ejecuta la acción normal.

Esto evita tocar la lógica de negocio de cada pantalla — es un wrapper alrededor del `onPress`, no una reescritura del formulario.

La defensa real sigue siendo las Security Rules (sección 7); este bloqueo de UI es para dar buena experiencia (mensaje claro, no un error rojo de Firestore), no para seguridad.

---

## 9. Qué pantallas deben bloquear acciones

Bloquear (deshabilitar/interceptar) los botones de:
- Crear, editar, eliminar producto
- Crear, editar, eliminar cliente
- Registrar fiado, cobrar fiado, anular movimiento
- Abrir caja, registrar ingreso, registrar gasto, cerrar caja, anular movimiento de caja
- Crear/eliminar categoría
- Guardar nombre de negocio / preferencias en Configuración
- Importar productos iniciales

Concretamente: cada botón que hoy llama a una de las ~15 funciones listadas en la sección 2 pasa por `useCanWrite()` primero.

---

## 10. Qué pantallas pueden seguir visibles

Sin restricción alguna (ni de lectura ni de navegación):
- Ver productos, buscar, filtrar
- Ver clientes, ver historial de movimientos por cliente
- Ver caja actual y cajas cerradas, historial completo
- Generar y compartir PDF de lista de precios (no escribe en Firestore)
- Configuración → exportar datos (JSON) — **se mantiene siempre disponible, incluso suspendido**, porque es la vía de salida digna del cliente si decide no continuar
- Configuración → eliminar cuenta — igual, siempre disponible, es una acción del usuario sobre sus propios datos, no depende del plan

---

## 11. Cómo se mostrará el estado del trial en la app

Un banner discreto (componente `PlanBanner`, usa `InlineMessage` existente), visible en Home y en Configuración, nunca como modal intrusivo salvo cuando se intenta escribir sin poder:

| Estado | Texto |
|---|---|
| Trial activo (>5 días) | "Prueba Premium · quedan X días" |
| Trial, últimos 5 días | "Tu prueba termina en X días" (tono warning) |
| Trial vencido | "Tu prueba finalizó. Activá Pro para seguir registrando." (tono error, con CTA a WhatsApp) |
| Pro | "Plan Pro activo" (tono success, discreto, no invasivo) |
| Suspendido | "Cuenta suspendida. Contactá soporte." (tono error) |

---

## 12. Qué debe tener el panel admin v0

Proyecto **separado** del repo Expo (recomendado: repo aparte o carpeta hermana `admin-panel/` fuera de `src/`/`app/` para no mezclar builds ni dependencias de RN con las de web) — React + Vite, Firebase Auth con custom claim `role: admin` asignado a mano por vos (nunca por signup público), acciones sensibles vía **Cloud Functions callable** (confirmado como necesario: no hay Cloud Functions hoy, esto es infraestructura 100% nueva, se separa en su propia fase — Fase 6).

- **Dashboard:** trials activos, trials vencidos, Pro activos, suspendidos, altas recientes (últimos 7 días). Todo como conteos agregados, no listados completos.
- **Negocios:** tabla con nombre, email, plan (`type`+`status`), `trialEndsAt`, último ingreso, `createdAt`. Filtro por estado.
- **Detalle de negocio:** datos básicos, estado del plan, días restantes, historial de acciones admin sobre ese negocio (log).
- **Acciones:** activar Pro, extender trial, pasar a solo lectura, suspender, reactivar. Cada una pide motivo (texto libre) y queda en un log (`adminActions/{id}`: quién, qué, cuándo, motivo, negocio afectado).

---

## 13. Qué debe NO hacerse todavía

Por restricción explícita del negocio (sección "Restricciones" del pedido) y por criterio técnico propio:

- No integrar Mercado Pago ni ningún gateway de cobro automático.
- No agregar plan Demo.
- No agregar backups propios (Firebase ya cubre esto a esta escala).
- No agregar exportación CSV.
- No agregar funcionalidades nuevas al usuario final más allá de lo estrictamente necesario para mostrar/bloquear por plan.
- No tocar diseño general, navegación, ni lógica de negocio de productos/fiados/caja.
- No hacer `onSnapshot` reactivo sobre el plan del negocio (para que un cambio del admin se refleje al instante) — con `getDoc` puntual en login/refresh alcanza para v0; agregarlo ahora es complejidad que no se pidió y que no es imprescindible para vender.
- No borrar cuentas desde el panel admin en esta fase — "suspender" es reversible, "eliminar" no se contempla en v0.
- No permitir "restablecer trial" como acción libre — abre la puerta a abuso (borrar cuenta y crear otra). Si se quiere en el futuro, atarlo a validación de identidad, no incluido ahora.

---

## 14. Fases de implementación

Cada fase es desplegable y probable de forma independiente; ninguna rompe la app en producción si se corta a la mitad (todas son aditivas hasta la Fase 5, que es la primera que empieza a *restringir* algo real).

**Fase 1 — Modelo SaaS en Firestore + infraestructura de reglas**
Agregar `plan` (objeto) a `Business`, migración de negocios existentes a trial, inicializar `firebase.json`/`.firebaserc`/`firestore.rules` en el repo (sin cambiar el contenido de las reglas todavía — solo traerlas a versión de control tal cual están hoy). Riesgo: bajo, es aditivo.

**Fase 2 — Lectura del plan en la app**
`getPlanStatus(plan)` puro + `usePlanStatus`/`useCanWrite`. Sin UI visible todavía, solo el helper y sus tests. Riesgo: nulo, no se conecta a ninguna pantalla aún.

**Fase 3 — UI de estado del plan**
`PlanBanner` en Home y Configuración. Puramente informativo, no bloquea nada todavía. Riesgo: bajo, es visual.

**Fase 4 — Modo solo lectura en la app (UI)**
Conectar `useCanWrite` a los ~15 puntos de escritura identificados en la sección 2, con el modal de aviso. Riesgo: medio — es el primer cambio que afecta el flujo real de uso; requiere probar cada botón bloqueado individualmente.

**Fase 5 — Firestore Rules con enforcement real**
Agregar `planIsActive()` a las reglas y desplegar. Riesgo: **alto** — un error acá bloquea a todos los negocios reales, incluidos los que están pagando. Se hace después de la Fase 4 (no antes), para que cuando la regla empiece a rechazar escrituras, la app ya sepa mostrar el mensaje correcto en vez de un error crudo de Firestore.

**Fase 6 — Panel Admin v0 + Cloud Functions**
Proyecto nuevo separado, Cloud Functions callable para las 5 acciones, custom claim de admin. Riesgo: medio, pero aislado — no toca la app mobile ni sus datos salvo por las Cloud Functions que se llaman explícitamente.

**Fase 7 — Cobro manual**
Texto "Para activar Pro, contactanos por WhatsApp" en el banner/modal de trial vencido. Vos activás Pro a mano desde el panel (Fase 6). Riesgo: nulo, es contenido estático + reutiliza Fase 6.

---

## 15. Checklist de pruebas por fase

**Fase 1:**
- [ ] Negocio nuevo se crea con `plan.type = trial`, `status = active`, `trialEndsAt` = hoy + 30 días
- [ ] Negocio existente (creado antes de este cambio) recibe trial de 30 días la primera vez que se abre la app tras el deploy
- [ ] Login y registro funcionan exactamente igual que antes (no debe haber ninguna regresión visible)
- [ ] `firebase deploy --only firestore:rules` funciona con las reglas actuales sin cambios de comportamiento

**Fase 2:**
- [ ] `getPlanStatus` cubre los 5 casos (trial activo, trial <5 días, trial vencido, pro, suspendido) con tests unitarios simples
- [ ] No hay ningún cambio visible en la app (el helper no está conectado a UI todavía)

**Fase 3:**
- [ ] Banner correcto para cada uno de los 5 estados (probar manualmente editando el documento en Firestore Console)
- [ ] Banner no aparece en pantallas de auth/onboarding

**Fase 4:**
- [ ] Cada uno de los ~15 puntos de escritura bloquea correctamente cuando `canWrite = false` (probar con un negocio de test en `readonly`)
- [ ] Ver productos, clientes, historial, PDF y exportar/eliminar cuenta siguen funcionando en modo solo lectura
- [ ] Un negocio en trial activo o Pro no ve ningún bloqueo (probar que no hay falsos positivos)

**Fase 5:**
- [ ] Con reglas nuevas desplegadas, un negocio Pro puede escribir en las 6 subcolecciones
- [ ] Un negocio en trial vigente puede escribir
- [ ] Un negocio con trial vencido o suspendido recibe `permission-denied` de Firestore en cada intento de escritura (y la Fase 4 ya lo intercepta antes de llegar ahí, en el camino feliz)
- [ ] Un negocio siempre puede leer sus propios datos sin importar el estado del plan
- [ ] Un negocio no puede escribir su propio campo `plan` bajo ninguna circunstancia (probar intento directo desde la consola o un script)

**Fase 6:**
- [ ] Solo un usuario con custom claim `admin` puede acceder al panel
- [ ] Cada acción (activar Pro, extender trial, solo lectura, suspender, reactivar) cambia el estado correcto en `businesses/{uid}` y queda registrada en el log con motivo
- [ ] Un negocio suspendido/reactivado desde el panel refleja el cambio en la app la próxima vez que el usuario hace login o `refreshBusiness()`

**Fase 7:**
- [ ] El mensaje de contacto por WhatsApp aparece correctamente en el modal de trial vencido y en el banner de suspendido
- [ ] El flujo completo end-to-end: registro → trial 30 días → aviso 5 días → vencimiento → solo lectura → contacto WhatsApp → activación manual desde panel → vuelta a `active` en la app

---

## Fase 1 — Resultado (implementado 2026-07-04/05)

Objetivo cumplido: el modelo SaaS quedó preparado y versionado. **Cero cambios visuales, cero bloqueos activos.** Un registro nuevo hoy funciona exactamente igual que ayer desde la perspectiva del usuario — lo único que cambió es qué se guarda por debajo.

### Archivos creados

- `firebase.json` — config de Firestore (rules + indexes) y emuladores (firestore:8080, auth:9099, ui:4000)
- `firestore.indexes.json` — vacío; ninguna query nueva de esta fase necesita índice compuesto
- `.firebaserc` — `{"projects": {"default": "minegocio-8bbef"}}`. El project ID **no es secreto** (ya viaja embebido en el APK vía `.env`/`google-services.json`); lo que sí es secreto y nunca se commitea es la service account key
- `firestore.rules` — reconstruidas desde `DECISIONES_TECNICAS.md` + validación de plan
- `scripts/migrate-existing-plans.mjs` — migración one-shot vía Admin SDK
- `scripts/rules-tests/business-plan.test.mjs` — 14 tests contra el emulador
- `docs/SAAS_ROADMAP.md` — este documento

### Archivos modificados

- `src/models/index.ts` — nuevos tipos `PlanType`, `PlanStatus`, `BusinessPlan`; `Business.plan` pasa de `'free' | 'pro'` a `BusinessPlan` (se mantiene **opcional** a propósito: cuentas sin migrar todavía no lo tienen)
- `src/services/userProfile.ts` — nuevo helper `newTrialPlan()`; `createUserAndBusiness` y `repairIncompleteRegistration` ahora escriben el plan con la forma nueva en vez de `plan: 'free'`
- `src/constants/index.ts` — `TRIAL_DURATION_DAYS = 30`
- `package.json` — nuevas devDependencies (`firebase-admin`, `@firebase/rules-unit-testing`) y scripts (`emulators`, `test:rules`, `test:rules:emulator`)
- `.gitignore` — excluía `scripts/serviceAccountKey.json` y artefactos del emulador (superado 2026-07-05: ver sección "Migración — credenciales" más abajo, ahora es Application Default Credentials, sin clave dentro del repo)

**No se tocó ninguna pantalla, ningún componente visual, ninguna navegación.**

### Modelo final del plan

```ts
type PlanType = 'trial' | 'pro';
type PlanStatus = 'active' | 'readonly' | 'suspended';

type BusinessPlan = {
  type: PlanType;
  status: PlanStatus;
  trialStartedAt: Timestamp;
  trialEndsAt: Timestamp;
  proActivatedAt?: Timestamp;
  proExpiresAt?: Timestamp;
  updatedAt: Timestamp;
};
```

Sin plan Demo, tal como se pidió.

### Estrategia elegida para el trial seguro: Opción A (Rules), no Cloud Function

Se evaluaron las dos alternativas pedidas:

- **B (Cloud Function para aprovisionar el trial):** descartada para esta fase. Cloud Functions requieren plan Blaze (pago por uso) habilitado en el proyecto Firebase — forzar esa migración de plan de facturación *ahora*, solo para crear un documento en el registro, es prematuro. Blaze se vuelve necesario recién en Fase 6 (acciones del panel admin), y ahí sí se justifica.
- **A (validación en Firestore Rules):** elegida. Es suficiente y verificable: `request.time` es la hora del servidor de Firestore, no se puede falsificar desde el cliente, así que anclar la validación a `request.time` es tan seguro como si la escribiera un servidor propio.

**Detalle técnico importante que apareció al implementar (y que justifica por qué esto no es trivial):** `trialStartedAt` se manda como sentinel `serverTimestamp()`, que Firestore resuelve a `request.time` *antes* de evaluar la regla — por eso se puede exigir igualdad exacta (`plan.trialStartedAt == request.time`). Pero **no existe un sentinel "serverTimestamp() + 30 días"** — Firestore no lo ofrece. `trialEndsAt` tiene que viajar como un valor literal calculado por el cliente (`Date.now() + 30 días`), y el cliente no puede predecir con precisión de milisegundos cuál va a ser el `request.time` real del servidor en el momento del commit. Exigir igualdad exacta ahí sería frágil (fallaría por unos pocos milisegundos de latencia de red en condiciones normales, todo el tiempo). La regla, en cambio, valida una ventana de tolerancia:

```js
plan.trialEndsAt > request.time + duration.value(30, 'd') - duration.value(5, 'm')
&& plan.trialEndsAt < request.time + duration.value(30, 'd') + duration.value(5, 'm')
```

Esto es seguro igual: un atacante como máximo podría correr su `trialEndsAt` ±5 minutos, irrelevante sobre un trial de 30 días — pero sí impide, por ejemplo, mandar un `trialEndsAt` de acá a un año. También se valida con `.keys().hasOnly([...])` que no se cuelen campos extra (`proActivatedAt`, etc.) en la creación — esos campos solo los toca el Admin SDK, nunca el cliente, ni siquiera al registrarse.

### Estrategia de migración (histórico — superado, ver "Migración masiva no requerida antes del lanzamiento" más abajo)

Esta sección describe el plan cuando se asumía que podía haber cuentas antiguas reales que migrar. Se confirmó que no las hay — solo existe la cuenta del fundador. `scripts/migrate-existing-plans.mjs` se mantiene sin ejecutar, como herramienta para el futuro; el bootstrap real de la única cuenta se hace con `scripts/bootstrap-admin.mjs` (sección más abajo).

`scripts/migrate-existing-plans.mjs` también lee `users` además de `businesses`, cruza ambas colecciones y reporta: negocios sin usuario correspondiente (no se migran, quedan para revisión manual), usuarios sin negocio correspondiente (solo informativo), y el detalle de cada negocio con su email asociado. Se agregó `--exclude=uid1,uid2` para dejar afuera de la migración real cualquier cuenta de prueba que aparezca en el dry-run.


`scripts/migrate-existing-plans.mjs`, ejecutado a mano una sola vez, vía Firebase Admin SDK (bypassea las Rules por diseño — es la vía correcta para una migración controlada y auditable, no un "repair" orgánico disparado por clientes no confiables en cada login).

- Es **idempotente**: si un negocio ya tiene `plan` con la forma nueva, se lo deja intacto — correrlo dos veces no rompe nada.
- Tu cuenta (pasada por `--admin-uid=<tu-UID>`) recibe `plan.type = 'pro'`, `status = 'active'`, sin vencimiento — queda protegida de cualquier bloqueo futuro. *Nota de alcance:* esto marca tu **negocio** como Pro en el modelo de plan; no es lo mismo que el custom claim de Firebase Auth `role: admin` que va a habilitar el acceso al Panel Admin en Fase 6 — son dos cosas distintas, esta fase solo resuelve la primera. Si querías decir esto último, avisame antes de Fase 6 y lo agrego ahí.
- El resto de las cuentas existentes recibe un trial nuevo de 30 días **contado desde hoy** (no retroactivo a su alta original) — no es destructivo, y como el enforcement (Fase 5) todavía no está activo, nadie queda expuesto a un bloqueo por esto.
- No migra nada por las dudas si no le pasás `--admin-uid`; tiene `--dry-run` para previsualizar antes de escribir.

### Reglas nuevas — diferencias con las actuales

| | Antes | Fase 1 |
|---|---|---|
| `businesses/{id}` create | ownership únicamente | ownership **+** forma de trial válida (`isValidNewTrialPlan`) |
| `businesses/{id}` update | ownership únicamente | ownership **+** `plan` no puede cambiar (`planUnchanged()`) |
| `businesses/{id}` read/delete | ownership | sin cambios |
| products / categories / customers / movements / cashSessions / cashMovements | ownership | **sin cambios** — `planIsActive()` está escrita y lista, pero no se llama desde ningún `allow` todavía (eso es Fase 5) |

### Bug real encontrado y corregido durante la validación

La primera versión de `planUnchanged()` comparaba `resource.data.plan` directamente. Firestore Rules **no devuelve `null` al acceder a un campo ausente de un mapa — tira un error de evaluación**, y un error de evaluación se resuelve como acceso denegado. Resultado: las cuentas legacy (sin `plan`) no podían actualizar ni siquiera su nombre. Se detectó con el test "una cuenta legacy sin plan sigue pudiendo actualizar otros campos" (fallaba `PERMISSION_DENIED`), y se corrigió chequeando presencia con el operador `in` antes de comparar. Sin el test, esto se habría descubierto recién en producción con una cuenta real.

### Comandos para probar con el Emulator Suite

```bash
# una vez, si no tenés Java: winget install EclipseAdoptium.Temurin.21.JRE
npm run test:rules:emulator
```

Corre 14 tests (creación de trial válido/inválido, inmutabilidad de `plan`, cuentas legacy, lectura entre negocios, y regresión de products/customers/cash). Estado actual: **14/14 pasan**.

Para dejar el emulador levantado e inspeccionar a mano (UI en `http://127.0.0.1:4000`):
```bash
npm run emulators
```

### Comandos para desplegar

```bash
# 1. Instalar CLI si hace falta
npm install -g firebase-tools
firebase login

# 2. OBLIGATORIO antes de la primera vez: abrir Firebase Console > Firestore
#    Database > Reglas, copiar el texto actual y compararlo a mano contra
#    firestore.rules. Si difieren, avisame — no desplegar a ciegas.
#    (Hecho 2026-07-05 — ver sección "Comparación contra Firebase Console".)

# 3. Deploy solo de reglas (no toca funciones ni hosting, no existen todavía)
firebase deploy --only firestore:rules
```

### Migración masiva no requerida antes del lanzamiento (2026-07-05)

Migración masiva no requerida antes del lanzamiento: solo existe la cuenta del administrador. Se usa `bootstrap-admin` para preparar el entorno inicial.

`scripts/migrate-existing-plans.mjs` **se mantiene en el repo como herramienta futura**, para cuando existan clientes reales que migrar — pero no se ejecuta ahora, ni en dry-run ni real. No hay clientes ni cuentas antiguas hoy.

En su lugar, `scripts/bootstrap-admin.mjs` prepara la única cuenta que existe (la del fundador) con dos cosas **conceptualmente distintas**:

- **Admin** (custom claim de Firebase Auth `admin: true`): habilita en el futuro el acceso al panel web interno (Fase 6). Ningún cliente puede asignarse esto a sí mismo — los custom claims solo se escriben con el Admin SDK, es una garantía de la plataforma, no algo reforzado por este script.
- **Pro** (plan de negocio en `businesses/{uid}.plan`): activo e indefinido, sin `proExpiresAt` — mismo modelo que ya usan las cuentas trial, ningún campo inventado.

Ambas cosas son ortogonales: un usuario común futuro nunca va a tener `admin`, y tener `admin` no le da a nadie más plan Pro automáticamente (son dos escrituras independientes, cada una a su propio sistema — Auth y Firestore).

**Ajustes de seguridad de ejecución (2026-07-05):**

- **Dry-run por defecto.** El script nunca escribe en Auth ni en Firestore a menos que reciba `--apply` explícitamente. `node scripts/bootstrap-admin.mjs --uid=<UID>` (sin `--apply`) es siempre de solo lectura, sin importar qué otro flag se le pase.
- **Validación de proyecto antes de leer o escribir cualquier cosa.** Con `GoogleAuth().getProjectId()` (paquete `google-auth-library`, ya usado internamente por `firebase-admin`) se resuelve el `project_id` real embebido en la credencial referenciada por `GOOGLE_APPLICATION_CREDENTIALS` — independiente de cualquier configuración local — y se compara contra `minegocio-8bbef` hardcodeado en el script. Si no coincide, aborta antes de tocar Auth o Firestore. Solo se imprime el `projectId` validado (no es secreto) y el UID/email de la cuenta objetivo — nunca la ruta ni el contenido de la clave.

**Windows PowerShell — comando exacto:**

```powershell
# La variable solo dura la sesión de PowerShell actual (no queda guardada en el sistema)
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\fuera-del-repo\clave-minegocio.json"

# Dry-run (por defecto, sin --apply) — nunca escribe nada
node scripts/bootstrap-admin.mjs --uid=<TU_UID>

# Ejecutar de verdad, recién después de revisar el dry-run
node scripts/bootstrap-admin.mjs --uid=<TU_UID> --apply
```

**Después de correrlo con `--apply`:** cerrá sesión y volvé a iniciarla, tanto en la app (para que se refleje el plan Pro) como más adelante en el panel admin (Fase 6) — Firebase no actualiza los custom claims de una sesión ya abierta hasta que se emite un ID token nuevo, lo cual pasa recién en el próximo login.

Si `GOOGLE_APPLICATION_CREDENTIALS` no está definida, el script falla de inmediato con un mensaje explicando qué hacer — no intenta leer ninguna ruta por defecto ni ningún archivo del repo. Ningún mensaje de log imprime la ruta de la clave, su contenido, `private_key`, `client_email` ni tokens — ni siquiera en los mensajes de error (se redacta la ruta si aparece en un error nativo de la librería de Google).

**Nota obligatoria para Fase 2 (modelo de plan sin cambios todavía):** la cuenta admin queda con `trialStartedAt` y `trialEndsAt` **iguales** (mismo instante, duración cero) porque el modelo actual los exige aunque esta cuenta nunca pasó por un trial real. `getPlanStatus()` (o el helper equivalente que se escriba en Fase 2) **debe tratar `type === 'pro'` como condición de prioridad, evaluada primero y sin evaluar fechas de trial en absoluto** — igual que ya hace `planIsActive()` en `firestore.rules` (`plan.type == 'pro' || (plan.type == 'trial' && request.time < plan.trialEndsAt)`, donde el `||` corta antes de mirar la fecha). Si el código de Fase 2 comparara fechas antes de mirar `type`, con `trialStartedAt == trialEndsAt` la cuenta admin se leería como "trial ya vencido" — bug fácil de introducir si no se respeta este orden.

No se creó ninguna Cloud Function ni se desplegaron reglas para este paso puntual (registro histórico de ese momento — Fase 2 y el resto ya se autorizaron y completaron después, ver "Estado actual" al inicio del documento).

### Riesgos pendientes

- **Drift no verificado:** las reglas reconstruidas salen de `DECISIONES_TECNICAS.md`, no de una fuente exportada del proyecto real. Si la consola tiene algo distinto (un ajuste manual no documentado), el primer deploy lo pisaría. Mitigado con el paso manual de comparación antes de desplegar (arriba) — pero sigue siendo un paso humano, no automático.
- **`plan` opcional en el tipo `Business`:** hasta que confirmes que la migración corrió sobre todas las cuentas reales, cualquier código nuevo que lea `business.plan` tiene que tolerar `undefined`. Nada en esta fase lo lee todavía, así que no hay impacto, pero es la primera cosa a tener en cuenta al empezar Fase 2.
- **Costo de `get()` en Fase 5:** ya señalado en la sección de Fase 5 más arriba — cada escritura en subcolecciones va a pagar una lectura extra. No es un problema de esta fase, pero conviene tenerlo presente para no sorprenderse con la facturación cuando se active.
- **Blaze pendiente:** Fase 6 (Panel Admin + Cloud Functions) va a requerir pasar el proyecto de Spark a Blaze. No es necesario ahora, pero avisalo quien maneje la tarjeta asociada al proyecto de Firebase antes de esa fase.

### Checklist manual — verificar que tu APK actual sigue funcionando

Nada de esto debería fallar; si algo falla, es una regresión real de esta fase:

- [ ] Registro de un negocio nuevo (usuario que no existía) — se crea la cuenta y podés operar de inmediato
- [ ] Login con una cuenta existente (creada antes de esta fase) — entra sin errores, sin pantalla nueva, sin aviso
- [ ] Verificación de email — sigue llegando y funcionando igual
- [ ] Recuperar contraseña — sin cambios
- [ ] Login biométrico (huella/Face ID) tras haber iniciado sesión una vez — sigue funcionando
- [ ] Lectura del negocio en Home (nombre, resumen) — se ve igual que antes
- [ ] Crear, editar y eliminar un producto
- [ ] Crear y eliminar una categoría
- [ ] Crear un cliente, registrar un fiado, registrar un pago, anular un movimiento
- [ ] Abrir caja, registrar ingreso, registrar gasto, cerrar caja, ver historial de cajas
- [ ] Generar y compartir el PDF de lista de precios
- [ ] Configuración: guardar nombre del negocio y preferencias (margen/redondeo/categoría por defecto)
- [ ] Exportar datos (JSON) y eliminar cuenta (probar en una cuenta de prueba, no en la real) — deben seguir funcionando exactamente igual

Ninguno de estos puntos debería verse afectado por Fase 1, porque las reglas nuevas solo restringen la forma del campo `plan` en la creación y su inmutabilidad después — no tocan `products`, `categories`, `customers`, `movements`, `cashSessions` ni `cashMovements`.

**No se avanza a Fase 2 hasta que confirmes este checklist y la migración sobre tu cuenta real.**

---

## Control de seguridad adicional (previo a autorizar Fase 2) — 2026-07-05

Pedido explícito antes de aprobar Fase 2: blindar `businesses/{uid}` contra borrado/manipulación del campo `plan` y probarlo en el emulador real. **No se tocó ninguna pantalla.**

### Hallazgo 1 — conflicto entre "nadie puede borrar el negocio" y "Eliminar cuenta"

`allow delete: if isOwner(businessId)` ya estaba permitido a propósito: `src/services/deleteAccount.ts` hace `deleteDoc(businesses/{uid})` como paso 7/9 de la función real "Eliminar cuenta" (Configuración). Denegarlo rompía esa función. **Decisión tomada con vos:** se mantiene el delete permitido para el dueño. Lo que se verificó y blindó es que **nadie más** que el dueño pueda borrarlo — eso sí es (y era) rechazado.

### Hallazgo 2 — reseteo de trial por fallo controlado de `deleteAuthUser()` (no resuelto todavía, a propósito)

Si `deleteAuthUser()` falla con `auth/requires-recent-login` (código ya anticipado en `settings.tsx`) después de que `deleteBusinessData` y `deleteUserProfile` ya se ejecutaron, la cuenta de Auth queda viva sin negocio ni perfil. En el próximo login, `repairIncompleteRegistration` recrea ambos documentos — con un **trial nuevo** — sin necesidad de nueva cuenta ni nuevo email. Es un reseteo de trial repetible con la misma cuenta.

**Decisión tomada con vos: documentar y no tocar código todavía** (ver "no modificar pantallas" de este pedido). Queda como ítem a resolver en Fase 2, cuando de nuevo se toque `userProfile.ts`/`deleteAccount.ts`. Fix propuesto para ese momento: no permitir que `repairIncompleteRegistration` otorgue un trial nuevo si hay evidencia de que el negocio ya existió antes (o, más simple, invertir el orden de `confirmDelete()` para borrar la cuenta de Auth *antes* que los documentos de Firestore, de forma que un fallo de `deleteAuthUser()` no deje datos borrados a mitad de camino).

### Resultado de los tests nuevos

31/31 pasan (14 de Fase 1 + 17 nuevos), agregados a `scripts/rules-tests/business-plan.test.mjs`. **No hizo falta modificar `firestore.rules`** — `planUnchanged()` tal como quedó en Fase 1 ya cerraba todos estos vectores:

| Caso probado | Resultado |
|---|---|
| Cliente borra el negocio de OTRO usuario | ✅ rechazado |
| Dueño borra su propio negocio | ✅ permitido (intencional) |
| `deleteField()` sobre `plan` completo | ✅ rechazado |
| `deleteField()` sobre `plan.type` | ✅ rechazado |
| `deleteField()` sobre `plan.status` | ✅ rechazado |
| `deleteField()` sobre `plan.trialStartedAt` | ✅ rechazado |
| `deleteField()` sobre `plan.trialEndsAt` | ✅ rechazado |
| `deleteField()` sobre `plan.updatedAt` | ✅ rechazado |
| `deleteField()` sobre `plan.proActivatedAt` (cuenta pro) | ✅ rechazado |
| `deleteField()` sobre `plan.proExpiresAt` ausente | ✅ permitido (no-op inofensivo, no hay nada que alterar) |
| `setDoc` overwrite total omitiendo `plan` | ✅ rechazado |
| `updateDoc` reemplazando `plan` completo por otro con la misma forma | ✅ rechazado |
| Agregar campo no permitido dentro de `plan` (`plan.hackedField`) | ✅ rechazado |
| Recrear el negocio SIN borrar antes, para forzar un trial nuevo | ✅ rechazado (es `update`, no `create`) |
| Recrear el negocio DESPUÉS de un delete real | ⚠️ permitido — limitación conocida, ver abajo |
| Batch real de alta (`users` + `businesses` juntos, como `createUserAndBusiness`) | ✅ funciona igual que antes |
| Doble intento de alta sobre un negocio ya existente | ✅ rechazado |

### Respuestas directas a lo pedido

- **¿Delete de `businesses` queda denegado para clientes?** Denegado para cualquiera que no sea el dueño — confirmado con test. Para el dueño sigue permitido, por decisión explícita tuya, porque lo requiere "Eliminar cuenta".
- **¿Qué operaciones administrativas futuras van a requerir Admin SDK / Cloud Functions?** Las mismas ya previstas en Fase 6 (activar Pro, extender trial, pasar a solo lectura, suspender, reactivar) — ninguna novedad acá, solo se confirma que hoy el cliente no tiene ningún camino alternativo para lograr esos cambios por su cuenta.
- **¿Se puede borrar y recrear para un trial nuevo?** Sí, pero solo vía un **delete real** del negocio (que ya requiere pasar por el flujo completo de "Eliminar cuenta", incluyendo perder todos los datos del negocio) — no hay un atajo más barato. Cerrar esto del todo requeriría estado que sobreviva al borrado (fuera del alcance de Firestore Rules), evaluar como decisión de producto en una fase futura si el volumen de abuso lo justifica. El vector más barato y más grave en la práctica es el Hallazgo 2 (arriba), que no pasa por borrar nada.

### Pendiente para tu OK — no se ejecuta nada de esto todavía (registro histórico de ese momento)

- [x] Comparar `firestore.rules` local contra Firebase Console
- [ ] Dry-run de migración (`--dry-run`) — no llegó a hacer falta: no había cuentas legacy reales que migrar, solo la cuenta administradora (ver `scripts/migrate-existing-plans.mjs`, nunca ejecutado)
- [ ] Migración real sobre cuentas existentes — idem, no aplicó
- [x] Deploy de reglas a producción
- [x] Autorización para avanzar a Fase 2 (que además debería resolver el Hallazgo 2)

**Actualización:** las reglas ya están desplegadas — ver "Estado actual" al inicio del documento. La migración de cuentas legacy nunca hizo falta.

---

## Comparación contra Firebase Console — 2026-07-05

Backup textual guardado en `docs/firestore.rules.backup-2026-07-05.txt` (copiado a mano desde Firebase Console, antes de cualquier deploy).

**Hallazgo principal: producción es MÁS permisiva de lo que documentaba `DECISIONES_TECNICAS.md`.** Cada colección tenía `allow read, write` sin distinción de operación — eso incluye `delete` en absolutamente todo (`users`, `businesses`, `products`, `categories`, `customers`, `movements`, `cashSessions`, `cashMovements`) y `update` en `movements`/`cashMovements`, que la documentación decía "inmutables".

Al reconstruir `firestore.rules` siguiendo la documentación (no la realidad), quedaron **3 restricciones de más que hubieran roto funciones reales** si desplegaba sin este chequeo:

| Path | Mi regla (antes de corregir) | Producción real | Código real | Corregido |
|---|---|---|---|---|
| `customers/{id}` | sin `delete` | `delete` permitido | `deleteCustomer()` se usa en `customers/[id]/edit.tsx` (botón real de eliminar cliente) | ✅ se agregó `delete` |
| `customers/{id}/movements/{id}` | sin `update` | `update` permitido | `annulMovement()` hace `tx.update(origRef, {annulled:true,...})` al anular un fiado/pago | ✅ se agregó `update` |
| `cashSessions/{id}/cashMovements/{id}` | sin `update` | `update` permitido | `annulCashMovement()` hace lo mismo al anular un ingreso/egreso | ✅ se agregó `update` |

Diferencias que **sí son intencionales** (endurecimiento deliberado de esta semana, no bugs):
- `delete` denegado en `businesses` y `users` (antes permitido) — decisión tomada explícitamente para cerrar el reinicio de trial.
- `delete` denegado en `cashSessions` y en los propios `movements`/`cashMovements` — producción lo permite pero **ningún código lo usa** (`grep` de `deleteDoc`/`deleteCollection` en `src/services` confirma que solo `categories.ts`, `customers.ts` y `products.ts` borran documentos — nunca movimientos ni sesiones). Tightening seguro, sin romper nada.
- Todo el modelo de `plan`/`deletionRequest` — no existe en producción, es 100% nuevo de Fase 1 y de esta semana.

No falta ninguna regla de producción sin cubrir: `users`, `businesses` y las 6 subcolecciones tienen equivalente en el archivo nuevo, más estricto donde correspondía y corregido donde la documentación vieja mentía.

Suite completa re-ejecutada contra el emulador tras la corrección: **46/46 tests pasan**, incluyendo 3 tests nuevos que reproducen exactamente `annulMovement`, `annulCashMovement` y la eliminación de cliente contra las reglas corregidas.

---

## Bloqueo de seguridad y ciclo de vida (previo a autorizar deploy) — 2026-07-05

Cierre de los dos hallazgos de la sección anterior: delete de `businesses/{uid}` y "Eliminar cuenta" ya no pueden reiniciar el trial ni dejar la cuenta a medio borrar. **No se desplegó nada — sigue pendiente tu OK.**

### Archivos modificados

- `firestore.rules` — `businesses/{uid}`: `allow delete: if false` (antes permitido para el dueño); nueva función `deletionRequestOk()`. `users/{uid}`: `delete` separado y denegado (antes incluido en `allow read, write`).
- `src/models/index.ts` — nuevo campo `Business.deletionRequest?: { requestedAt: Timestamp }`.
- `src/services/userProfile.ts` — `repairIncompleteRegistration` reescrita: antes reparaba cada documento por separado (huella del bug); ahora solo actúa si **ninguno** de los dos existe, y no hace nada si existe exactamente uno.
- `src/services/deleteAccount.ts` — reescrito por completo: se eliminaron `deleteBusinessData`, `deleteUserProfile`, `deleteAuthUser` (ya no podían tener éxito contra las reglas nuevas, y dejarlas ahí era un riesgo de borrado parcial en sí mismo). Nueva función `requestAccountDeletion`.
- `src/context/AuthContext.tsx` — nuevo campo de estado `accountInconsistent`, calculado como `Boolean(profile) !== Boolean(biz)` en los cuatro puntos donde se fija el estado (login, registro, sesión biométrica, listener de auth).
- `app/_layout.tsx` (`RootGuard`) — nueva rama: si `accountInconsistent`, redirige a `/account-issue` antes que a onboarding o la app.
- `app/account-issue.tsx` — nueva pantalla de recuperación.
- `app/(app)/(tabs)/settings.tsx` — sección "ZONA PELIGROSA" reemplazada: botón + diálogo de "Solicitar eliminación de cuenta" en vez del borrado directo; muestra el estado de una solicitud ya enviada.
- `scripts/rules-tests/account-lifecycle.test.mjs` — nuevo, 10 tests (+ 4 subtests de regresión).
- `scripts/rules-tests/business-plan.test.mjs` — 2 tests actualizados para reflejar que el delete ya no está permitido ni para el dueño; project ID separado del otro archivo.

### Decisión tomada para "Eliminar cuenta": Opción A

Se reemplazó por "Solicitar eliminación de cuenta" (no B, ocultar la opción), por ser la más limpia: no deja al usuario en un callejón sin salida (sigue teniendo un botón, con una respuesta clara de qué va a pasar), no borra nada — solo escribe `deletionRequest: { requestedAt }` en su propio documento, que las reglas dejan crear una vez y vuelven inmutable después (mismo patrón que `plan`). Vos revisás las solicitudes a mano y procesás el borrado real vía consola/Admin SDK hasta que exista Fase 6.

### Flujo exacto ante negocio faltante

`repairIncompleteRegistration(uid, email)` ahora:
- Si **ambos** documentos existen → no hace nada (caso normal).
- Si **ninguno** existe → los crea juntos, con un trial nuevo — es el único caso legítimo (registro interrumpido antes de que el batch original llegara a commitear; nunca tuvo trial, es la primera vez real).
- Si existe **exactamente uno** → no hace nada. No repara, no crea, no toca nada.

En paralelo, `AuthContext` calcula `accountInconsistent = Boolean(profile) !== Boolean(biz)` cada vez que fija su estado (login, registro, sesión biométrica, listener de auth) — no solo después de `repairIncompleteRegistration`. Si es `true`, `RootGuard` redirige a `/account-issue` ("No pudimos cargar tu negocio. Contactá soporte.") con un botón para cerrar sesión, en vez de dejar pasar a onboarding o a la app con un `business` nulo.

### Resultado de todos los tests

**43/43 pasan** (39 tests de nivel superior + 4 subtests de regresión), repartidos en dos archivos:

| | `business-plan.test.mjs` | `account-lifecycle.test.mjs` |
|---|---|---|
| Tests | 29 | 10 (+4 subtests) |
| Cubre | Fase 1 + control de seguridad anterior, actualizado para el nuevo delete denegado | Este bloqueo: delete denegado, `deletionRequest`, no-recreación, regresión |

Durante la implementación aparecieron dos bugs reales, corregidos antes de reportar:

1. **Contaminación entre archivos de test.** Los dos archivos usaban el mismo `projectId` contra el emulador; `node --test` los corre en paralelo, y sus `clearFirestore()` se pisaban entre sí, generando fallos falsos e intermitentes (una `create` se convertía en `update` porque el otro archivo ya había escrito el mismo documento). Se corrigió dándole a cada archivo su propio `projectId`.
2. **`.keys()` sobre un campo ausente revienta la regla, incluso "protegido" por un `&&`.** La primera versión de `deletionRequestOk()` seguía el patrón de `planUnchanged()` pero llamaba a `request.resource.data.deletionRequest.keys().hasOnly([...])` para validar la forma de una solicitud nueva. Aunque esa rama estaba detrás de una condición `&&` que en teoría solo se cumple cuando el campo existe, Firestore Rules evalúa igual la llamada al método y tira "Null value error" — el short-circuit no protege llamadas a método de esta forma (sí protege comparaciones `==`, que es como está armado `planUnchanged()` desde Fase 1, por eso ese no fallaba). Se corrigió reemplazando `.keys().hasOnly([...])` por una comparación de mapa completo (`== {'requestedAt': request.time}`), que es segura y además exige las claves exactas igual que antes.

### Qué queda pendiente para una eliminación real y segura

- Procesar las solicitudes de `deletionRequest` sigue siendo 100% manual (revisar, contactar, borrar a mano). Se planteó acá que una fase futura del panel admin agregara una acción "Procesar eliminación" vía Cloud Function con Admin SDK — **eso no se hizo**: la Fase 6 implementada explícitamente no incluye borrado real de cuentas (ver Restricciones de esa fase). Sigue siendo un pendiente real, no resuelto — ver la lista de pendientes al inicio del documento.
- El script de migración (`scripts/migrate-existing-plans.mjs`, de la Fase 1) no necesitó cambios por esto — no toca `deletionRequest` ni delete.
- Sigue sin resolver qué pasa si alguien acumula muchas solicitudes de eliminación sin que nadie las procese — un problema operativo de soporte, no técnico, para cuando haya volumen.

### Pendiente para tu OK — nada de esto se ejecutó todavía (registro histórico de ese momento)

- [x] Comparar `firestore.rules` local contra Firebase Console (incluye ahora también el delete denegado en `users` y `businesses`, y `deletionRequestOk()`)
- [ ] Dry-run de migración — no aplicó, no había cuentas legacy que migrar
- [ ] Migración real — idem
- [x] Deploy de reglas
- [x] Autorización para avanzar a Fase 2

**Actualización:** las reglas ya están desplegadas — ver "Estado actual" al inicio del documento.

---

## Fase 2 — Helper central `getPlanStatus()` (implementado 2026-07-05)

**`bootstrap-admin.mjs` queda pausado.** No hay clientes ni cuentas para migrar, y el panel admin no existe todavía — el script se guarda tal cual quedó (dry-run por defecto, validación de proyecto) para correrlo en Fase 6, cuando haya panel y haga falta asignar el custom claim `admin: true`. No se pidió UID, no se tocó Auth, no se ejecutó ningún script administrativo en este paso.

### Qué se implementó

- `src/utils/planStatus.ts` — `getPlanStatus(plan)`, función pura, sin dependencias de Firebase ni de React. Devuelve `{ kind, canWrite, daysRemaining, message }`.
- `src/utils/planStatus.test.ts` — 9 tests unitarios (`node --test` con type-stripping experimental de Node, sin Jest ni dependencias nuevas de testing).
- `tsconfig.json` — se agregó `allowImportingTsExtensions: true` (necesario porque los tests corren con Node directo, que exige extensión `.ts` explícita en imports relativos; no afecta el bundle de la app, Metro/expo-router nunca ven estos archivos).
- `package.json` — script `test:unit`.

**Sin cambios visibles en la app** — el helper no está conectado a ninguna pantalla todavía (eso es Fase 3/4), tal como estaba planeado.

### Prioridad de evaluación (por qué importa el orden)

1. `status === 'suspended'` → siempre gana, sin importar el `type`.
2. `status === 'readonly'` → ídem.
3. `type === 'pro'` → se resuelve **antes** de mirar cualquier fecha de trial. Es la razón concreta por la que la cuenta admin (bootstrapeada con `trialStartedAt == trialEndsAt`, ver sección anterior) nunca se lee como "trial vencido": el chequeo de `type` corta el camino antes de llegar a comparar fechas.
4. Recién para `type === 'trial'` con `status === 'active'` se compara `trialEndsAt` contra la hora actual.

### Sin bypass permanente para cuentas sin plan

`getPlanStatus(undefined)` y cualquier forma inválida (incluida la legacy `plan: 'free'` en string, pre-Fase-1) resuelven en `kind: 'no-plan'`, `canWrite: false` — no un "todo permitido por defecto". Verificado con un test específico que reproduce la forma vieja como string y confirma que no explota ni lo trata como válido. Como esto todavía no está conectado a ninguna pantalla, no bloquea nada hoy — es una decisión de diseño para cuando sí lo esté (Fase 4), no un efecto colateral de esta fase.

### Instrucciones exactas — asignar Pro manualmente por Firestore Console (para probar en el celular)

Mientras `bootstrap-admin.mjs` sigue pausado, esta es la forma de dejar tu cuenta en Pro para poder probar sin escribir código nuevo ni correr scripts:

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com) con la cuenta de Google correcta (la que tiene acceso al proyecto) → proyecto **minegocio**.
2. Si no sabés tu UID: **Authentication → Users**, buscá tu email en la lista, columna **User UID** — copialo.
3. **Firestore Database → Data**, colección `businesses` → documento con ese UID.
4. Fijate si el documento ya tiene un campo `plan`:
   - Si `plan` es de tipo **string** (valor `"free"`, forma vieja): hacé click en el campo → **Delete field** (el ícono de tacho al lado). Vas a recrearlo como mapa en el paso siguiente.
   - Si `plan` no existe: pasá directo al paso siguiente.
5. **Add field** → nombre `plan`, tipo **map**. Adentro del mapa, agregá estos campos (con **Add field** dentro del mapa, uno por uno):

   | Campo | Tipo | Valor |
   |---|---|---|
   | `type` | string | `pro` |
   | `status` | string | `active` |
   | `trialStartedAt` | timestamp | fecha/hora actual (el selector de Console te la propone por defecto) |
   | `trialEndsAt` | timestamp | la misma fecha/hora que pusiste en `trialStartedAt` |
   | `proActivatedAt` | timestamp | fecha/hora actual |
   | `updatedAt` | timestamp | fecha/hora actual |

   **No agregues `proExpiresAt`** — su ausencia es justamente lo que representa "Pro indefinido" en el modelo (ver `getPlanStatus`/`planIsActive`). Agregarlo con cualquier valor, aunque sea uno lejano, sería inventar un campo que el modelo no necesita.

6. **Save**.
7. En el teléfono: cerrá la app por completo y volvé a abrirla (o cerrá sesión y volvé a entrar) para que se vuelva a leer `businesses/{uid}` — `refreshBusiness()`/`onAuthStateChanged` no tienen un listener en tiempo real sobre este campo todavía, así que el cambio no aparece solo hasta la próxima lectura.

Esto **no** toca Auth ni asigna ningún custom claim — es exclusivamente el plan de negocio (Pro), tal como pediste. El claim `admin` sigue reservado para `bootstrap-admin.mjs` en Fase 6.

---

## Fase 3 — Banner visual del plan (implementado 2026-07-05)

### Archivos tocados

- `src/hooks/usePlanStatus.ts` — nuevo. `useMemo(() => getPlanStatus(business?.plan), [business?.plan])` sobre el `business` de `useAuth()`.
- `src/components/PlanBanner.tsx` — nuevo. Componente de una sola línea: llama a `usePlanStatus()` y renderiza `<InlineMessage>` (ya existente en `src/components/ui`) con tono según el `kind`.
- `app/(app)/(tabs)/index.tsx` (Home) — `<PlanBanner />` agregado debajo del header, arriba de la tarjeta de resumen (caja/fiados/inventario).
- `app/(app)/(tabs)/settings.tsx` (Configuración) — `<PlanBanner />` agregado debajo del subtítulo de la página, antes de "MI COMERCIO". No se creó ninguna sección/tarjeta nueva alrededor.

Nada más se tocó. Sin cambios en `firestore.rules`, sin nuevas escrituras, sin custom claims, sin panel admin, sin cobro/WhatsApp.

### De dónde lee el plan / cómo se evitaron lecturas duplicadas

`usePlanStatus()` lee `useAuth().business.plan` — el mismo `business` que `AuthContext` ya carga en login, registro, sesión biométrica y el listener de `onAuthStateChanged` (services/userProfile.ts `getBusiness`). Ninguna pantalla ni el hook abren una lectura o suscripción de Firestore nueva. Las dos pantallas (Home y Configuración) llaman al mismo hook — la traducción de `plan` a estado vive **una sola vez** en `getPlanStatus()` (Fase 2); `usePlanStatus`/`PlanBanner` no reimplementan ninguna lógica, solo memoizan y pintan.

### Cómo se ve cada estado

| Estado (`kind`) | Texto | Tono |
|---|---|---|
| `trial-active` | "Prueba Premium · quedan X días" | info (celeste) |
| `trial-ending-soon` (≤5 días) | "Tu prueba termina en X días" | warning (ámbar) |
| `pro` | "Plan Pro activo" | success (verde) |
| `trial-expired` | "Tu prueba terminó. Activá Pro para seguir registrando." | warning (ámbar) |
| `readonly` (forzado por admin, Fase 6) | "Tu cuenta está en modo solo lectura. Contactá soporte." | warning (ámbar) |
| `suspended` | "Cuenta suspendida. Contactá soporte." | error (rojo) |
| `no-plan` (sin plan / forma inválida) | "No pudimos verificar tu plan. Contactá soporte." | warning (ámbar) |

**Ajuste 2026-07-05 (post-entrega):** texto de `trial-expired` corregido a "Tu prueba terminó. Activá Pro para seguir registrando." (antes decía "finalizó"). Tonos redefinidos: `error`/rojo queda reservado exclusivamente para `suspended`; `trial-expired` y `readonly` pasan a `warning`/ámbar — mismos textos distintos de antes, solo cambia el color. Tabla de arriba ya actualizada.

### Pro tiene prioridad sobre fechas de trial — sin cambios respecto a Fase 2

`getPlanStatus()` ya resolvía `type === 'pro'` antes de mirar `trialEndsAt` (ver sección "Fase 2" arriba). `PlanBanner` no agrega ninguna lógica de fechas — solo consume el resultado ya resuelto.

### Cómo probar Pro activo desde tu teléfono

Exactamente el procedimiento ya documentado más arriba ("Instrucciones exactas — asignar Pro manualmente por Firestore Console"): editar `businesses/{uid}.plan` desde Firestore Console, después cerrar y volver a abrir la app (o cerrar sesión y volver a entrar) para que se relea el `business`. Con el plan en `type: 'pro', status: 'active'`, tanto en Home como en Configuración deberías ver el banner verde "Plan Pro activo".

### Prueba manual antes de autorizar Fase 4

- [ ] Con tu cuenta real (probablemente `plan: 'free'` string legacy todavía): abrir Home y Configuración, confirmar que aparece el banner de `no-plan` ("No pudimos verificar tu plan...") en tono ámbar, **sin que la app crashee** y sin que ninguna otra función dejе de funcionar.
- [ ] Editar `businesses/{uid}.plan` a Pro por Firestore Console (pasos de arriba), reabrir la app, confirmar banner verde "Plan Pro activo" en ambas pantallas.
- [ ] Confirmar que ninguna acción quedó bloqueada en ningún estado — todos los botones (crear producto, registrar fiado, abrir caja, etc.) deben seguir funcionando igual que antes, sin importar el banner. Bloquear es Fase 4, no esta.
- [ ] Revisar que el banner no se vea "roto" en pantallas chicas (es una sola línea con ícono + texto, debería ajustarse solo por ser un `InlineMessage` ya usado en otros lados de la app).

**No se probó visualmente en dispositivo ni en simulador desde acá** — no hay un teléfono/emulador conectado a esta sesión. Lo validado es: `tsc --noEmit` sin errores nuevos, y los 9 tests unitarios de `getPlanStatus` (sin cambios en esta fase, ya verificados en Fase 2). La verificación visual real queda para tu prueba manual de arriba.

---

## Fase 4 — Modo solo lectura en la UI (implementado 2026-07-05)

Aprobada Fase 3 en el celular. Ver `docs/SAAS_ROADMAP.md` (este archivo) para el detalle completo; resumen ejecutivo abajo.

### Mecanismo

- `src/hooks/useWriteGuard.ts` (nuevo) — `requireWrite(accion)` ejecuta la acción si `canWrite` es true; si es false, muestra el mensaje de `RESTRICTION_MESSAGE_BY_KIND[kind]`. Única fuente de verdad: `usePlanStatus()` (Fase 2/3) — ningún archivo de esta fase vuelve a mirar `plan.type`/`status`/`trialEndsAt`.
- `src/components/ui/ConfirmDialog.tsx` — `onCancel` pasó a ser opcional; sin él, se muestra un solo botón. Cambio retrocompatible (todo lo existente sigue pasando `onCancel`).
- `src/components/PlanRestrictionDialog.tsx` (nuevo) — envoltorio de un solo botón ("Entendido") sobre `ConfirmDialog`, sin agregar ningún componente/dependencia nueva.
- Patrón: un `useWriteGuard()` por pantalla (no uno por ítem de lista) — en `cash.tsx` y en las listas de movimientos, `requireWrite` se pasa hacia abajo por props.

### Archivos modificados (18)

Core: `src/hooks/useWriteGuard.ts`, `src/components/ui/ConfirmDialog.tsx`, `src/components/PlanRestrictionDialog.tsx`.
Pantallas: `app/(app)/(tabs)/products.tsx`, `products/new.tsx`, `products/[id].tsx`, `app/(app)/(tabs)/customers.tsx`, `customers/new.tsx`, `customers/[id].tsx`, `customers/[id]/edit.tsx`, `src/components/MovementItem.tsx`, `app/(app)/categories/index.tsx`, `app/(app)/(tabs)/cash.tsx`, `cash/new-income.tsx`, `cash/new-expense.tsx`, `cash/close.tsx`, `cash/movements.tsx`, `app/(app)/(tabs)/settings.tsx`.

Sin cambios en `firestore.rules`, sin deploy, sin panel admin, sin Cloud Functions, sin custom claims.

### Puntos de escritura bloqueados

Productos: crear, editar, eliminar, importar lista inicial (+ "empezar desde cero", extensión mía sobre lo pedido).
Fiados: crear cliente, editar cliente, eliminar cliente, registrar fiado, registrar cobro, anular movimiento.
Caja: abrir caja, **reabrir caja** (extensión mía — no estaba en tu lista, pero es la misma familia de escritura que "abrir"), registrar ingreso, registrar gasto, cerrar caja, anular movimiento de caja.
Configuración: editar nombre del comercio, modificar preferencias, crear categoría, eliminar categoría.

Cada uno bloquea **dos capas**: el punto de entrada (botón/FAB que abre el formulario o el diálogo de confirmación) y la confirmación final (el botón "Guardar"/"Eliminar"/"Anular" dentro del formulario o diálogo ya abierto) — así nadie llega a un formulario abierto desde antes y logra guardar aunque el plan haya cambiado mientras tanto.

**Bug real encontrado en la auditoría final:** los diálogos de "¿Anulás este movimiento?" (fiados y caja) solo bloqueaban el botón "..." que los abre, no el botón "Anular" final dentro del diálogo — y dos `onSubmitEditing` (Enter en el teclado) en `customers/new.tsx` y `customers/[id]/edit.tsx` llamaban a `handleSave` directo, sin pasar por el guard. Los tres se corrigieron antes de reportar.

### Acciones permitidas — confirmadas sin cambios

Ver productos/precios/categorías, buscar/filtrar, ver clientes e historial de movimientos, ver historial de caja, generar PDF (`products/prices.tsx`, sin escritura a Firestore, no tocado), ver configuración, cerrar sesión, **solicitar eliminación de cuenta** (deliberadamente NO pasa por `requireWrite` — confirmado que sigue disponible en cualquier estado del plan), recuperar contraseña (flujo en `(auth)`, no tocado).

### Validación ejecutada

- `tsc --noEmit`: sin errores nuevos (mismos 2 preexistentes de siempre, en `exportData.ts`, no relacionados).
- `npm run test:unit`: 9/9 (sin cambios en `getPlanStatus`, esta fase no toca lógica de plan).
- `npm run test:rules:emulator`: 46/46 (sanity check — esta fase no toca `firestore.rules`, confirmado que sigue intacto).
- No se probó visualmente en dispositivo — ver checklist manual abajo.

### Checklist manual — 4 estados (editar `businesses/{uid}.plan` a mano por Firestore Console entre cada uno, y reabrir la app)

**1. Pro activo** (`type: pro, status: active`): todo debe funcionar sin ningún modal de restricción — crear/editar/eliminar producto, cliente, fiado/cobro, categoría, abrir/cerrar/reabrir caja, ingreso/gasto, anular movimientos, guardar nombre/preferencias.

**2. Trial activo** (`type: trial, status: active, trialEndsAt` en el futuro, +20 días): mismo checklist que Pro — todo debe funcionar igual, banner en tono info/celeste o warning si quedan ≤5 días.

**3. Trial vencido** (`type: trial, status: active, trialEndsAt` en el pasado): lectura sí (ver todo el checklist de "no bloquear" de arriba), escritura no — cada acción de la lista de bloqueados debe mostrar "Tu prueba terminó. Activá Pro para seguir registrando." en vez de ejecutarse. Probar especialmente: abrir un formulario (ej. editar producto), cambiar de estado el plan a Pro por Console SIN cerrar la app, e intentar guardar — debería seguir bloqueado hasta reabrir la app (la lectura del plan no es en vivo, ver limitación conocida de Fase 3).

**Actualizado en Fase 4.1 (más abajo): esta limitación ya no existe.** El cambio de plan por Firestore Console ahora se refleja en la app sin reabrirla ni cerrar sesión — la prueba de arriba pasa a ser: cambiar el plan CON la app abierta y ver el bloqueo aplicarse solo.

**4. Suspendido** (`status: suspended`, cualquier `type`): mismo checklist que "trial vencido" pero con el mensaje "Tu cuenta está suspendida. Contactá soporte." y tono rojo/error (el único estado que usa ese tono).

No se avanza a Fase 5.

---

## Fase 4.1 — Sincronización en tiempo real del negocio y plan (implementado 2026-07-05)

### Archivos modificados

- `src/context/AuthContext.tsx` — reescrito: reemplaza la lectura puntual de `businesses/{uid}` (`getBusiness()` en el efecto de `onAuthStateChanged`, en `register()` y en `refreshSession()`) por una única suscripción `onSnapshot`. Nuevo estado `businessSyncStatus` (`'loading' | 'synced' | 'stale' | 'error' | 'missing'`), exportado como tipo `BusinessSyncStatus`. `accountInconsistent` pasa de guardarse en `useState` a derivarse en cada render desde `userProfile`/`business`/`businessSyncStatus` — no puede desincronizarse porque no es un valor aparte.
- `src/utils/resolvePlanStatus.ts` (nuevo) — función pura `resolveSyncAwarePlanStatus(base, syncStatus)`, sin React ni Firebase, que combina el resultado de `getPlanStatus()` (Fase 2, **sin modificar**) con `businessSyncStatus`. Vive en `utils/` junto a `planStatus.ts` exactamente por la misma razón: testeable con `node:test` sin arrastrar dependencias.
- `src/utils/resolvePlanStatus.test.ts` (nuevo) — 5 tests.
- `src/hooks/usePlanStatus.ts` — simplificado a la parte de React (conecta `useAuth()` con `resolveSyncAwarePlanStatus`); la lógica en sí se movió a `resolvePlanStatus.ts`.
- `src/components/PlanBanner.tsx` — `TONE_BY_KIND` ahora cubre también `sync-loading`/`sync-stale`/`sync-error` (info/warning/warning — nunca rojo, reservado para `suspended`).
- `src/hooks/useWriteGuard.ts` — el tipo de `RESTRICTION_MESSAGE_BY_KIND` se amplió para aceptar los kinds de sync, con fallback a `status.message` para los casos que no tienen una entrada propia en esa tabla (los 3 nuevos `sync-*`, que no la necesitan porque `resolvePlanStatus.ts` ya resuelve su texto en un solo lugar).

**No se tocó `firestore.rules`, no hubo deploy, no se creó panel admin ni Cloud Functions, no se modificó `planStatus.ts`.**

### Dónde vive el listener

Un único `useEffect` dentro de `AuthProvider` (`AuthContext.tsx`), con dependencia `[uid]` (`state.firebaseUser?.uid`, un string primitivo — no el objeto `firebaseUser` completo). Ninguna pantalla (Home, Configuración, Productos, Caja, Fiados) abre su propio listener — todas leen `useAuth().business`/`businessSyncStatus`, igual que antes.

### Cómo evita listeners duplicados

- La dependencia del efecto es el **uid** (string), no el objeto `FirebaseUser`. Firebase a veces emite una nueva referencia de `FirebaseUser` con el mismo uid (ej. al refrescar el token) — React no vuelve a correr el efecto si el string no cambió, así que eso nunca dispara una resuscripción.
- React limpia (`unsubscribe()`) el efecto anterior antes de correr uno nuevo o al desmontar — es la garantía estándar de `useEffect`, no algo que haya que reforzar a mano.
- Durante `register()`, `isRegistering.current` sigue bloqueando que `onAuthStateChanged` reprocese el mismo evento de alta (como ya hacía antes de esta fase) — pero el listener de negocio es un efecto aparte, no bloqueado por esa bandera; como su dependencia es el uid, de todos modos solo se dispara una vez por uid nuevo, así que no hace falta coordinarlo con `isRegistering`.
- En logout, `onAuthStateChanged` limpia `firebaseUser` a `null` → el uid pasa a `undefined` → el efecto corre su cleanup (unsubscribe) y no crea uno nuevo (`if (!uid) return`).

### Qué pasa offline

Firebase JS SDK en este proyecto usa `getFirestore(app)` sin `persistentLocalCache` (no hay IndexedDB en React Native, así que el cache es en memoria, no en disco). Dos escenarios distintos:

1. **Se cae la conexión con la app ya abierta y ya sincronizada:** el listener sigue vivo, sigue sirviendo el último valor conocido (en memoria), y con `includeMetadataChanges: true` entrega un snapshot con `metadata.fromCache: true` en cuanto detecta que ya no puede confirmar con el servidor → `businessSyncStatus` pasa a `'stale'` → `canWrite` se fuerza a `false` sin importar lo que diga el plan cacheado (aunque sea Pro) → el banner y cualquier intento de escritura muestran "Sin conexión. No pudimos validar tu plan para registrar cambios." — exactamente el texto de ejemplo que pediste.
2. **La app se abre ya sin conexión, sin haber tenido nunca una sesión previa con cache en memoria (ej. primer uso offline):** el listener no tiene nada que servir todavía — no llega ningún snapshot hasta que vuelva la conexión. `businessSyncStatus` se queda en `'loading'` (mensaje: "Estamos validando tu cuenta. Esperá un momento.") — sigue bloqueando escritura, no inventa nada, no hay timeout artificial agregado (no se pidió y hubiera sido soporte offline nuevo, fuera de alcance).

En ningún caso se cierra sesión ni se borran datos visibles — `business` conserva el último valor conocido salvo que el listener confirme `'missing'`.

### Qué pasa si falta `businesses/{uid}`

El snapshot llega con `snap.exists() === false` → `business` se pone en `null` y `businessSyncStatus` en `'missing'` — **no se recrea nada, no se genera un trial nuevo** (eso solo lo hace `repairIncompleteRegistration`, que no se tocó y que ya tenía esta misma protección desde el bloqueo de seguridad anterior). `accountInconsistent` se deriva como verdadero (perfil existe, negocio confirmadamente no) y `RootGuard` (sin cambios) redirige a `/account-issue`, que tampoco se tocó. Sigue sin permitir acceso operativo.

### Manejo de errores

El callback de error de `onSnapshot` hace `console.warn('[AuthContext:businessListener]', uid, err)` — prefijo estable pensado para poder filtrarlo el día que se integre Crashlytics/Sentry — y pasa `businessSyncStatus` a `'error'`. Nunca se le muestra al usuario el error técnico de Firestore; ve el mismo tipo de mensaje genérico y seguro que en `stale`/`loading`.

### Nota de comportamiento (no una regresión de seguridad)

Antes de esta fase, la pantalla de carga inicial (`RootGuard`) esperaba a que `userProfile` **y** `business` estuvieran listos antes de mostrar Home/Configuración. Ahora `loading` se resuelve en cuanto `userProfile` llega, y `business` puede tardar un instante más en aparecer vía el listener — durante esa ventana (típicamente sub-segundo con conexión) las pantallas pueden mostrar un valor por defecto (ej. "Mi Almacén" en vez del nombre real) antes de que el listener entregue el primer snapshot. No es un hueco de seguridad: `canWrite` sigue en `false` mientras `businessSyncStatus === 'loading'`. Es un matiz cosmético que no se pidió resolver explícitamente; si se nota molesto en la prueba manual, avisame y lo ajusto.

### Tests

- **Unitarios nuevos:** `src/utils/resolvePlanStatus.test.ts`, 5 casos — incluye el caso crítico "un plan cacheado que dice Pro/`canWrite:true` debe terminar en `canWrite:false` bajo `loading`/`stale`/`error`" (no se inventan permisos por cache).
- **`npm run test:unit`: 14/14** (9 de `planStatus.test.ts`, sin cambios, + 5 nuevos).
- **`tsc --noEmit`:** sin errores nuevos (mismos 2 preexistentes de siempre).
- No se re-corrió `test:rules:emulator` — esta fase no tocó `firestore.rules` ni ningún script administrativo.

### Checklist manual exacto (Expo, con Firestore Console abierto en paralelo)

1. Abrir la app con la cuenta ya en `type: pro, status: active` (dejada así en la fase anterior).
2. Confirmar banner verde "Plan Pro activo" en Inicio y Configuración.
3. **Sin cerrar la app**, en Firestore Console cambiar `businesses/{uid}.plan.status` a `readonly`.
4. Sin tocar el teléfono, esperar unos segundos — el banner debe pasar solo a "Tu cuenta está en modo solo lectura. Contactá soporte." (ámbar), sin reabrir la app ni cerrar sesión.
5. Intentar cualquier acción de escritura (ej. crear producto) — debe mostrar el modal de restricción, no ejecutar nada.
6. **Sin cerrar la app**, cambiar `status` a `suspended`.
7. Confirmar que el banner cambia a "Tu cuenta está suspendida. Contactá soporte." (rojo) y que las escrituras siguen bloqueadas.
8. Volver a cambiar `status` a `active` (con `type: pro`).
9. Confirmar que el banner vuelve a verde "Plan Pro activo" **solo**, y que las acciones de escritura vuelven a funcionar sin reiniciar nada.
10. Abrir un formulario de escritura (ej. "Registrar gasto") mientras el plan está en `active`/Pro. **Sin cerrarlo**, cambiar `status` a `readonly` en Firestore Console. Volver al teléfono y tocar "Guardar" — debe mostrar el modal de restricción y no ejecutar el servicio (el ejemplo exacto que diste).
11. Activar modo avión en el teléfono. Confirmar que el banner cambia a "Sin conexión. No pudimos validar tu plan para registrar cambios." (ámbar) y que ningún botón de escritura ejecuta nada — solo muestra el modal. Los datos ya cargados (productos, clientes, historial) deben seguir visibles.
12. Desactivar modo avión — confirmar que el banner vuelve a reflejar el estado real del plan sin reiniciar la app.

No se avanza a Fase 5.

---

## Fase 5 — Enforcement real en Firestore Rules (implementado 2026-07-05 — **desplegado**, ver "Estado actual" al inicio del documento)

Autorizada solo esta fase. `planIsActive(businessId)` (dormida desde Fase 1) queda conectada a `create`/`update`/`delete` de las 6 subcolecciones de negocio. **No se tocó UI, panel admin, Cloud Functions ni cobros. No se desplegó nada — sigue pendiente tu OK.**

### Archivos modificados

- `firestore.rules` — diff real abajo.
- `scripts/rules-tests/plan-enforcement.test.mjs` (nuevo) — 30 tests.
- `scripts/rules-tests/account-lifecycle.test.mjs` — un test con subtests anidados (`t.test`) se reescribió como 4 tests planos, por la razón que se explica en "Hallazgo" más abajo. Misma cobertura, cero cambio de comportamiento probado.

### Diff de `firestore.rules`

**Comentario de `planIsActive()` actualizado** (antes decía "Prepared for Fase 5 — NO se usa todavía"):
```diff
- // Prepared for Fase 5 — NO se usa todavía en ninguna regla de abajo.
- // El modo solo-lectura/suspendido recién bloqueará escrituras cuando
- // la UI de Fase 4 ya sepa mostrar el mensaje correcto al usuario.
+ // Fase 5: conectada a create/update/delete de las 6 subcolecciones de
+ // negocio (products, categories, customers, customer movements,
+ // cashSessions, cashMovements). NO se usa en `businesses/{businessId}`
+ // en sí — ese documento tiene sus propias reglas (planUnchanged(),
+ // deletionRequestOk()) que ya garantizan lo que hace falta ahí, y
+ // agregar planIsActive() a su `update` bloquearía "Solicitar
+ // eliminación de cuenta" para cuentas readonly/suspended/vencidas,
+ // que debe seguir disponible siempre.
  function planIsActive(businessId) { ... }  // sin cambios en el cuerpo
```

**Las 6 subcolecciones** (patrón idéntico en cada una — se muestra `products` completo, el resto solo la línea que cambió):
```diff
  match /products/{productId} {
-   allow read, create, update, delete: if isOwner(businessId);
+   allow read: if isOwner(businessId);
+   allow create, update, delete: if isOwner(businessId) && planIsActive(businessId);
  }

  match /categories/{categoryId} {
-   allow read, create, update, delete: if isOwner(businessId);
+   allow read: if isOwner(businessId);
+   allow create, update, delete: if isOwner(businessId) && planIsActive(businessId);
  }

  match /customers/{customerId} {
-   allow read, create, update, delete: if isOwner(businessId);
+   allow read: if isOwner(businessId);
+   allow create, update, delete: if isOwner(businessId) && planIsActive(businessId);

    match /movements/{movementId} {
-     allow read, create, update: if isOwner(businessId);
+     allow read: if isOwner(businessId);
+     allow create, update: if isOwner(businessId) && planIsActive(businessId);
    }
  }

  match /cashSessions/{sessionId} {
-   allow read, create, update: if isOwner(businessId);
+   allow read: if isOwner(businessId);
+   allow create, update: if isOwner(businessId) && planIsActive(businessId);

    match /cashMovements/{movementId} {
-     allow read, create, update: if isOwner(businessId);
+     allow read: if isOwner(businessId);
+     allow create, update: if isOwner(businessId) && planIsActive(businessId);
    }
  }
```

**Sin cambios:** `businesses/{businessId}` (read/create/update/delete), `users/{userId}`, el catch-all, y las funciones `isOwner`, `planUnchanged`, `deletionRequestOk`, `isValidNewTrialPlan`. `deletionRequest` sigue permitido (vive en `businesses`, no tocado) y el `plan` sigue inmutable para la APK (`planUnchanged()`, sin cambios).

### Resultado de la suite Emulator

**72/72 tests pasan**, corrido dos veces seguidas para confirmar que no es casualidad (ver "Hallazgo" abajo, el motivo de por qué insistí en correrlo dos veces).

| Archivo | Tests | Qué cubre en esta fase |
|---|---|---|
| `business-plan.test.mjs` | 29 | Sin cambios — regresión de fases anteriores |
| `account-lifecycle.test.mjs` | 14 | Sin cambios de cobertura; 1 test reescrito de anidado a plano |
| `plan-enforcement.test.mjs` | 30 (nuevo) | Fase 5 completa |

**Negativos — SIEMPRE con cliente autenticado (`testEnv.authenticatedContext`), nunca Admin SDK/Console para la acción bajo prueba** (tal como pediste — `withSecurityRulesDisabled` solo se usa para sembrar datos previos):
- Dueño intenta modificar `plan` / borrar `business` → ya cubierto desde Fase 1/control de seguridad anterior (`business-plan.test.mjs`, `account-lifecycle.test.mjs`), no duplicado acá.
- **Trial vencido**: create/update/delete denegados, exhaustivo en las 6 colecciones (8 tests).
- **Readonly**: create/update/delete denegados, muestra representativa en `products` (mismo `planIsActive()` que trial vencido — no hace falta repetir 6 colecciones para cada estado).
- **Suspended**: ídem.
- **Plan ausente**: probado con el campo `plan` completamente inexistente (legacy sin migrar) Y con la forma string vieja `plan: 'free'` — ambos denegados.

**Positivos (control, para probar que el enforcement no rompe lo legítimo):**
- Pro activo: create/update/delete permitidos, exhaustivo en las 6 colecciones.
- Trial vigente (no vencido): permitido, muestra representativa.

**Regresión de operaciones reales con batch/transaction** (reproducen exactamente los patrones de `src/services/customers.ts` y `src/services/cash.ts`):
- Registrar fiado (transacción de 2 escrituras) — Pro.
- Registrar cobro con caja abierta (transacción de **4** escrituras) — Pro.
- Anular fiado (transacción de 3 escrituras) — Pro.
- Abrir caja, cerrar caja.
- Registrar ingreso/gasto (batch de 2 escrituras) — Pro.
- Anular movimiento de caja (transacción de 3 escrituras) — Pro.
- La misma "registrar fiado" repetida bajo trial vencido → la transacción **completa** se rechaza (no un create aislado de prueba — el flujo real completo).

### Hallazgo real durante la implementación (harness de tests, no un bug de Rules)

Al escribir el control positivo "Pro activo: las 6 colecciones" como un solo test con subtests anidados (`t.test`, el mismo patrón ya usado en Fase 1/control de seguridad), apareció un fallo **no determinístico**: "Null value error" al evaluar `planIsActive()`, como si `plan` viniera vacío pese a haber sido sembrado momentos antes. Aislé el caso exhaustivamente (bisección manual, más de 10 corridas contra el emulador): las mismas aserciones, con el mismo plan Pro sembrado, **pasan de forma consistente como tests planos** y **fallan de forma consistente como subtests anidados**, específicamente cuando corren después de bastantes pruebas previas contra el mismo emulador. Es una rareza de la combinación `node:test` + `@firebase/rules-unit-testing` bajo carga, no un problema de `firestore.rules` — confirmado porque el mismo enforcement, probado de otra forma, funciona perfecto. Reescribí ese test (y uno análogo preexistente en `account-lifecycle.test.mjs` que mostró el mismo síntoma al correr las 3 suites juntas) como tests planos independientes. Corrí la suite completa dos veces seguidas después del cambio para confirmar que quedó estable.

### Límites de access calls en batch/transaction

Firestore documenta un máximo de **10** llamadas `get()`/`exists()` en Rules para una escritura de un solo documento, y **20** para requests multi-documento (transacciones y batched writes). Cada subcolección ahora dispara **una** llamada `get()` (dentro de `planIsActive()`) por documento escrito. El caso más grande encontrado en el código real es "registrar cobro con caja abierta" (`registerMovement` en `src/services/customers.ts`): una transacción con **4 escrituras** (cliente, movimiento, movimiento de caja, sesión de caja) → **4 llamadas `get()`**, muy por debajo del límite de 20. El resto de las operaciones reales (anular fiado, anular movimiento de caja: 3 escrituras/3 `get()`; registrar ingreso/gasto: 2/2; abrir/cerrar caja: 1/1) están todavía más lejos del límite. No hay riesgo de excederlo con el código actual.

*(Nota de honestidad: estos límites los tomo de la documentación oficial de Firestore Rules, no los pude verificar en vivo contra el emulador — no tengo certeza de que el emulador los haga cumplir igual que producción. Dado el margen amplísimo (4 de 20), no debería importar, pero si querés blindarlo del todo antes del deploy, se puede confirmar contra la documentación actual de Firebase.)*

### Checklist manual — Expo (después del deploy, cuando lo autorices)

No lo pediste ejecutar todavía (dijiste explícitamente no desplegar), pero lo dejo preparado para cuando llegue el momento:

1. Con tu cuenta en Pro activo: crear producto, cliente, categoría; registrar fiado y cobro; abrir/cerrar caja; registrar ingreso/gasto; anular un movimiento — todo debe seguir funcionando exactamente igual que hoy (Fase 4 ya bloqueaba en UI cuando correspondía; ahora Rules lo respalda).
2. Cambiar el plan a `readonly` por Firestore Console (con la app abierta, aprovechando el listener de Fase 4.1) e intentar cualquier acción de escritura — debe verse el modal de restricción de la UI (Fase 4), y si por algún motivo la UI fallara en bloquear, Firestore debe rechazar igual con `permission-denied` (no debería llegar a verse, pero es la garantía de fondo).
3. Repetir con `suspended` y con trial vencido.
4. Confirmar que **ver** productos, clientes, historial de caja, generar PDF y **solicitar eliminación de cuenta** siguen funcionando en cualquiera de esos 3 estados.
5. Volver a `pro`/`active` y confirmar que todo vuelve a funcionar.

### Pendiente para tu OK (registro histórico de ese momento)

- [x] Revisar este resultado
- [x] Autorizar deploy (`firebase deploy --only firestore:rules`)
- [x] Autorizar avance a Fase 6

**Actualización:** estas reglas ya están desplegadas (ver "Estado actual" al inicio del documento). En el momento de escribir esta sección todavía no lo estaban — se dejó el registro tal cual quedó entonces.

---

## Fase 5.1 — Enforcement en businesses/{businessId} (implementado 2026-07-05 — **desplegado**, ver "Estado actual" al inicio del documento)

Cierre de un hueco real que encontraste: Fase 5 protegió las 6 subcolecciones pero no el documento raíz del negocio, donde viven `updateBusiness`/`updateBusinessPreferences` (nombre, preferencias) — una cuenta readonly/suspended/vencida podía seguir guardando Configuración a nivel Rules, aunque la UI (Fase 4) ya se lo impidiera. **Ya desplegado — ver "Estado actual" al inicio del documento.**

### Auditoría de escritores reales de `businesses/{uid}` (punto 5 de tu pedido)

| Función | Tipo de escritura | Camino que necesita |
|---|---|---|
| `createUserAndBusiness` | create (batch, registro) | Sin cambios — regla de `create` intacta |
| `repairIncompleteRegistration` | create (solo si ningún doc existe) | Sin cambios |
| `updateBusiness` (nombre) | update operativo | Camino A — plan activo |
| `updateBusinessPreferences` | update operativo | Camino A — plan activo |
| `requestAccountDeletion` | update, solo `deletionRequest` | Camino B — siempre disponible |
| **`importInitialProducts`/`declineInitialProducts`** | update operativo (`importedInitialProducts: true`, vía `batch.set(..., {merge:true})`) | Camino A — plan activo |

La última fila **no estaba en tu lista explícita** — la encontré al auditar: ambas funciones (`src/services/importInitialProducts.ts`) marcan `businesses/{uid}.importedInitialProducts` dentro del mismo batch que crea los productos importados. Ya estaba gateada en la UI desde Fase 4 (`requireWrite` en `products.tsx`); ahora también lo está a nivel Rules, consistente con el resto.

**Login, perfil y sesión no tocan este documento en absoluto** — `updateLastLogin` escribe en `users/{uid}`, no en `businesses/{uid}`. Nada de auth/onboarding/biometría queda afectado.

### Diseño: dos caminos excluyentes

```js
allow update: if isOwner(businessId) && planUnchanged() && (
  (isPlanActiveValue(resource.data.plan) && deletionRequestUntouched())
  || isNewDeletionRequestOnly()
);
```

- **Camino A (operativo):** exige plan activo (Pro o Trial vigente) y que `deletionRequest` no cambie en esa escritura.
- **Camino B (`deletionRequest`):** exige que `deletionRequest` sea la única clave que cambió (`request.resource.data.diff(resource.data).affectedKeys().hasOnly(['deletionRequest'])`), que no existiera antes, y que tenga forma exacta — disponible sin importar el estado del plan, incluso ausente.

Un mismo update no puede satisfacer los dos caminos a la vez por diseño (A exige `deletionRequest` sin tocar; B exige que sea lo único que cambió), así que "crear `deletionRequest` + cambiar nombre" no entra por ninguno de los dos.

**Optimización de paso:** `isPlanActiveValue(plan)` separa la lógica de "plan activo" del `get()` que la alimenta. Para las subcolecciones (`planIsActive(businessId)`) hace falta el `get()` porque `resource` es un documento distinto. Para `businesses/{businessId}` en sí, `resource.data.plan` ya es gratis (es el propio documento) — usar `planIsActive(businessId)` ahí hubiera pagado una lectura redundante contra sí mismo.

### Diff puntual de `businesses/{businessId}`

```diff
-      allow update: if isOwner(businessId) && planUnchanged() && deletionRequestOk();
+      allow update: if isOwner(businessId) && planUnchanged() && (
+        (isPlanActiveValue(resource.data.plan) && deletionRequestUntouched())
+        || isNewDeletionRequestOnly()
+      );
```

Y las funciones helper: `deletionRequestOk()` (conflaba "sin cambios" + "recién creada") se separó en `deletionRequestUntouched()` + `isNewDeletionRequestOnly()` (esta última suma la exigencia de aislamiento vía `.diff().affectedKeys().hasOnly([...])`, nueva). `planIsActive(businessId)` se refactorizó para reusar una nueva `isPlanActiveValue(plan)` sin cambiar su comportamiento externo (las 6 subcolecciones de Fase 5 no necesitaron ningún cambio).

Sin cambios: `create`, `delete`, catch-all, `users/{userId}`, las 6 subcolecciones.

### Tests

**87/87 pasan, corrido dos veces seguidas** (sin ningún fallo esta vez — la inestabilidad de subtests anidados de Fase 5 ya había quedado resuelta).

Nuevos en `plan-enforcement.test.mjs` (15 tests): Pro/Trial vigente actualizan nombre+preferencias (permitido); Trial vencido/readonly/suspended/plan-ausente intentan lo mismo (rechazado); readonly/suspended/trial-vencido crean `deletionRequest` válido (permitido); crear `deletionRequest` + cambiar nombre o preferencias en la misma escritura (rechazado); modificar o borrar un `deletionRequest` existente (rechazado); regresión de cuenta activa guardando nombre+preferencias juntos (permitido).

**Un test existente se actualizó a propósito** (`business-plan.test.mjs`): "una cuenta legacy sin plan sigue pudiendo actualizar otros campos" pasó de `assertSucceeds` a `assertFails` — es exactamente el cambio de comportamiento que pediste (plan ausente ya no hace updates operativos), y se agregó un test hermano confirmando que esa misma cuenta legacy sí puede crear `deletionRequest`.

### Pendiente para tu OK (registro histórico de ese momento)

- [x] Revisar este resultado
- [x] Autorizar deploy (`firebase deploy --only firestore:rules`)
- [x] Autorizar avance a Fase 6

**Actualización:** estas reglas ya están desplegadas (ver "Estado actual" al inicio del documento).

---

## Fase 6 — Panel Admin móvil interno (implementado 2026-07-05 — **desplegado**, ver "Estado actual" al inicio del documento)

Cambio de rumbo pedido explícitamente: nada de panel web, Vite ni Hosting. El
panel de administración vive **dentro de la APK de Mi Almacén**, en una ruta
protegida que solo tu cuenta puede ver, y su backend son Cloud Functions
callable (requieren plan Blaze — ver sección al final). Todo lo implementado
abajo se probó primero contra emuladores. **Actualización posterior:** Blaze,
Rules, Functions e Indexes ya están desplegados y el custom claim `admin` ya
está asignado — ver "Estado actual" al inicio del documento. En el momento
de escribir esta sección, nada de eso estaba desplegado todavía; se dejó el
registro tal cual quedó entonces.

### Modelo de permisos: dos conceptos separados, como pediste

1. `businesses/{uid}.plan` (`type: 'pro'`, `status: 'active'`) → habilita las
   funciones normales de Mi Almacén. Sin cambios respecto a Fase 1-5.1.
2. Custom claim de Firebase Auth `admin: true` → habilita **exclusivamente**
   el Panel Admin. No es un plan "master" ni un tercer valor de `PlanType`;
   vive en el ID token, no en Firestore, y ningún cliente puede otorgárselo a
   sí mismo (solo `scripts/bootstrap-admin.mjs`, vía Admin SDK).

`AuthContext` resuelve `isAdmin` llamando `firebaseUser.getIdTokenResult()` y
leyendo `claims.admin === true` — no hay ningún camino donde el cliente lea
o escriba ese claim.

### Backend: 5 Cloud Functions callable (`functions/index.js`)

Paquete Node nuevo y separado (`functions/`, CommonJS, sin build step — se
evitó un pipeline de TypeScript para esto por ser complejidad que no hace
falta en un backend de 5 funciones). Cada una empieza con `requireAdmin()`:
rechaza con `unauthenticated` si no hay sesión, con `permission-denied` si
`request.auth.token.admin !== true`. Ninguna toca `products`, `categories`,
`customers`, `movements`, `cashSessions` ni `cashMovements` — el panel nunca
lee ni escribe datos operativos o financieros de un negocio.

| Function | Qué hace |
|---|---|
| `adminGetDashboard` | Cuenta negocios por estado (`select('plan','deletionRequest')`, clasificación en memoria) — trials activos/vencidos, Pro, solo lectura, suspendidos, solicitudes de eliminación pendientes, total. |
| `adminListBusinesses` | Lista todos los negocios + email del dueño (`db.getAll(...)` batched contra `users/{uid}`), con búsqueda y filtro por estado (en memoria, aceptable a esta escala). |
| `adminGetBusinessDetail` | Nombre, email del dueño, UID, fecha de alta, plan completo, `deletionRequest` si existe, y las últimas 20 acciones de `adminAuditLogs` para ese negocio. Nunca lee las subcolecciones operativas. |
| `adminChangePlan` | Transacción: lee el plan actual, valida la acción, escribe el nuevo plan Y el log de auditoría en el mismo commit atómico. |
| `adminListAuditLogs` | Historial global o filtrado por negocio, orden descendente por fecha. |

**`adminChangePlan`** — 5 acciones (`activate_pro`, `extend_trial`,
`set_readonly`, `suspend`, `reactivate`), todas validadas server-side antes
de tocar la transacción:

- `extend_trial`, `set_readonly`, `suspend` exigen `reason` no vacío (como pediste); `reactivate` y `activate_pro` no.
- `extend_trial` exige `days ∈ {1,3,7,14,30}` y que el negocio esté en `trial` (activo o vencido) — rechaza con `failed-precondition` sobre una cuenta Pro. Extiende desde `max(trialEndsAt actual, ahora)`, así extender un trial ya vencido cuenta los días desde hoy, no desde una fecha pasada.
- `set_readonly`/`suspend`/`reactivate` rechazan con `failed-precondition` si el negocio no tiene ningún `plan` asignado todavía (le falta pasar por `activate_pro` primero).
- `activate_pro` preserva `trialStartedAt`/`trialEndsAt` históricos si existían (no los borra ni inventa una ventana falsa), y solo agrega `proActivatedAt`.

Cada cambio escribe en `adminAuditLogs/{id}`: `actorUid`, `businessId`,
`action`, `reason` (o `null`), `previousPlan`, `nextPlan`, `createdAt` — el
mismo `Timestamp.now()` se usa para el negocio y el log dentro de la misma
transacción, así ambos documentos quedan con la fecha exacta y coincidente.

### Firestore: un solo bloque nuevo, aditivo

```
match /adminAuditLogs/{logId} {
  allow read, write: if false;
}
```

Las Functions usan el Admin SDK, que ignora Rules por completo — este bloque
existe solo para negar explícitamente cualquier acceso directo desde un
cliente (incluso vos mismo autenticado en la app) a esta colección, sin
depender del catch-all. **No se tocó ninguna regla ya desplegada** de Fase
1-5.1 — es un `match` nuevo e independiente, agregado antes del catch-all.
También se agregó un índice compuesto (`adminAuditLogs`: `businessId` ASC +
`createdAt` DESC) en `firestore.indexes.json`, necesario para
`adminGetBusinessDetail`/`adminListAuditLogs` cuando filtran por negocio.

### Cliente: dónde vive todo

- `src/services/firebase.ts`: agrega `functions` (`getFunctions(app)`).
- `src/services/admin.ts`: capa fina de `httpsCallable` sobre las 5 Functions — el único lugar del cliente que las llama.
- `src/models/index.ts`: tipos `Admin*` (formas ya serializadas — fechas como ISO string, no `Timestamp`, porque cruzan el protocolo callable).
- `src/context/AuthContext.tsx`: nuevo `isAdmin` en `AuthState`, resuelto con `getIdTokenResult()` en cada lugar donde ya se resolvía `firebaseUser` (login, registro, `refreshSession`, `onAuthStateChanged`) — ningún listener nuevo, ninguna lectura de Firestore adicional.
- `app/(app)/admin/_layout.tsx`: **guardia de ruta real**, no solo del botón — si `isAdmin` es falso, `<Redirect href="/" />` antes de renderizar nada. Entrar por navegación directa a `/admin/...` sin el claim no llega a pedir ni mostrar ningún dato.
- `app/(app)/admin/index.tsx`: Resumen Admin (6 métricas + link a Negocios).
- `app/(app)/admin/businesses.tsx`: lista con `SearchBar` + chips de filtro por estado (reutiliza `ListRow`, `Chip`, `EmptyState` ya existentes).
- `app/(app)/admin/business/[businessId].tsx`: detalle (solo los campos que pediste — nada de caja/fiados/productos) + las 5 acciones, cada una con confirmación y, cuando corresponde, un campo de motivo obligatorio antes de poder confirmar.
- `app/(app)/(tabs)/settings.tsx`: sección "ADMINISTRACIÓN" al final, condicionada a `isAdmin` — invisible para cualquier otra cuenta.
- `app/(app)/_layout.tsx`: registra el grupo `admin` igual que `(tabs)`.

### Tests

**Rules: 89/89** (87 de Fase 5.1 + 2 nuevos confirmando que nadie —ni con
Rules deshabilitadas para sembrar datos, ni el propio dueño autenticado—
puede leer o escribir `adminAuditLogs` directamente desde un cliente).

**Functions: 19/19**, contra Functions + Firestore + Auth Emulator juntos
(`npm run test:functions:emulator`), con usuarios reales de Auth Emulator
(uno con `admin: true` vía `setCustomUserClaims`, otro sin el claim) y
`signInWithCustomToken` desde el SDK cliente — nunca se llamó a una Function
"como admin" simulando el auth, siempre con un ID token real que sí o no
trae el claim. Cobertura: portero (sin sesión → `unauthenticated`; sin claim
→ `permission-denied`, las 5 Functions); conteos exactos del dashboard contra
6 negocios sembrados en todos los estados posibles; búsqueda y filtro de
`adminListBusinesses`; que `adminGetBusinessDetail` no incluya ninguna clave
operativa (`products`/`customers`/`cashSessions`/etc.) y rechace con
`not-found` si el negocio no existe; las 5 acciones de `adminChangePlan`
(éxito y auditoría de `activate_pro`; motivo obligatorio y validación de
días de `extend_trial`, incluyendo el rechazo `failed-precondition` sobre
una cuenta Pro; motivo obligatorio de `set_readonly`/`suspend`; ciclo
suspender→reactivar; rechazo `failed-precondition` sobre negocio sin plan;
acción inválida rechazada; negocio inexistente rechazado); orden descendente
y alcance (por negocio vs. global) de `adminListAuditLogs`.

**TypeScript**: `tsc --noEmit` solo muestra los 2 errores preexistentes y no
relacionados de `exportData.ts` (confirmados desde antes de Fase 1) — cero
regresiones.

### Flujo para asignarte `admin: true` (cuando decidas ejecutarlo)

`scripts/bootstrap-admin.mjs` no se tocó ni se ejecutó — sigue siendo
dry-run por defecto y sigue validando el proyecto ADC antes de escribir
nada. Cuando quieras activarlo:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\fuera-del-repo\clave.json"
node scripts/bootstrap-admin.mjs --uid=<TU_UID>              # dry-run, no escribe nada
node scripts/bootstrap-admin.mjs --uid=<TU_UID> --apply      # asigna admin:true + Pro indefinido
```

Después: **cerrá sesión y volvé a entrar** en la app — los custom claims no
aparecen en una sesión ya abierta hasta que Firebase emite un ID token
nuevo (`resolveIsAdmin()` en `AuthContext` lee el claim del token vigente,
no puede detectar un claim asignado después de que ese token ya se emitió).

### Checklist para probar el panel móvil (después del deploy)

1. Con `admin: true` asignado y sesión reiniciada: en Configuración debe aparecer "ADMINISTRACIÓN" al final, con el link a "Panel de administración". Sin el claim, esa sección no debe aparecer en absoluto.
2. Entrar al Resumen Admin: los 6 conteos deben coincidir con la realidad de tus negocios de prueba.
3. Ir a "Ver negocios": buscar por nombre/email, filtrar por cada estado, confirmar que la lista y los filtros coinciden.
4. Abrir el detalle de un negocio: confirmar que se ven exactamente los campos pedidos (nombre, dueño/email, UID, alta, plan/estado, trialEndsAt, proActivatedAt, deletionRequest si existe, historial) y nada de caja/fiados/productos.
5. Probar cada acción: Activar Pro, Extender Trial (probar los 5 valores de días), Pasar a solo lectura (con motivo), Suspender (con motivo), Reactivar — cada una debe pedir confirmación, las que exigen motivo no deben dejar confirmar sin texto, y el historial debe reflejar cada acción con fecha y motivo.
6. Intentar entrar a `/admin` navegando manualmente (ej. deep link) con una cuenta sin `admin: true` — debe redirigir sin mostrar nada.
7. Confirmar que ninguna pantalla normal de Mi Almacén (Productos, Fiados, Caja, Configuración) cambió de comportamiento.

### Qué requiere activar Blaze

**Cloud Functions (las 5 callable) no se pueden desplegar en el plan
Spark** — Firebase exige Blaze para cualquier Cloud Function desde 2020,
incluso callable sin egress saliente propio. **Actualización:** Blaze ya
está activo y las 5 Functions ya están desplegadas (ver "Estado actual" al
inicio del documento) — en el momento de escribir esta sección todavía no
lo estaban, y el registro de abajo quedó tal cual se escribió entonces.
Cuando se desplegó, se usó: `firebase deploy --only
functions,firestore:rules,firestore:indexes` (o por separado), con Blaze
activo y la cuenta correcta (con acceso confirmado al proyecto) logueada en
la CLI. Blaze tiene una capa gratuita mensual que cubre por lejos el volumen
de un panel admin de un solo usuario — no implica cobros automáticos ni
tarjeta cobrándose salvo que se supere esa capa (que para 5 Functions de bajo tráfico
es extremadamente improbable).

### Cómo se reutiliza este backend cuando exista panel web

Las 5 Cloud Functions no saben ni les importa quién las llama — no hay nada
de React Native, Expo ni mobile-specific en `functions/index.js`. El día que
exista un panel web, ese frontend llamaría exactamente a las mismas
`httpsCallable` (mismo nombre, mismos parámetros, misma respuesta) desde el
SDK web de Firebase en vez del SDK de React Native — cero cambios en
`functions/`, `firestore.rules` ni en el modelo de datos. Es la misma razón
por la que no se creó una versión "para mobile" de la lógica: el backend ya
es agnóstico del cliente.

### Restricciones respetadas

Sin panel web, sin Vite, sin Vercel/Hosting, sin cobros automáticos, sin
Mercado Pago, sin roles múltiples, sin eliminación real de cuentas, sin
tocar Caja/Fiados/Productos ni ninguna regla ya desplegada de Fase 1-5.1,
sin mostrar datos financieros de otro negocio.

### Pendiente para tu OK (registro histórico de ese momento)

- [x] Revisar este resultado
- [x] Decidir cuándo activar Blaze en el proyecto
- [x] Resolver el acceso de la Firebase CLI al proyecto y desplegar
- [x] Ejecutar `bootstrap-admin.mjs --apply` para asignar `admin: true`
- [x] Autorizar deploy de Functions + Rules + Indexes
- [ ] Probar el panel en la APK real (pendiente real — ver "Estado actual" al inicio del documento)

---

## Fase 7 — Contacto/activación manual (implementado 2026-07-06)

Cierra el hueco real de UX que quedó abierto desde Fase 3: el cliente podía
ver "Contactá soporte" o "Activá Pro" en texto, pero no tenía ningún link ni
botón — tenía que buscar el contacto en `MANUAL_USUARIO.md`, que no está
enlazado desde la app. Difiere de la planificación original de la sección
14 ("Texto... contactanos por WhatsApp"): se usó el sitio propio
(`SUPPORT_URL = https://www.delgadodev.com.ar`, en `src/constants/index.ts`)
en vez de WhatsApp — mismo patrón (link de salida, activación 100% manual
desde el panel admin de Fase 6), solo cambia el canal.

### Qué se agregó

- **`InlineMessage`** (`src/components/ui/InlineMessage.tsx`): nuevo par de
  props opcionales `actionLabel`/`onPressAction` — texto subrayado tocable
  al final de la fila. No rompe ningún uso existente (props opcionales).
- **`PlanBanner`** (`src/components/PlanBanner.tsx`): el CTA ("Activar Pro"
  o "Contactar soporte", según el kind) solo se muestra en los estados que
  requieren una decisión: `trial-ending-soon`, `trial-expired`, `readonly`,
  `suspended`, `no-plan`. Exporta `HEALTHY_PLAN_KINDS` (`pro`,
  `trial-active`) y `openSupportSite()`, reutilizados por `settings.tsx`.
- **Banner oculto en estados sanos** (`pro`, `trial-active`): decisión de
  UX explícita — mostrar el banner completo en las ~15 pantallas de la app
  durante los ~25 días "normales" del trial (o indefinidamente en Pro) es
  el tipo de aviso que un cliente aprende a ignorar. El banner ahora
  **no aparece en ninguna pantalla de trabajo** (Productos, Clientes, Caja,
  Categorías, Home) cuando el plan está sano; sigue apareciendo tal cual en
  los 5 estados que requieren acción.
- **Indicador discreto en Configuración** (`app/(app)/(tabs)/settings.tsx`):
  como el banner desaparece en `pro`/`trial-active`, se agregó una fila
  chica (reutiliza `ListRow`, mismo estilo que "Administrar categorías") que
  se muestra únicamente en esos dos casos — "Pro activo" sin acción, o el
  mensaje de días restantes con toda la fila tocable (abre `SUPPORT_URL`)
  para poder activar Pro en cualquier momento del trial, no solo en los
  últimos 5 días.
- **Acceso permanente a soporte** (`settings.tsx`, sección "AYUDA"): fila
  fija "Contactar soporte", visible sin importar el estado del plan — para
  que el cliente pueda escribir por cualquier motivo sin depender de que
  algo esté roto o por vencer.
- **`PlanRestrictionDialog`** (`src/components/PlanRestrictionDialog.tsx`):
  el modal de bloqueo ahora tiene un segundo botón cuyo label distingue
  "Activar Pro" (trial vencido) de "Contactar soporte" (el resto), derivado
  del texto del mensaje — no se tocaron los ~14 call sites de
  `useWriteGuard` para pasar el `kind`, porque cada mensaje ya es un texto
  fijo por estado (mismo criterio que `RESTRICTION_MESSAGE_BY_KIND`).

### Resumen de cuándo se ve cada cosa

| Estado del plan | Banner en pantallas de trabajo | Configuración |
|---|---|---|
| `pro` | Nada | Fila discreta "Plan · Pro activo", sin acción |
| `trial-active` | Nada | Fila discreta con días restantes, tocable → abre soporte |
| `trial-ending-soon` / `trial-expired` | Banner con CTA "Activar Pro" | (banner también visible arriba) |
| `readonly` / `suspended` / `no-plan` | Banner con CTA "Contactar soporte" | (banner también visible arriba) |

En todos los casos, el modal de bloqueo (`useWriteGuard` + `PlanRestrictionDialog`)
y la fila fija "Contactar soporte" en Ayuda están disponibles sin
condición alguna.

### Qué NO se hizo (respetando el alcance)

- No se integró WhatsApp ni ningún SDK de mensajería — un solo link de
  salida (`Linking.openURL`), como ya usa `MANUAL_USUARIO.md`/`README.md`
  para compartir PDF/JSON.
- No se agregó tracking/analytics al link (sin UTM ni medición de clics) —
  no se pidió y hubiera sido alcance nuevo.
- No cambia nada del enforcement de Firestore Rules (Fase 5/5.1) ni de la
  lógica de `getPlanStatus`/`resolveSyncAwarePlanStatus` (Fase 2/4.1) — es
  estrictamente una capa de UI sobre estados que ya existían.

### Tests

`npm run test:unit`: **14/14** (sin cambios — esta fase no tocó
`planStatus.ts` ni `resolvePlanStatus.ts`, solo componentes de UI sin tests
propios). `tsc --noEmit`: solo los 2 errores preexistentes de
`exportData.ts`, cero regresiones.

### Pendiente real

- [ ] Probar visualmente en la app: banner ausente en `pro`/`trial-active`
  en todas las pantallas, fila discreta correcta en Configuración, y que
  los 3 CTAs (banner, modal, fila fija de Ayuda) abran el sitio correctamente.
- Cobro automático (Mercado Pago) sigue sin implementarse — esta fase es
  puramente el link de contacto, no un checkout.

**Actualización:** Blaze está activo, Functions/Rules/Indexes están desplegadas y la cuenta administradora ya tiene `admin: true`. Lo único que sigue pendiente de esta fase es la validación manual end-to-end del panel en un dispositivo real — ver la lista de pendientes reales al inicio del documento.
