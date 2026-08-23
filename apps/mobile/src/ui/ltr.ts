/** Unicode isolate pair: forces a run to render LTR inside an RTL paragraph. */
const LTR_ISOLATE_START = '\u2066';
const LTR_ISOLATE_END = '\u2069';

/**
 * Brackets a value in LTR isolates when the layout is RTL. `writingDirection`
 * only lands on iOS, so Android needs the Unicode marks to keep a price or a
 * lobby code from being reordered. In an LTR layout the marks would only add
 * invisible characters to the string, so they are skipped.
 */
export function isolateLtr(value: string | number, isRTL: boolean): string {
  return isRTL ? `${LTR_ISOLATE_START}${value}${LTR_ISOLATE_END}` : String(value);
}
