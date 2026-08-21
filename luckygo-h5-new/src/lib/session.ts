const TOKEN_KEY = 'luckygo_h5_token';
const USER_ID_KEY = 'luckygo_user_id';
const PHONE_KEY = 'luckygo_phone';

export interface H5SessionPayload {
  token: string;
  userId: string;
  phone: string;
}

export const getAccessToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const getCurrentUserId = (): string | null => localStorage.getItem(USER_ID_KEY);

export const getStoredPhone = (): string | null => localStorage.getItem(PHONE_KEY);

export const setSession = ({ token, userId, phone }: H5SessionPayload): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(PHONE_KEY, phone);
};

export const updateStoredPhone = (phone: string): void => {
  localStorage.setItem(PHONE_KEY, phone);
};

export const clearSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(PHONE_KEY);
};
