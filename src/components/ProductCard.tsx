import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '@/theme';
import type { Category, Product } from '@/models';

type Props = {
  product: Product;
  category?: Category;
  onPress: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  unidad: 'Unidad',
  pack: 'Pack',
  peso: 'Peso',
};

export function ProductCard({ product, category, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.meta}>
            {category?.name ?? '—'} · {TYPE_LABELS[product.type] ?? product.type}
          </Text>
          <Text style={styles.cost}>
            Costo ${product.cost.toLocaleString('es-AR')} · {product.margin}% mg
          </Text>
        </View>
        <Text style={styles.price}>${product.price.toLocaleString('es-AR')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  cost: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
});
