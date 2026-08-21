const BALANCE_VISIBLE_KEY = 'luckygo_balance_visible';

export function isBalanceVisible(): boolean {
    try {
        return localStorage.getItem(BALANCE_VISIBLE_KEY) !== '0';
    } catch {
        return true;
    }
}

export function setBalanceVisible(visible: boolean): void {
    try {
        localStorage.setItem(BALANCE_VISIBLE_KEY, visible ? '1' : '0');
    } catch {
        // Ignore quota / private mode errors.
    }
}
