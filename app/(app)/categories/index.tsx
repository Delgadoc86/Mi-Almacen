import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { createCategory, deleteCategory } from '@/services/categories';
import { getCategoryProductCount } from '@/services/products';
import { DEFAULT_CATEGORY_IDS } from '@/constants';
import { theme } from '@/theme';
import { ConfirmDialog } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { PlanRestrictionDialog } from '@/components/PlanRestrictionDialog';
import type { Category } from '@/models';

export default function CategoriesScreen() {
  const { userProfile } = useAuth();
  const { categories, loading } = useCategories();
  const { requireWrite, restrictionMessage, dismissRestriction } = useWriteGuard();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'El nombre es obligatorio.');
      return;
    }
    if (!userProfile?.businessId) return;
    setAdding(true);
    try {
      await createCategory(userProfile.businessId, trimmed);
      setNewName('');
    } catch {
      Alert.alert('Error', 'No se pudo crear la categoría. Intentá de nuevo.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRequestDelete(cat: Category) {
    if (!userProfile?.businessId) return;
    const bizId = userProfile.businessId;

    let count: number;
    try {
      count = await getCategoryProductCount(bizId, cat.id);
    } catch {
      Alert.alert('Error', 'No se pudo verificar. Intentá de nuevo.');
      return;
    }

    if (count > 0) {
      Alert.alert(
        'No se puede eliminar',
        `Esta categoría tiene ${count} producto${count > 1 ? 's' : ''} asociado${count > 1 ? 's' : ''}.\nReasigná esos productos a otra categoría antes de eliminarla.`,
      );
      return;
    }

    setPendingDelete(cat);
  }

  async function handleConfirmDelete() {
    if (!userProfile?.businessId || !pendingDelete) return;
    const cat = pendingDelete;
    setPendingDelete(null);
    setDeletingId(cat.id);
    try {
      await deleteCategory(userProfile.businessId, cat.id);
    } catch {
      Alert.alert('Error', 'No se pudo eliminar. Intentá de nuevo.');
    } finally {
      setDeletingId(null);
    }
  }

  function renderCategory({ item }: { item: Category }) {
    const isSystem = DEFAULT_CATEGORY_IDS.has(item.id) || item.system === true;
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.row}>
        <Text style={styles.rowName}>{item.name}</Text>
        {isSystem ? (
          <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} />
        ) : isDeleting ? (
          <ActivityIndicator size="small" color={theme.colors.error} />
        ) : (
          <TouchableOpacity
            onPress={() => requireWrite(() => handleRequestDelete(item))}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.addBar}>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Nueva categoría..."
          placeholderTextColor={theme.colors.muted}
          maxLength={40}
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={() => requireWrite(handleAdd)}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!newName.trim() || adding) && styles.addBtnDisabled]}
          onPress={() => requireWrite(handleAdd)}
          disabled={!newName.trim() || adding}
        >
          {adding ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="add" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategory}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <EmptyState icon="pricetags-outline" title="No hay categorías todavía" />
          }
        />
      )}

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Eliminar categoría"
        message={pendingDelete ? `¿Eliminar "${pendingDelete.name}"?` : undefined}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => requireWrite(handleConfirmDelete)}
        onCancel={() => setPendingDelete(null)}
      />
      <PlanRestrictionDialog message={restrictionMessage} onDismiss={dismissRestriction} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  addBar: {
    flexDirection: 'row',
    gap: 10,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: theme.fontFamily.medium,
    fontSize: theme.font.bodyLg,
    color: theme.colors.text,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  loader: {
    marginTop: 48,
  },
  list: {
    padding: theme.spacing.lg,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowName: {
    fontFamily: theme.fontFamily.semibold,
    fontSize: theme.font.bodyLg,
    color: theme.colors.text,
    flex: 1,
  },
  separator: {
    height: 8,
  },
});
