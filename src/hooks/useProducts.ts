import { useBusinessData } from '@/context/BusinessDataContext';

// Lee del listener único de BusinessDataContext — ver ese archivo para el
// motivo (antes cada pantalla abría su propio onSnapshot de productos).
export function useProducts() {
  const { products } = useBusinessData();
  return { products: products.data, loading: products.loading, error: products.error, retry: products.retry };
}
