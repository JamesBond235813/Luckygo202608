import axios, { isAxiosError } from 'axios';
import {
  mapCampaign,
  mapHistoryRecord,
  mapWinningRecord,
  type ApiCampaignRow,
  type ApiHistoryRow,
  type ApiWinningRow,
  type HistoryRecord,
  mapProductCategory,
  type ApiProductCategoryRow,
  type Product,
  type ProductCategory,
  type Transaction,
  type InviteMyRewards,
  type RewardsSummary,
  type User,
  type UserNotification,
  type WinningRecord,
} from '../types';
import {
  DEFAULT_INVITE_REWARD_CONFIG,
  INVITE_REWARDS_SETTING_KEY,
  normalizeInviteRewardConfig,
} from '../lib/invite-rewards-config';
import { getAccessToken, getCurrentUserId } from '../lib/session';
import {
  createApiBusinessError,
  getEnvelopeErrorMessage,
  isApiFailure,
  unwrapApiData,
} from '../lib/api-response';

export { getApiErrorMessage, isApiBusinessError } from '../lib/api-response';

type PublicSettingRow = { key: string; value: Record<string, unknown> };

/** 公开系统配置：整页生命周期内只请求一次（刷新页面后重新拉取） */
let publicSettingsCache: PublicSettingRow[] | null = null;
let publicSettingsInflight: Promise<PublicSettingRow[]> | null = null;

const resolveApiBaseURL = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return '/api';
};

const api = axios.create({
  baseURL: resolveApiBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // FormData 上传须由浏览器自动带 multipart boundary；全局 application/json 会导致 multer 收不到 file
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const headers = config.headers;
    if (headers && typeof headers === 'object' && 'delete' in headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type');
    } else if (headers && typeof headers === 'object') {
      delete (headers as Record<string, unknown>)['Content-Type'];
      delete (headers as Record<string, unknown>)['content-type'];
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (isApiFailure(body)) {
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
        return Promise.reject(
          createApiBusinessError(resData.code, getEnvelopeErrorMessage(resData)),
        );
      }
    }
    return Promise.reject(error);
  },
);

const unwrapArray = <T>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
};

const unwrapObject = <T>(payload: unknown, keys: string[]): T => {
  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      const value = (payload as Record<string, unknown>)[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) return value as T;
    }
  }
  return payload as T;
};

const mapUserRow = (data: Record<string, unknown>): User => {
  const balance = Number(data.balance ?? 0);
  const exchangeBalance = Number(data.exchange_balance ?? 0);
  const totalBalance =
    data.total_balance != null && data.total_balance !== ''
      ? Number(data.total_balance)
      : Number((balance + exchangeBalance).toFixed(2));
  return {
    id: data.id != null ? String(data.id) : getCurrentUserId() ?? '',
    nickname: String(data.nickname ?? 'User'),
    avatar: String(data.avatar ?? ''),
    balance,
    exchangeBalance,
    totalBalance,
    beans: Number(data.beans ?? 0),
    vipLevel: Number(data.vip_level ?? 0),
    phone: data.phone != null ? String(data.phone) : '',
    inviteCode:
      data.invite_code != null && String(data.invite_code).trim()
        ? String(data.invite_code).trim()
        : data.inviteCode != null && String(data.inviteCode).trim()
          ? String(data.inviteCode).trim()
          : undefined,
    ageConfirmed: Boolean(data.ageConfirmed ?? data.age_confirmed_at),
    agePolicyVersion:
      data.agePolicyVersion != null && String(data.agePolicyVersion).trim()
        ? String(data.agePolicyVersion).trim()
        : data.age_policy_version != null && String(data.age_policy_version).trim()
          ? String(data.age_policy_version).trim()
          : null,
  };
};

export interface AuthLoginResponse {
  token: string;
  isNewUser?: boolean;
  user: { phone?: string; nickname?: string; role?: string };
}

