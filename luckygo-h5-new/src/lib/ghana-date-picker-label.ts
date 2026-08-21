import { useCallback } from 'react';
import type { RenderLabel } from 'antd-mobile/es/components/date-picker-view/date-picker-view';
import type { LocalLanguageCode } from './localization';

function formatMonthLabel(month: number, language: LocalLanguageCode): string {
    if (language === 'zh') return `${month}月`;
    return new Intl.DateTimeFormat('en-GB', {
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(2024, month - 1, 1)));
}

/** 滚轮标签：中文 年/月/日，英文月份缩写 + 数字日/年 */
export function useGhanaDatePickerRenderLabel(language: LocalLanguageCode): RenderLabel {
    return useCallback(
        (type, data) => {
            if (type === 'year') {
                return language === 'zh' ? `${data}年` : String(data);
            }
            if (type === 'month') {
                return formatMonthLabel(data, language);
            }
            if (type === 'day') {
                return language === 'zh' ? `${data}日` : String(data).padStart(2, '0');
            }
            return String(data);
        },
        [language],
    );
}
