import React, { useState } from 'react';
import {
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RestaurantsStackParamList } from '../../../navigation/types';
import { ErrorBanner } from '../../../ui/components/ErrorBanner';
import { colors, fontFamily, radius, spacing, typography } from '../../../ui';
import { getApiError } from '../../../api/client';
import { useCreateRestaurant } from '../hooks/useRestaurants';

type Props = NativeStackScreenProps<
  RestaurantsStackParamList,
  'RestaurantForm'
>;

const NAME_MIN = 2;
const NAME_MAX = 255;
const PHONE_MIN = 5;
const PHONE_MAX = 32;
const NOTE_MAX = 2000;

// ── Reusable inline field component ─────────────────────────────────────────
interface FormFieldProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  multiline?: boolean;
  maxLength?: number;
  error?: string;
  testID?: string;
}

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
  multiline = false,
  maxLength,
  error,
  testID,
}: FormFieldProps) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View
        style={[
          fieldStyles.inputRow,
          multiline && fieldStyles.inputRowMulti,
          !!error && fieldStyles.inputRowError,
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={colors.textMuted}
          style={fieldStyles.icon}
        />
        <TextInput
          testID={testID}
          style={[fieldStyles.input, multiline && fieldStyles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    ...typography.caption,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputRowMulti: {
    alignItems: 'flex-start',
    paddingTop: spacing.md,
  },
  inputRowError: { borderColor: colors.danger },
  icon: { marginRight: spacing.sm, marginTop: 2 },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  inputMulti: {
    minHeight: 90,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});

// ── Screen ───────────────────────────────────────────────────────────────────

export function RestaurantFormScreen({ navigation, route }: Props) {
  const isEditMode = !!route.params?.restaurantId;

  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  const [nameError, setNameError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [bannerError, setBannerError] = useState<string | undefined>();

  const { mutateAsync: createRestaurant, isPending } = useCreateRestaurant();

  /** Opens the device photo library. */
  async function handlePickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setBannerError(
        'Photo library access is required to pick a logo. Please allow it in Settings.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  }

  function validateName(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length < NAME_MIN)
      return `Name must be at least ${NAME_MIN} characters.`;
    if (trimmed.length > NAME_MAX) return 'Name is too long.';
    return undefined;
  }

  function validatePhone(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length < PHONE_MIN)
      return `Phone must be at least ${PHONE_MIN} characters.`;
    if (trimmed.length > PHONE_MAX) return 'Phone number is too long.';
    return undefined;
  }

  async function handleSubmit() {
    const nErr = validateName(name);
    const pErr = validatePhone(phone);

    setNameError(nErr);
    setPhoneError(pErr);

    if (nErr || pErr) return;

    setBannerError(undefined);

    try {
      await createRestaurant({
        name: name.trim(),
        phone: phone.trim(),
        // Send local URI as the image string — backend stores whatever string we pass.
        // When a real upload endpoint exists this will be replaced with the CDN URL.
        image: logoUri ?? '',
        note: note.trim() || undefined,
      });
      navigation.goBack();
    } catch (err) {
      const { code, message } = getApiError(err);
      if (code === 'ALREADY_EXISTS') {
        setNameError('A restaurant with this name already exists.');
      } else {
        setBannerError(message ?? 'Something went wrong. Please try again.');
      }
    }
  }

  const canSubmit =
    name.trim().length >= NAME_MIN &&
    phone.trim().length >= PHONE_MIN &&
    !isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo picker ── */}
        <View style={styles.logoWrap}>
          <TouchableOpacity
            id="restaurant-logo-picker"
            accessibilityRole="button"
            accessibilityLabel="Add restaurant logo"
            style={styles.logoPicker}
            onPress={() => void handlePickLogo()}
          >
            {logoUri ? (
              <>
                <Image source={{ uri: logoUri }} style={styles.logoImage} />
                <View style={styles.logoBadge}>
                  <Ionicons name="pencil" size={12} color={colors.onPrimary} />
                </View>
              </>
            ) : (
              <>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={colors.textMuted}
                />
                <Text style={styles.logoLabel}>Add Logo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Error banner ── */}
        {bannerError ? (
          <ErrorBanner
            message={bannerError}
            testID="restaurant-form-error-banner"
          />
        ) : null}

        {/* ── Fields ── */}
        <View style={styles.fields}>
          <FormField
            label="Restaurant Name"
            icon="storefront-outline"
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (nameError) setNameError(validateName(v));
            }}
            placeholder="e.g., Al Aseel Foul"
            autoCapitalize="words"
            maxLength={NAME_MAX}
            error={nameError}
            testID="restaurant-name-input"
          />

          <FormField
            label="Phone Number"
            icon="call-outline"
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              if (phoneError) setPhoneError(validatePhone(v));
            }}
            placeholder="01X.XXXX.XXXX"
            keyboardType="phone-pad"
            autoCapitalize="none"
            maxLength={PHONE_MAX}
            error={phoneError}
            testID="restaurant-phone-input"
          />

          <FormField
            label="Notes (Optional)"
            icon="document-text-outline"
            value={note}
            onChangeText={setNote}
            placeholder="e.g., Best tameya in Dokki, opens at 6 AM."
            multiline
            maxLength={NOTE_MAX}
            testID="restaurant-notes-input"
          />
        </View>
      </ScrollView>

      {/* ── Save button — pinned above keyboard ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          id="restaurant-form-submit-btn"
          accessibilityRole="button"
          style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
        >
          <Text style={styles.saveBtnLabel}>
            {isPending
              ? 'Saving…'
              : isEditMode
                ? 'Update Restaurant'
                : 'Save Restaurant'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.xl,
  },

  // ── Logo picker ──
  logoWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoPicker: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
  },
  logoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // ── Fields group ──
  fields: {
    gap: spacing.lg,
  },

  // ── Footer / Save ──
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
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.onPrimary,
    lineHeight: 24,
  },
});
