import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { InviteEntryBanner } from '../components/InviteEntryBanner';
// import LuckyAssistant from '../components/LuckyAssistant'; // EBA 助手暂下线
import { ApiService, getApiErrorMessage } from '../services/api';
import { resolveAssetUrl } from '../lib/asset-url';
import { isH5Authenticated } from '../lib/auth';
import { isBalanceVisible, setBalanceVisible } from '../lib/balance-visibility';
import {
    localLanguages,
    tf,
    type LocalLanguageCode,
} from '../lib/localization';
import { isValidGhanaLocalPhone } from '../lib/ghana-phone';
import { promptLogin } from '../lib/require-login';
import { updateStoredPhone } from '../lib/session';
import {
    ProfileAvatarTooLargeError,
    saveUserProfile,
    uploadUserAvatar,
    validateProfileNickname,
} from '../lib/profile-edit';
import { showSimpleToast } from '../lib/simpleToast';
import { useI18n } from '../lib/useI18n';
import { useUserProfile } from '../context/UserProfileContext';
import { SupportContactLinks } from '../components/SupportContactLinks';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import { isAgeConfirmationRequiredError } from '../lib/age-compliance-api';
import { useSupportContact } from '../hooks/useSupportContact';
import { useNotificationUnread } from '../hooks/useNotificationUnread';
import type { User } from '../types';

interface Address {
    id: string;
    name: string;
    phone: string;
    line: string;
    city: string;
    country: string;
    isDefault: boolean;
}

const emptyAddress = (): Address => ({
    id: '',
    name: '',
    phone: '',
    line: '',
    city: '',
    country: 'Ghana',
    isDefault: false,
});

