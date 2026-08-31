import { randomInt } from 'node:crypto';
import { AppError } from '../../core/errors/app-error';

const LOBBY_CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const LOBBY_CODE_LENGTH = 6;
export const LOBBY_CODE_PATTERN = /^[A-Z0-9]{6}$/;

/** Attempts before giving up on finding a free code (see `uq_lobbies_code`). */
export const MAX_CODE_ATTEMPTS = 8;

export function generateLobbyCode(): string {
  let code = '';
  for (let i = 0; i < LOBBY_CODE_LENGTH; i += 1) {
    code += LOBBY_CODE_ALPHABET[randomInt(LOBBY_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeLobbyCode(raw: string): string {
  const code = raw.trim().toUpperCase();
  if (!LOBBY_CODE_PATTERN.test(code)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'code must be a 6-character alphanumeric lobby code',
    );
  }
  return code;
}
