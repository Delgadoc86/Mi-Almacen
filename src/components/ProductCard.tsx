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
        <Text style={styles.price}>${(product.salePrice ?? product.price).toLocaleString('es-AR')}</Text>
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
    borderRadius: theme.radius.card,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.sm,
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
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.bodyLg,
    color: theme.colors.text,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.muted,
  },
  price: {
    fontFamily: theme.fontFamily.extrabold,
    fontSize: theme.font.h3,
    color: theme.colors.primary,
    letterSpacing: -0.5,
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
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.caption,
    color: theme.colors.textSecondary,
  },
  marginBadge: {
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
  },
  marginText: {
    fontFamily: theme.fontFamily.bold,
    fontSize: theme.font.caption,
    color: theme.colors.warning,
  },
});
