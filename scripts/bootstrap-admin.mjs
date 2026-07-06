// Bootstrap de la única cuenta que existe hoy: la del administrador de la
// plataforma. No hay clientes ni cuentas antiguas que migrar — por eso este
// script reemplaza a scripts/migrate-existing-plans.mjs para el lanzamiento
// inicial (esa herramienta se mantiene para el futuro, cuando sí haya
// negocios reales que migrar, pero no se ejecuta ahora).
//
// Admin y Pro son conceptos DISTINTOS y este script los trata por separado:
//   - Admin: custom claim de Firebase Auth (`admin: true`). Habilita en el
//     futuro el acceso al panel web interno (Fase 6). Un custom claim SOLO
//     se puede escribir con el Admin SDK — ningún cliente (ni siquiera el
//     dueño de la cuenta) tiene forma de asignárselo a sí mismo desde la app,
//     es una garantía de la plataforma, no algo que haya que reforzar acá.
//   - Pro: plan de negocio (`businesses/{uid}.plan`), activo e indefinido
//     (sin proExpiresAt). Es exactamente el mismo modelo que ya usan las
//     cuentas trial — nada nuevo, ningún campo inventado.
//
// Ninguna de las dos cosas le da al usuario capacidad de auto-asignarse
// nada: firestore.rules ya impide que el propio dueño modifique su `plan`
// (ver planUnchanged()), y los custom claims son inalcanzables para el
// cliente por diseño de Firebase Auth.
//
// Credenciales: Application Default Credentials, igual que
// migrate-existing-plans.mjs — variable de entorno
// GOOGLE_APPLICATION_CREDENTIALS apuntando a una clave guardada FUERA de
// este repo. Sin esa variable, el script falla de inmediato sin tocar nada.
//
// Uso (PowerShell — ver también docs/SAAS_ROADMAP.md):
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\fuera-del-repo\clave.json"
//   node scripts/bootstrap-admin.mjs --uid=<TU_UID>              (dry-run, NO escribe nada)
//   node scripts/bootstrap-admin.mjs --uid=<TU_UID> --apply      (ejecuta de verdad)
//
// El script es dry-run POR DEFECTO. Solo escribe en Auth/Firestore si se
// pasa --apply explícitamente — sin ese flag, ninguna corrida modifica nada,
// sin importar qué otro flag se le pase.
//
// Este script SOLO toca: el custom claim `admin` en Firebase Auth, y el
// campo `plan` de businesses/{uid}. No toca products, categories,
// customers, movements, cashSessions, cashMovements, ni el resto del
// documento de negocio o del perfil de usuario.

import { GoogleAuth } from 'google-auth-library';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const EXPECTED_PROJECT_ID = 'minegocio-8bbef';

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=');
      return [key, value ?? true];
    }),
  );
  if (!args.uid || typeof args.uid !== 'string') {
    console.error('Falta --uid=<UID>. Es el UID de tu cuenta principal en Firebase Auth.');
    process.exit(1);
  }
  const apply = Boolean(args.apply);
  return { uid: args.uid, dryRun: !apply };
}

// No imprime la ruta ni el contenido de la credencial en ningún caso —
// solo confirma si la variable está definida o no. Igual que en
// migrate-existing-plans.mjs.
function assertCredentialsConfigured() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      'Falta GOOGLE_APPLICATION_CREDENTIALS.\n' +
        'Este script usa Application Default Credentials — no lee ninguna clave ' +
        'del repo. Generá una clave de cuenta de servicio (Firebase Console > ' +
        'Configuración del proyecto > Cuentas de servicio > Generar nueva clave ' +
        'privada), guardala FUERA de este repo, y antes de correr el script:\n\n' +
        '  PowerShell:\n' +
        '    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\ruta\\fuera-del-repo\\clave.json"\n',
    );
    process.exit(1);
  }
}

// Valida que la credencial ADC apunte de verdad al proyecto minegocio-8bbef
// ANTES de tocar Auth o Firestore. GoogleAuth().getProjectId() resuelve el
// project_id real embebido en la clave de servicio referenciada por
// GOOGLE_APPLICATION_CREDENTIALS — independiente de cualquier cosa que se le
// pase a initializeApp(), así que confirma la credencial en sí, no una
// configuración local que podría estar desalineada. No imprime nada de la
// clave, solo el projectId resuelto (que no es secreto).
async function assertCorrectProject() {
  const resolvedProjectId = await new GoogleAuth().getProjectId();
  if (resolvedProjectId !== EXPECTED_PROJECT_ID) {
    console.error(
      `La credencial activa apunta al proyecto "${resolvedProjectId}", no a ` +
        `"${EXPECTED_PROJECT_ID}". Abortando sin leer ni escribir nada — verificá ` +
        'que GOOGLE_APPLICATION_CREDENTIALS apunte a la clave del proyecto correcto.',
    );
    process.exit(1);
  }
  return resolvedProjectId;
}

