import { MIN_PARTICIPATION_GHS } from '../constants';

/** 满足最低参与金额所需份数 */
export function resolveMinShareCount(pricePerShare: number): number {
    const price = Math.max(Number(pricePerShare) || MIN_PARTICIPATION_GHS, 0.01);
    return Math.max(1, Math.ceil(MIN_PARTICIPATION_GHS / price));
}

export function meetsMinParticipationAmount(shareCount: number, pricePerShare: number): boolean {
    return shareCount * Math.max(Number(pricePerShare) || 0, 0) + 1e-9 >= MIN_PARTICIPATION_GHS;
}
