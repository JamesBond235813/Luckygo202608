import { useEffect, useMemo, useState } from 'react';
import { ApiService } from '../services/api';
import {
    collectInviteHighlightNumbers,
    DEFAULT_INVITE_REWARD_CONFIG,
    type InviteRewardConfig,
} from '../lib/invite-rewards-config';

export function useInviteRewardsConfig() {
    const [config, setConfig] = useState<InviteRewardConfig>(DEFAULT_INVITE_REWARD_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const loaded = await ApiService.getInviteRewardsConfig();
                if (!cancelled) setConfig(loaded);
            } catch {
                if (!cancelled) setConfig(DEFAULT_INVITE_REWARD_CONFIG);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const highlightNumbers = useMemo(() => collectInviteHighlightNumbers(config), [config]);

    return { config, loading, highlightNumbers };
}
