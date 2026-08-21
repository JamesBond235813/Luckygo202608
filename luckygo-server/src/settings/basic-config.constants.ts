/** H5 基础展示配置（应用名、货币、语言、主题等） */
export const BASIC_CONFIG_SETTING_KEY = 'frontend.general';

export type BasicConfig = {
  appName: string;
  currencyCode: string;
  currencySymbol: string;
  defaultLanguage: string;
  modalPlacement: 'center-above' | 'center' | 'bottom';
  darkModeDefault: boolean;
  assistantEnabled: boolean;
  enabledLanguages: Array<{
    code: string;
    label: string;
    nativeName: string;
    enabled: boolean;
  }>;
  /** 客服电话（留空则 H5 不展示） */
  supportPhone: string;
  supportEmail: string;
  supportWhatsapp: string;
  /** 最低参与年龄（合规文案占位） */
  minAge: number;
  /** 首页滚动公告（留空则 H5 不展示） */
  homeNoticeText: string;
};

export const DEFAULT_BASIC_CONFIG: BasicConfig = {
  appName: 'LuckyGo',
  currencyCode: 'GHS',
  currencySymbol: 'GH₵',
  defaultLanguage: 'en',
  modalPlacement: 'center-above',
  darkModeDefault: false,
  assistantEnabled: true,
  enabledLanguages: [
    { code: 'en', label: 'English', nativeName: 'English', enabled: true },
    { code: 'tw', label: 'Twi', nativeName: 'Twi', enabled: true },
    { code: 'gaa', label: 'Ga', nativeName: 'Ga', enabled: true },
    { code: 'ee', label: 'Ewe', nativeName: 'Ewe', enabled: true },
    { code: 'ha', label: 'Hausa', nativeName: 'Hausa', enabled: true },
  ],
  supportPhone: '',
  supportEmail: '',
  supportWhatsapp: '',
  minAge: 18,
  homeNoticeText: '',
};
