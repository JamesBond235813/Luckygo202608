import { useMemo, useState } from 'react';
import { DatePicker } from 'antd-mobile';
import {
    dateFromIsoYmd,
    formatGhanaDateOnlyFromIso,
    isoYmdFromPickerDate,
} from '../../lib/ghana-datetime';
import { useGhanaDatePickerRenderLabel } from '../../lib/ghana-date-picker-label';
import { useI18n } from '../../lib/useI18n';

type Props = {
    label: string;
    value?: string;
    onChange: (isoYmd: string) => void;
    min?: Date;
    max?: Date;
};

/** 开始/结束日期：antd-mobile DatePicker，展示 DD/MM/YYYY，滚轮随语言切换 */
export function GhanaDatePickerField({ label, value, onChange, min, max = new Date() }: Props) {
    const { t, language } = useI18n();
    const [visible, setVisible] = useState(false);
    const renderLabel = useGhanaDatePickerRenderLabel(language);

    const pickerValue = useMemo((): Date | null => {
        if (!value) return null;
        return dateFromIsoYmd(value);
    }, [value]);

    const display = value ? formatGhanaDateOnlyFromIso(value) : '';

    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold text-gray-500 dark:text-slate-400">{label}</span>
            <button
                type="button"
                onClick={() => setVisible(true)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm transition-colors hover:border-ghana-green dark:border-slate-700 dark:bg-slate-900"
            >
                <span
                    className={
                        display
                            ? 'font-semibold tabular-nums text-gray-900 dark:text-slate-100'
                            : 'text-gray-400 dark:text-slate-500'
                    }
                >
                    {display || '—'}
                </span>
                <span className="material-symbols-outlined text-xl text-gray-400">calendar_month</span>
            </button>
            <DatePicker
                visible={visible}
                title={label}
                precision="day"
                value={pickerValue}
                min={min}
                max={max}
                renderLabel={renderLabel}
                confirmText={t('commonApply')}
                cancelText={t('commonCancel')}
                onClose={() => setVisible(false)}
                onCancel={() => setVisible(false)}
                onConfirm={(picked) => {
                    onChange(isoYmdFromPickerDate(picked));
                    setVisible(false);
                }}
            />
        </label>
    );
}
