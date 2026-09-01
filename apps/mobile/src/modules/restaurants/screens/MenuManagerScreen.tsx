import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import { Screen } from '../../../ui/components/Screen';
import { colors, fontFamily, radius, spacing, typography } from '../../../ui';
import { getApiError } from '../../../api/client';
import type { MenuItem } from '../../../api/endpoints/menu';
import {
  useAddMenuItem,
  useMenu,
  useRetireMenuItem,
  useUpdateMenuItem,
} from '../hooks/useMenu';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'MenuManager'>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const UNCATEGORIZED = 'Uncategorized';
const EGP_PATTERN = /^\d+(\.\d{1,2})?$/;

function validateEgp(value: string): boolean {
  return EGP_PATTERN.test(value.trim()) && value.trim() !== '';
}

/** Group active items by category, preserving insertion order of first use. */
function groupByCategory(
  items: MenuItem[],
): { title: string; data: MenuItem[] }[] {
  const map = new Map<string, MenuItem[]>();
  for (const item of items) {
    const cat = item.category.trim() || UNCATEGORIZED;
    const existing = map.get(cat);
    if (existing) {
      existing.push(item);
    } else {
      map.set(cat, [item]);
    }
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ── Inline edit row ───────────────────────────────────────────────────────────

interface EditRowProps {
  item: MenuItem;
  restaurantId: string;
  onDone: () => void;
}

function EditRow({ item, restaurantId, onDone }: EditRowProps) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.referencePrice);
  const [category, setCategory] = useState(item.category);
  const [error, setError] = useState<string | undefined>();
  const { mutateAsync: update, isPending } = useUpdateMenuItem(restaurantId);

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!validateEgp(price)) {
      setError('Enter a valid price e.g. 25.00');
      return;
    }
    setError(undefined);
    try {
      await update({
        id: item.id,
        payload: {
          name: name.trim(),
          category: category.trim() || '',
          referencePrice: price.trim(),
        },
      });
      onDone();
    } catch (err) {
      const { message } = getApiError(err);
      setError(message ?? 'Failed to save.');
    }
  }

  return (
    <View style={editStyles.wrap}>
      <Text style={editStyles.label}>Edit Menu Item</Text>
      <TextInput
        style={[
          editStyles.input,
          !name.trim() && !!error && editStyles.inputError,
        ]}
        value={name}
        onChangeText={setName}
        placeholder="Item Name (e.g. Original Foul)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="sentences"
      />
      <View style={editStyles.row}>
        <View
          style={[
            editStyles.priceWrap,
            !validateEgp(price) && price.length > 0 && editStyles.priceError,
          ]}
        >
          <Text style={editStyles.egpSymbol}>EGP</Text>
          <TextInput
            style={editStyles.priceInput}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
        <TextInput
          style={[editStyles.input, editStyles.categoryInput]}
          value={category}
          onChangeText={setCategory}
          placeholder="Category (e.g. Sandwiches)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="sentences"
        />
      </View>
      {error ? <Text style={editStyles.error}>{error}</Text> : null}
      <View style={editStyles.actions}>
        <TouchableOpacity style={editStyles.cancelBtn} onPress={onDone}>
          <Text style={editStyles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[editStyles.saveBtn, isPending && editStyles.disabled]}
          onPress={() => void handleSave()}
          disabled={isPending}
        >
          <Text style={editStyles.saveLabel}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const editStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  label: { ...typography.label, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  categoryInput: { flex: 1.2 },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flex: 1,
    minHeight: 48,
    gap: spacing.xs,
  },
  priceError: { borderColor: colors.danger },
  egpSymbol: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  priceInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  error: { ...typography.caption, color: colors.danger },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelLabel: { ...typography.label, color: colors.textMuted, fontSize: 13 },
  saveBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  saveLabel: { ...typography.label, color: colors.onPrimary, fontSize: 13 },
  disabled: { opacity: 0.5 },
});

// ── Menu item row ─────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: MenuItem;
  restaurantId: string;
  isEditing: boolean;
  onEdit: () => void;
  onEditDone: () => void;
}

