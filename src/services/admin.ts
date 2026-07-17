import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminChangePlanAction,
  AdminDashboardCounts,
  AdminAuditLogEntry,
  AdminSerializedPlan,
  AdminBillingDetail,
  AdminBillingSummary,
  AdminBillingMethod,
} from '@/models';

// Capa fina sobre las Cloud Functions callable de functions/index.js (Fase 6).
// El cliente nunca lee/escribe `plan` de otro negocio directamente en
// Firestore — todo pasa por acá. Cada función valida `admin === true` del
// lado del servidor; si esta capa se llama sin ese claim, la Function
// devuelve un error `permission-denied` que se propaga tal cual.

export async function getAdminDashboard(): Promise<AdminDashboardCounts> {
  const fn = httpsCallable<void, AdminDashboardCounts>(functions, 'adminGetDashboard');
  const res = await fn();
  return res.data;
}

export async function listAdminBusinesses(params: {
  search?: string;
  statusFilter?: string;
}): Promise<AdminBusinessListItem[]> {
  const fn = httpsCallable<typeof params, { businesses: AdminBusinessListItem[] }>(
    functions,
    'adminListBusinesses',
  );
  const res = await fn(params);
  return res.data.businesses;
}

export async function getAdminBusinessDetail(businessId: string): Promise<AdminBusinessDetail> {
  const fn = httpsCallable<{ businessId: string }, AdminBusinessDetail>(
    functions,
    'adminGetBusinessDetail',
  );
  const res = await fn({ businessId });
  return res.data;
}

export async function changeAdminPlan(params: {
  businessId: string;
  action: AdminChangePlanAction;
  days?: number;
  reason?: string;
}): Promise<{ success: boolean; previousPlan: AdminSerializedPlan | null; nextPlan: AdminSerializedPlan | null }> {
  const fn = httpsCallable<
    typeof params,
    { success: boolean; previousPlan: AdminSerializedPlan | null; nextPlan: AdminSerializedPlan | null }
  >(functions, 'adminChangePlan');
  const res = await fn(params);
  return res.data;
}

export async function listAdminAuditLogs(params: {
  businessId?: string;
  limit?: number;
}): Promise<AdminAuditLogEntry[]> {
  const fn = httpsCallable<typeof params, { logs: AdminAuditLogEntry[] }>(
    functions,
    'adminListAuditLogs',
  );
  const res = await fn(params);
  return res.data.logs;
}

// ── Libreta de cobros (adminBilling) — administración comercial interna,
// nunca acceso. El cliente normal no puede leer/escribir esta colección
// (ver firestore.rules); solo llega acá vía estas Cloud Functions callable,
// igual que el resto de la capa admin de arriba.

export async function getAdminBillingDetail(businessId: string): Promise<AdminBillingDetail> {
  const fn = httpsCallable<{ businessId: string }, AdminBillingDetail>(
    functions,
    'adminGetBillingDetail',
  );
  const res = await fn({ businessId });
  return res.data;
}

export async function recordAdminPayment(params: {
  businessId: string;
  amount: number;
  method: AdminBillingMethod;
  paidAt?: string;
  periodDays?: 30 | 90 | 365;
  note?: string;
}): Promise<{ success: boolean; billing: AdminBillingSummary | null }> {
  const fn = httpsCallable<typeof params, { success: boolean; billing: AdminBillingSummary | null }>(
    functions,
    'adminRecordPayment',
  );
  const res = await fn(params);
  return res.data;
}

export async function updateAdminBillingNotes(params: {
  businessId: string;
  notes: string;
}): Promise<{ success: boolean; billing: AdminBillingSummary | null }> {
  const fn = httpsCallable<typeof params, { success: boolean; billing: AdminBillingSummary | null }>(
    functions,
    'adminUpdateBillingNotes',
  );
  const res = await fn(params);
  return res.data;
}
