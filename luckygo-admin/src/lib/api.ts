import axios, { isAxiosError } from 'axios';
import type {
    AppSetting,
    Campaign,
    CampaignNumbersSummary,
    CampaignPayload,
    CheckoutOrder,
    FinanceRecord,
    LotteryNumberRow,
    Product,
    ProductCategory,
    ProductCategoryPayload,
    ProductPayload,
    SmsSendLog,
    User,
    UserUpdatePayload,
    WinningRecord,
    AuthResponse,
} from '../types';
import { mapCampaign, mapProduct, mapProductCategory, mapSmsSendLog } from '../types';
import {
    createApiBusinessError,
    getEnvelopeErrorMessage,
    isApiFailure,
    unwrapApiData,
} from './api-response';

export { getApiErrorMessage, isApiBusinessError } from './api-response';

const resolveApiBaseURL = () => {
    const configured = import.meta.env.VITE_API_BASE_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    // 开发时走 Vite 代理到 luckygo-server；直连后端可设 VITE_API_BASE_URL=http://localhost:3000/api
    return '/api';
};

const api = axios.create({
    baseURL: resolveApiBaseURL(),
    timeout: 20000,
});

let authToken: string | null = localStorage.getItem('admin_token');

api.interceptors.request.use((config) => {
    if (authToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => {
        const body = response.data;
        if (isApiFailure(body)) {
            if (body.code === 401 || body.code === 403) {
                setAuthToken(null);
                window.location.reload();
            }
            return Promise.reject(
                createApiBusinessError(body.code, getEnvelopeErrorMessage(body)),
            );
        }
        response.data = unwrapApiData(body);
        return response;
    },
    (error) => {
        if (isAxiosError(error)) {
            const resData = error.response?.data;
            if (isApiFailure(resData)) {
                if (resData.code === 401 || resData.code === 403) {
                    setAuthToken(null);
                    window.location.reload();
                }
                return Promise.reject(
                    createApiBusinessError(resData.code, getEnvelopeErrorMessage(resData)),
                );
            }
        }
        return Promise.reject(error);
    },
);

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        localStorage.setItem('admin_token', token);
    } else {
        localStorage.removeItem('admin_token');
    }
};

