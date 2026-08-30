import { Prisma } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';

export const DISPLAY_NAME_TAKEN_MESSAGE =
  'This name is already taken in this lobby.';

function normalizeConstraintToken(value: string): string {
  return value.toLowerCase().replace(/[_"]/g, '');
}

/**
 * Prisma reports P2002 targets as either column names or the index name,
 * depending on the driver, so match on normalized tokens instead.
 */
export function isUniqueOn(error: unknown, ...fields: string[]): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }
  const target = error.meta?.['target'];
  const tokens = (Array.isArray(target) ? target : [target]).flatMap((item) =>
    item === undefined || item === null
      ? []
      : [normalizeConstraintToken(String(item))],
  );
  const haystack = tokens.join(' ');
  return fields.every((field) =>
    haystack.includes(normalizeConstraintToken(field)),
  );
}

/** Covers `uq_lobby_members_name_lower`, which Prisma cannot express. */
export function rethrowDisplayNameConflict(error: unknown): void {
  if (
    isUniqueOn(error, 'display_name') ||
    isUniqueOn(error, 'lobby_id', 'lower')
  ) {
    throw new AppError('CONFLICT', DISPLAY_NAME_TAKEN_MESSAGE);
  }
}
