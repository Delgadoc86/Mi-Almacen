import { Timestamp } from 'firebase/firestore';

export type ProductType = 'unidad' | 'pack' | 'peso';
export type RoundTo = 1 | 5 | 10 | 50 | 100;
export type MovementType = 'fiado' | 'pago' | 'reversal';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'mercado_pago' | 'otro';

export type Category = {
  id: string;
  name: string;
  order: number;
  system?: boolean;
  locked?: boolean;
  createdAt: Timestamp;
};

export type Product = {
  id: string;
  name: string;
  type: ProductType;
  categoryId: string;
  cost: number;
  margin: number;
  roundTo: RoundTo;
  price: number;
  suggestedPrice?: number;
  salePrice?: number;
  // type = 'peso'
  unit?: 'kg' | 'g';
  saleUnitLabel?: string;
  baseWeightGrams?: number;
  // type = 'pack'
  unitsPerPack?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  reference?: string;
  balance: number; // positive = owes money, 0 = settled, never negative
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Movement = {
  id: string;
  type: MovementType;
  amount: number; // always positive
  description?: string;
  paymentMethod?: PaymentMethod;
  balanceAfter: number; // customer balance after this movement
  annulled?: boolean;
  linkedMovementId?: string;
  reversalReason?: string;
  createdAt: Timestamp;
};

// ── Caja Diaria ──────────────────────────────────────────

export type CashSessionStatus = 'open' | 'closed';
export type CashMovementType = 'ingreso' | 'egreso';

export type CashSession = {
  id: string;
  date: string; // "YYYY-MM-DD"
  openingBalance: number;
  status: CashSessionStatus;
  summary: {
    totalIngresos: number;
    totalEgresos: number;
    efectivo: number;
    mercadoPago: number;
    transferencia: number;
    otro: number;
    movementsCount: number;
  };
  closedAt?: Timestamp;
  createdAt: Timestamp;
};

export type CashMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  medioPago?: PaymentMethod;
  description?: string;
  annulled?: boolean;
  linkedMovementId?: string;
  isReversal?: boolean;
  createdAt: Timestamp;
};

// ─────────────────────────────────────────────────────────

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

export type OnboardingState = {
  completed: boolean;
  completedAt?: Timestamp;
  skipped?: boolean;
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  businessId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  onboarding?: OnboardingState;
};

// ── Panel Admin (Fase 6) ─────────────────────────────────────────────────
// Formas devueltas por las Cloud Functions callable en functions/index.js.
// No son documentos de Firestore leídos directamente por el cliente — el
// cliente nunca lee `businesses`/`adminAuditLogs` de otro negocio por su
// cuenta, solo a través de estas funciones. Fechas ya vienen serializadas
// como ISO string (no Timestamp) porque cruzan el protocolo callable.
export type AdminPlanKind = 'no-plan' | 'suspended' | 'readonly' | 'pro' | 'trial-active' | 'trial-expired';

export type AdminChangePlanAction = 'activate_pro' | 'extend_trial' | 'set_readonly' | 'suspend' | 'reactivate';

export type AdminDashboardCounts = {
  trialActive: number;
  trialExpired: number;
  pro: number;
  readonly: number;
  suspended: number;
  noPlan: number;
  pendingDeletionRequests: number;
  totalBusinesses: number;
  // Derivados de adminBilling, no de `plan` — puramente informativos para
  // priorizar seguimiento de cobro, sin relación con acceso/canWrite.
  billingDueThisWeek: number;
  billingOverdue: number;
  billingNoData: number;
};

export type AdminBusinessListItem = {
  businessId: string;
  name: string;
  email: string;
  kind: AdminPlanKind;
  planType: PlanType | null;
  planStatus: PlanStatus | null;
  trialEndsAt: string | null;
  createdAt: string | null;
  hasDeletionRequest: boolean;
};

export type AdminSerializedPlan = {
  type: PlanType | null;
  status: PlanStatus | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  proActivatedAt: string | null;
  proExpiresAt: string | null;
  updatedAt: string | null;
};

export type AdminAuditLogEntry = {
  id: string;
  actorUid: string;
  businessId: string;
  action: AdminAuditAction;
  reason: string | null;
  previousPlan: AdminSerializedPlan | null;
  nextPlan: AdminSerializedPlan | null;
  // Presentes únicamente en entradas de acciones de billing (record_payment,
  // update_billing_notes) — null en entradas de cambio de plan.
  previousBilling: AdminBillingSummary | null;
  nextBilling: AdminBillingSummary | null;
  // Presentes únicamente en entradas de eliminación definitiva de cuenta
  // (delete_account_completed/delete_account_failed) — null en el resto.
  deletedCounts: AdminDeletionCounts | null;
  error: string | null;
  createdAt: string | null;
};

