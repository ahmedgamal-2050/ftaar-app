import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  TextField,
  colors,
  radius,
  spacing,
  typography,
} from '../../../ui';

interface RejectClaimSheetProps {
  visible: boolean;
  /** Whose claim is being turned down — named so the host can't misfire. */
  memberName: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (note: string | undefined) => void;
}

/** Matches the backend's `ResolveClaimDto.note` cap. */
const NOTE_MAX_LENGTH = 500;

/**
 * Asks the host why a claim is being rejected. The reason is optional by
 * design — a wrong amount is worth explaining, a fat-fingered tap is not, and
 * demanding justification for the second would just train hosts to type
 * nothing meaningful.
 *
 * A modal rather than `Alert.prompt` because that API is iOS-only.
 */
export function RejectClaimSheet({
  visible,
  memberName,
  busy,
  onCancel,
  onSubmit,
}: RejectClaimSheetProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');

  const close = () => {
    setNote('');
    onCancel();
  };

  const submit = () => {
    const trimmed = note.trim();
    onSubmit(trimmed.length > 0 ? trimmed : undefined);
    setNote('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID="reject-claim-sheet">
          <Text style={styles.title}>{t('payments.rejectTitle')}</Text>
          <Text style={styles.body}>
            {t('payments.rejectBody', { name: memberName })}
          </Text>
          <TextField
            label={t('payments.rejectReasonLabel')}
            value={note}
            onChangeText={setNote}
            placeholder={t('payments.rejectReasonPlaceholder')}
            maxLength={NOTE_MAX_LENGTH}
            testID="reject-claim-note"
          />
          <View style={styles.actions}>
            <Button
              label={t('common.cancel')}
              variant="outline"
              onPress={close}
              disabled={busy}
              style={styles.action}
              testID="reject-claim-cancel"
            />
            <Button
              label={t('payments.reject')}
              onPress={submit}
              loading={busy}
              style={styles.action}
              testID="reject-claim-submit"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { ...typography.title, fontSize: 20, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
