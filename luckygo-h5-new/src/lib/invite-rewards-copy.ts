import {
    formatInviteCediAmount,
    inviteSpendExample,
    type InviteRewardConfig,
} from './invite-rewards-config';
import { tf } from './localization';

type TranslateFn = (key: string) => string;

export type InviteRewardCopy = {
    step3Desc: string;
    inviterSignup: string;
    inviterSpendDetail: string;
    inviteeDetail: string;
    entrySubtitle: string;
};

export function buildInviteRewardCopy(config: InviteRewardConfig, translate: TranslateFn): InviteRewardCopy {
    const { spendTotal, beansTotal } = inviteSpendExample(config);
    const spendUnit = formatInviteCediAmount(config.spendUnitGhs);
    const spendExample = formatInviteCediAmount(spendTotal);

    return {
        step3Desc: tf(translate, 'inviteStep3Desc', {
            inviterBeans: config.signupInviterBeans,
            inviteeBeans: config.signupInviteeBeans,
        }),
        inviterSignup: tf(translate, 'inviteRewardInviterSignup', {
            beans: config.signupInviterBeans,
        }),
        inviterSpendDetail: tf(translate, 'inviteRewardInviterSpendDetail', {
            spendUnit,
            beansPerUnit: config.spendBeansPerUnit,
            spendExample,
            beansExample: beansTotal,
        }),
        inviteeDetail: tf(translate, 'inviteRewardInviteeDetail', {
            beans: config.signupInviteeBeans,
        }),
        entrySubtitle: tf(translate, 'inviteEntrySubtitleTemplate', {
            inviterBeans: config.signupInviterBeans,
            inviteeBeans: config.signupInviteeBeans,
        }),
    };
}
