import { formatCampaignRoundNo } from './lib/campaign-round';

export interface User {
    id: string;
    nickname: string;
    avatar: string;
    /** 可提现余额 */
    balance: number;
    /** 金豆/积分兑换得到的夺宝专用余额，不可提现 */
    exchangeBalance: number;
    /** 可提现 + 夺宝专用，用于下单校验展示 */
    totalBalance: number;
    beans: number;
    vipLevel: number;
    /** 来自后端 users.phone，未设置时为空字符串 */
    phone?: string;
    /** 专属邀请码（8 位字母数字） */
    inviteCode?: string;
    /** 是否已在服务端确认成年（无 KYC） */
    ageConfirmed?: boolean;
    agePolicyVersion?: string | null;
}

export interface InviteMyRewardsInvitee {
    nickname: string;
    phoneMasked: string;
    registeredAt: string;
    signupRewardBeans: number;
    spendRewardBeans: number;
    /** 本人通过邀请码注册获得的奖励 */
    isSelf: boolean;
}

export interface InviteMyRewards {
    inviteCount: number;
    signupRewardBeans: number;
    spendRewardBeans: number;
    totalRewardBeans: number;
    invitees: InviteMyRewardsInvitee[];
}

/** 在售期次（H5 列表/详情） */
export interface Campaign {
    id: number;
    productId: number;
    roundNo: number;
    roundNoDisplay?: string;
    title: string;
    description: string;
    image: string;
    totalPrice: number;
    pricePerShare: number;
    totalShares: number;
    sharesSold: number;
    tag?: string | null;
    categoryId?: number | null;
    status: string;
    autoDrawOnSellout?: boolean;
    autoDrawCountdownSeconds?: number;
    selloutAt?: string | null;
    drawScheduledAt?: string | null;
    drawCountdownRemaining?: number;
    drawPending?: boolean;
}

export type Product = Campaign;

export interface ProductCategory {
    id: number;
    name: string;
    nameZh: string;
    sortOrder: number;
}

export interface ApiProductCategoryRow {
    id: number;
    name: string;
    name_zh?: string;
    sort_order: number;
}

export const mapProductCategory = (data: ApiProductCategoryRow): ProductCategory => ({
    id: data.id,
    name: data.name,
    nameZh: data.name_zh ?? '',
    sortOrder: data.sort_order,
});

export interface ApiCampaignRow {
    id: number;
    productId: number;
    roundNo: number;
    roundNoDisplay?: string;
    title: string;
    description: string;
    image: string;
    totalPrice: number;
    pricePerShare: number;
    totalShares: number;
    sharesSold: number;
    tag?: string | null;
    categoryId?: number | null;
    category_id?: number | null;
    status: string;
    autoDrawOnSellout?: boolean;
    auto_draw_on_sellout?: number | boolean;
    autoDrawCountdownSeconds?: number;
    auto_draw_countdown_seconds?: number;
    selloutAt?: string | null;
    sellout_at?: string | null;
    drawScheduledAt?: string | null;
    draw_scheduled_at?: string | null;
    drawCountdownRemaining?: number;
    draw_countdown_remaining?: number;
    drawPending?: boolean;
    draw_pending?: boolean;
}

export const mapCampaign = (data: ApiCampaignRow): Campaign => ({
    id: data.id,
    productId: data.productId,
    roundNo: data.roundNo,
    roundNoDisplay: data.roundNoDisplay ?? formatCampaignRoundNo(data.roundNo),
    title: data.title,
    description: data.description,
    image: data.image,
    totalPrice: Number(data.totalPrice),
    pricePerShare: Number(data.pricePerShare),
    totalShares: data.totalShares,
    sharesSold: data.sharesSold,
    tag: data.tag ?? undefined,
    categoryId: data.categoryId ?? data.category_id ?? null,
    status: data.status,
    autoDrawOnSellout: Boolean(data.autoDrawOnSellout ?? data.auto_draw_on_sellout),
    autoDrawCountdownSeconds: Number(data.autoDrawCountdownSeconds ?? data.auto_draw_countdown_seconds) || 60,
    selloutAt: data.selloutAt ?? data.sellout_at ?? null,
    drawScheduledAt: data.drawScheduledAt ?? data.draw_scheduled_at ?? null,
    drawCountdownRemaining: Number(data.drawCountdownRemaining ?? data.draw_countdown_remaining) || 0,
    drawPending: Boolean(data.drawPending ?? data.draw_pending),
});

export const mapProduct = mapCampaign;

export interface HistoryRecord {
    id: string;
    productName: string;
    productImage: string;
    issue: string;
    drawTime: string;
    winningNumber: string;
    totalShares: number;
    winnerName: string;
    winnerAvatar: string;
    winnerLocation: string;
    valueA: string;
    valueB: string;
    winnerPhone?: string;
    serverSeedHash?: string;
    entriesHash?: string;
    publicRandomSource?: string;
    publicRandomValue?: string;
    finalHash?: string;
    proofTxHash?: string;
}

