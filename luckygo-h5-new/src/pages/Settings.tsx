import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isH5Authenticated, logoutH5 } from '../lib/auth';
import { promptLogin } from '../lib/require-login';
import { useI18n } from '../lib/useI18n';
import { ApiService, getApiErrorMessage } from '../services/api';
import { showSimpleToast } from '../lib/simpleToast';
import { AppPageNav } from '../components/AppPageNav';

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
        // Keep the default address if local storage contains invalid data.
    }
    return [];
};

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const isLoggedIn = isH5Authenticated();

    const openAccountModal = (modal: 'profile' | 'password' | 'address') => {
        if (modal === 'profile') {
            if (!promptLogin(navigate, t('authLoginRequired'), '/settings')) {
                return;
            }
            navigate('/me', { state: { openProfile: true } });
            return;
        }
        if (modal === 'password' && !promptLogin(navigate, t('authLoginRequired'), '/settings')) {
            return;
        }
        setModal(modal);
    };
    const [modal, setModal] = useState<'password' | 'address' | null>(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('luckygo_dark_mode') === '1');
    const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('luckygo_push') !== '0');
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('luckygo_sound') === '1');
    const [addresses, setAddresses] = useState<Address[]>(loadAddresses);
    const [addressFormOpen, setAddressFormOpen] = useState(false);
    const [addressDraft, setAddressDraft] = useState<Address>(emptyAddress);
    const [formError, setFormError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('luckygo_dark_mode', isDarkMode ? '1' : '0');
        window.dispatchEvent(new Event('luckygo-theme-change'));
    }, [isDarkMode]);

    useEffect(() => {
        localStorage.setItem('luckygo_addresses', JSON.stringify(addresses));
    }, [addresses]);

    const togglePush = async (checked: boolean) => {
        setPushEnabled(checked);
        localStorage.setItem('luckygo_push', checked ? '1' : '0');
        if (checked && 'Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    };

    const openAddressForm = () => {
        setAddressDraft(emptyAddress());
        setFormError('');
        setAddressFormOpen(true);
    };

    const saveAddress = () => {
        if (!addressDraft.name.trim() || !addressDraft.phone.trim() || !addressDraft.line.trim() || !addressDraft.city.trim()) {
            setFormError(t('settingsAddressIncomplete'));
            return;
        }

        const nextAddress = {
            ...addressDraft,
            id: `addr-${Date.now()}`,
            isDefault: addresses.length === 0 || addressDraft.isDefault,
        };

        setAddresses((current) => {
            const normalized = nextAddress.isDefault ? current.map((item) => ({ ...item, isDefault: false })) : current;
            return [...normalized, nextAddress];
        });
        setAddressDraft(emptyAddress());
        setAddressFormOpen(false);
        setFormError('');
        setStatusMessage(t('settingsAddressSaved'));
    };

    const setDefaultAddress = (id: string) => {
        setAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === id })));
    };

    return (
        <div className="bg-gray-50 dark:bg-dark-surface font-display text-slate-800 dark:text-slate-100 antialiased min-h-screen transition-colors duration-300">
            <AppPageNav title={t('settingsTitle')} onBack={() => navigate('/me')} />

            <main className="px-5 py-4 space-y-6 pb-12">
                <section>
                    <h3 className="mb-3 pl-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{t('settingsAccountSecurity')}</h3>
                    <div className="overflow-hidden rounded-3xl bg-white dark:bg-dark-card shadow-sm border border-slate-100 dark:border-slate-800">
                        {(
                            [
                                { modal: 'profile' as const, labelKey: 'settingsEditProfile', icon: 'person' },
                                { modal: 'password' as const, labelKey: 'settingsChangePassword', icon: 'lock' },
                                { modal: 'address' as const, labelKey: 'settingsManageAddresses', icon: 'location_on' },
                            ] as const
                        ).map((item, idx) => (
                            <button
                                key={item.modal}
                                onClick={() => openAccountModal(item.modal)}
                                className={`group relative flex w-full cursor-pointer items-center justify-between p-4 active:bg-ghana-green/5 transition-colors ${idx !== 2 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-ghana-green/10 text-ghana-green">
                                        <span className="material-symbols-outlined filled">{item.icon}</span>
                                    </div>
                                    <span className="text-[15px] font-semibold">{t(item.labelKey)}</span>
                                </div>
                                <span className="material-symbols-outlined text-gray-300 dark:text-slate-600 text-xl">chevron_right</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="mb-3 pl-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{t('settingsPreferences')}</h3>
                    <div className="overflow-hidden rounded-3xl bg-white dark:bg-dark-card shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-yellow-600">
                                    <span className="material-symbols-outlined filled">dark_mode</span>
                                </div>
                                <span className="text-[15px] font-semibold">{t('settingsDarkMode')}</span>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isDarkMode}
                                    onChange={(event) => setIsDarkMode(event.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-ghana-green after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-yellow-600">
                                    <span className="material-symbols-outlined filled">notifications</span>
                                </div>
                                <span className="text-[15px] font-semibold">{t('settingsPushNotifications')}</span>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input type="checkbox" className="sr-only peer" checked={pushEnabled} onChange={(event) => void togglePush(event.target.checked)} />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-ghana-green after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-yellow-600">
                                    <span className="material-symbols-outlined filled">volume_up</span>
                                </div>
                                <span className="text-[15px] font-semibold">{t('settingsSoundEffects')}</span>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={soundEnabled}
                                    onChange={(event) => {
                                        setSoundEnabled(event.target.checked);
                                        localStorage.setItem('luckygo_sound', event.target.checked ? '1' : '0');
                                    }}
                                />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-ghana-green after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                            </label>
                        </div>
                    </div>
                </section>

                <section className="mb-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-dark-card">
                    <button
                        type="button"
                        onClick={() => navigate('/help')}
                        className="flex w-full items-center justify-between border-b border-gray-100 p-4 text-left text-[15px] font-semibold dark:border-slate-800"
                    >
                        {t('loginHelpCenter')}
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/responsible-gaming')}
                        className="flex w-full items-center justify-between border-b border-gray-100 p-4 text-left text-[15px] font-semibold dark:border-slate-800"
                    >
                        {t('settingsResponsibleGaming')}
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/terms')}
                        className="flex w-full items-center justify-between p-4 text-left text-[15px] font-semibold"
                    >
                        {t('loginTermsPrivacy')}
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </button>
                </section>

                <section>
                    {isLoggedIn ? (
                        <button
                            type="button"
                            onClick={() => {
                                logoutH5();
                                navigate('/me', { replace: true });
                            }}
                            className="w-full rounded-2xl bg-white dark:bg-dark-card p-4 text-center text-[15px] font-bold text-ghana-red active:bg-ghana-red/5 transition-colors shadow-sm border border-ghana-red/10 dark:border-ghana-red/20"
                        >
                            {t('settingsLogOut')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => { promptLogin(navigate, t('authLoginRequired'), '/settings', 0); }}
                            className="w-full rounded-2xl bg-ghana-green p-4 text-center text-[15px] font-bold text-white active:opacity-90 shadow-sm"
                        >
                            {t('authGoLogin')}
                        </button>
                    )}
                </section>
            </main>
            {modal && (
                <div className="fixed inset-0 z-[80] bg-black/45 flex items-center justify-center p-4 pb-24">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black text-gray-900">
                                {modal === 'password' && t('settingsChangePassword')}
                                {modal === 'address' && t('settingsManageAddresses')}
                            </h3>
                            <button onClick={() => setModal(null)} className="size-9 rounded-full bg-gray-100 text-gray-600">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>
                        {modal === 'password' && (
                            <div className="space-y-3">
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    placeholder={t('settingsPlaceholderCurrentPw')}
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                                />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    placeholder={t('settingsPlaceholderNewPw')}
                                    autoComplete="new-password"
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                                />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder={t('settingsPlaceholderConfirmPw')}
                                    autoComplete="new-password"
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
                                />
                                <button
                                    type="button"
                                    disabled={passwordSaving}
                                    onClick={() => {
                                        void (async () => {
                                            if (newPassword.length < 6) {
                                                showSimpleToast(t('loginErrorPasswordTooShort'));
                                                return;
                                            }
                                            if (newPassword !== confirmPassword) {
                                                showSimpleToast(t('loginErrorPasswordMismatch'));
                                                return;
                                            }
                                            setPasswordSaving(true);
                                            try {
                                                await ApiService.changePassword(currentPassword, newPassword);
                                                setCurrentPassword('');
                                                setNewPassword('');
                                                setConfirmPassword('');
                                                setStatusMessage(t('settingsPasswordUpdated'));
                                                setModal(null);
                                                showSimpleToast(t('settingsPasswordUpdated'));
                                            } catch (error) {
                                                const msg = getApiErrorMessage(error, t('settingsPasswordUpdateFailed'));
                                                if (/invalid password/i.test(msg)) {
                                                    showSimpleToast(t('loginErrorInvalidCredentials'));
                                                } else {
                                                    showSimpleToast(msg);
                                                }
                                            } finally {
                                                setPasswordSaving(false);
                                            }
                                        })();
                                    }}
                                    className="w-full rounded-xl bg-ghana-green py-3 text-white font-black disabled:opacity-60"
                                >
                                    {passwordSaving ? t('commonLoading') : t('settingsUpdatePassword')}
                                </button>
                            </div>
                        )}
                        {modal === 'address' && (
                            <div className="space-y-3">
                                {statusMessage && <div className="rounded-xl bg-ghana-green/10 px-3 py-2 text-sm font-bold text-ghana-green">{statusMessage}</div>}
                                {addresses.map((address) => (
                                    <div key={address.id} className="rounded-xl border border-gray-200 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-bold">{address.name}</div>
                                                <div className="text-sm text-gray-500">{address.phone}</div>
                                                <div className="text-sm text-gray-500">{address.line}, {address.city}, {address.country}</div>
                                            </div>
                                            {address.isDefault ? (
                                                <span className="rounded bg-ghana-green/10 px-2 py-1 text-xs font-bold text-ghana-green">{t('meDefaultBadge')}</span>
                                            ) : (
                                                <button onClick={() => setDefaultAddress(address.id)} className="text-xs font-bold text-ghana-green">{t('meSetDefault')}</button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {addressFormOpen && (
                                    <div className="space-y-3 rounded-xl bg-gray-50 p-3">
                                        <input value={addressDraft.name} onChange={(event) => setAddressDraft((current) => ({ ...current, name: event.target.value }))} placeholder={t('mePlaceholderRecipient')} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green" />
                                        <input value={addressDraft.phone} onChange={(event) => setAddressDraft((current) => ({ ...current, phone: event.target.value }))} placeholder={t('mePlaceholderPhone')} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green" />
                                        <input value={addressDraft.line} onChange={(event) => setAddressDraft((current) => ({ ...current, line: event.target.value }))} placeholder={t('mePlaceholderStreet')} className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input value={addressDraft.city} onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))} placeholder={t('mePlaceholderCity')} className="min-w-0 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green" />
                                            <input value={addressDraft.country} onChange={(event) => setAddressDraft((current) => ({ ...current, country: event.target.value }))} placeholder={t('mePlaceholderCountry')} className="min-w-0 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-ghana-green" />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                            <input type="checkbox" checked={addressDraft.isDefault} onChange={(event) => setAddressDraft((current) => ({ ...current, isDefault: event.target.checked }))} />
                                            {t('meSetAsDefaultAddress')}
                                        </label>
                                        {formError && <div className="text-sm font-bold text-ghana-red">{formError}</div>}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setAddressFormOpen(false)} className="rounded-xl bg-gray-100 py-3 font-black text-gray-700">{t('commonCancel')}</button>
                                            <button type="button" onClick={saveAddress} className="rounded-xl bg-ghana-green py-3 font-black text-white">{t('commonSave')}</button>
                                        </div>
                                    </div>
                                )}

                                {!addressFormOpen && (
                                    <button type="button" onClick={openAddressForm} className="w-full rounded-xl bg-gray-100 py-3 font-black text-gray-700">{t('settingsAddAddress')}</button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
