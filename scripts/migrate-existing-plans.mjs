// Migración one-shot: agrega `plan` (forma nueva) a negocios que no lo tienen.
//
// Usa Admin SDK, NO pasa por Firestore Rules — por eso este script, y no un
// "repair" client-side, es la forma correcta de hacer esta migración: es
// auditable (una corrida controlada, no escrituras orgánicas de clientes no
// confiables) y no requiere abrir un agujero en las Rules para permitir que
// un cliente agregue el campo `plan` a un doc que no lo tenía.
//
// Es idempotente: correrlo dos veces no pisa negocios que ya migraron.
//
// Credenciales: Application Default Credentials (ADC) vía la variable de
// entorno GOOGLE_APPLICATION_CREDENTIALS, apuntando a un archivo de clave de
// cuenta de servicio guardado FUERA de este repo (en cualquier carpeta de tu
// máquina, nunca en scripts/ ni versionado). Este script no lee ni acepta
// ninguna ruta de clave hardcodeada — si la variable no está definida, falla
// con un mensaje claro y no hace nada.
//
// Uso (PowerShell — ver también docs/SAAS_ROADMAP.md):
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\ruta\fuera-del-repo\clave.json"
//   node scripts/migrate-existing-plans.mjs --admin-uid=<TU_UID> --dry-run
//   node scripts/migrate-existing-plans.mjs --admin-uid=<TU_UID> [--exclude=uid1,uid2]
//
// --exclude sirve para dejar afuera de la migración real cuentas de prueba
// que aparezcan en el dry-run y no correspondan a comercios reales.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const TRIAL_DURATION_DAYS = 30;
const BATCH_SIZE = 400; // margen seguro bajo el límite de 500 de writeBatch

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, '').split('=');
      return [key, value ?? true];
    }),
  );
  if (!args['admin-uid']) {
    console.error('Falta --admin-uid=<UID>. Es el UID de tu cuenta principal (queda como Pro).');
    process.exit(1);
  }
  const exclude = new Set(
    typeof args.exclude === 'string' ? args.exclude.split(',').map((s) => s.trim()).filter(Boolean) : [],
  );
  return { adminUid: args['admin-uid'], dryRun: Boolean(args['dry-run']), exclude };
}

// No imprime la ruta ni el contenido de la credencial en ningún caso —
// solo confirma si la variable está definida o no.
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

// Si GOOGLE_APPLICATION_CREDENTIALS apunta a un archivo inválido, el error
// nativo de la librería de Google suele incluir la ruta completa del
// archivo en su mensaje (ej. "ENOENT: no such file, open 'C:\...\clave.json'").
// Se redacta esa ruta antes de imprimir cualquier error, para no violar el
// "no imprimir la ruta completa" ni siquiera en el camino de error.
function sanitizeErrorMessage(message) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let msg = String(message);
  if (credPath) msg = msg.split(credPath).join('[GOOGLE_APPLICATION_CREDENTIALS]');
  return msg;
}

function hasNewPlanShape(plan) {
  return Boolean(plan) && typeof plan === 'object' && 'type' in plan && 'status' in plan;
}

