import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Unsubscribe } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToProducts } from '@/services/products';
import { subscribeToCustomers } from '@/services/customers';
import { subscribeLatestSession } from '@/services/cash';
import { getOrSeedCategories, subscribeToCategories } from '@/services/categories';
import type { Product, Customer, CashSession, Category } from '@/models';

type Resource<T> = {
  data: T;
  loading: boolean;
  error: Error | null;
  retry: () => void;
};

function useSubscribedResource<T>(
  businessId: string | undefined,
  initialData: T,
  subscribe: (
    businessId: string,
    onData: (data: T) => void,
    onError: (err: Error) => void,
  ) => Unsubscribe,
): Resource<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    const unsubscribe = subscribe(
      businessId,
      (value) => { setData(value); setLoading(false); },
      (err) => { setError(err); setLoading(false); },
    );
    return unsubscribe;
    // retryKey solo fuerza la resuscripción manual — no es un dato real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, retryKey]);

  return { data, loading, error, retry: () => setRetryKey((k) => k + 1) };
}

// Categorías tiene un paso extra (getOrSeedCategories) antes de suscribir —
// mismo comportamiento que el useCategories original, solo movido acá.
function useCategoriesResource(businessId: string | undefined): Resource<Category[]> {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    let unsubscribe: Unsubscribe | undefined;

    getOrSeedCategories(businessId)
      .then(() => {
        unsubscribe = subscribeToCategories(
          businessId,
          (cats) => { setData(cats); setLoading(false); },
          (err) => { setError(err); setLoading(false); },
        );
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error('Error al cargar categorías.'));
        setLoading(false);
      });

    return () => { if (unsubscribe) unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, retryKey]);

  return { data, loading, error, retry: () => setRetryKey((k) => k + 1) };
}

type BusinessDataContextValue = {
  products: Resource<Product[]>;
  customers: Resource<Customer[]>;
  cashSession: Resource<CashSession | null>;
  categories: Resource<Category[]>;
};

const BusinessDataContext = createContext<BusinessDataContextValue | null>(null);

// Único listener por colección para todo el negocio autenticado. Antes,
// useProducts/useCustomers/useCashSession/useCategories abrían su propio
// onSnapshot en cada pantalla que los llamaba — sin caché offline
// configurada en firebase.ts (`getFirestore()` simple), visitar Inicio +
// Caja + Fiados + Productos en la misma sesión releía las mismas
// colecciones 2-3 veces contra el servidor. Mismo patrón que ya usa
// AuthContext para `business`: un solo listener acá arriba, y los hooks de
// abajo (mismo nombre y misma forma de retorno de siempre) solo leen de
// este Context — ninguna pantalla necesita cambiar cómo los llama.
export function BusinessDataProvider({ children }: { children: ReactNode }) {
  const { userProfile } = useAuth();
  const businessId = userProfile?.businessId;

  const products = useSubscribedResource<Product[]>(businessId, [], subscribeToProducts);
  const customers = useSubscribedResource<Customer[]>(businessId, [], subscribeToCustomers);
  const cashSession = useSubscribedResource<CashSession | null>(businessId, null, subscribeLatestSession);
  const categories = useCategoriesResource(businessId);

  const value = useMemo(
    () => ({ products, customers, cashSession, categories }),
    [products, customers, cashSession, categories],
  );

  return <BusinessDataContext.Provider value={value}>{children}</BusinessDataContext.Provider>;
}

export function useBusinessData(): BusinessDataContextValue {
  const ctx = useContext(BusinessDataContext);
  if (!ctx) throw new Error('useBusinessData must be used inside BusinessDataProvider');
  return ctx;
}
