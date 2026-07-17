# Operación, administración y despliegue — Mi Almacén

Guía interna de referencia para correr, probar y desplegar la parte de
infraestructura del proyecto (Firestore Rules, Cloud Functions, panel admin).
No es documentación de usuario final (ver `MANUAL_USUARIO.md` para eso).

Nunca se usan datos reales en los ejemplos de este documento. Reemplazar:

- `<TU_UID>` — el UID de Firebase Auth de tu propia cuenta.
- `<RUTA_A_LA_CLAVE>` — ruta local, fuera del repositorio, a una clave de cuenta de servicio.
- `<PROJECT_ID>` — el ID del proyecto de Firebase.

---

## Estado de despliegue actual

- Firebase Blaze está activo en el proyecto.
- Firestore Rules (`firestore.rules`) están desplegadas.
- Los índices de Firestore (`firestore.indexes.json`) están desplegados.
- Las 5 Cloud Functions del panel admin (`adminGetDashboard`, `adminListBusinesses`, `adminGetBusinessDetail`, `adminChangePlan`, `adminListAuditLogs`) están desplegadas.
- La política de limpieza de imágenes de build de Cloud Functions quedó configurada a 30 días (evita acumulación de artefactos de builds anteriores).
- La cuenta administradora ya tiene el custom claim `admin: true` asignado.

**Pendiente de deploy:** las 3 Cloud Functions de la libreta de cobros
(`adminGetBillingDetail`, `adminRecordPayment`, `adminUpdateBillingNotes`,
`functions/index.js`) y la regla explícita `adminBilling/{document=**}` en
`firestore.rules` están escritas y con tests locales, pero **no se
desplegaron todavía** — el panel admin de la app no va a poder usar la
sección "Cobro" hasta que corra `firebase deploy --only firestore:rules,functions`
(ver el procedimiento más abajo). No requieren cambios en `firestore.indexes.json`
(las queries nuevas son de campo único o reusan el índice compuesto ya
desplegado de `adminAuditLogs`).

Para el detalle de qué se implementó en cada fase (arquitectura, archivos,
tests), ver `docs/SAAS_ROADMAP.md`.

---

## Emuladores locales

Todo el desarrollo y testing de Rules/Functions se hace primero contra
emuladores — nunca contra el proyecto real.

```bash
npm run emulators
```

Levanta Firestore, Auth y Functions localmente (puertos definidos en
`firebase.json`). Requiere un JRE instalado (el emulador de Firestore corre
sobre Java) y Node.js para el emulador de Functions.

---

## Tests

| Comando | Qué corre |
|---|---|
| `npm run test:unit` | Tests unitarios puros (`src/utils/*.test.ts`) — sin Firebase. |
| `npm run test:rules` | Tests de Firestore Rules (`scripts/rules-tests/*.test.mjs`) — asume que los emuladores ya están corriendo. |
| `npm run test:rules:emulator` | Levanta los emuladores, corre `test:rules`, los apaga al terminar. Es el comando recomendado. |
| `npm run test:functions` | Tests de las Cloud Functions (`scripts/functions-tests/*.test.mjs`) — asume emuladores corriendo. |
| `npm run test:functions:emulator` | Levanta Functions + Firestore + Auth, corre `test:functions`, los apaga al terminar. Comando recomendado. |

Ningún test de Rules ni de Functions se valida nunca contra Firebase Console
ni contra el proyecto real — siempre contra el emulador, con un cliente
autenticado (nunca con las reglas desactivadas ni con el Admin SDK como
"prueba" de que algo está bloqueado).

---

## Desplegar Rules, Functions e índices

Antes de cualquier deploy:

