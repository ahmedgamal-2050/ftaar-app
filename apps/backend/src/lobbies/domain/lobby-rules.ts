import { AppError } from '../../core/errors/app-error';
import type { Lobby } from '../entities/lobby.entity';

export const DISPLAY_NAME_MAX_LENGTH = 120;

export function resolveExpiresAt(
  expiryMinutes?: number,
  expiresAt?: string,
): Date | null {
  if (expiryMinutes !== undefined && expiresAt !== undefined) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Provide either expiryMinutes or expiresAt, not both',
    );
  }
  if (expiryMinutes !== undefined) {
    return new Date(Date.now() + expiryMinutes * 60_000);
  }
  if (expiresAt !== undefined) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError('VALIDATION_ERROR', 'expiresAt must be a valid date');
    }
    if (parsed.getTime() <= Date.now()) {
      throw new AppError('VALIDATION_ERROR', 'expiresAt must be in the future');
    }
    return parsed;
  }
  return null;
}

/** `undefined` keeps the profile fallback; `null` clears the handle. */
export function normalizeOptionalHandle(
  handle?: string,
): string | null | undefined {
  if (handle === undefined) {
    return undefined;
  }
  const trimmed = handle.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveJoinDisplayName(
  requested: string | undefined,
  profileName: string,
): string {
  const name = (requested ?? profileName).trim();
  if (name.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'displayName is required');
  }
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new AppError(
      'VALIDATION_ERROR',
      `displayName must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
    );
  }
  return name;
}

export function assertJoinable(lobby: Lobby): void {
  if (lobby.status !== 'open') {
    throw new AppError('CONFLICT', 'This lobby is not open for joining', {
      status: lobby.status,
    });
  }
  if (lobby.expiresAt && lobby.expiresAt.getTime() <= Date.now()) {
    throw new AppError('CONFLICT', 'This lobby has expired');
  }
  if (lobby.maxMembers !== null && lobby.memberCount >= lobby.maxMembers) {
    throw new AppError('CONFLICT', 'This lobby is full', {
      maxMembers: lobby.maxMembers,
    });
  }
}
