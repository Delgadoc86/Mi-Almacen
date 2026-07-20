import { useBusinessData } from '@/context/BusinessDataContext';

// Lee del listener único de BusinessDataContext — ver ese archivo para el
// motivo (antes cada pantalla abría su propio onSnapshot de categorías).
export function useCategories() {
  const { categories } = useBusinessData();
  return { categories: categories.data, loading: categories.loading, error: categories.error };
}
