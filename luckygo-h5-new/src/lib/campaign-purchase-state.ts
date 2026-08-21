import type { Product } from '../types';

export type CampaignPurchaseState = 'open' | 'awaiting' | 'closed';

/** 详情页底部 CTA：是否可购买 / 待开奖 / 已结束 */
export function getCampaignPurchaseState(
    product: Pick<Product, 'status' | 'totalShares' | 'sharesSold' | 'drawPending'>,
): CampaignPurchaseState {
    const status = String(product.status || '').toLowerCase();
    const remaining = Math.max(product.totalShares - product.sharesSold, 0);
    const drawPending = Boolean(product.drawPending);

    if (status === 'selling' && remaining > 0 && !drawPending) {
        return 'open';
    }
    if (drawPending || status === 'sold_out' || status === 'drawing') {
        return 'awaiting';
    }
    if (status === 'ended' || status === 'cancelled') {
        return 'closed';
    }
    // 已满员但状态未及时更新时，勿再展示「立即夺取」
    if (remaining === 0 && status !== 'selling') {
        return 'closed';
    }
    return 'closed';
}