function ItemRow({
  item,
  restaurantId,
  isEditing,
  onEdit,
  onEditDone,
}: ItemRowProps) {
  const { mutate: retire, isPending } = useRetireMenuItem(restaurantId);

  function confirmRetire() {
    Alert.alert(
      'Retire Item',
      `"${item.name}" will disappear from new orders. Past orders that included it are unaffected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retire',
          style: 'destructive',
          onPress: () => retire(item.id),
        },
      ],
    );
  }

  return (
    <View>
      <View style={[rowStyles.row, !item.isActive && rowStyles.rowInactive]}>
        <View style={rowStyles.info}>
          <Text
            style={[rowStyles.name, !item.isActive && rowStyles.nameInactive]}
          >
            {item.name}
          </Text>
          <Text style={rowStyles.price}>EGP {item.referencePrice}</Text>
        </View>
        {item.isActive && (
          <View style={rowStyles.actions}>
            <TouchableOpacity
              accessibilityLabel={`Edit ${item.name}`}
              onPress={onEdit}
              style={rowStyles.actionBtn}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={`Retire ${item.name}`}
              onPress={confirmRetire}
              style={rowStyles.actionBtn}
              disabled={isPending}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={isPending ? colors.textMuted : colors.danger}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {isEditing && (
        <EditRow item={item} restaurantId={restaurantId} onDone={onEditDone} />
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  rowInactive: { opacity: 0.45 },
  info: { flex: 1, gap: 2 },
  name: { ...typography.label, color: colors.text, fontSize: 14 },
  nameInactive: { textDecorationLine: 'line-through' },
  price: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
});

// ── Inline add row ────────────────────────────────────────────────────────────

interface AddRowProps {
  restaurantId: string;
  onDone: () => void;
}

function AddRow({ restaurantId, onDone }: AddRowProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | undefined>();
  const { mutateAsync: add, isPending } = useAddMenuItem(restaurantId);

  async function handleAdd() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!validateEgp(price)) {
      setError('Enter a valid price e.g. 25.00');
      return;
    }
    setError(undefined);
    try {
      await add({
        name: name.trim(),
        category: category.trim() || undefined,
        referencePrice: price.trim(),
      });
      onDone();
    } catch (err) {
      const { message } = getApiError(err);
      setError(message ?? 'Failed to add item.');
    }
  }

  return (
    <View style={addStyles.wrap}>
      <Text style={addStyles.heading}>Add New Menu Item</Text>
      <TextInput
        style={[
          addStyles.input,
          !name.trim() && !!error && addStyles.inputError,
        ]}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(undefined);
        }}
        placeholder="Item Name (e.g. Foul Mudammas)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="sentences"
        autoFocus
      />
      <View style={addStyles.row}>
        <View
          style={[
            addStyles.priceWrap,
            !validateEgp(price) && price.length > 0 && addStyles.priceError,
          ]}
        >
          <Text style={addStyles.egpSymbol}>EGP</Text>
          <TextInput
            style={addStyles.priceInput}
            value={price}
            onChangeText={(text) => {
              setPrice(text);
              if (error) setError(undefined);
            }}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
        <TextInput
          style={[addStyles.input, addStyles.categoryInput]}
          value={category}
          onChangeText={setCategory}
          placeholder="Category (e.g. Foul & Falafel)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="sentences"
        />
      </View>
      {error ? <Text style={addStyles.error}>{error}</Text> : null}
      <View style={addStyles.actions}>
        <TouchableOpacity style={addStyles.cancelBtn} onPress={onDone}>
          <Text style={addStyles.cancelLabel}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[addStyles.addBtn, isPending && addStyles.disabled]}
          onPress={() => void handleAdd()}
          disabled={isPending}
        >
          <Text style={addStyles.addLabel}>
            {isPending ? 'Adding…' : 'Add Item'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const addStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: { ...typography.label, color: colors.text, fontSize: 16 },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  categoryInput: { flex: 1.2 },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flex: 1,
    minHeight: 48,
    gap: spacing.xs,
  },
  priceError: { borderColor: colors.danger },
  egpSymbol: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  priceInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  error: { ...typography.caption, color: colors.danger },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelLabel: { ...typography.label, color: colors.textMuted, fontSize: 13 },
  addBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  addLabel: { ...typography.label, color: colors.onPrimary, fontSize: 13 },
  disabled: { opacity: 0.5 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

const INACTIVE_SECTION_TITLE = '__inactive__';

export function MenuManagerScreen({ navigation, route }: Props) {
  const { restaurantId } = route.params;
  const {
    data: items = [],
    isLoading,
    isError,
    refetch,
  } = useMenu(restaurantId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [inactiveExpanded, setInactiveExpanded] = useState(false);

  const activeItems = useMemo(() => items.filter((i) => i.isActive), [items]);
  const inactiveItems = useMemo(
    () => items.filter((i) => !i.isActive),
    [items],
  );

  const sections = useMemo(() => {
    const grouped = groupByCategory(activeItems);
    if (inactiveItems.length > 0) {
      grouped.push({
        title: INACTIVE_SECTION_TITLE,
        data: inactiveExpanded ? inactiveItems : [],
      });
    }
    return grouped;
  }, [activeItems, inactiveItems, inactiveExpanded]);

  // ── Header config ──
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('BulkMenuPaste', { restaurantId })}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
          }}
          accessibilityLabel="Bulk add menu items"
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={colors.primary}
          />
          <Text
            style={{
              ...typography.caption,
              fontFamily: fontFamily.bold,
              color: colors.primary,
            }}
          >
            Bulk
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, restaurantId]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={44}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>Couldn't load menu.</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void refetch()}
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Summary header with Bulk Paste action ── */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {activeItems.length} item{activeItems.length !== 1 ? 's' : ''} active
        </Text>
        <TouchableOpacity
          style={styles.bulkPill}
          onPress={() => navigation.navigate('BulkMenuPaste', { restaurantId })}
          accessibilityRole="button"
          accessibilityLabel="Bulk Paste Menu Items"
        >
          <Ionicons name="copy-outline" size={14} color={colors.primary} />
          <Text style={styles.bulkPillText}>Bulk Paste Menu</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => {
          if (section.title === INACTIVE_SECTION_TITLE) {
            return (
              <TouchableOpacity
                style={styles.inactiveHeader}
                onPress={() => setInactiveExpanded((v) => !v)}
                accessibilityRole="button"
              >
                <Ionicons
                  name={inactiveExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.inactiveHeaderLabel}>
                  Inactive Items ({inactiveItems.length})
                </Text>
              </TouchableOpacity>
            );
          }
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            restaurantId={restaurantId}
            isEditing={editingId === item.id}
            onEdit={() => {
              setShowAdd(false);
              setEditingId(item.id);
            }}
            onEditDone={() => setEditingId(null)}
          />
        )}
        ListEmptyComponent={
          !showAdd ? (
            <View style={styles.center}>
              <Ionicons
                name="restaurant-outline"
                size={44}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>
                No menu items yet.{'\n'}Tap + to add or use Bulk Paste.
              </Text>
              <TouchableOpacity
                style={styles.emptyBulkBtn}
                onPress={() =>
                  navigation.navigate('BulkMenuPaste', { restaurantId })
                }
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.onPrimary}
                />
                <Text style={styles.emptyBulkBtnText}>Bulk Paste Items</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      {/* ── Inline add form pinned above FAB ── */}
      {showAdd && (
        <AddRow restaurantId={restaurantId} onDone={() => setShowAdd(false)} />
      )}

      {/* ── FAB ── */}
      {!showAdd && (
        <TouchableOpacity
          id="menu-manager-fab"
          accessibilityRole="button"
          accessibilityLabel="Add menu item"
          style={styles.fab}
          onPress={() => {
            setEditingId(null);
            setShowAdd(true);
          }}
        >
          <Ionicons name="add" size={30} color={colors.onPrimary} />
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
  },
  bulkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bulkPillText: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  emptyBulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  emptyBulkBtnText: {
    ...typography.label,
    color: colors.onPrimary,
    fontSize: 14,
  },

  sectionHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  inactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inactiveHeaderLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 13,
  },

  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  retryLabel: { ...typography.label, color: colors.onPrimary },

  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
