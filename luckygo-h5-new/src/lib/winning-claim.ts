import type { WinningRecord } from '../types';

export type WinningsListFilter = 'All' | 'Pending' | 'Claimed';

export function winningClaimPhase(status: WinningRecord['status']): 'pending' | 'claimed' {
    return status === 'Received' ? 'claimed' : 'pending';
}

export function matchesWinningsFilter(record: WinningRecord, filter: WinningsListFilter): boolean {
    if (filter === 'All') return true;
    const phase = winningClaimPhase(record.status);
    return filter === 'Pending' ? phase === 'pending' : phase === 'claimed';
}

export function winningStatusLabelKey(status: WinningRecord['status']): string {
    return status === 'Received' ? 'winningsStatusClaimed' : 'winningsStatusPending';
}

export function winningStatusBadgeClass(status: WinningRecord['status']): string {
    return status === 'Received'
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
        : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200';
}