async function main() {
  const { adminUid, dryRun, exclude } = parseArgs();
  assertCredentialsConfigured();

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const [businessesSnap, usersSnap] = await Promise.all([
    db.collection('businesses').get(),
    db.collection('users').get(),
  ]);

  const userIds = new Set(usersSnap.docs.map((d) => d.id));
  const businessIds = new Set(businessesSnap.docs.map((d) => d.id));
  const usersById = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));

  // ── Detección de inconsistencias (users sin business y viceversa) ───────
  const businessesWithoutUser = businessesSnap.docs.filter((d) => !userIds.has(d.id));
  const usersWithoutBusiness = usersSnap.docs.filter((d) => !businessIds.has(d.id));

  console.log(`Negocios encontrados: ${businessesSnap.size}`);
  console.log(`Usuarios encontrados: ${usersSnap.size}`);

  if (businessesWithoutUser.length > 0) {
    console.log(`\n⚠ Negocios SIN perfil de usuario correspondiente (revisar a mano, no se migran):`);
    for (const d of businessesWithoutUser) {
      console.log(`  - ${d.id} ("${d.data().name || '(sin nombre)'}")`);
    }
  }
  if (usersWithoutBusiness.length > 0) {
    console.log(`\n⚠ Usuarios SIN negocio correspondiente (revisar a mano, no afectan la migración de planes):`);
    for (const d of usersWithoutBusiness) {
      console.log(`  - ${d.id} (${d.data().email || 'sin email'})`);
    }
  }

  const now = Timestamp.now();
  const trialEndsAt = Timestamp.fromMillis(now.toMillis() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  let migratedAsPro = 0;
  let migratedAsTrial = 0;
  let skippedAlreadyMigrated = 0;
  let skippedExcluded = 0;
  let skippedNoUser = 0;
  let adminFound = false;

  const pending = [];

  console.log('\nDetalle por negocio:');
  for (const docSnap of businessesSnap.docs) {
    const data = docSnap.data();
    const email = usersById.get(docSnap.id)?.email || '(sin usuario/email)';
    const isAdmin = docSnap.id === adminUid;
    if (isAdmin) adminFound = true;

    if (hasNewPlanShape(data.plan)) {
      skippedAlreadyMigrated += 1;
      console.log(`  - ${docSnap.id} (${email}) -> ya migrado (plan.type=${data.plan.type}), sin cambios`);
      continue;
    }

    if (!userIds.has(docSnap.id)) {
      skippedNoUser += 1;
      console.log(`  - ${docSnap.id} (${email}) -> SIN usuario correspondiente, NO se migra (revisar a mano)`);
      continue;
    }

    if (exclude.has(docSnap.id)) {
      skippedExcluded += 1;
      console.log(`  - ${docSnap.id} (${email}) -> excluido explícitamente (--exclude), NO se migra`);
      continue;
    }

    const plan = isAdmin
      ? {
          type: 'pro',
          status: 'active',
          // Placeholder histórico: esta cuenta no pasó por un trial real,
          // pero el modelo exige estos campos (ver docs/SAAS_ROADMAP.md).
          // No afecta el gating: con type='pro', trialEndsAt se ignora.
          trialStartedAt: now,
          trialEndsAt,
          proActivatedAt: now,
          updatedAt: now,
        }
      : {
          type: 'trial',
          status: 'active',
          trialStartedAt: now,
          trialEndsAt,
          updatedAt: now,
        };

    if (isAdmin) migratedAsPro += 1;
    else migratedAsTrial += 1;

    console.log(`  - ${docSnap.id} (${email}) -> ${isAdmin ? 'PRO (cuenta admin, sin vencimiento)' : 'TRIAL 30 días desde hoy'}`);

    pending.push({ ref: docSnap.ref, plan, name: data.name || '(sin nombre)' });
  }

  console.log(`\nResumen: ${migratedAsPro} a Pro, ${migratedAsTrial} a Trial, ${skippedAlreadyMigrated} ya migrados, ${skippedExcluded} excluidos, ${skippedNoUser} sin usuario (no migrados).`);

  if (!adminFound) {
    console.warn(`\nADVERTENCIA: ningún negocio tiene id == ${adminUid}. Verificá el UID antes de continuar.`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada.');
    return;
  }

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const item of chunk) {
      batch.update(item.ref, { plan: item.plan, updatedAt: FieldValue.serverTimestamp() });
    }
    await batch.commit();
    console.log(`Batch de ${chunk.length} negocios escrito (${i + chunk.length}/${pending.length}).`);
  }

  console.log('\nMigración completa.');
}

main().catch((err) => {
  console.error('Error en la migración:', sanitizeErrorMessage(err?.message ?? err));
  process.exit(1);
});
