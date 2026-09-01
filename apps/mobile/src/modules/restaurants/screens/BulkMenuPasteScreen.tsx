import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import { colors, fontFamily, radius, spacing, typography } from '../../../ui';
import { getApiError } from '../../../api/client';
import { useBulkMenu } from '../hooks/useMenu';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'BulkMenuPaste'>;

// ── Parser ────────────────────────────────────────────────────────────────────

const EGP_PATTERN = /^\d+(\.\d{1,2})?$/;

interface ParsedRow {
  id: string;
  name: string;
  price: string;
  category: string;
  priceValid: boolean;
}

function parseLine(raw: string, index: number): ParsedRow {
  const line = raw.trim();
  const lastComma = line.lastIndexOf(',');
  const id = `row-${index}`;

  if (lastComma === -1) {
    // No comma → whole line is name, price missing
    return {
      id,
      name: line,
      price: '',
      category: '',
      priceValid: false,
    };
  }

  const name = line.slice(0, lastComma).trim();
  const priceRaw = line.slice(lastComma + 1).trim();
  const priceValid = EGP_PATTERN.test(priceRaw);

  return { id, name, price: priceRaw, category: '', priceValid };
}

function parseText(text: string): ParsedRow[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l, i) => parseLine(l, i));
}

// ── Preview row ───────────────────────────────────────────────────────────────

interface PreviewRowProps {
  row: ParsedRow;
  onChange: (updated: ParsedRow) => void;
  onRemove: () => void;
}

function PreviewRow({ row, onChange, onRemove }: PreviewRowProps) {
  const priceInvalid =
    row.price.trim() !== '' && !EGP_PATTERN.test(row.price.trim());
  const priceEmpty = row.price.trim() === '';

  return (
    <View style={previewStyles.wrap}>
      <View style={previewStyles.row}>
        <TextInput
          style={[
            previewStyles.nameInput,
            !row.name.trim() && previewStyles.inputError,
          ]}
          value={row.name}
          onChangeText={(v) => onChange({ ...row, name: v })}
          placeholder="Item name"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="sentences"
        />
        <TouchableOpacity
          onPress={onRemove}
          style={previewStyles.removeBtn}
          accessibilityLabel="Remove row"
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          previewStyles.priceWrap,
          (priceInvalid || priceEmpty) && previewStyles.priceError,
        ]}
      >
        <Text style={previewStyles.egpSymbol}>£</Text>
        <TextInput
          style={previewStyles.priceInput}
          value={row.price}
          onChangeText={(v) =>
            onChange({
              ...row,
              price: v,
              priceValid: EGP_PATTERN.test(v.trim()),
            })
          }
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </View>

      {(priceInvalid || priceEmpty) && (
        <View style={previewStyles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={12}
            color={colors.danger}
          />
          <Text style={previewStyles.errorText}>
            Missing or invalid price format
          </Text>
        </View>
      )}

      <TextInput
        style={previewStyles.categoryInput}
        value={row.category}
        onChangeText={(v) => onChange({ ...row, category: v })}
        placeholder="Category (optional)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="sentences"
      />
    </View>
  );
}

const previewStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  removeBtn: { padding: spacing.xs },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  priceError: { borderColor: colors.danger },
  egpSymbol: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
  priceInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    fontSize: 11,
  },
  categoryInput: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    fontSize: 13,
    color: colors.text,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export function BulkMenuPasteScreen({ navigation, route }: Props) {
  const { restaurantId } = route.params;
  const [pasteText, setPasteText] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsed, setParsed] = useState(false);
  const [bannerError, setBannerError] = useState<string | undefined>();
  const { mutateAsync: bulkCreate, isPending } = useBulkMenu(restaurantId);

  const lineCount = pasteText.split('\n').filter((l) => l.trim()).length;
  const validRows = rows.filter((r) => r.name.trim() && r.priceValid);
  const errorRows = rows.filter((r) => !r.name.trim() || !r.priceValid);

  function handleParse() {
    const result = parseText(pasteText);
    setRows(result);
    setParsed(result.length > 0);
    setBannerError(undefined);
  }

  function handleRowChange(index: number, updated: ParsedRow) {
    setRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
  }

  function handleRemoveRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddEmptyRow() {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        name: '',
        price: '',
        category: '',
        priceValid: false,
      },
    ]);
  }

  async function handleSave() {
    if (validRows.length === 0) {
      setBannerError('Fix all errors before saving.');
      return;
    }
    if (errorRows.length > 0) {
      setBannerError(
        `${errorRows.length} row(s) have errors. Fix or remove them first.`,
      );
      return;
    }
    setBannerError(undefined);
    try {
      await bulkCreate(
        validRows.map((r) => ({
          name: r.name.trim(),
          category: r.category.trim() || undefined,
          referencePrice: r.price.trim(),
        })),
      );
      navigation.goBack();
    } catch (err) {
      const { message } = getApiError(err);
      setBannerError(message ?? 'Failed to save. Try again.');
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setPasteText(text.trim());
        setBannerError(undefined);
      } else {
        setBannerError('Clipboard is empty. Copy some text first!');
      }
    } catch {
      setBannerError('Unable to read from clipboard.');
    }
  }

  function handleInsertSample() {
    setPasteText(
      'Foul, 15.00\nTaameya, 12.00\nSpicy Shakshuka, 18.00\nKoshari, 25.00\nBaladi Bread, 5.00',
    );
    setBannerError(undefined);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Instructions ── */}
        {!parsed && (
          <Text style={styles.instruction}>
            Paste your menu items below. Use the format:{'\n'}
            <Text style={styles.instructionBold}>Item Name, Price</Text>
            {'. Each item on a new line.'}
          </Text>
        )}

        {/* ── Quick action buttons ── */}
        {!parsed && (
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.pasteActionBtn}
              onPress={() => void handlePasteFromClipboard()}
              accessibilityRole="button"
            >
              <Ionicons
                name="clipboard-outline"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.pasteActionBtnText}>
                Paste from Clipboard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sampleActionBtn}
              onPress={handleInsertSample}
              accessibilityRole="button"
            >
              <Ionicons
                name="sparkles-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.sampleActionBtnText}>Insert Sample</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Paste area ── */}
        {!parsed && (
          <View style={styles.pasteWrap}>
            <TextInput
              id="bulk-paste-input"
              style={styles.pasteInput}
              value={pasteText}
              onChangeText={setPasteText}
              placeholder={
                'Foul, 15.00\nTaameya, 12.00\nSpicy Shakshuka, 18.00\nKoshari, 25.00\nBaladi Bread, 5.00'
              }
              placeholderTextColor={colors.textMuted}
              multiline
              autoCapitalize="sentences"
              autoCorrect={false}
              textAlignVertical="top"
              contextMenuHidden={false}
              selectTextOnFocus={false}
            />
            <Text style={styles.lineCount}>
              {lineCount} line{lineCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* ── Parse button ── */}
        {!parsed && (
          <TouchableOpacity
            id="bulk-parse-btn"
            style={[
              styles.parseBtn,
              !pasteText.trim() && styles.parseBtnDisabled,
            ]}
            onPress={handleParse}
            disabled={!pasteText.trim()}
          >
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={colors.onPrimary}
            />
            <Text style={styles.parseBtnLabel}>Parse Items</Text>
          </TouchableOpacity>
        )}

        {/* ── Editable preview ── */}
        {parsed && (
          <>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewTitle}>Editable Preview</Text>
                <TouchableOpacity
                  onPress={() => setParsed(false)}
                  style={{ marginTop: 2 }}
                >
                  <Text style={styles.reEditLink}>← Edit Raw Text</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.badges}>
                {validRows.length > 0 && (
                  <View style={[styles.badge, styles.badgeValid]}>
                    <Text style={styles.badgeText}>
                      {validRows.length} Valid
                    </Text>
                  </View>
                )}
                {errorRows.length > 0 && (
                  <View style={[styles.badge, styles.badgeError]}>
                    <Text style={styles.badgeText}>
                      {errorRows.length} Error
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {bannerError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{bannerError}</Text>
              </View>
            )}

            {rows.map((row, index) => (
              <PreviewRow
                key={row.id}
                row={row}
                onChange={(updated) => handleRowChange(index, updated)}
                onRemove={() => handleRemoveRow(index)}
              />
            ))}

            <TouchableOpacity
              id="bulk-add-empty-row-btn"
              style={styles.addEmptyBtn}
              onPress={handleAddEmptyRow}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addEmptyLabel}>Add Empty Row</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Save button ── */}
      {parsed && (
        <View style={styles.footer}>
          <TouchableOpacity
            id="bulk-save-btn"
            style={[
              styles.saveBtn,
              (validRows.length === 0 || isPending) && styles.saveBtnDisabled,
            ]}
            onPress={() => void handleSave()}
            disabled={validRows.length === 0 || isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.saveBtnLabel}>
                Save {validRows.length} Item{validRows.length !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    flexGrow: 1,
  },

  instruction: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  instructionBold: {
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },

  // ── Quick actions ──
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pasteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pasteActionBtnText: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
    fontSize: 13,
  },
  sampleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sampleActionBtnText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 13,
  },
  reEditLink: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },

  // ── Paste area ──
  pasteWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pasteInput: {
    minHeight: 160,
    padding: spacing.md,
    ...typography.body,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  lineCount: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },

  parseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
  },
  parseBtnDisabled: { opacity: 0.45 },
  parseBtnLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.onPrimary,
  },

  // ── Preview ──
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitle: { ...typography.label, color: colors.text },
  badges: { flexDirection: 'row', gap: spacing.xs },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeValid: { backgroundColor: '#2ECC71' + '30' },
  badgeError: { backgroundColor: colors.danger + '25' },
  badgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: colors.text,
  },

  errorBanner: {
    backgroundColor: colors.danger + '20',
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.danger,
  },

  addEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addEmptyLabel: {
    ...typography.label,
    color: colors.primary,
    fontSize: 13,
  },

  // ── Footer ──
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.onPrimary,
  },
});
