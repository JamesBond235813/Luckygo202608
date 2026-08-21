/** 成功邀请 1 人注册，邀请人获得金豆 */

export const INVITE_SIGNUP_REWARD_INVITER_BEANS = 100;



/** 通过邀请码注册，新用户获得金豆 */

export const INVITE_SIGNUP_REWARD_INVITEE_BEANS = 100;



/** 被邀请好友每累计消费达到该金额（GHS，与 transactions.amount 一致） */

export const INVITE_SPEND_UNIT_GHS = 100;



/** 每满一档消费，邀请人获得金豆 */

export const INVITE_SPEND_BEANS_PER_UNIT = 100;



export const INVITE_REWARD_TYPE_SIGNUP = 'signup';

/** 新用户填邀请码注册，本人获得的金豆（记入「我的奖励」） */
export const INVITE_REWARD_TYPE_SIGNUP_INVITEE = 'signup_invitee';

export const INVITE_REWARD_TYPE_SPEND = 'spend';

