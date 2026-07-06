import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  AdminBusinessDetail,
  AdminBusinessListItem,
  AdminChangePlanAction,
  AdminDashboardCounts,
  AdminAuditLogEntry,
  AdminSerializedPlan,
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
