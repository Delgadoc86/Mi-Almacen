import { Timestamp } from 'firebase/firestore';

export type ProductType = 'unidad' | 'pack' | 'peso';
export type RoundTo = 1 | 5 | 10 | 50 | 100;
export type MovementType = 'fiado' | 'pago';
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
  createdAt: Timestamp;
};

// ─────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro';

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

export type Business = {
  id: string;
  ownerUid: string;
  name: string;
  defaultMargin?: number;
  defaultRoundTo?: RoundTo;
  defaultCategoryId?: string;
  plan?: Plan;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