export const ApiClient = {
    // Auth
    async login(phone: string, password: string): Promise<AuthResponse> {
        const response = await api.post('/auth/login', { phone, password });
        return response.data;
    },

    // Products
    async getProducts(): Promise<Product[]> {
        const response = await api.get('/products');
        return response.data.map(mapProduct);
    },
    async createProduct(payload: ProductPayload) {
        return api.post('/products', {
            title: payload.title,
            description: payload.description,
            image: payload.image,
            tag: payload.tag,
            categoryId: payload.categoryId ?? null,
        });
    },
    async updateProduct(id: number, payload: ProductPayload) {
        return api.put(`/products/${id}`, {
            title: payload.title,
            description: payload.description,
            image: payload.image,
            tag: payload.tag,
            categoryId: payload.categoryId ?? null,
        });
    },
    async deleteProduct(id: number) {
        return api.delete(`/products/${id}`);
    },

    // Product categories
    async getProductCategories(): Promise<ProductCategory[]> {
        const response = await api.get('/product-categories');
        return response.data.map(mapProductCategory);
    },
    async createProductCategory(payload: ProductCategoryPayload) {
        return api.post('/product-categories', {
            name: payload.name,
            name_zh: payload.nameZh,
            sort_order: payload.sortOrder,
        });
    },
    async updateProductCategory(id: number, payload: ProductCategoryPayload) {
        return api.put(`/product-categories/${id}`, {
            name: payload.name,
            name_zh: payload.nameZh,
            sort_order: payload.sortOrder,
        });
    },
    async deleteProductCategory(id: number) {
        return api.delete(`/product-categories/${id}`);
    },

    async getSmsSendLogs(limit = 100): Promise<SmsSendLog[]> {
        const response = await api.get('/admin/sms/logs', { params: { limit } });
        return response.data.map(mapSmsSendLog);
    },

    async uploadImage(file: File): Promise<{ url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/admin/upload', formData);
        return response.data as { url: string };
    },

    async getCampaigns(params?: {
        productId?: number;
        status?: string;
        roundNo?: string;
        createdFrom?: string;
        createdTo?: string;
    }): Promise<Campaign[]> {
        const response = await api.get('/admin/campaigns', { params });
        return response.data.map(mapCampaign);
    },
    async createCampaign(payload: CampaignPayload) {
        return api.post('/admin/campaigns', {
            productId: payload.productId,
            roundNo: payload.roundNo,
            totalShares: payload.totalShares,
            pricePerShare: payload.pricePerShare,
            autoDrawOnSellout: payload.autoDrawOnSellout,
            autoDrawCountdownSeconds: payload.autoDrawCountdownSeconds,
        });
    },
    async updateCampaign(
        id: number,
        payload: Partial<Pick<CampaignPayload, 'autoDrawOnSellout' | 'autoDrawCountdownSeconds'>>,
    ) {
        return api.put(`/admin/campaigns/${id}`, payload);
    },
    async designateCampaign(id: number, designatedWinningNumber: string | null) {
        return api.put(`/admin/campaigns/${id}/designate`, { designatedWinningNumber });
    },
    async getCampaignNumbers(
        id: number,
        params?: { status?: string; page?: number; pageSize?: number; search?: string },
    ) {
        const response = await api.get(`/admin/campaigns/${id}/numbers`, { params });
        return response.data as {
            items: LotteryNumberRow[];
            total: number;
            summary: CampaignNumbersSummary;
        };
    },
    async publishCampaign(id: number) {
        return api.post(`/admin/campaigns/${id}/publish`);
    },
    async drawCampaign(id: number) {
        return api.post(`/admin/campaigns/${id}/draw`);
    },
    async cancelCampaign(id: number) {
        return api.post(`/admin/campaigns/${id}/cancel`);
    },
    async lookupCampaignNumber(id: number, number: string) {
        const response = await api.get(`/admin/campaigns/${id}/lookup`, { params: { number } });
        return response.data;
    },

    // Users
    async getUsers(): Promise<User[]> {
        const response = await api.get('/users');
        return response.data.map(
            (u: User & { balance: string | number; exchange_balance?: string | number; beans?: string | number }) => ({
                ...u,
                balance: Number(u.balance) || 0,
                exchange_balance: Number(u.exchange_balance) || 0,
                beans: Number(u.beans) || 0,
            }),
        );
    },
    async updateUser(inviteCode: string, payload: UserUpdatePayload) {
        return api.put(`/users/by-invite/${encodeURIComponent(inviteCode)}`, payload);
    },
    async resetUserPassword(inviteCode: string, password: string) {
        return api.put(`/users/by-invite/${encodeURIComponent(inviteCode)}/password`, { password });
    },

    // Winning records
    async getWinningRecords(): Promise<WinningRecord[]> {
        const response = await api.get('/history/admin/winnings');
        return response.data;
    },
    async updateWinningStatus(id: number, status: WinningRecord['status']) {
        return api.put(`/history/admin/winnings/${id}`, { status });
    },

    // Orders / checkouts
    async getOrders(): Promise<CheckoutOrder[]> {
        const response = await api.get('/orders');
        const data = response.data;
        return Array.isArray(data) ? (data as CheckoutOrder[]) : [];
    },

    async getFinancePaymentRecords(): Promise<FinanceRecord[]> {
        const response = await api.get('/admin/finance/payment-records');
        return response.data;
    },
    async getFinanceTransactions(): Promise<FinanceRecord[]> {
        const response = await api.get('/admin/finance/transactions');
        return response.data;
    },
    async getFinanceWithdrawals(): Promise<FinanceRecord[]> {
        const response = await api.get('/admin/finance/withdrawals');
        return response.data;
    },

    // Frontend content / feature settings
    async getAppSettings(): Promise<AppSetting[]> {
        const response = await api.get('/settings/admin');
        return response.data;
    },
    async updateAppSetting(key: string, payload: Pick<AppSetting, 'value' | 'description' | 'isPublic'>) {
        const response = await api.put(`/settings/admin/${encodeURIComponent(key)}`, payload);
        return response.data;
    }
};

export default api;
