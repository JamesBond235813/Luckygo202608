import type { RowDataPacket } from 'mysql2';

export type InviteMyRewardsInvitee = {
  nickname: string;
  phone_masked: string;
  registered_at: string;
  signup_reward_beans: number;
  spend_reward_beans: number;
  /** 本人通过邀请码注册获得的奖励 */
  is_self: boolean;
};

export type InviteMyRewardsPayload = {
  invite_count: number;
  signup_reward_beans: number;
  spend_reward_beans: number;
  total_reward_beans: number;
  invitees: InviteMyRewardsInvitee[];
};

export function maskLocalPhoneForDisplay(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 7) return '-';
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
  }
  return `${digits.slice(0, 2)}****${digits.slice(-2)}`;
}

export function formatInviteRegisteredAt(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function mapInviteeRow(row: RowDataPacket, isSelf: boolean): InviteMyRewardsInvitee {
  return {
    nickname: String(row.nickname ?? 'User'),
    phone_masked: maskLocalPhoneForDisplay(String(row.phone ?? '')),
    registered_at: formatInviteRegisteredAt(row.created_at),
    signup_reward_beans: Number(row.signup_reward_beans ?? 0),
    spend_reward_beans: Number(row.spend_reward_beans ?? 0),
    is_self: isSelf,
  };
}

export function buildInviteMyRewards(
  invitedRows: RowDataPacket[],
  selfRow: RowDataPacket | null,
  spendRewardBeansTotal = 0,
  fallbackSelfSignupBeans = 0,
): InviteMyRewardsPayload {
  const invitedInvitees = invitedRows.map((row) => mapInviteeRow(row, false));

  let selfInvitee: InviteMyRewardsInvitee | null = null;
  if (selfRow) {
    selfInvitee = mapInviteeRow(selfRow, true);
    if (selfInvitee.signup_reward_beans <= 0 && fallbackSelfSignupBeans > 0) {
      selfInvitee.signup_reward_beans = fallbackSelfSignupBeans;
    }
  }

  const invitees = selfInvitee ? [selfInvitee, ...invitedInvitees] : invitedInvitees;

  const signupFromInvited = invitedInvitees.reduce((sum, row) => sum + row.signup_reward_beans, 0);
  const signupSelf = selfInvitee?.signup_reward_beans ?? 0;
  const signupRewardBeans = signupFromInvited + signupSelf;
  const spendRewardBeans = Number(spendRewardBeansTotal) || 0;

  return {
    invite_count: invitedInvitees.length,
    signup_reward_beans: signupRewardBeans,
    spend_reward_beans: spendRewardBeans,
    total_reward_beans: signupRewardBeans + spendRewardBeans,
    invitees,
  };
}
