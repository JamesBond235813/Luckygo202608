import { CURRENCY_SYMBOL } from './localization';

export const INVITE_REWARDS_SETTING_KEY = 'invite.rewards';

export type InviteRewardConfig = {
    enabled: boolean;
    signupInviterBeans: number;
    signupInviteeBeans: number;
    spendUnitGhs: number;
    spendBeansPerUnit: number;
};

export const DEFAULT_INVITE_REWARD_CONFIG: InviteRewardConfig = {
    enabled: true,
    signupInviterBeans: 100,
    signupInviteeBeans: 100,
    spendUnitGhs: 100,
    spendBeansPerUnit: 100,
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeInviteRewardConfig(raw: unknown): InviteRewardConfig {
    const src =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    return {
        enabled: src.enabled !== false,
        signupInviterBeans: clampInt(
            src.signupInviterBeans,
            DEFAULT_INVITE_REWARD_CONFIG.signupInviterBeans,
            0,
            1_000_000,
        ),
        signupInviteeBeans: clampInt(
            src.signupInviteeBeans,
            DEFAULT_INVITE_REWARD_CONFIG.signupInviteeBeans,
            0,
            1_000_000,
        ),
        spendUnitGhs: clampInt(src.spendUnitGhs, DEFAULT_INVITE_REWARD_CONFIG.spendUnitGhs, 1, 1_000_000),
        spendBeansPerUnit: clampInt(
            src.spendBeansPerUnit,
            DEFAULT_INVITE_REWARD_CONFIG.spendBeansPerUnit,
            0,
            1_000_000,
        ),
    };
}

/** 展示用金额（整数不带小数，后缀 ₵，如 5₵） */
export function formatInviteCediAmount(amount: number): string {
    const n = Math.round(amount);
    return `${n}${CURRENCY_SYMBOL}`;
}

/** 消费返利示例：满 3 档 */
export function inviteSpendExample(config: InviteRewardConfig) {
    return {
        spendTotal: config.spendUnitGhs * 3,
        beansTotal: config.spendBeansPerUnit * 3,
    };
}

/** 文案高亮用的数字（去重，长的优先匹配） */
export function collectInviteHighlightNumbers(config: InviteRewardConfig): number[] {
    const { spendTotal, beansTotal } = inviteSpendExample(config);
    const nums = [
        config.signupInviterBeans,
        config.signupInviteeBeans,
        config.spendUnitGhs,
        config.spendBeansPerUnit,
        spendTotal,
        beansTotal,
    ].filter((n) => n > 0);
    return [...new Set(nums)].sort((a, b) => b - a);
}