export type AdminBusinessDetail = {
  businessId: string;
  name: string;
  ownerEmail: string;
  ownerDisplayName: string;
  createdAt: string | null;
  kind: AdminPlanKind;
  plan: AdminSerializedPlan | null;
  deletionRequestedAt: string | null;
  auditLog: AdminAuditLogEntry[];
};

// ── Libreta de cobros — administración comercial interna (adminBilling) ──
// Vive en adminBilling/{businessId} (colección separada de `businesses`,
// nunca legible/escribible por el cliente — ver firestore.rules). Es
// puramente informativo para el admin: no participa en `canWrite` ni en
// ninguna decisión de acceso. `plan` sigue siendo la única fuente de
// verdad para eso. Fechas ya vienen como ISO string (ver AdminSerializedPlan,
// mismo criterio: cruzan el protocolo callable).
export type AdminBillingMethod = 'transferencia' | 'mercado_pago_link' | 'efectivo' | 'otro';

export type AdminBillingStatus = 'no-data' | 'ok' | 'due-soon' | 'overdue';

export type AdminBillingSummary = {
  businessId: string;
  lastPaymentAt: string | null;
  nextPaymentDueAt: string | null;
  paymentMethod: AdminBillingMethod | null;
  lastAmount: number | null;
  currency: 'ARS' | null;
  notes: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type AdminBillingPayment = {
  id: string;
  businessId: string;
  amount: number;
  currency: 'ARS';
  method: AdminBillingMethod;
  paidAt: string | null;
  periodDays: 30 | 90 | 365 | null;
  nextPaymentDueAt: string | null;
  note: string | null;
  createdAt: string | null;
  createdBy: string;
};

export type AdminBillingDetail = {
  businessId: string;
  businessName: string;
  billing: AdminBillingSummary | null;
  payments: AdminBillingPayment[];
};

export type AdminBillingAction = 'record_payment' | 'update_billing_notes';

export type AdminAccountDeletionAction =
  | 'delete_account_requested_execute'
  | 'delete_account_completed'
  | 'delete_account_failed';

// Acción registrada en adminAuditLogs — puede ser un cambio de plan (acceso),
// una acción de billing (administración comercial) o un paso de eliminación
// definitiva de cuenta. Mismo documento/colección, campos previous/next (o
// deletedCounts/error) distintos según cuál de los tres sea.
export type AdminAuditAction = AdminChangePlanAction | AdminBillingAction | AdminAccountDeletionAction;

// ── Eliminación definitiva de cuenta (adminGetDeletionPreview /
// adminDeleteRequestedAccount) — solo alcanzable si el negocio ya tiene
// `deletionRequest` (solicitado por el propio dueño desde Configuración).
export type AdminDeletionCounts = {
  products: number;
  categories: number;
  customers: number;
  movements: number;
  cashSessions: number;
  cashMovements: number;
  hasBilling: boolean;
  billingPayments: number;
};

export type AdminDeletionPreview = {
  businessId: string;
  name: string;
  ownerEmail: string;
  requestedAt: string | null;
  counts: AdminDeletionCounts;
  authUserExists: boolean;
};

export type Business = {
  id: string;
  ownerUid: string;
  name: string;
  defaultMargin?: number;
  defaultRoundTo?: RoundTo;
  defaultCategoryId?: string;
  // Opcional durante la transición: cuentas creadas antes de Fase 1 pueden
  // no tener `plan` todavía hasta que corra el script de migración
  // (scripts/migrate-existing-plans.mjs). Nunca lo escribe el cliente
  // salvo en la creación inicial del negocio — ver firestore.rules.
  plan?: BusinessPlan;
  // Solicitud no destructiva de "Eliminar cuenta" (ver src/services/deleteAccount.ts).
  // Inmutable para el cliente una vez creada — ver firestore.rules.
  deletionRequest?: { requestedAt: Timestamp };
  importedInitialProducts?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

// appConfig/updateInfo — aviso de actualización configurable desde el panel
// admin (ver src/services/appUpdate.service.ts). Documento único, ajeno a
// businesses/ — no tiene owner, lo lee cualquier usuario de la app.
export type AppUpdateInfo = {
  active: boolean;
  latestVersion: string;
  title: string;
  message: string;
  downloadUrl: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
