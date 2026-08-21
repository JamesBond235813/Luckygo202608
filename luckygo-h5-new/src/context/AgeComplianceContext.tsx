import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { ApiService } from '../services/api';
import { isH5Authenticated } from '../lib/auth';
import {
    clearAgeGate,
    isPolicyVersionStale,
    readAgeGateStatus,
    setAgeGateAdult,
    setAgeGateMinor,
} from '../lib/age-gate-storage';
import {
    DEFAULT_COMPLIANCE_CONFIG,
    mergeComplianceWithDefaults,
    type ComplianceConfig,
} from '../lib/compliance-config';
import { normalizeFrontendGeneral, SUPPORT_CONFIG_SETTING_KEY } from '../lib/support-config';
import { useI18n } from '../lib/useI18n';
import { useUserProfile } from './UserProfileContext';

/* The provider and its hook intentionally share this module for context identity. */
/* eslint-disable react-refresh/only-export-components */

type SpendConfirmState = {
    open: boolean;
    onConfirm: (() => void) | null;
};

type AgeComplianceContextValue = {
    config: ComplianceConfig;
    configReady: boolean;
    isMinor: boolean;
    showGate: boolean;
    showSpendConfirm: boolean;
    spendConfirmText: string;
    confirmAdult: () => Promise<void>;
    declineMinor: () => void;
    closeSpendConfirm: () => void;
    confirmSpend: () => void;
    runAdultAction: (action: () => void | Promise<void>, options?: { spendConfirm?: boolean }) => void;
};

const AgeComplianceContext = createContext<AgeComplianceContextValue | null>(null);

export function AgeComplianceProvider({ children }: { children: React.ReactNode }) {
    const { t, language } = useI18n();
    const { user, refreshUser } = useUserProfile();
    const [rawConfig, setRawConfig] = useState<ComplianceConfig>(DEFAULT_COMPLIANCE_CONFIG);
    const [configReady, setConfigReady] = useState(false);
    const [gateOpen, setGateOpen] = useState(false);
    const [spendConfirm, setSpendConfirm] = useState<SpendConfirmState>({ open: false, onConfirm: null });

    const config = useMemo(
        () => mergeComplianceWithDefaults(rawConfig, t, language),
        [rawConfig, t, language],
    );

    const gateStatus = readAgeGateStatus();
    const isMinor = gateStatus === 'minor';
    const userAgeConfirmed = Boolean(user?.ageConfirmed);

    useEffect(() => {
        void (async () => {
            try {
                const rows = await ApiService.getPublicSettings();
                const row = rows.find((item) => item.key === SUPPORT_CONFIG_SETTING_KEY);
                const general = normalizeFrontendGeneral(row?.value);
                setRawConfig({ ...DEFAULT_COMPLIANCE_CONFIG, minAge: general.minAge });
            } catch {
                setRawConfig(DEFAULT_COMPLIANCE_CONFIG);
            } finally {
                setConfigReady(true);
            }
        })();
    }, []);

    useEffect(() => {
        if (!configReady) return;
        if (isMinor) {
            setGateOpen(false);
            return;
        }
        if (isPolicyVersionStale(config.policyVersion)) {
            clearAgeGate();
        }
        const status = readAgeGateStatus();
        if (status === 'minor') return;
        if (status !== 'adult') {
            setGateOpen(true);
            return;
        }
        if (isH5Authenticated() && !userAgeConfirmed) {
            setGateOpen(true);
            return;
        }
        setGateOpen(false);
    }, [configReady, config.policyVersion, isMinor, userAgeConfirmed, user?.id]);

    const syncServerAge = useCallback(async () => {
        if (!isH5Authenticated()) return;
        try {
            await ApiService.confirmAge(config.policyVersion);
            await refreshUser();
        } catch {
            // ignore; gate may show again on spend
        }
    }, [config.policyVersion, refreshUser]);

    const confirmAdult = useCallback(async () => {
        setAgeGateAdult(config.policyVersion);
        setGateOpen(false);
        await syncServerAge();
    }, [config.policyVersion, syncServerAge]);

    const declineMinor = useCallback(() => {
        setAgeGateMinor();
        setGateOpen(false);
    }, []);

    const closeSpendConfirm = useCallback(() => {
        setSpendConfirm({ open: false, onConfirm: null });
    }, []);

    const confirmSpend = useCallback(() => {
        const action = spendConfirm.onConfirm;
        closeSpendConfirm();
        action?.();
    }, [closeSpendConfirm, spendConfirm.onConfirm]);

    const runAdultAction = useCallback(
        (action: () => void | Promise<void>, options?: { spendConfirm?: boolean }) => {
            if (isMinor) return;
            const run = () => {
                void Promise.resolve(action());
            };
            if (readAgeGateStatus() !== 'adult') {
                setGateOpen(true);
                return;
            }
            if (isH5Authenticated() && !userAgeConfirmed) {
                setGateOpen(true);
                return;
            }
            if (options?.spendConfirm) {
                setSpendConfirm({ open: true, onConfirm: run });
                return;
            }
            run();
        },
        [isMinor, userAgeConfirmed],
    );

    const value = useMemo<AgeComplianceContextValue>(
        () => ({
            config,
            configReady,
            isMinor,
            showGate: gateOpen && !isMinor,
            showSpendConfirm: spendConfirm.open,
            spendConfirmText: config.spendConfirmText,
            confirmAdult,
            declineMinor,
            closeSpendConfirm,
            confirmSpend,
            runAdultAction,
        }),
        [
            config,
            configReady,
            isMinor,
            gateOpen,
            spendConfirm.open,
            confirmAdult,
            declineMinor,
            closeSpendConfirm,
            confirmSpend,
            runAdultAction,
        ],
    );

    return <AgeComplianceContext.Provider value={value}>{children}</AgeComplianceContext.Provider>;
}

export function useAgeCompliance(): AgeComplianceContextValue {
    const ctx = useContext(AgeComplianceContext);
    if (!ctx) {
        throw new Error('useAgeCompliance must be used within AgeComplianceProvider');
    }
    return ctx;
}
