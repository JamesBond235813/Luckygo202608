import React, { useMemo } from 'react';
import { CURRENCY_SYMBOL } from '../lib/localization';
import { showSimpleToast } from '../lib/simpleToast';

const highlightNumClass =
    'mx-0.5 inline rounded bg-primary/25 px-1 font-black text-ghana-green underline-offset-2 active:opacity-80';

type InviteBeansRichTextProps = {
    text: string;
    hint: string;
    className?: string;
    /** 需要高亮的纯数字（来自后台配置） */
    highlightNumbers?: number[];
};

function buildTokenPattern(highlightNumbers: number[]): RegExp {
    const nums = [...new Set(highlightNumbers.filter((n) => Number.isFinite(n) && n > 0))]
        .map((n) => Math.round(n))
        .sort((a, b) => b - a);
    const numPart = nums.length > 0 ? nums.map((n) => String(n)).join('|') : '\\d+';
    return new RegExp(`(\\d+(?:\\.\\d+)?${CURRENCY_SYMBOL}|${numPart}|金豆|beans)`, 'gi');
}

/** 高亮金豆、₵金额与配置中的数字；点击数字/金豆提示兑换说明 */
export const InviteBeansRichText: React.FC<InviteBeansRichTextProps> = ({
    text,
    hint,
    className,
    highlightNumbers = [],
}) => {
    const tokenRe = useMemo(() => buildTokenPattern(highlightNumbers), [highlightNumbers]);

    const showHint = (event: React.MouseEvent) => {
        event.stopPropagation();
        showSimpleToast(hint);
    };

    const parts = text.split(tokenRe).filter((part) => part.length > 0);
    const highlightSet = useMemo(
        () => new Set(highlightNumbers.map((n) => String(Math.round(n)))),
        [highlightNumbers],
    );

    return (
        <span className={className}>
            {parts.map((part, index) => {
                const lower = part.toLowerCase();
                if (part.endsWith(CURRENCY_SYMBOL) && part.length > CURRENCY_SYMBOL.length) {
                    return (
                        <button
                            key={`${index}-cedi`}
                            type="button"
                            onClick={showHint}
                            className={highlightNumClass}
                        >
                            {part}
                        </button>
                    );
                }
                if (highlightSet.has(part)) {
                    return (
                        <button
                            key={`${index}-${part}`}
                            type="button"
                            onClick={showHint}
                            className={highlightNumClass}
                        >
                            {part}
                        </button>
                    );
                }
                if (part === '金豆' || lower === 'beans') {
                    return (
                        <button
                            key={`${index}-beans`}
                            type="button"
                            onClick={showHint}
                            className="inline font-semibold text-ghana-green underline decoration-ghana-green decoration-2 underline-offset-2 active:opacity-80"
                        >
                            {part}
                        </button>
                    );
                }
                return <React.Fragment key={`${index}-t`}>{part}</React.Fragment>;
            })}
        </span>
    );
};
