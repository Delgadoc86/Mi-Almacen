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
  action: AdminChangePlanAction;
  reason: string | null;
  previousPlan: AdminSerializedPlan | null;
  nextPlan: AdminSerializedPlan | null;
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
