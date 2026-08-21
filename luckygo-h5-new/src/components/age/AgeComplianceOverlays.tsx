import { useAgeCompliance } from '../../context/AgeComplianceContext';
import { useI18n } from '../../lib/useI18n';

export function AgeComplianceOverlays() {
    const { t } = useI18n();
    const {
        config,
        configReady,
        isMinor,
        showGate,
        showSpendConfirm,
        spendConfirmText,
        confirmAdult,
        declineMinor,
        closeSpendConfirm,
        confirmSpend,
    } = useAgeCompliance();

    if (!configReady) return null;

    if (isMinor) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-100 p-6 dark:bg-dark-surface">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl dark:bg-dark-card">
                    <span className="material-symbols-outlined mb-3 text-5xl text-amber-500">block</span>
                    <h2 className="mb-2 text-lg font-black text-gray-900 dark:text-slate-100">{config.minorTitle}</h2>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-400">{config.minorBody}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {showGate ? (
                <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/55 p-4">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card">
                        <div className="mb-3 flex items-center gap-2 text-amber-600">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                            <h2 className="text-lg font-black text-gray-900 dark:text-slate-100">{config.gateTitle}</h2>
                        </div>
                        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                            {config.gateBody}
                        </p>
                        <p className="mb-5 text-xs text-gray-500 dark:text-slate-500">
                            {t('ageGateMinAge').replace('{age}', String(config.minAge))}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => void confirmAdult()}
                                className="w-full rounded-xl bg-ghana-green py-3 text-sm font-black text-white"
                            >
                                {t('ageGateConfirmAdult').replace('{age}', String(config.minAge))}
                            </button>
                            <button
                                type="button"
                                onClick={declineMinor}
                                className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 dark:border-slate-700 dark:text-slate-300"
                            >
                                {t('ageGateDeclineMinor').replace('{age}', String(config.minAge))}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {showSpendConfirm ? (
                <div className="fixed inset-0 z-[195] flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card">
                        <h3 className="mb-2 text-base font-black text-gray-900 dark:text-slate-100">
                            {t('ageSpendConfirmTitle')}
                        </h3>
                        <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-slate-400">
                            {spendConfirmText}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={closeSpendConfirm}
                                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 dark:border-slate-700"
                            >
                                {t('commonCancel')}
                            </button>
                            <button
                                type="button"
                                onClick={confirmSpend}
                                className="flex-[2] rounded-xl bg-ghana-yellow py-2.5 text-sm font-black text-gray-900 active:scale-[0.98] disabled:opacity-70"
                            >
                                {t('commonConfirm')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
