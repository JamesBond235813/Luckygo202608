import type { RowDataPacket } from 'mysql2';

/** 管理端用户列表项（不含数据库主键 id） */
export type AdminUserListItem = {
  nickname: string;
  avatar: string | null;
  phone: string;
  invite_code: string;
  inviter_nickname: string | null;
  inviter_phone: string | null;
  balance: number;
  exchange_balance: number;
  beans: number;
  created_at: string;
};

export function toAdminUserListItem(row: RowDataPacket): AdminUserListItem {
  return {
    nickname: String(row.nickname ?? ''),
    avatar: row.avatar != null ? String(row.avatar) : null,
    phone: String(row.phone ?? ''),
    invite_code: String(row.invite_code ?? ''),
    inviter_nickname: row.inviter_nickname != null ? String(row.inviter_nickname) : null,
    inviter_phone: row.inviter_phone != null ? String(row.inviter_phone) : null,
    balance: Number.parseFloat(String(row.balance ?? 0)),
    exchange_balance: Number.parseFloat(String(row.exchange_balance ?? 0)),
    beans: Number(row.beans ?? 0),
    created_at: row.created_at ? String(row.created_at) : '',
  };
}
