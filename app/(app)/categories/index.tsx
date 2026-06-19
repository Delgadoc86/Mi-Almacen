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
import { createCategory, deleteCategory } from '@/services/categories';
import { getCategoryProductCount } from '@/services/products';
import { DEFAULT_CATEGORY_IDS } from '@/constants';
import { theme } from '@/theme';
import type { Category } from '@/models';

export default function CategoriesScreen() {
  const { userProfile } = useAuth();
  const { categories, loading } = useCategories();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleDelete(cat: Category) {
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

    Alert.alert('Eliminar categoría', `¿Eliminar "${cat.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(cat.id);
          try {
            await deleteCategory(bizId, cat.id);
          } catch {
            Alert.alert('Error', 'No se pudo eliminar. Intentá de nuevo.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
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
            onPress={() => handleDelete(item)}
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
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!newName.trim() || adding) && styles.addBtnDisabled]}
          onPress={handleAdd}
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
            <Text style={styles.empty}>No hay categorías todavía.</Text>
          }
        />
      )}
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
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  addBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
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
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowName: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  separator: {
    height: 8,
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.muted,
    marginTop: 32,
    fontSize: 15,
  },
});
