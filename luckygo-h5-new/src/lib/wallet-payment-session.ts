const CHECKOUT_URL_KEY = 'eba_wallet_checkout_url';
const CHECKOUT_META_KEY = 'eba_wallet_checkout_meta';

export type WalletCheckoutMeta = {
    clientReference?: string;
    checkoutId?: string;
};

export function saveWalletCheckoutSession(checkoutUrl: string, meta: WalletCheckoutMeta = {}) {
    sessionStorage.setItem(CHECKOUT_URL_KEY, checkoutUrl);
    sessionStorage.setItem(CHECKOUT_META_KEY, JSON.stringify(meta));
}

export function readWalletCheckoutSession(): { checkoutUrl: string | null; meta: WalletCheckoutMeta } {
    const checkoutUrl = sessionStorage.getItem(CHECKOUT_URL_KEY);
    let meta: WalletCheckoutMeta = {};
    try {
        const raw = sessionStorage.getItem(CHECKOUT_META_KEY);
        if (raw) meta = JSON.parse(raw) as WalletCheckoutMeta;
    } catch {
        meta = {};
    }
    return { checkoutUrl, meta };
}

export function clearWalletCheckoutSession() {
    sessionStorage.removeItem(CHECKOUT_URL_KEY);
    sessionStorage.removeItem(CHECKOUT_META_KEY);
}

export function isAllowedPaymentUrl(raw: string): boolean {
    try {
        const url = new URL(raw);
        if (url.protocol === 'https:') return true;
        return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    } catch {
        return false;
    }
}
