import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiService, getApiErrorMessage } from '../services/api';
import { persistH5Login } from '../lib/auth';
import { parseUserIdFromToken } from '../lib/jwt';
import { showSimpleToast } from '../lib/simpleToast';
import { isValidGhanaLocalPhone, normalizeGhanaLocalPhoneInput, toGhanaE164Phone } from '../lib/ghana-phone';
import { useAgeCompliance } from '../context/AgeComplianceContext';
import { useI18n } from '../lib/useI18n';

interface LocationState { from?: string; }
interface LoginProps {
    modal?: boolean;
    onClose?: () => void;
    from?: string;
}

const OTP_LENGTH = 6;
const OTP_RESEND_SECONDS = 60;

const Login: React.FC<LoginProps> = ({ modal = false, onClose, from: modalFrom }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { t } = useI18n();
    const { config } = useAgeCompliance();
    const state = location.state as LocationState | null;
    const returnPath = modalFrom || state?.from || '/';
    const otpInputRef = useRef<HTMLInputElement | null>(null);

    const inviteFromUrl = useMemo(() => {
        const raw = searchParams.get('invite') || searchParams.get('code') || '';
        return raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    }, [searchParams]);

    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [inviteCode, setInviteCode] = useState(inviteFromUrl);
    const [phoneSubmitted, setPhoneSubmitted] = useState(false);
    const [ageAccepted, setAgeAccepted] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const normalizedPhone = useMemo(() => normalizeGhanaLocalPhoneInput(phone), [phone]);
    const isPhoneValid = isValidGhanaLocalPhone(normalizedPhone);
    const showPhoneError = phoneSubmitted && !isPhoneValid;
    const e164Phone = useMemo(() => toGhanaE164Phone(normalizedPhone), [normalizedPhone]);
    const displayPhoneDigits = normalizedPhone.startsWith('0') ? normalizedPhone.slice(1) : normalizedPhone;
    const codeSent = cooldown > 0;

    useEffect(() => {
        if (inviteFromUrl) setInviteCode(inviteFromUrl);
    }, [inviteFromUrl]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [cooldown]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        if (modal) document.body.style.overflow = 'hidden';
        return () => {
            if (modal) document.body.style.overflow = previousOverflow;
        };
    }, [modal]);

    const closeLogin = useCallback(() => {
        if (onClose) {
            onClose();
            return;
        }
        navigate(returnPath, { replace: true });
    }, [navigate, onClose, returnPath]);

    const sendCode = useCallback(async () => {
        setPhoneSubmitted(true);
        if (!isPhoneValid) {
            showSimpleToast(t('loginErrorInvalidPhone'));
            return;
        }
        if (cooldown > 0) return;
        setSendingCode(true);
        try {
            const data = await ApiService.requestLoginOtp(e164Phone);
            setCode('');
            setCooldown(OTP_RESEND_SECONDS);
            showSimpleToast(data.message || t('loginOtpSent'));
            window.setTimeout(() => otpInputRef.current?.focus(), 0);
        } catch (error) {
            showSimpleToast(getApiErrorMessage(error, t('loginOtpSendFailed')));
        } finally {
            setSendingCode(false);
        }
    }, [cooldown, e164Phone, isPhoneValid, t]);

    const verifyCode = useCallback(async () => {
        setPhoneSubmitted(true);
        if (!isPhoneValid) {
            showSimpleToast(t('loginErrorInvalidPhone'));
            return;
        }
        if (code.length !== OTP_LENGTH) {
            showSimpleToast(t('loginOtpInvalid'));
            return;
        }
        if (!ageAccepted) {
            showSimpleToast(t('registerAgeRequired'));
            return;
        }
        setVerifying(true);
        try {
            const data = await ApiService.loginWithOtp(e164Phone, code, inviteCode, ageAccepted);
            if (data.user?.role === 'admin') {
                showSimpleToast(t('loginErrorAdmin'));
                return;
            }
            const storedPhone = (typeof data.user?.phone === 'string' && data.user.phone) || normalizedPhone;
            persistH5Login({ token: data.token, userId: parseUserIdFromToken(data.token), phone: storedPhone });
            showSimpleToast(data.isNewUser ? t('registerSuccess') : t('loginSuccess'));
            onClose?.();
            navigate(returnPath, { replace: true });
        } catch (error) {
            showSimpleToast(getApiErrorMessage(error, t('loginOtpVerifyFailed')));
        } finally {
            setVerifying(false);
        }
    }, [ageAccepted, code, e164Phone, inviteCode, isPhoneValid, navigate, normalizedPhone, onClose, returnPath, t]);

    useEffect(() => {
        if (codeSent && ageAccepted && code.length === OTP_LENGTH && !verifying) {
            void verifyCode();
        }
    }, [ageAccepted, code, codeSent, verifying, verifyCode]);

    useEffect(() => {
        if (!codeSent || typeof navigator === 'undefined' || !('credentials' in navigator)) return;
        const controller = new AbortController();
        const credentials = navigator.credentials as CredentialsContainer & {
            get: (options?: CredentialRequestOptions & { otp?: { transport: string[] }; signal?: AbortSignal }) => Promise<Credential | null>;
        };
        void credentials.get({ otp: { transport: ['sms'] }, signal: controller.signal })
            .then((credential) => {
                const smsCode = (credential as { code?: string } | null)?.code?.replace(/\D/g, '').slice(0, OTP_LENGTH);
                if (smsCode) setCode(smsCode);
            })
            .catch(() => undefined);
        return () => controller.abort();
    }, [codeSent]);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3 sm:p-6" role="presentation">
            <button
                type="button"
                aria-label={t('commonCancel')}
                onClick={closeLogin}
                className="absolute inset-0 cursor-default"
            />
            <section
                role="dialog"
                aria-modal="true"
                aria-label={t('loginOtpTitle')}
                className="relative z-10 flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-[#f4f7f5] text-slate-900 shadow-2xl dark:bg-dark-surface dark:text-slate-100"
            >
                <div className="min-h-0 overflow-y-auto">
            <main className="mx-auto w-full max-w-md px-4 py-4 sm:px-5">
                <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-dark-card" onSubmit={(event) => { event.preventDefault(); void verifyCode(); }}>
                    <div>
                        <div className={`mt-2.5 flex h-14 items-center rounded-xl border bg-white px-3 transition focus-within:ring-2 focus-within:ring-ghana-green/15 dark:bg-dark-card ${showPhoneError ? 'border-ghana-red' : 'border-slate-300 focus-within:border-ghana-green dark:border-slate-600'}`}>
                            <span className="mr-2.5 text-2xl leading-none" aria-label="Ghana">🇬🇭</span>
                            <span className="border-r border-slate-300 pr-2.5 text-base font-bold text-slate-800 dark:border-slate-600 dark:text-slate-100">+233</span>
                            <input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                value={normalizedPhone}
                                onChange={(event) => { setPhone(normalizeGhanaLocalPhoneInput(event.target.value)); setPhoneSubmitted(false); }}
                                placeholder={t('loginPlaceholderMobile')}
                                className="min-w-0 flex-1 border-none bg-transparent px-3 text-base font-medium outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100"
                                aria-label={t('loginAriaMobile')}
                            />
                            <span className="shrink-0 text-sm font-medium text-slate-400"><b className="text-slate-700 dark:text-slate-100">{displayPhoneDigits.length}</b>/9</span>
                        </div>
                        {showPhoneError ? <p className="mt-2 text-sm font-semibold text-ghana-red">{t('loginInvalidPhoneShort')}</p> : null}
                    </div>

                    <div className="mt-7">
                        <div className="flex items-center gap-2">
                            <input
                                ref={otpInputRef}
                                id="otp-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={OTP_LENGTH}
                                value={code}
                                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                                placeholder={t('loginOtpPlaceholder')}
                                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-center text-lg font-bold tracking-[0.22em] text-slate-800 outline-none transition placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-ghana-green focus:ring-2 focus:ring-ghana-green/15 disabled:bg-slate-100 dark:border-slate-600 dark:bg-dark-card dark:text-slate-100 dark:placeholder:text-slate-400 dark:disabled:bg-slate-800"
                                aria-label={t('loginOtpCode')}
                                disabled={!codeSent}
                            />
                            <button type="button" onClick={() => void sendCode()} disabled={sendingCode || cooldown > 0} className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-ghana-green px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#006b3f] disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700">
                                {sendingCode ? t('loginOtpSending') : cooldown > 0 ? t('loginOtpResendCountdown').replace('{seconds}', String(cooldown)) : t('loginOtpSend')}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                        <label htmlFor="inviteCode" className="shrink-0 text-sm font-bold text-slate-700 dark:text-slate-200">{t('registerInviteCode')}</label>
                        <input
                            id="inviteCode"
                            type="text"
                            maxLength={8}
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            readOnly={Boolean(inviteFromUrl)}
                            value={inviteCode}
                            onChange={(event) => { if (!inviteFromUrl) setInviteCode(event.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)); }}
                            placeholder={t('registerPlaceholderInviteCode')}
                            className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-ghana-green focus:ring-2 focus:ring-ghana-green/15 dark:border-slate-600 dark:bg-dark-card dark:text-slate-100"
                        />
                    </div>

                    <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <input id="login-age-confirm" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-ghana-green" checked={ageAccepted} onChange={(event) => setAgeAccepted(event.target.checked)} />
                        <label htmlFor="login-age-confirm" className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {t('registerAgeConfirmBeforeLink').replace('{age}', String(config.minAge))}{' '}
                            <Link to="/responsible-gaming" className="font-semibold text-ghana-green underline underline-offset-2">{t('ageResponsibleLink')}</Link>
                        </label>
                    </div>

                    <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-ghana-green text-white" aria-label={t('loginPrivacyAutoAccepted')}><Check className="size-3" strokeWidth={3} aria-hidden /></span>
                            <p>{t('loginPrivacyAutoAccepted')}{' '}<Link to="/terms" className="font-semibold text-ghana-green underline underline-offset-2">{t('privacyPolicy')}</Link>{' '}{t('loginPrivacyAnd')}{' '}<Link to="/terms" className="font-semibold text-ghana-green underline underline-offset-2">{t('termsConditions')}</Link>. {t('loginPrivacyLoginAgreement')}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button type="button" onClick={closeLogin} className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-dark-card dark:text-slate-200 dark:hover:bg-slate-800">
                            {t('commonCancel')}
                        </button>
                        <button type="submit" disabled={!codeSent || sendingCode || verifying} className="flex h-12 flex-1 items-center justify-center rounded-xl bg-ghana-green text-sm font-bold text-white shadow-sm shadow-ghana-green/20 transition hover:bg-[#006b3f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55">
                            {verifying ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> : null}
                            {verifying ? t('loginOtpVerifying') : t('authGoLogin')}
                        </button>
                    </div>
                </form>
            </main>
                </div>
            </section>
        </div>
    );
};

export default Login;