1. Confirmar que los tests de Rules y de Functions pasan localmente contra el emulador.
2. Confirmar que la sesión de Firebase CLI está autenticada con la cuenta correcta del proyecto (`firebase login`, `firebase projects:list`) — **nunca desplegar desde una cuenta que no tenga acceso confirmado al proyecto `<PROJECT_ID>` correcto.**
3. Si el deploy incluye Rules, comparar el archivo `firestore.rules` contra el texto vigente en Firebase Console antes de sobrescribir, para detectar cualquier diferencia inesperada.

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only functions
```

O los tres juntos: `firebase deploy --only firestore:rules,firestore:indexes,functions`.

Cloud Functions requiere el plan Blaze del proyecto (ya activo — ver
"Estado de despliegue actual"). El plan Spark no permite desplegar
Functions, incluso callable sin egress propio.

---

## Asignar el custom claim `admin`

El custom claim `admin: true` habilita el panel admin móvil dentro de la
APK. Es completamente independiente del plan (`Pro`/`Trial`) del negocio —
ver `DECISIONES_TECNICAS.md`. Se asigna únicamente con
`scripts/bootstrap-admin.mjs`, nunca desde la app ni desde Firestore
directo.

```bash
# PowerShell — la variable dura solo la sesión actual, no queda guardada en el sistema
$env:GOOGLE_APPLICATION_CREDENTIALS = "<RUTA_A_LA_CLAVE>"

# 1. Dry-run — no escribe nada, solo muestra qué haría
node scripts/bootstrap-admin.mjs --uid=<TU_UID>

# 2. Recién después de revisar el dry-run, ejecutar de verdad
node scripts/bootstrap-admin.mjs --uid=<TU_UID> --apply
```

El script valida que la credencial apunte al proyecto correcto antes de
escribir nada, y aborta si no coincide. Después de correrlo con `--apply`,
**cerrar sesión y volver a iniciarla** en la app — los custom claims solo se
reflejan en un ID token nuevo; una sesión ya abierta no lo detecta hasta que
Firebase emite un token nuevo.

---

## Manejo de credenciales

- `GOOGLE_APPLICATION_CREDENTIALS` debe apuntar siempre a una clave de cuenta de servicio guardada **fuera del repositorio**.
- La clave privada de una cuenta de servicio **nunca se sube a GitHub** ni se pega en ningún documento de este repo. `.gitignore` ya excluye patrones como `**/*serviceAccount*.json`, `**/*service-account*.json` y `**/*firebase-admin*.json` como red de seguridad adicional, pero la regla real es no generar la clave dentro del repo en primer lugar.
- Ningún script de este proyecto (migración, bootstrap) imprime la ruta completa ni el contenido de la credencial — solo confirman si la variable de entorno está definida y a qué proyecto resuelve.

---

## Reglas de operación manual

- **No editar el campo `plan` de un negocio manualmente** (Firestore Console, script ad-hoc) salvo pruebas controladas y puntuales — el camino real para cambiar el plan de una cuenta es el panel admin (`adminChangePlan`), que deja auditoría en `adminAuditLogs`. Una edición manual no queda registrada en ningún lado.
- **No editar `adminBilling/{businessId}` manualmente** por el mismo motivo — usar siempre "Registrar pago" o la edición de notas desde el panel admin (`adminRecordPayment`/`adminUpdateBillingNotes`), que dejan auditoría. Recordar que `adminBilling` es administración comercial, no plan: registrar un pago **nunca** activa Pro ni cambia el acceso del negocio por sí solo — esa sigue siendo una acción separada y manual (`adminChangePlan`) que el admin decide después de ver el estado de cobro.
- **No desplegar Rules ni Functions desde una cuenta de Firebase CLI equivocada.** Verificar con `firebase projects:list` que la cuenta logueada tiene acceso al proyecto antes de cualquier `firebase deploy`.
- Los scripts privilegiados (`bootstrap-admin.mjs`, `migrate-existing-plans.mjs`) son dry-run por defecto — nunca escriben nada salvo que se pase `--apply` explícitamente.

---

## Recuperación ante errores comunes

- **Error de índice faltante en una consulta de Firestore:** agregar el índice a `firestore.indexes.json` y desplegar con `firebase deploy --only firestore:indexes` — no crearlo solo desde el link que sugiere el error en producción, para que quede versionado.
- **Un deploy de Rules rechaza algo que antes funcionaba:** comparar el `firestore.rules` desplegado contra el anterior (historial de git) antes de revertir a ciegas; correr `npm run test:rules:emulator` para confirmar qué caso específico cambió.
- **El custom claim `admin` no aparece después de `--apply`:** confirmar que se cerró sesión y se volvió a iniciar en el dispositivo de prueba — es la causa más común, no un fallo del script.
