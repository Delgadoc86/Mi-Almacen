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
import { ScreenContainer } from '@/components/ScreenContainer';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { theme } from '@/theme';
import type { ProductType } from '@/models';

type TypeFilter = ProductType | 'all';

const TYPE_OPTIONS: { label: string; value: TypeFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Unidad', value: 'unidad' },
  { label: 'Pack', value: 'pack' },
  { label: 'Peso', value: 'peso' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const { products, loading } = useProducts();
  const { categories } = useCategories();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState<TypeFilter>('all');

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
      const matchType = selectedType === 'all' || p.type === selectedType;
      return matchName && matchCategory && matchType;
    });
  }, [products, search, selectedCategory, selectedType]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Productos</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/products/new')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar producto..." />

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipRow, styles.chipRowBottom]}
      >
        {TYPE_OPTIONS.map((opt) => {
          const active = selectedType === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setSelectedType(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
          subtitle="Probá con otro nombre, categoría o tipo."
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  fab: {
    backgroundColor: theme.colors.primary,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 8,
  },
  chipRowBottom: {
    marginBottom: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
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
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    paddingBottom: 20,
  },
});
