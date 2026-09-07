import type { ValidationError } from '@nestjs/common';
import { mapConstraintToValidationCode } from './validation-code.mapper';
import type { ValidationErrorItem } from './validation-error.types';

function joinPath(parent: string, child: string): string {
  if (!parent) {
    return child;
  }
  if (!child) {
    return parent;
  }
  return `${parent}.${child}`;
}

function maybeConstraintMeta(
  code: string,
  message: string,
): Record<string, unknown> | undefined {
  if (code === 'MIN_LENGTH') {
    const match = message.match(/(\d+)/);
    if (match?.[1]) {
      return { min: Number.parseInt(match[1], 10) };
    }
  }
  if (code === 'MAX_LENGTH') {
    const match = message.match(/(\d+)/);
    if (match?.[1]) {
      return { max: Number.parseInt(match[1], 10) };
    }
  }
  return undefined;
}

function flattenNode(
  node: ValidationError,
  parentPath: string,
  out: ValidationErrorItem[],
): void {
  const path = joinPath(parentPath, node.property);
  const constraints = node.constraints ?? {};

  for (const [constraintName, constraintMessage] of Object.entries(
    constraints,
  )) {
    const code = mapConstraintToValidationCode(constraintName);
    out.push({
      path,
      code,
      message: constraintMessage,
      ...(maybeConstraintMeta(code, constraintMessage)
        ? { meta: maybeConstraintMeta(code, constraintMessage) }
        : {}),
    });
  }

  for (const child of node.children ?? []) {
    flattenNode(child, path, out);
  }
}

export function flattenValidationErrors(
  errors: ValidationError[],
): ValidationErrorItem[] {
  const result: ValidationErrorItem[] = [];
  for (const node of errors) {
    flattenNode(node, '', result);
  }
  return result;
}
