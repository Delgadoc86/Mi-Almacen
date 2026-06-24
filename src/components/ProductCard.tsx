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
      <View style={styles.topRow}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {category?.name ?? '—'} · {TYPE_LABELS[product.type] ?? product.type}
          </Text>
        </View>
        <Text style={styles.price}>${product.price.toLocaleString('es-AR')}</Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.cost}>
          Costo ${product.cost.toLocaleString('es-AR')}
        </Text>
        <View style={styles.marginBadge}>
          <Text style={styles.marginText}>{product.margin}% margen</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  cost: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  marginBadge: {
    backgroundColor: theme.colors.warningLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  marginText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
});
