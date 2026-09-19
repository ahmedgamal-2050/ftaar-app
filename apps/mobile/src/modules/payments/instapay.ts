import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * InstaPay's deep link scheme. Egypt's IPN does not publish a documented
 * URL contract, so this is the one value to change if the team confirms a
 * different one — every call site goes through `instaPayUrl` below.
 */
const INSTAPAY_SCHEME = 'instapay';

/** What actually happened when the member tapped "Pay". */
export type PayLaunchResult =
  /** The payment app took over, prefilled. */
  | { kind: 'opened' }
  /** No payment app — details are on the clipboard, show manual instructions. */
  | { kind: 'copied' }
  /** The host never set an InstaPay handle, so there is nothing to pay to. */
  | { kind: 'no-handle' };

/**
 * Deep link into InstaPay with the recipient and amount already filled in, so
 * paying is one tap and nobody mistypes an amount.
 */
export function instaPayUrl(handle: string, amount: string): string {
  const params = new URLSearchParams({ recipient: handle, amount });
  return `${INSTAPAY_SCHEME}://pay?${params.toString()}`;
}

interface LaunchArgs {
  /** The host's InstaPay handle — the recipient. */
  handle: string | null;
  /** EGP string, e.g. "42.75". */
  amount: string;
  /**
   * Localised text copied when the payment app is missing. Composed by the
   * caller so this module stays free of i18n; it must carry the handle, the
   * amount and enough context for the member to pay by hand.
   */
  clipboardText: string;
}

/**
 * Opens InstaPay prefilled, or falls back to the clipboard.
 *
 * The fallback is not a nicety — a member who cannot pay is a member who
 * holds up the whole lobby, so "app missing" must still end with them holding
 * every detail they need.
 *
 * Deliberately no `canOpenURL` pre-check: on Android 11+ it returns false for
 * any scheme not declared in the manifest's `queries` block, which Expo Go
 * cannot declare, so it would report "not installed" even when InstaPay is
 * sitting right there. Attempting the open and catching the throw is the only
 * reading that is accurate on both platforms.
 */
export async function launchInstaPay({
  handle,
  amount,
  clipboardText,
}: LaunchArgs): Promise<PayLaunchResult> {
  if (!handle) {
    return { kind: 'no-handle' };
  }

  try {
    await Linking.openURL(instaPayUrl(handle, amount));
    return { kind: 'opened' };
  } catch {
    await Clipboard.setStringAsync(clipboardText);
    return { kind: 'copied' };
  }
}
