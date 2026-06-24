import type { RoundTo } from '@/models';

export const APP_NAME = 'Mi Almacén';
export const PACKAGE_NAME = 'com.delgadodev.mialmacen';
export const DEFAULT_CURRENCY = 'ARS';

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  BUSINESSES: 'businesses',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  CUSTOMERS: 'customers',
  MOVEMENTS: 'movements',
  CASH_SESSIONS: 'cashSessions',
  CASH_MOVEMENTS: 'cashMovements',
} as const;

export const DEFAULT_CATEGORIES = [
  { id: 'almacen', name: 'Almacén', order: 1, system: true, locked: true },
  { id: 'bebidas', name: 'Bebidas', order: 2, system: true, locked: true },
  { id: 'lacteos', name: 'Lácteos', order: 3, system: true, locked: true },
  { id: 'carnes', name: 'Carnes', order: 4, system: true, locked: true },
  { id: 'verduleria', name: 'Verdulería', order: 5, system: true, locked: true },
  { id: 'limpieza', name: 'Limpieza', order: 6, system: true, locked: true },
  { id: 'higiene', name: 'Higiene', order: 7, system: true, locked: true },
  { id: 'panaderia', name: 'Panadería', order: 8, system: true, locked: true },
  { id: 'otros', name: 'Otros', order: 9, system: true, locked: true },
] as const;

export const DEFAULT_CATEGORY_IDS: Set<string> = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

export const DEFAULT_MARGIN_MAX = 500;

export const ROUND_OPTIONS: { label: string; value: RoundTo }[] = [
  { label: '$1', value: 1 },
  { label: '$5', value: 5 },
  { label: '$10', value: 10 },
  { label: '$50', value: 50 },
  { label: '$100', value: 100 },
];
