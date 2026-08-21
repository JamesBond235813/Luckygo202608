export interface Product {
    id: number;
    title: string;
    description: string;
    image: string;
    tag?: string;
    categoryId?: number | null;
    createdAt?: string;
}

export interface ProductPayload {
    title: string;
    description: string;
    image: string;
    tag?: string;
    categoryId?: number | null;
}

export interface ProductCategory {
    id: number;
    name: string;
    nameZh: string;
    sortOrder: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProductCategoryPayload {
    name: string;
    nameZh: string;
    sortOrder: number;
}

interface ApiProductCategoryRow {
    id: number;
    name: string;
    name_zh?: string;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
}

export const mapProductCategory = (data: ApiProductCategoryRow): ProductCategory => ({
    id: data.id,
    name: data.name,
    nameZh: data.name_zh ?? '',
    sortOrder: data.sort_order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
});

export interface SmsSendLog {
    id: number;
    scene: string;
    phone: string;
    phoneMasked: string;
    contentPreview: string;
    status: string;
    gatewayErrcode: string;
    gatewayMessage: string;
    createdAt?: string;
}

interface ApiSmsSendLogRow {
    id: number;
    scene: string;
    phone: string;
    phone_masked: string;
    content_preview: string;
    status: string;
    gateway_errcode: string;
    gateway_message: string;
    created_at?: string;
}

export const mapSmsSendLog = (data: ApiSmsSendLogRow): SmsSendLog => ({
    id: data.id,
    scene: data.scene,
    phone: data.phone,
    phoneMasked: data.phone_masked,
    contentPreview: data.content_preview,
    status: data.status,
    gatewayErrcode: data.gateway_errcode,
    gatewayMessage: data.gateway_message,
    createdAt: data.created_at,
});

export type CampaignStatus =
    | 'draft'
    | 'selling'
    | 'sold_out'
    | 'drawing'
    | 'ended'
    | 'cancelled';

export interface Campaign {
    id: number;
    productId: number;
    roundNo: number;
    roundNoDisplay?: string;
    title: string;
    description: string;
    image: string;
    totalShares: number;
    pricePerShare: number;
    sharesSold: number;
    status: CampaignStatus;
    autoDrawOnSellout: boolean;
    autoDrawCountdownSeconds: number;
    designatedWinningNumber: string | null;
    winningNumber: string | null;
    numbersGenerated: boolean;
    productTitle?: string;
    createdAt?: string;
}

export interface CampaignPayload {
    productId: number;
    roundNo?: number;
    totalShares: number;
    pricePerShare: number;
    autoDrawOnSellout?: boolean;
    autoDrawCountdownSeconds?: number;
}

export interface LotteryNumberRow {
    id: number;
    number: string;
    status: 'available' | 'sold';
    user_id: number | null;
    checkout_id: number | null;
    sold_at: string | null;
    user_nickname?: string | null;
    user_phone?: string | null;
}

export interface CampaignNumbersSummary {
    campaignId: number;
    total: number;
    available: number;
    sold: number;
    designatedWinningNumber: string | null;
    winningNumber: string | null;
}

/** 管理端用户列表（不含数据库主键 id） */
export interface User {
    nickname: string;
    avatar?: string | null;
    phone: string;
    invite_code: string;
    inviter_nickname?: string | null;
    inviter_phone?: string | null;
    balance: number;
    /** 夺宝可用余额 */
    exchange_balance: number;
    beans: number;
    created_at: string;
}

export interface UserUpdatePayload {
    balance: number;
    exchange_balance?: number;
    beans?: number;
    nickname?: string;
}

export interface WinningRecord {
    id: number;
    product_id: number;
    campaign_id?: number;
    user_id: number | null;
    productName: string;
    productImage?: string;
    winnerName: string;
    winnerPhone?: string;
    winning_number: string;
    status: 'Processing' | 'Shipped' | 'Received';
    draw_time: string;
    created_at?: string;
    round_no?: number;
}

export interface FinanceRecord {
    id: number;
    user_id: number;
    user_nickname?: string;
    user_phone?: string;
    type: string;
    amount: number | string;
    asset?: string | null;
    beans_amount?: number | string | null;
    status: string;
    method?: string | null;
    created_at: string;
    channel?: string | null;
    payment_type?: string | null;
    payer_phone?: string | null;
    hubtel_amount?: number | string | null;
    fee?: number | string | null;
    updated_at?: string;
    checkout_id?: string | null;
    client_reference?: string | null;
    account_info?: string | null;
    remark?: string | null;
}

export interface CheckoutOrder {
    id: number;
    user_id: number;
    product_id: number;
    campaign_id?: number;
    count: number;
    numbers: number[] | string[];
    numbers_count?: number;
    numbers_truncated?: boolean;
    created_at: string;
    user_nickname: string;
    user_phone: string;
    product_title: string;
    campaign_title?: string;
    product_image?: string;
    price_per_share: number;
    total_shares: number;
    shares_sold: number;
    campaign_status?: CampaignStatus;
    product_status?: string;
    round_no?: number;
}

export interface DashboardStats {
    totalRevenue: number;
    activeProducts: number;
    totalUsers: number;
    pendingShipments: number;
}

interface ApiProductRow {
    id: number;
    title: string;
    description: string;
    image: string;
    tag?: string;
    category_id?: number | null;
    created_at?: string;
}

export const mapProduct = (data: ApiProductRow): Product => ({
    id: data.id,
    title: data.title,
    description: data.description,
    image: data.image,
    tag: data.tag,
    categoryId: data.category_id ?? null,
    createdAt: data.created_at,
});

interface ApiCampaignRow {
    id: number;
    product_id: number;
    round_no: number;
    total_shares: number;
    price_per_share: string | number;
    shares_sold: number;
    status: CampaignStatus;
    auto_draw_on_sellout: number;
    auto_draw_countdown_seconds?: number;
    designated_winning_number: string | null;
    winning_number: string | null;
    numbers_generated: number;
    product_title?: string;
    product_description?: string;
    product_image?: string;
    created_at?: string;
}

export const mapCampaign = (data: ApiCampaignRow): Campaign => ({
    id: data.id,
    productId: data.product_id,
    roundNo: data.round_no,
    roundNoDisplay:
        (data as ApiCampaignRow & { round_no_display?: string }).round_no_display ??
        String(data.round_no).padStart(7, '0'),
    title: data.product_title || '',
    description: data.product_description || '',
    image: data.product_image || '',
    totalShares: data.total_shares,
    pricePerShare: Number(data.price_per_share),
    sharesSold: data.shares_sold,
    status: data.status,
    autoDrawOnSellout: Boolean(data.auto_draw_on_sellout),
    autoDrawCountdownSeconds: Number(data.auto_draw_countdown_seconds) || 60,
    designatedWinningNumber: data.designated_winning_number,
    winningNumber: data.winning_number,
    numbersGenerated: Boolean(data.numbers_generated),
    productTitle: data.product_title,
    createdAt: data.created_at,
});

export interface AuthResponse {
    message: string;
    user: User & { role?: string };
    token: string;
}

export interface AppSetting {
    key: string;
    value: Record<string, unknown>;
    description: string;
    isPublic: boolean;
    updatedAt?: string;
}