const loadAddresses = (): Address[] => {
    try {
        const saved = localStorage.getItem('luckygo_addresses');
        if (saved) {
            const parsed = JSON.parse(saved) as Address[];
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        // ignore
    }
    return [];
};

type MeModal = 'profile' | 'exchange' | 'address' | 'phone' | 'support';

/** 与 Login 页相同的页面光晕背景 */
function MePageAmbientBackground() {
    return (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -right-24 -top-28 size-[22rem] rounded-full bg-primary/10 blur-3xl sm:size-[26rem]" />
            <div className="absolute -bottom-32 -left-20 size-[20rem] rounded-full bg-ghana-green/[0.075] blur-3xl sm:size-[24rem]" />
        </div>
    );
}

const formatMeTotalBalance = (value: number) =>
    value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Me: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language } = useI18n();
    const { user, loading: profileLoading, updateUser, refreshUser } = useUserProfile();
    const isLoggedIn = isH5Authenticated();
    const { config: supportConfig, hasAny: hasSupport } = useSupportContact();
    const { unreadCount: notificationUnread } = useNotificationUnread();
    const { runAdultAction } = useAgeCompliance();

    const [modal, setModal] = useState<MeModal | null>(null);
    const [balanceVisible, setBalanceVisibleState] = useState(isBalanceVisible);

    const headerAvatarInputRef = useRef<HTMLInputElement>(null);
    const [headerAvatarUploading, setHeaderAvatarUploading] = useState(false);

    const [exchangeBeansInput, setExchangeBeansInput] = useState('0');
    const [exchangeSubmitting, setExchangeSubmitting] = useState(false);
    const [beansRulesOpen, setBeansRulesOpen] = useState(false);

    const [addresses, setAddresses] = useState<Address[]>(loadAddresses);
    const [addressFormOpen, setAddressFormOpen] = useState(false);
    const [addressDraft, setAddressDraft] = useState<Address>(emptyAddress);
    const [addressMessage, setAddressMessage] = useState('');

    const [phoneDigits, setPhoneDigits] = useState('');
    const [phonePassword, setPhonePassword] = useState('');
    const [phoneSaving, setPhoneSaving] = useState(false);

    const guardAuth = useCallback(
        (from: string) => promptLogin(navigate, t('authLoginRequired'), from),
        [navigate, t],
    );

    const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
        localStorage.setItem('luckygo_language', event.target.value);
        window.dispatchEvent(new Event('luckygo-language-change'));
    };

    const toggleBalanceVisible = (event: React.MouseEvent) => {
        event.stopPropagation();
        setBalanceVisibleState((current) => {
            const next = !current;
            setBalanceVisible(next);
            return next;
        });
    };

    useEffect(() => {
        localStorage.setItem('luckygo_addresses', JSON.stringify(addresses));
    }, [addresses]);

    useEffect(() => {
        if (modal === 'exchange' && user) {
            setExchangeBeansInput(user.beans > 0 ? String(user.beans) : '0');
        }
    }, [modal, user]);

    useEffect(() => {
        const state = location.state as { openProfile?: boolean } | null;
        if (state?.openProfile && user) {
            setModal('profile');
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate, user]);

    const normalizedPhone = useMemo(() => phoneDigits.replace(/\D/g, '').slice(0, 10), [phoneDigits]);
    const isPhoneValid = isValidGhanaLocalPhone(normalizedPhone);
    const e164Phone = useMemo(
        () => `+233${normalizedPhone.startsWith('0') ? normalizedPhone.slice(1) : normalizedPhone}`,
        [normalizedPhone],
    );
    const currentPhoneE164 = useMemo(() => {
        const raw = user?.phone?.trim() || '';
        if (!raw) return '';
        if (raw.startsWith('+')) return raw;
        const digits = raw.replace(/\D/g, '');
        if (digits.length === 10) return `+233${digits.startsWith('0') ? digits.slice(1) : digits}`;
        return raw;
    }, [user?.phone]);

    const handleProfileSaved = useCallback(
        (updated: User) => {
            updateUser(updated);
            setModal(null);
        },
        [updateUser],
    );

    const handleHeaderAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !user) return;

        const nicknameError = validateProfileNickname(user.nickname, t);
        if (nicknameError) {
            showSimpleToast(nicknameError);
            setModal('profile');
            return;
        }

        setHeaderAvatarUploading(true);
        try {
            const url = await uploadUserAvatar(file);
            const updated = await saveUserProfile({ nickname: user.nickname, avatar: url });
            updateUser(updated);
            showSimpleToast(t('settingsProfileSaved'));
        } catch (error) {
            if (error instanceof ProfileAvatarTooLargeError) {
                showSimpleToast(t('meAvatarTooLarge'));
            } else {
                showSimpleToast(getApiErrorMessage(error, t('meUploadAvatarFailed')));
            }
        } finally {
            setHeaderAvatarUploading(false);
        }
    };

    const submitBeansExchange = async () => {
        if (!user) return;
        const n = Number.parseInt(exchangeBeansInput.replace(/\D/g, ''), 10);
        if (!Number.isInteger(n) || n < 1) {
            showSimpleToast(t('meExchangeInvalidAmount'));
            return;
        }
        if (user.beans < n) {
            showSimpleToast(t('meExchangeInsufficientBeans'));
            return;
        }
        setExchangeSubmitting(true);
        try {
            await ApiService.exchangeBeansForGameBalance(n);
            await refreshUser();
            showSimpleToast(t('meExchangeSuccess'));
            setModal(null);
        } catch (error) {
            if (isAgeConfirmationRequiredError(error)) {
                showSimpleToast(t('ageGateRequired'));
            } else {
                showSimpleToast(getApiErrorMessage(error, t('meExchangeError')));
            }
        } finally {
            setExchangeSubmitting(false);
        }
    };

    const openAddressForm = () => {
        setAddressDraft(emptyAddress());
        setAddressFormOpen(true);
        setAddressMessage('');
    };

    const saveAddress = () => {
        if (
            !addressDraft.name.trim() ||
            !addressDraft.phone.trim() ||
            !addressDraft.line.trim() ||
            !addressDraft.city.trim()
        ) {
            setAddressMessage(t('meAddressErrorIncomplete'));
            return;
        }
        const nextAddress: Address = {
            ...addressDraft,
            id: `addr-${Date.now()}`,
            isDefault: addresses.length === 0 || addressDraft.isDefault,
        };
        setAddresses((current) => {
            const normalized = nextAddress.isDefault
                ? current.map((item) => ({ ...item, isDefault: false }))
                : current;
            return [...normalized, nextAddress];
        });
        setAddressDraft(emptyAddress());
        setAddressFormOpen(false);
        setAddressMessage(t('meAddressSaved'));
    };

    const submitPhoneChange = useCallback(async () => {
        if (!isPhoneValid) {
            showSimpleToast(t('loginErrorInvalidPhone'));
            return;
        }
        if (e164Phone === currentPhoneE164) {
            showSimpleToast(t('mePhoneSameAsCurrent'));
            return;
        }
        if (phonePassword.length < 6) {
            showSimpleToast(t('loginErrorPasswordTooShort'));
            return;
        }
        setPhoneSaving(true);
        try {
            const updated = await ApiService.updateMePhone(e164Phone, phonePassword);
            updateStoredPhone(updated.phone || e164Phone);
            updateUser({ phone: updated.phone || e164Phone });
            showSimpleToast(t('mePhoneUpdated'));
            setPhonePassword('');
            setModal(null);
        } catch (error) {
            const msg = getApiErrorMessage(error, t('mePhoneUpdateFailed'));
            if (/already registered/i.test(msg)) {
                showSimpleToast(t('mePhoneAlreadyUsed'));
            } else if (/different from the current/i.test(msg)) {
                showSimpleToast(t('mePhoneSameAsCurrent'));
            } else if (/invalid password/i.test(msg)) {
                showSimpleToast(t('loginErrorInvalidCredentials'));
            } else {
                showSimpleToast(msg);
            }
        } finally {
            setPhoneSaving(false);
        }
    }, [currentPhoneE164, e164Phone, isPhoneValid, phonePassword, t, updateUser]);

    const modalTitle = (kind: MeModal) => {
        if (kind === 'profile') return t('meEditProfile');
        if (kind === 'exchange') return t('meBeansExchange');
        if (kind === 'address') return t('meAddressManager');
        if (kind === 'phone') return t('meChangePhone');
        return t('helpSupport');
    };

    const openBeansRules = (event: React.MouseEvent) => {
        event.stopPropagation();
        setBeansRulesOpen(true);
    };

    const renderBeansLabel = () => (
        <p className="mb-1.5 flex items-center justify-end gap-0.5 text-xs font-medium uppercase tracking-wide text-white/80">
            <span>{t('meBeans')}</span>
            <button
                type="button"
                onClick={openBeansRules}
                className="inline-flex items-center justify-center rounded-full p-0.5 text-white/75 hover:bg-white/10 hover:text-white"
                aria-label={t('meBeansRulesAria')}
            >
                <span className="material-symbols-outlined text-[15px] leading-none">info</span>
            </button>
        </p>
    );

    const renderBeansRulesSheet = () => {
        if (!beansRulesOpen) return null;
        const sections = [
            {
                title: t('meBeansRulesEarn'),
                items: [t('meBeansRulesEarn1'), t('meBeansRulesEarn2')],
            },
            {
                title: t('meBeansRulesExchange'),
                items: [t('meBeansRulesExchange1')],
            },
            {
                title: t('meBeansRulesUse'),
                items: [t('meBeansRulesUse1'), t('meBeansRulesUse2')],
            },
        ];
        return (
            <div
                className="fixed inset-0 z-[85] flex items-end justify-center bg-black/45 p-4 pb-24 sm:items-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="me-beans-rules-title"
                onClick={() => setBeansRulesOpen(false)}
            >
                <div
                    className="max-h-[min(28rem,80vh)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 id="me-beans-rules-title" className="text-lg font-black text-ghana-green">
                            {t('meBeansRulesTitle')}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setBeansRulesOpen(false)}
                            className="size-9 shrink-0 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                            aria-label={t('commonClose')}
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    <div className="space-y-4">
                        {sections.map((section) => (
                            <section key={section.title}>
                                <h4 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">{section.title}</h4>
                                <ul className="space-y-2 text-sm leading-relaxed text-gray-600 dark:text-slate-400">
                                    {section.items.map((item) => (
                                        <li key={item} className="flex gap-2">
                                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ghana-green" aria-hidden />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderAddressBody = () => (
        <div className="space-y-3">
            {addressMessage ? (
                <div className="rounded-xl bg-ghana-green/10 px-3 py-2 text-sm font-bold text-ghana-green">
                    {addressMessage}
                </div>
            ) : null}
            {addresses.map((address) => (
                <div key={address.id} className="rounded-xl border border-gray-200 p-3 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                        <div className="font-bold">{address.name}</div>
                        {address.isDefault ? (
                            <span className="rounded bg-ghana-green/10 px-2 py-0.5 text-[10px] font-bold text-ghana-green">
                                {t('meDefaultBadge')}
                            </span>
                        ) : null}
                    </div>
                    <div className="text-sm text-gray-500">{address.phone}</div>
                    <div className="text-sm text-gray-500">
                        {address.line}, {address.city}, {address.country}
                    </div>
                </div>
            ))}
            {addressFormOpen ? (
                <div className="space-y-2">
                    <input
                        value={addressDraft.name}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder={t('mePlaceholderRecipient')}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                        value={addressDraft.phone}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, phone: e.target.value }))}
                        placeholder={t('mePlaceholderPhone')}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                        value={addressDraft.line}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, line: e.target.value }))}
                        placeholder={t('mePlaceholderStreet')}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                    />
                    <input
                        value={addressDraft.city}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
                        placeholder={t('mePlaceholderCity')}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                    />
                    <button
                        type="button"
                        onClick={saveAddress}
                        className="w-full rounded-xl bg-ghana-green py-3 font-black text-white"
                    >
                        {t('commonSave')}
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={openAddressForm}
                    className="w-full rounded-xl bg-gray-100 py-3 font-black text-gray-700 dark:bg-slate-800 dark:text-slate-200"
                >
                    {t('meAddNewAddress')}
                </button>
            )}
        </div>
    );

    const renderModalOverlay = () => {
        if (!modal) return null;
        return (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 pb-24">
                <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">{modalTitle(modal)}</h3>
                        <button
                            type="button"
                            onClick={() => setModal(null)}
                            className="size-9 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    {modal === 'profile' && user ? (
                        <ProfileEditForm user={user} onSaved={handleProfileSaved} />
                    ) : null}
                    {modal === 'exchange' && user ? (
                        <div className="space-y-4">
                            <p className="text-sm leading-6 text-gray-600 dark:text-slate-400">
                                {tf(t, 'meExchangeIntro', {
                                    beans: String(user.beans),
                                })}
                            </p>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
                                {t('meExchangeBeansLabel')}
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={exchangeBeansInput}
                                    onChange={(e) => setExchangeBeansInput(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                                />
                            </label>
                            <button
                                type="button"
                                disabled={exchangeSubmitting}
                                onClick={() => runAdultAction(() => void submitBeansExchange(), { spendConfirm: true })}
                                className="w-full rounded-xl bg-ghana-green py-3 font-black text-white disabled:opacity-60"
                            >
                                {exchangeSubmitting ? t('commonLoading') : t('meExchangeNow')}
                            </button>
                        </div>
                    ) : null}
                    {modal === 'address' ? renderAddressBody() : null}
                    {modal === 'phone' ? (
                        <div className="space-y-3">
                            <input
                                value={phoneDigits}
                                onChange={(e) => {
                                    setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10));
                                }}
                                placeholder={t('loginPlaceholderMobile')}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                            />
                            <input
                                type="password"
                                value={phonePassword}
                                onChange={(e) => setPhonePassword(e.target.value)}
                                placeholder={t('mePhonePasswordHint')}
                                autoComplete="current-password"
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                            />
                            <button
                                type="button"
                                disabled={phoneSaving}
                                onClick={() => void submitPhoneChange()}
                                className="w-full rounded-xl bg-ghana-green py-3 font-black text-white disabled:opacity-60"
                            >
                                {phoneSaving ? t('commonLoading') : t('commonConfirm')}
                            </button>
                        </div>
                    ) : null}
                    {modal === 'support' ? <SupportContactLinks config={supportConfig} /> : null}
                </div>
            </div>
        );
    };

    if (!isLoggedIn) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-surface pb-24 text-gray-900 transition-colors dark:bg-dark-surface dark:text-slate-100">
                <MePageAmbientBackground />
                <div className="relative z-10 flex w-full flex-col px-4 pb-4 pt-10">
                    <div className="py-4">
                        <div
                            role="presentation"
                            onClick={() => guardAuth('/wallet')}
                            className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r from-ghana-green via-[#00875a] to-[#006b3f] p-6 shadow-lg shadow-ghana-green/20"
                        >
                            <div className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/25 blur-2xl" aria-hidden />
                            <div className="relative z-10 mb-6 flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-white/80">
                                        {t('meTotalBalance')}
                                        <button
                                            type="button"
                                            onClick={(event) => {
                                                if (!guardAuth('/wallet')) return;
                                                toggleBalanceVisible(event);
                                            }}
                                            className="inline-flex items-center justify-center rounded-full p-0.5 text-white/80 hover:bg-white/10 hover:text-white"
                                            aria-label={balanceVisible ? t('meHideBalance') : t('meShowBalance')}
                                        >
                                            <span className="material-symbols-outlined text-[16px] leading-none">
                                                {balanceVisible ? 'visibility' : 'visibility_off'}
                                            </span>
                                        </button>
                                    </p>
                                    <span className="text-3xl font-extrabold tabular-nums tracking-tight text-primary">
                                        {balanceVisible ? formatMeTotalBalance(0) : '****'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    {renderBeansLabel()}
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span className="inline-block size-[14px] shrink-0 rounded-full bg-primary ring-2 ring-primary/40" aria-hidden />
                                        <p className="text-xl font-bold tabular-nums text-white">0</p>
                                    </div>
                                </div>
                            </div>
                            <div className="relative z-10 flex gap-3">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        guardAuth('/wallet');
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-ghana-green shadow-lg shadow-black/10 active:scale-[0.98]"
                                >
                                    <span className="material-symbols-outlined filled text-[20px]">add_card</span>
                                    {t('topUp')}
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        guardAuth('/me');
                                    }}
                                    className="flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-sm active:scale-[0.98]"
                                >
                                    {t('meExchange')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <InviteEntryBanner />

                    <button
                        type="button"
                        onClick={() => {
                            if (!guardAuth('/rewards')) return;
                            navigate('/rewards');
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left shadow-sm active:scale-[0.99]"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined filled text-2xl text-ghana-green">stars</span>
                            <div>
                                <p className="text-sm font-black text-gray-900 dark:text-slate-100">{t('meRewardsEntry')}</p>
                                <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-400">{t('meRewardsEntryHint')}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </button>

                    <div className="pt-2">
                        <div className="grid grid-cols-3 items-stretch gap-3">
                            <button
                                type="button"
                                onClick={() => guardAuth('/winnings') && navigate('/winnings')}
                                className="group flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-dark-card"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ghana-green/10">
                                    <span className="material-symbols-outlined filled text-[22px] text-ghana-green">emoji_events</span>
                                </div>
                                <span className="line-clamp-2 block w-full px-0.5 text-center text-xs font-bold leading-snug">
                                    {t('meMyWinnings')}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => guardAuth('/participation') && navigate('/participation')}
                                className="group flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-dark-card"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    <span className="material-symbols-outlined text-[22px] text-yellow-600">receipt_long</span>
                                </div>
                                <span className="line-clamp-2 block w-full px-0.5 text-center text-xs font-bold leading-snug">
                                    {t('meParticipation')}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!guardAuth('/me')) return;
                                    setModal('address');
                                }}
                                className="group flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-dark-card"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                                    <span className="material-symbols-outlined text-[22px] text-gray-600 dark:text-slate-400">location_on</span>
                                </div>
                                <span className="line-clamp-2 block w-full px-0.5 text-center text-xs font-bold leading-snug">
                                    {t('meAddress')}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-dark-card">
                            <button
                                type="button"
                                onClick={() => guardAuth('/me')}
                                className="group flex w-full items-center gap-4 border-b border-gray-200 p-4 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">phone_iphone</span>
                                </div>
                                <div className="flex-1 text-left text-sm font-semibold">{t('meChangePhone')}</div>
                                <span className="material-symbols-outlined text-[20px] text-gray-300 dark:text-slate-600">chevron_right</span>
                            </button>
                            <div className="flex w-full items-center gap-4 border-b border-gray-200 p-4 dark:border-slate-700">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">translate</span>
                                </div>
                                <div className="flex flex-1 items-center justify-between pr-2">
                                    <p className="text-sm font-semibold">{t('language')}</p>
                                    <select
                                        value={language}
                                        onChange={changeLanguage}
                                        className="bg-transparent text-xs font-bold text-ghana-green outline-none"
                                    >
                                        {localLanguages.map((item) => (
                                            <option key={item.code} value={item.code as LocalLanguageCode}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => guardAuth('/settings') && navigate('/settings')}
                                className="group flex w-full items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">settings</span>
                                </div>
                                <div className="flex-1 text-left text-sm font-semibold">{t('meGeneralSettings')}</div>
                                <span className="material-symbols-outlined text-[20px] text-gray-300 dark:text-slate-600">chevron_right</span>
                            </button>
                        </div>
                        {hasSupport ? (
                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-dark-card">
                                <button
                                    type="button"
                                    onClick={() => setModal('support')}
                                    className="group flex w-full items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
                                >
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                        <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">help</span>
                                    </div>
                                    <div className="flex-1 text-left text-sm font-semibold">{t('helpSupport')}</div>
                                    <span className="material-symbols-outlined text-[20px] text-gray-300 dark:text-slate-600">chevron_right</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
                {renderModalOverlay()}
                {renderBeansRulesSheet()}
                {/* <LuckyAssistant /> EBA 助手暂下线 */}
            </div>
        );
    }

    if (profileLoading && !user) {
        return <div className="p-8 text-center text-sm text-gray-500">{t('commonLoading')}</div>;
    }

    if (!user) {
        return null;
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-surface pb-24 text-gray-900 transition-colors dark:bg-dark-surface dark:text-slate-100">
            <MePageAmbientBackground />
            <div className="relative z-10 flex w-full flex-col px-4 pb-4 pt-10">
                <div className="mb-2 flex items-center justify-between gap-4">
                    <input
                        ref={headerAvatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={headerAvatarUploading}
                        onChange={(event) => void handleHeaderAvatarFile(event)}
                    />
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            disabled={headerAvatarUploading}
                            onClick={() => headerAvatarInputRef.current?.click()}
                            className="group relative cursor-pointer text-left disabled:opacity-70"
                            aria-label={t('meUploadAvatar')}
                        >
                            <img
                                src={resolveAssetUrl(user.avatar) || '/logo.png'}
                                className="aspect-square h-16 w-16 rounded-full border-2 border-primary object-cover shadow-sm"
                                alt={t('meUserProfileAlt')}
                            />
                            <div className="absolute -bottom-1 -right-1 rounded-full border border-gray-100 bg-white p-1 text-ghana-green shadow-md dark:border-slate-700 dark:bg-slate-800">
                                <span className="material-symbols-outlined block text-[14px] font-bold">edit</span>
                            </div>
                        </button>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-slate-100">
                                    {user.nickname}
                                </h1>
                                <button
                                    type="button"
                                    onClick={() => setModal('profile')}
                                    className="material-symbols-outlined cursor-pointer text-[18px] text-ghana-green/80 filled"
                                    aria-label={t('meEditProfile')}
                                >
                                    edit_square
                                </button>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="rounded bg-gradient-to-r from-ghana-green to-[#004d2c] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm">
                                    {t('meVip')} {user.vipLevel || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            if (!guardAuth('/notifications')) return;
                            navigate('/notifications');
                        }}
                        className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-slate-700 dark:bg-dark-card dark:text-slate-100"
                        aria-label={t('notificationsTitle')}
                    >
                        <span className="material-symbols-outlined text-[22px] leading-none text-gray-600 dark:text-slate-300">
                            notifications
                        </span>
                        {notificationUnread > 0 ? (
                            <span
                                className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-ghana-red px-1 text-[10px] font-bold leading-none text-white dark:border-slate-900"
                                aria-hidden
                            >
                                {notificationUnread > 99 ? '99+' : notificationUnread}
                            </span>
                        ) : null}
                    </button>
                </div>

                <div className="py-4">
                    <div
                        role="presentation"
                        onClick={() => navigate('/wallet')}
                        className="relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r from-ghana-green via-[#00875a] to-[#006b3f] p-6 shadow-lg shadow-ghana-green/20"
                    >
                        <div className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/25 blur-2xl" aria-hidden />
                        <div className="relative z-10 mb-6 flex items-start justify-between">
                            <div className="flex-1">
                                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-white/80">
                                    {t('meTotalBalance')}
                                    <button
                                        type="button"
                                        onClick={toggleBalanceVisible}
                                        className="inline-flex items-center justify-center rounded-full p-0.5 text-white/80 hover:bg-white/10 hover:text-white"
                                        aria-label={balanceVisible ? t('meHideBalance') : t('meShowBalance')}
                                    >
                                        <span className="material-symbols-outlined text-[16px] leading-none">
                                            {balanceVisible ? 'visibility' : 'visibility_off'}
                                        </span>
                                    </button>
                                </p>
                                <span className="text-3xl font-extrabold tabular-nums tracking-tight text-primary">
                                    {balanceVisible ? formatMeTotalBalance(user.totalBalance) : '****'}
                                </span>
                            </div>
                            <div className="text-right">
                                {renderBeansLabel()}
                                <div className="flex items-center justify-end gap-1.5">
                                    <span className="inline-block size-[14px] shrink-0 rounded-full bg-primary ring-2 ring-primary/40" aria-hidden />
                                    <p className="text-xl font-bold tabular-nums text-white">{user.beans.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative z-10 flex gap-3">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    navigate('/wallet');
                                }}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-ghana-green shadow-lg shadow-black/10 active:scale-[0.98]"
                            >
                                <span className="material-symbols-outlined filled text-[20px]">add_card</span>
                                {t('topUp')}
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setModal('exchange');
                                }}
                                className="flex h-11 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-sm active:scale-[0.98]"
                            >
                                {t('meExchange')}
                            </button>
                        </div>
                    </div>
                </div>

                <InviteEntryBanner />

                <div className="pt-2">
                    <div className="grid grid-cols-3 items-stretch gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/winnings')}
                            className="group flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-dark-card"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ghana-green/10">
                                <span className="material-symbols-outlined filled text-[22px] text-ghana-green">emoji_events</span>
                            </div>
                            <span className="line-clamp-2 block w-full px-0.5 text-center text-xs font-bold leading-snug">
                                {t('meMyWinnings')}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/participation')}
                            className="group flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-dark-card"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <span className="material-symbols-outlined text-[22px] text-yellow-600">receipt_long</span>
                            </div>
                            <span className="line-clamp-2 block w-full px-0.5 text-center text-xs font-bold leading-snug">
                                {t('meParticipation')}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setModal('address')}
                            className="group flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-dark-card"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                                <span className="material-symbols-outlined text-[22px] text-gray-600 dark:text-slate-400">location_on</span>
                            </div>
                            <span className="line-clamp-2 block w-full px-0.5 text-center text-xs font-bold leading-snug">
                                {t('meAddress')}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-dark-card">
                        <button
                            type="button"
                            onClick={() => setModal('phone')}
                            className="group flex w-full items-center gap-4 border-b border-gray-200 p-4 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">phone_iphone</span>
                            </div>
                            <div className="flex-1 text-left text-sm font-semibold">{t('meChangePhone')}</div>
                            <span className="material-symbols-outlined text-[20px] text-gray-300 dark:text-slate-600">chevron_right</span>
                        </button>
                        <div className="flex w-full items-center gap-4 border-b border-gray-200 p-4 dark:border-slate-700">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">translate</span>
                            </div>
                            <div className="flex flex-1 items-center justify-between pr-2">
                                <p className="text-sm font-semibold">{t('language')}</p>
                                <select
                                    value={language}
                                    onChange={changeLanguage}
                                    className="bg-transparent text-xs font-bold text-ghana-green outline-none"
                                >
                                    {localLanguages.map((item) => (
                                        <option key={item.code} value={item.code as LocalLanguageCode}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/settings')}
                            className="group flex w-full items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">settings</span>
                            </div>
                            <div className="flex-1 text-left text-sm font-semibold">{t('meGeneralSettings')}</div>
                            <span className="material-symbols-outlined text-[20px] text-gray-300 dark:text-slate-600">chevron_right</span>
                        </button>
                    </div>
                    {hasSupport ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-dark-card">
                            <button
                                type="button"
                                onClick={() => setModal('support')}
                                className="group flex w-full items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">help</span>
                                </div>
                                <div className="flex-1 text-left text-sm font-semibold">{t('helpSupport')}</div>
                                <span className="material-symbols-outlined text-[20px] text-gray-300 dark:text-slate-600">chevron_right</span>
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
            {renderModalOverlay()}
            {renderBeansRulesSheet()}
            {/* <LuckyAssistant /> EBA 助手暂下线 */}
        </div>
    );
};

export default Me;
