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

const OTP_LENGTH = 6;
const OTP_RESEND_SECONDS = 60;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { t } = useI18n();
    const { config } = useAgeCompliance();
    const state = location.state as LocationState | null;
    const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

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
            window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
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
            navigate(state?.from || '/', { replace: true });
        } catch (error) {
            showSimpleToast(getApiErrorMessage(error, t('loginOtpVerifyFailed')));
        } finally {
            setVerifying(false);
        }
    }, [ageAccepted, code, e164Phone, inviteCode, isPhoneValid, navigate, normalizedPhone, state?.from, t]);

    useEffect(() => {
        if (codeSent && ageAccepted && code.length === OTP_LENGTH && !verifying) {
            void verifyCode();
        }
    }, [ageAccepted, code, codeSent, verifying, verifyCode]);

    const submit = useCallback(async () => {
        if (!codeSent) {
            await sendCode();
            return;
        }
        await verifyCode();
    }, [codeSent, sendCode, verifyCode]);

    const updateOtp = (index: number, value: string) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) {
            const next = code.split('');
            next[index] = '';
            setCode(next.join(''));
            return;
        }
        const next = code.split('');
        digits.slice(0, OTP_LENGTH - index).split('').forEach((digit, offset) => { next[index + offset] = digit; });
        setCode(next.join('').slice(0, OTP_LENGTH));
        otpRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
    };

    const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !code[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };

    return (
        <div className="min-h-[100dvh] bg-[#f4f7f5] text-slate-900 dark:bg-dark-surface dark:text-slate-100">
            <header className="relative px-4 pb-4 pt-5">
                <div className="mx-auto w-full max-w-md">
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ghana-green via-[#00875a] to-[#006b3f] p-5 shadow-lg shadow-ghana-green/20">
                        <div className="absolute -right-10 -top-10 size-32 rounded-full bg-primary/25 blur-2xl" aria-hidden />
                        <div className="relative flex items-center gap-4">
                            <div className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/80 bg-white/10 p-1.5 shadow-inner">
                                <img src="/logo.png" alt="" className="size-full rounded-full object-contain" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-xl font-black tracking-tight text-white">{t('appName')}</h1>
                                <p className="mt-1 text-sm leading-5 text-white/80">{t('loginOtpSubtitle')}</p>
                            </div>
                        </div>
                        <div className="relative mt-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{t('meGuestWalletTeaser')}</span>
                            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/90">+233</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-md px-4 pb-8 pt-2">
                <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-dark-card" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-slate-700 dark:text-slate-200">{t('loginMobileNumber')}</label>
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
                        <div className="flex items-center justify-between gap-3">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="otp-0">{t('loginOtpCode')}</label>
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{t('loginOtpDigitCount').replace('{count}', String(OTP_LENGTH))}</span>
                        </div>
                        <div className="mt-2.5 flex gap-2">
                            {Array.from({ length: OTP_LENGTH }, (_, index) => (
                                <input
                                    key={index}
                                    ref={(element) => { otpRefs.current[index] = element; }}
                                    id={`otp-${index}`}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                                    maxLength={OTP_LENGTH}
                                    value={code[index] || ''}
                                    onChange={(event) => updateOtp(index, event.target.value)}
                                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                                    className="h-12 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white text-center text-xl font-bold text-slate-800 outline-none transition focus:border-ghana-green focus:ring-2 focus:ring-ghana-green/15 dark:border-slate-600 dark:bg-dark-card dark:text-slate-100"
                                    aria-label={`${t('loginOtpCode')} ${index + 1}`}
                                />
                            ))}
                        </div>
                        <button type="button" onClick={() => void sendCode()} disabled={sendingCode || cooldown > 0} className="mt-3 text-xs font-semibold text-ghana-green hover:text-[#006b3f] disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-500">
                            {sendingCode ? t('loginOtpSending') : cooldown > 0 ? t('loginOtpResendCountdown').replace('{seconds}', String(cooldown)) : t('loginOtpSend')}
                        </button>
                    </div>

                    <div className="mt-6">
                        <label htmlFor="inviteCode" className="block text-sm font-bold text-slate-700 dark:text-slate-200">{t('registerInviteCode')}</label>
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
                            className="mt-2.5 h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none transition focus:border-ghana-green focus:ring-2 focus:ring-ghana-green/15 dark:border-slate-600 dark:bg-dark-card dark:text-slate-100"
                        />
                    </div>

                    <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <input id="login-age-confirm" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-ghana-green" checked={ageAccepted} onChange={(event) => setAgeAccepted(event.target.checked)} />
                        <label htmlFor="login-age-confirm" className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {t('registerAgeConfirmBeforeLink').replace('{age}', String(config.minAge))}{' '}
                            <Link to="/responsible-gaming" className="font-semibold text-ghana-green underline underline-offset-2">{t('ageResponsibleLink')}</Link>
                        </label>
                    </div>

                    <div className="pt-6">
                        {!codeSent ? (
                            <button type="submit" disabled={sendingCode || verifying} className="flex h-12 w-full items-center justify-center rounded-xl bg-ghana-green text-base font-bold text-white shadow-sm shadow-ghana-green/20 transition hover:bg-[#006b3f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55">
                                {sendingCode ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> : null}
                                {sendingCode ? t('loginOtpSending') : t('loginOtpSend')}
                            </button>
                        ) : (
                            <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-ghana-green/10 text-sm font-semibold text-ghana-green">
                                {verifying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                                {verifying ? t('loginOtpVerifying') : ageAccepted ? t('loginOtpAutoVerify') : t('registerAgeRequired')}
                            </div>
                        )}
                        <div className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-ghana-green text-white" aria-label={t('loginPrivacyAutoAccepted')}><Check className="size-3" strokeWidth={3} aria-hidden /></span>
                            <p>{t('loginPrivacyAutoAccepted')}{' '}<Link to="/terms" className="font-semibold text-ghana-green underline underline-offset-2">{t('privacyPolicy')}</Link>{' '}{t('loginPrivacyAnd')}{' '}<Link to="/terms" className="font-semibold text-ghana-green underline underline-offset-2">{t('termsConditions')}</Link>. {t('loginPrivacyLoginAgreement')}</p>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default Login;
