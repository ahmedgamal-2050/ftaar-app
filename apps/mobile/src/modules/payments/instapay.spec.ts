import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { instaPayUrl, launchInstaPay } from './instapay';

const CLIPBOARD_TEXT = 'InstaPay: omar.pay — EGP 42.75 (Ftaar lobby FTAAR1)';

function args(overrides: Partial<Parameters<typeof launchInstaPay>[0]> = {}) {
  return {
    handle: 'omar.pay',
    amount: '42.75',
    clipboardText: CLIPBOARD_TEXT,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('instaPayUrl', () => {
  it('carries the recipient and amount so nothing has to be typed', () => {
    const url = new URL(instaPayUrl('omar.pay', '42.75'));

    expect(url.protocol).toBe('instapay:');
    expect(url.searchParams.get('recipient')).toBe('omar.pay');
    expect(url.searchParams.get('amount')).toBe('42.75');
  });

  it('escapes handles that would otherwise break the query string', () => {
    const url = new URL(instaPayUrl('omar pay&x=1', '10.00'));

    expect(url.searchParams.get('recipient')).toBe('omar pay&x=1');
    expect(url.searchParams.get('amount')).toBe('10.00');
  });
});

describe('launchInstaPay', () => {
  it('opens the payment app when it is installed', async () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(true as never);

    await expect(launchInstaPay(args())).resolves.toEqual({ kind: 'opened' });

    expect(openURL).toHaveBeenCalledWith(instaPayUrl('omar.pay', '42.75'));
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });

  /**
   * The acceptance criterion: on a device without InstaPay, the member must
   * still walk away with everything needed to pay by hand.
   */
  it('falls back to the clipboard when the payment app is missing', async () => {
    jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('No Activity found to handle Intent'));

    await expect(launchInstaPay(args())).resolves.toEqual({ kind: 'copied' });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(CLIPBOARD_TEXT);
  });

  it('reports a missing host handle instead of opening a useless link', async () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(true as never);

    await expect(launchInstaPay(args({ handle: null }))).resolves.toEqual({
      kind: 'no-handle',
    });

    expect(openURL).not.toHaveBeenCalled();
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
  });
});