function sanitizeErrorMessage(message) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let msg = String(message);
  if (credPath) msg = msg.split(credPath).join('[GOOGLE_APPLICATION_CREDENTIALS]');
  return msg;
}

function isAlreadyIndefinitePro(plan) {
  return Boolean(plan)
    && plan.type === 'pro'
    && plan.status === 'active'
    && !('proExpiresAt' in plan);
}

async function main() {
  const { uid, dryRun } = parseArgs();
  assertCredentialsConfigured();

  const projectId = await assertCorrectProject();
  console.log(`Proyecto validado: ${projectId}`);

  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const db = getFirestore();

  // ── Validaciones previas — no se escribe nada hasta pasarlas todas ──────

  let authUser;
  try {
    authUser = await auth.getUser(uid);
  } catch {
    console.error(`No existe ningún usuario de Firebase Auth con uid "${uid}". Verificá el UID.`);
    process.exit(1);
  }

  const [userSnap, businessSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('businesses').doc(uid).get(),
  ]);

  if (!businessSnap.exists) {
    console.error(
      `No existe businesses/${uid}. Este script no crea negocios nuevos — ` +
        'registrate primero normalmente en la app y volvé a correrlo.',
    );
    process.exit(1);
  }

  if (!userSnap.exists) {
    console.error(
      `businesses/${uid} existe pero users/${uid} NO — cuenta inconsistente. ` +
        'No se toca nada automáticamente (mismo criterio que accountInconsistent ' +
        'en la app). Revisá esta cuenta a mano antes de reintentar.',
    );
    process.exit(1);
  }

  const businessData = businessSnap.data();
  const currentPlan = businessData.plan;
  const currentClaims = authUser.customClaims || {};
  const alreadyAdmin = currentClaims.admin === true;
  const planAlreadyOk = isAlreadyIndefinitePro(currentPlan);

  // ── Resumen de lo que se va a hacer, ANTES de tocar nada ────────────────

  console.log(`Cuenta: ${uid} (${authUser.email || 'sin email'})`);
  console.log(`Custom claims actuales: ${JSON.stringify(currentClaims)}`);
  console.log(`Plan actual: ${currentPlan ? JSON.stringify({ type: currentPlan.type, status: currentPlan.status }) : '(sin plan / forma antigua)'}`);
  console.log('');
  console.log('Cambios a realizar:');
  console.log(
    alreadyAdmin
      ? '  - Custom claim admin: ya está en true, sin cambios.'
      : `  - Custom claim admin: se agrega "admin: true", preservando el resto de los claims actuales (${JSON.stringify(currentClaims)}).`,
  );
  console.log(
    planAlreadyOk
      ? '  - Plan: ya es Pro/active/indefinido, sin cambios.'
      : '  - Plan: se reemplaza por Pro, active, indefinido (sin proExpiresAt — el modelo lo trata como "sin vencimiento" con el campo ausente, no null).',
  );
  console.log('  - No se toca ningún otro dato: productos, clientes, fiados, caja, perfil, nombre del negocio, etc.');

  if (alreadyAdmin && planAlreadyOk) {
    console.log('\nNada que hacer — la cuenta ya está bootstrapeada.');
    return;
  }

  if (dryRun) {
    console.log('\nDry-run (sin --apply): no se escribió nada en Auth ni en Firestore.');
    return;
  }

  // ── Ejecución ────────────────────────────────────────────────────────────

  if (!alreadyAdmin) {
    await auth.setCustomUserClaims(uid, { ...currentClaims, admin: true });
    console.log('\nCustom claim admin asignado.');
  }

  if (!planAlreadyOk) {
    await db.collection('businesses').doc(uid).update({
      plan: {
        type: 'pro',
        status: 'active',
        // trialStartedAt/trialEndsAt son obligatorios en el modelo (BusinessPlan)
        // aunque esta cuenta nunca pasó por un trial real — se marcan como el
        // mismo instante (duración cero) en vez de inventar una ventana de 30
        // días que no ocurrió. planIsActive() nunca los evalúa para type='pro'.
        trialStartedAt: FieldValue.serverTimestamp(),
        trialEndsAt: FieldValue.serverTimestamp(),
        proActivatedAt: FieldValue.serverTimestamp(),
        // proExpiresAt deliberadamente ausente: Pro indefinido. Ver
        // isValidNewTrialPlan/planIsActive en firestore.rules — un plan
        // pro sin proExpiresAt no vence nunca.
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('Plan actualizado a Pro/active/indefinido.');
  }

  console.log('\nListo. Cerrá sesión y volvé a iniciarla (en la app y en el futuro panel admin)');
  console.log('para que Firebase refresque el ID token con el claim admin — los custom claims');
  console.log('no aparecen en una sesión ya abierta hasta que se emite un token nuevo.');
}

main().catch((err) => {
  console.error('Error en el bootstrap:', sanitizeErrorMessage(err?.message ?? err));
  process.exit(1);
});
