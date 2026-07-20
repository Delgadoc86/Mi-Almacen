import { useBusinessData } from '@/context/BusinessDataContext';

// Lee del listener único de BusinessDataContext — ver ese archivo para el
// motivo (antes cada pantalla abría su propio onSnapshot de clientes).
export function useCustomers() {
  const { customers } = useBusinessData();
  return { customers: customers.data, loading: customers.loading, error: customers.error, retry: customers.retry };
}
