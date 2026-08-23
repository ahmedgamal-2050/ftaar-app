/**
 * Deterministic avatar colour for a person, derived only from their name —
 * the app never stores or renders photo avatars, so the name is the single
 * input. Same name always yields the same colour, on every device.
 */

// FNV-1a over code points: stable across platforms and JS engines, and
// spreads short names (the common case) across the hue circle.
function hashName(name: string): number {
  let hash = 0x811c9dc5;
  for (const character of name.trim().toLowerCase()) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

// Saturation and lightness are pinned so every generated colour keeps enough
// contrast for white initials; only the hue varies.
const SATURATION = 42;
const LIGHTNESS = 42;

export function memberColor(name: string): string {
  return `hsl(${hashName(name) % 360}, ${SATURATION}%, ${LIGHTNESS}%)`;
}

/** Up to two initials, taken from the first and last word of the name. */
export function memberInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }

  const first = Array.from(words[0])[0] ?? '';
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : '';

  return `${first}${last}`.toLocaleUpperCase();
}