export const ApiService = {
  requestLoginOtp: async (phone: string): Promise<{ message?: string }> => {
    const response = await api.post('/auth/otp/request', { phone });
    return (response.data ?? {}) as { message?: string };
  },

  loginWithOtp: async (
    phone: string,
    code: string,
    inviteCode?: string,
    ageConfirmed?: boolean,
  ): Promise<AuthLoginResponse> => {
    const response = await api.post('/auth/otp/verify', {
      phone,
      code,
      inviteCode: inviteCode?.trim() || undefined,
      ageConfirmed: ageConfirmed === true,
    });
    const data = response.data as AuthLoginResponse;
    if (!data?.token) {
      throw new Error('Invalid verification response');
    }
    return data;
  },

  loginWithPassword: async (phone: string, password: string): Promise<AuthLoginResponse> => {
    const response = await api.post('/auth/user/login', { phone, password });
    const data = response.data as AuthLoginResponse;
    if (!data?.token) {
      throw new Error('Invalid login response');
    }
    return data;
  },

  registerWithPassword: async (
    phone: string,
    password: string,
    inviteCode?: string,
    ageConfirmed?: boolean,
  ): Promise<AuthLoginResponse> => {
    const response = await api.post('/auth/user/register', {
      phone,
      password,
      inviteCode: inviteCode?.trim() || undefined,
      ageConfirmed: ageConfirmed === true,
    });
    const data = response.data as AuthLoginResponse;
    if (!data?.token) {
      throw new Error('Invalid register response');
    }
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<User> => {
    const response = await api.put('/users/me/password', { currentPassword, newPassword });
    return mapUserRow(response.data as Record<string, unknown>);
  },

  confirmAge: async (policyVersion?: string): Promise<User> => {
    const response = await api.post('/users/me/confirm-age', {
      policyVersion: policyVersion?.trim() || undefined,
    });
    const raw = response.data;
    const row =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? unwrapObject<Record<string, unknown>>(raw, ['data', 'user', 'row'])
        : {};
    return mapUserRow(
      row && typeof row === 'object' && Object.keys(row).length > 0
        ? row
        : (raw as Record<string, unknown>),
    );
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/users/me');
    const raw = response.data;
    const row =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? unwrapObject<Record<string, unknown>>(raw, ['data', 'user', 'row'])
        : {};
    return mapUserRow(
      row && typeof row === 'object' && Object.keys(row).length > 0
        ? row
        : (raw as Record<string, unknown>),
    );
  },

  updateMe: async (payload: { nickname?: string; avatar?: string }): Promise<User> => {
    const response = await api.put('/users/me', payload);
    const raw = response.data;
    const row =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? unwrapObject<Record<string, unknown>>(raw, ['data', 'user', 'row'])
        : {};
    return mapUserRow(
      row && typeof row === 'object' && Object.keys(row).length > 0
        ? row
        : (raw as Record<string, unknown>),
    );
  },

  updateMePhone: async (phone: string, password: string): Promise<User> => {
    const response = await api.put('/users/me/phone', { phone, password });
    const raw = response.data;
    const row =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? unwrapObject<Record<string, unknown>>(raw, ['data', 'user', 'row'])
        : {};
    return mapUserRow(
      row && typeof row === 'object' && Object.keys(row).length > 0
        ? row
        : (raw as Record<string, unknown>),
    );
  },

  uploadImage: async (file: File, folder?: 'avatars'): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
      params: folder ? { folder } : undefined,
    });
    return response.data as { url: string };
  },

  /** 金豆兑换为夺宝专用游戏余额（100 金豆 = 1），不可提现 */
  getMyInviteRewards: async (): Promise<InviteMyRewards> => {
    const response = await api.get('/users/me/invite-rewards');
    const raw = unwrapObject<Record<string, unknown>>(response.data, ['data']);
    return {
      inviteCount: Number(raw.invite_count ?? 0),
      signupRewardBeans: Number(raw.signup_reward_beans ?? 0),
      spendRewardBeans: Number(raw.spend_reward_beans ?? 0),
      totalRewardBeans: Number(raw.total_reward_beans ?? 0),
      invitees: Array.isArray(raw.invitees)
        ? (raw.invitees as Record<string, unknown>[]).map((row) => ({
            nickname: String(row.nickname ?? ''),
            phoneMasked: String(row.phone_masked ?? ''),
            registeredAt: String(row.registered_at ?? ''),
            signupRewardBeans: Number(row.signup_reward_beans ?? 0),
            spendRewardBeans: Number(row.spend_reward_beans ?? 0),
            isSelf: Boolean(row.is_self),
          }))
        : [],
    };
  },

  getRewardsSummary: async (): Promise<RewardsSummary> => {
    const response = await api.get('/rewards/summary');
    const raw = unwrapObject<Record<string, unknown>>(response.data, ['data']);
    const checkin = (raw.checkin ?? {}) as Record<string, unknown>;
    const tasks = Array.isArray(raw.tasks) ? raw.tasks as Record<string, unknown>[] : [];
    return {
      beans: Number(raw.beans ?? 0),
      checkin: {
        checkedInToday: Boolean(checkin.checkedInToday ?? checkin.checked_in_today),
        streakDays: Number(checkin.streakDays ?? checkin.streak_days ?? 0),
        lastDate: (checkin.lastDate ?? checkin.last_date) as string | null | undefined,
        lastRewardBeans: Number(checkin.lastRewardBeans ?? checkin.last_reward_beans ?? 0),
      },
      tasks: tasks.map((task) => ({
        code: String(task.code ?? ''),
        titleZh: String(task.titleZh ?? task.title_zh ?? ''),
        titleEn: String(task.titleEn ?? task.title_en ?? ''),
        descriptionZh: String(task.descriptionZh ?? task.description_zh ?? ''),
        descriptionEn: String(task.descriptionEn ?? task.description_en ?? ''),
        taskType: String(task.taskType ?? task.task_type ?? ''),
        targetValue: Number(task.targetValue ?? task.target_value ?? 0),
        progress: Number(task.progress ?? 0),
        rewardBeans: Number(task.rewardBeans ?? task.reward_beans ?? 0),
        claimed: Boolean(task.claimed),
        claimedAt: (task.claimedAt ?? task.claimed_at) as string | null | undefined,
      })),
    };
  },

  checkinRewards: async (): Promise<{ message: string; beans: number; streakDays: number }> => {
    const response = await api.post('/rewards/checkin');
    return response.data as { message: string; beans: number; streakDays: number };
  },

  claimRewardTask: async (code: string): Promise<{ message: string; task: string; beans: number }> => {
    const response = await api.post(`/rewards/tasks/${encodeURIComponent(code)}/claim`);
    return response.data as { message: string; task: string; beans: number };
  },

  exchangeBeansForGameBalance: async (beans: number): Promise<{
    message: string;
    beans: number;
    balance: number;
    exchange_balance: number;
    total_balance: number;
  }> => {
    const response = await api.post('/users/me/exchange-beans', { beans });
    return response.data as {
      message: string;
      beans: number;
      balance: number;
      exchange_balance: number;
      total_balance: number;
    };
  },

  getProductCategories: async (): Promise<ProductCategory[]> => {
    const response = await api.get('/product-categories');
    return unwrapArray<ApiProductCategoryRow>(response.data, ['data', 'categories', 'rows', 'items']).map(
      mapProductCategory,
    );
  },

  getCampaigns: async (categoryId?: number): Promise<Product[]> => {
    const response = await api.get('/campaigns', {
      params: categoryId != null && categoryId > 0 ? { categoryId } : undefined,
    });
    return unwrapArray<ApiCampaignRow>(response.data, ['data', 'campaigns', 'rows', 'items']).map(
      mapCampaign,
    );
  },

  getProducts: async (): Promise<Product[]> => ApiService.getCampaigns(),

  getCampaign: async (id: string | number): Promise<Product> => {
    const response = await api.get(`/campaigns/${id}`);
    return mapCampaign(unwrapObject<ApiCampaignRow>(response.data, ['data', 'campaign', 'row', 'item']));
  },

  getProduct: async (id: string | number): Promise<Product> => ApiService.getCampaign(id),

  getHistory: async (): Promise<HistoryRecord[]> => {
    const response = await api.get('/history');
    return unwrapArray<ApiHistoryRow>(response.data, ['data', 'history', 'rows', 'items']).map(mapHistoryRecord);
  },

  getPublicSettings: async (): Promise<PublicSettingRow[]> => {
    if (publicSettingsCache) return publicSettingsCache;
    if (!publicSettingsInflight) {
      publicSettingsInflight = (async () => {
        const response = await api.get('/settings/public');
        const rows = unwrapArray<Record<string, unknown>>(response.data, ['data', 'settings']);
        return rows.map((row) => ({
          key: String(row.key ?? row.setting_key ?? ''),
          value:
            row.value && typeof row.value === 'object' && !Array.isArray(row.value)
              ? (row.value as Record<string, unknown>)
              : typeof row.value_json === 'object' && row.value_json !== null && !Array.isArray(row.value_json)
                ? (row.value_json as Record<string, unknown>)
                : {},
        }));
      })()
        .then((rows) => {
          publicSettingsCache = rows;
          return rows;
        })
        .finally(() => {
          publicSettingsInflight = null;
        });
    }
    return publicSettingsInflight;
  },

  getInviteRewardsConfig: async () => {
    try {
      const rows = await ApiService.getPublicSettings();
      const row = rows.find((item) => item.key === INVITE_REWARDS_SETTING_KEY);
      return normalizeInviteRewardConfig(row?.value ?? DEFAULT_INVITE_REWARD_CONFIG);
    } catch {
      return DEFAULT_INVITE_REWARD_CONFIG;
    }
  },

  getUserTransactions: async (): Promise<Transaction[]> => {
    const response = await api.get('/users/me/transactions');
    return unwrapArray<{
      id: number | string;
      type: Transaction['type'];
      amount: string | number;
      asset?: string;
      beans_amount?: string | number | null;
      beansAmount?: string | number | null;
      created_at?: string;
      timestamp?: string;
      status: Transaction['status'];
      method?: string;
    }>(response.data, ['data', 'transactions', 'rows', 'items']).map((tx) => {
      const rawAsset = String(tx.asset ?? '').toLowerCase();
      const asset =
        rawAsset === 'exchange' || rawAsset === 'beans' || rawAsset === 'balance'
          ? (rawAsset as Transaction['asset'])
          : undefined;
      const beansRaw = tx.beans_amount ?? tx.beansAmount;
      const beansAmount =
        beansRaw === null || beansRaw === undefined ? null : Number(beansRaw);
      const method = tx.method;
      const rawType = String(tx.type ?? '').trim();
      const type =
        rawType === 'Recharge' ||
        rawType === 'Spend' ||
        rawType === 'Withdraw' ||
        rawType === 'Reward' ||
        rawType === 'BeanExchange'
          ? rawType
          : /^beans_to_exchange/i.test(String(method ?? ''))
            ? 'BeanExchange'
            : (rawType as Transaction['type']);
      return {
        id: String(tx.id),
        type,
        amount: Number(tx.amount),
        asset,
        beansAmount: Number.isFinite(beansAmount) ? beansAmount : null,
        timestamp: tx.timestamp || tx.created_at || '',
        status: tx.status,
        method,
      };
    });
  },

  getUserWinnings: async (): Promise<WinningRecord[]> => {
    const response = await api.get('/users/me/winnings');
    return unwrapArray<ApiWinningRow>(response.data, ['data', 'winnings', 'rows', 'items']).map(mapWinningRecord);
  },

  submitWinningFulfillment: async (id: string, payload: {
    type: 'pickup' | 'delivery';
    name: string;
    phone: string;
    address?: string;
    note?: string;
  }): Promise<{ message: string; type: string }> => {
    const response = await api.post(`/users/me/winnings/${encodeURIComponent(id)}/fulfillment`, payload);
    return response.data as { message: string; type: string };
  },

  getUserNotifications: async (
    readStatus: 'all' | 'unread' | 'read' = 'all',
  ): Promise<UserNotification[]> => {
    const response = await api.get('/users/me/notifications', {
      params: readStatus === 'all' ? undefined : { status: readStatus },
    });
    return unwrapArray<Record<string, unknown>>(response.data, [
      'data',
      'notifications',
      'rows',
      'items',
    ]).map((row) => ({
      id: String(row.id ?? ''),
      type: String(row.type ?? 'system'),
      titleZh: String(row.title_zh ?? row.titleZh ?? ''),
      titleEn: String(row.title_en ?? row.titleEn ?? ''),
      bodyZh: String(row.body_zh ?? row.bodyZh ?? ''),
      bodyEn: String(row.body_en ?? row.bodyEn ?? ''),
      createdAt: String(row.created_at ?? row.createdAt ?? ''),
      refId: Number(row.ref_id ?? row.refId ?? 0),
      refType: String(row.ref_type ?? row.refType ?? ''),
      read: Boolean(row.read) || row.read_at != null,
      linkPath: row.link_path != null ? String(row.link_path) : undefined,
      icon: row.icon != null ? String(row.icon) : undefined,
      amount: row.amount != null && row.amount !== '' ? Number(row.amount) : undefined,
      productTitle: row.product_title != null ? String(row.product_title) : undefined,
      roundNo:
        row.round_no != null && row.round_no !== '' ? Number(row.round_no) : null,
      winningNumber:
        row.winning_number != null ? String(row.winning_number) : undefined,
    }));
  },

  getNotificationUnreadCount: async (): Promise<number> => {
    const response = await api.get('/users/me/notifications/unread-count');
    const raw = response.data;
    if (raw && typeof raw === 'object' && 'count' in (raw as Record<string, unknown>)) {
      return Number((raw as Record<string, unknown>).count ?? 0);
    }
    return Number(raw ?? 0);
  },

  markNotificationsRead: async (ids?: string[]): Promise<void> => {
    await api.post('/users/me/notifications/read', {
      ids: ids?.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('luckygo-notifications-change'));
    }
  },

  getUserParticipation: async (): Promise<unknown[]> => {
    const response = await api.get('/users/me/participation');
    return unwrapArray<unknown>(response.data, ['data', 'participation', 'rows', 'items']);
  },

  initiateHubtelPayment: async (payload: {
    amount: number;
    returnUrl?: string;
    cancellationUrl?: string;
  }): Promise<Record<string, unknown>> => {
    const response = await api.post('/payments/hubtel/initiate', payload);
    return response.data as Record<string, unknown>;
  },

  confirmHubtelPayment: async (payload: {
    checkoutId?: string;
    clientReference?: string;
  }): Promise<{
    settled: boolean;
    paymentStatus: string;
    amount?: number;
    message?: string;
  }> => {
    const response = await api.post('/payments/hubtel/confirm', payload);
    return response.data as {
      settled: boolean;
      paymentStatus: string;
      amount?: number;
      message?: string;
    };
  },

  placeOrder: async (payload: {
    campaignId: number;
    count: number;
  }): Promise<{ message: string; numbers: string[] }> => {
    const response = await api.post('/orders', payload);
    return response.data as { message: string; numbers: string[] };
  },
};

export default api;
