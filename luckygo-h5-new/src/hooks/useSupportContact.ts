import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import {
    emptySupportContact,
    hasSupportContact,
    normalizeFrontendGeneral,
    parseHomeNoticeMessages,
    SUPPORT_CONFIG_SETTING_KEY,
    type FrontendGeneralPublic,
    type SupportContactConfig,
} from '../lib/support-config';

export function useSupportContact() {
    const [config, setConfig] = useState<SupportContactConfig>(emptySupportContact);
    const [minAge, setMinAge] = useState(18);
    const [homeNoticeText, setHomeNoticeText] = useState('');
    const [homeNoticeMessages, setHomeNoticeMessages] = useState<string[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const rows = await ApiService.getPublicSettings();
                const row = rows.find((item) => item.key === SUPPORT_CONFIG_SETTING_KEY);
                const normalized = normalizeFrontendGeneral(row?.value);
                if (!cancelled) {
                    setConfig({
                        phone: normalized.phone,
                        email: normalized.email,
                        whatsapp: normalized.whatsapp,
                    });
                    setMinAge(normalized.minAge);
                    setHomeNoticeText(normalized.homeNoticeText);
                    setHomeNoticeMessages(parseHomeNoticeMessages(normalized.homeNoticeText));
                }
            } catch {
                if (!cancelled) {
                    setConfig(emptySupportContact());
                    setMinAge(18);
                    setHomeNoticeText('');
                    setHomeNoticeMessages([]);
                }
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const general: FrontendGeneralPublic = { ...config, minAge, homeNoticeText };

    return {
        config,
        minAge,
        homeNoticeMessages,
        general,
        loaded,
        hasAny: hasSupportContact(config),
    };
}