export interface ApiHistoryRow {
    id: string | number;
    productName: string;
    productImage: string;
    issue?: string | number;
    drawTime?: string;
    draw_time?: string;
    winningNumber?: string;
    winning_number?: string;
    totalShares: number;
    winnerName: string;
    winnerAvatar: string;
    winnerLocation: string;
    valueA: string;
    valueB: string;
    winnerPhone?: string;
}

export const mapHistoryRecord = (data: ApiHistoryRow): HistoryRecord => ({
    id: String(data.id),
    productName: data.productName,
    productImage: data.productImage,
    issue: (() => {
        const n = Number(data.issue);
        if (Number.isFinite(n) && n > 0) return formatCampaignRoundNo(n);
        return String(data.issue ?? data.id);
    })(),
    drawTime: data.drawTime || data.draw_time || '',
    winningNumber: data.winningNumber || data.winning_number || '',
    totalShares: Number(data.totalShares),
    winnerName: data.winnerName,
    winnerAvatar: data.winnerAvatar,
    winnerLocation: data.winnerLocation,
    valueA: String(data.valueA || ''),
    valueB: String(data.valueB || data.totalShares || ''),
    winnerPhone: data.winnerPhone,
});

export interface WinningRecord {
    id: string;
    productId: number;
    campaignId: number;
    product: {
        title: string;
        image: string;
    };
    issue: string;
    winningNumber: string;
    status: 'Processing' | 'Shipped' | 'Received';
    fulfillmentType?: 'pickup' | 'delivery';
    deliveryName?: string;
    deliveryPhone?: string;
    deliveryAddress?: string;
    fulfillmentNote?: string;
    timestamp: string;
}

export interface ApiWinningRow {
    id: number | string;
    product_id?: number | string;
    campaign_id?: number | string;
    product_title?: string;
    product_image?: string;
    winning_number?: string;
    winningNumber?: string;
    status?: WinningRecord['status'];
    draw_time?: string;
    created_at?: string;
    round_no?: number;
    fulfillment_type?: 'pickup' | 'delivery';
    delivery_name?: string | null;
    delivery_phone?: string | null;
    delivery_address?: string | null;
    fulfillment_note?: string | null;
}

export const mapWinningRecord = (row: ApiWinningRow): WinningRecord => ({
    id: String(row.id),
    productId: Number(row.product_id ?? 0),
    campaignId: Number(row.campaign_id ?? 0),
    product: {
        title: row.product_title || 'EBA Promo Prize',
        image: row.product_image || '',
    },
    issue: (() => {
        const rn = Number(row.round_no ?? 0);
        if (rn > 0) return formatCampaignRoundNo(rn);
        return String(row.campaign_id || row.product_id || row.id);
    })(),
    winningNumber: row.winning_number || row.winningNumber || '',
    status: (row.status as WinningRecord['status']) || 'Processing',
    fulfillmentType: row.fulfillment_type || 'pickup',
    deliveryName: row.delivery_name || '',
    deliveryPhone: row.delivery_phone || '',
    deliveryAddress: row.delivery_address || '',
    fulfillmentNote: row.fulfillment_note || '',
    timestamp: row.draw_time || row.created_at || '',
});

export interface RewardTask {
    code: string;
    titleZh: string;
    titleEn: string;
    descriptionZh: string;
    descriptionEn: string;
    taskType: string;
    targetValue: number;
    progress: number;
    rewardBeans: number;
    claimed: boolean;
    claimedAt?: string | null;
}

export interface RewardsSummary {
    beans: number;
    checkin: {
        checkedInToday: boolean;
        streakDays: number;
        lastDate?: string | null;
        lastRewardBeans: number;
    };
    tasks: RewardTask[];
}

export type TxAsset = 'balance' | 'exchange' | 'beans';

export interface Transaction {
    id: string;
    type: 'Recharge' | 'Spend' | 'Withdraw' | 'Reward' | 'BeanExchange';
    amount: number;
    asset?: TxAsset;
    beansAmount?: number | null;
    timestamp: string;
    status: 'Success' | 'Processing' | 'Failed';
    method?: string;
}

export interface UserNotification {
    id: string;
    type: string;
    /** 数据库 title_zh / title_en */
    titleZh: string;
    titleEn: string;
    bodyZh: string;
    bodyEn: string;
    createdAt: string;
    refId: number;
    refType: 'transaction' | 'winning' | string;
    read: boolean;
    linkPath?: string;
    icon?: string;
    amount?: number;
    productTitle?: string;
    roundNo?: number | null;
    winningNumber?: string;
}
