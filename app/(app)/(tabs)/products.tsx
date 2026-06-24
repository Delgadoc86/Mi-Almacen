import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { theme } from '@/theme';

export default function ProductsScreen() {
  const router = useRouter();
  const { products, loading } = useProducts();
  const { categories } = useCategories();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const categoryOptions = useMemo(
    () => [{ id: 'all', name: 'Todas' }, ...categories.map((c) => ({ id: c.id, name: c.name }))],
    [categories],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchName = !q || p.name.toLowerCase().includes(q);
      const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      return matchName && matchCategory;
    });
  }, [products, search, selectedCategory]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Productos</Text>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/products/new')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar producto..." />

        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categoryOptions.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="Sin productos todavía"
            subtitle="Agregá tu primer producto para empezar a gestionar tu catálogo."
            actionLabel="Agregar producto"
            onAction={() => router.push('/products/new')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Sin resultados"
            subtitle="Probá con otro nombre o categoría."
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                category={categoryMap[item.categoryId]}
                onPress={() => router.push(`/products/${item.id}`)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  fab: {
    backgroundColor: theme.colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 12,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loader: { marginTop: 40 },
  list: { paddingBottom: 20 },
});
