import type { Product } from '../../types';
import { formatCurrencyPlain, formatProductNumber, tf, tfProduct } from '../../lib/localization';
import { resolveAssetUrl } from '../../lib/asset-url';
import { DrawCountdownBanner } from '../DrawCountdownBanner';

function fundProgress(product: Product) {
    const total = Math.max(product.totalShares, 1);
    const pct = Math.round((product.sharesSold / total) * 100);
    const left = Math.max(product.totalShares - product.sharesSold, 0);
    return { pct, left };
}

/** 文案里用 {n} 占位，数字单独玫红高亮（不加千分位） */
function RemainingTimesLabel({ count, t }: { count: number; t: (key: string) => string }) {
    const template = t('homeRemainingTimes');
    const parts = template.split('{n}');
    if (parts.length !== 2) {
        return <p className="text-[11px] font-semibold text-gray-500">{template.replace('{n}', String(count))}</p>;
    }
    return (
        <p className="text-[11px] font-semibold text-gray-500">
            {parts[0]}
            <span className="font-black tabular-nums text-rose-600">{formatProductNumber(count)}</span>
            {parts[1]}
        </p>
    );
}

function ProgressBar({ pct, className = '' }: { pct: number; className?: string }) {
    return (
        <div className={`h-1 overflow-hidden rounded-full bg-gray-100 ${className}`}>
            <div
                className="h-full rounded-full bg-gradient-to-r from-ghana-green to-emerald-400 transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            />
        </div>
    );
}

type CardBaseProps = {
    product: Product;
    t: (key: string) => string;
    onOpen: () => void;
    onAction: (e: React.MouseEvent) => void;
    actionLabel: string;
    onCountdownExpire?: () => void;
};

/** 胶囊分栏：左金额（完整显示）/ 右参加 */
function ProductJoinCta({
    actionLabel,
    drawPending,
    waitingLabel,
    onAction,
}: {
    actionLabel: string;
    drawPending: boolean;
    waitingLabel: string;
    onAction: (e: React.MouseEvent) => void;
}) {
    if (drawPending) {
        return (
            <button
                type="button"
                disabled
                className="flex h-8 w-full items-center justify-center rounded-lg bg-gray-200 px-3 text-[10px] font-bold text-gray-500"
            >
                {waitingLabel}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onAction}
            className="flex h-8 w-full items-center justify-center gap-0.5 overflow-hidden rounded-lg bg-[#00875a] px-2 text-xs font-bold leading-none text-white ring-1 ring-black/[0.04] transition-transform active:scale-[0.98]"
        >
            <span className="truncate">{actionLabel}</span>
            <span className="material-symbols-outlined shrink-0 text-sm leading-none opacity-90">chevron_right</span>
        </button>
    );
}

export function HomeHotPickCard({ product, t, onOpen, onAction, actionLabel }: CardBaseProps) {
    const { pct, left } = fundProgress(product);

    return (
        <article
            role="presentation"
            onClick={onOpen}
            className="group flex min-w-[272px] max-w-[272px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] cursor-pointer transition-transform active:scale-[0.98]"
        >
            <div className="relative h-44 overflow-hidden bg-gray-100">
                <img
                    src={resolveAssetUrl(product.image)}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-active:scale-105"
                />
                {product.tag ? (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-ghana-red px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                        {product.tag}
                    </span>
                ) : null}
            </div>

            <div className="flex flex-1 flex-col p-2.5">
                <h4 className="truncate text-[13px] font-bold leading-snug text-gray-900">
                    {product.title}
                </h4>

                <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-lg font-black text-ghana-red">{formatCurrencyPlain(product.pricePerShare)}</span>
                    <span className="text-[10px] font-medium text-gray-400">{t('commonPerShare')}</span>
                </div>

                <div className="mt-2 rounded-xl bg-gray-50 px-2.5 py-2">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]">
                        <span className="font-bold text-ghana-green">{tf(t, 'commonFunded', { pct: String(pct) })}</span>
                        <span className="text-gray-500">{tfProduct(t, 'commonLeft', { n: left })}</span>
                    </div>
                    <ProgressBar pct={pct} />
                </div>

                <button
                    type="button"
                    onClick={onAction}
                    className="mt-2.5 w-full rounded-xl bg-[#00875a] py-2.5 text-xs font-bold text-white shadow-md shadow-ghana-green/25 active:opacity-90"
                >
                    {actionLabel}
                </button>
            </div>
        </article>
    );
}

export function HomeTrendingCard({
    product,
    t,
    onOpen,
    onAction,
    actionLabel,
    onCountdownExpire,
    showProgressBar = false,
    compact = false,
}: CardBaseProps & { showProgressBar?: boolean; compact?: boolean }) {
    const { pct, left } = fundProgress(product);
    const drawPending = Boolean(product.drawPending);

    return (
        <article
            role="presentation"
            onClick={onOpen}
            className={`group w-full min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04] cursor-pointer transition-transform active:scale-[0.98] ${
                compact ? 'flex h-[142px] flex-row' : 'flex h-full flex-col'
            }`}
        >
            <div className={`relative shrink-0 overflow-hidden bg-gray-100 ${compact ? 'h-full w-[124px]' : 'aspect-square w-full'}`}>
                <img
                    src={resolveAssetUrl(product.image)}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-active:scale-105"
                />
                {product.tag && !drawPending ? (
                    <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                        {product.tag}
                    </span>
                ) : null}
            </div>

            <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${compact ? 'p-3' : 'p-2.5'}`}>
                <h4 className={`${compact ? 'line-clamp-2' : 'truncate'} text-[13px] font-bold leading-tight text-gray-900`}>
                    {product.title}
                </h4>

                <div className="mt-1.5 min-h-[1.25rem]">
                    {drawPending ? (
                        <DrawCountdownBanner
                            remainingSeconds={product.drawCountdownRemaining ?? 0}
                            enabled
                            compact
                            onExpire={onCountdownExpire}
                        />
                    ) : (
                        <RemainingTimesLabel count={left} t={t} />
                    )}
                </div>

                {showProgressBar && !drawPending ? (
                    <div className="mt-1.5">
                        <ProgressBar pct={pct} />
                    </div>
                ) : null}

                <div className="mt-auto pt-2">
                    <ProductJoinCta
                        actionLabel={actionLabel}
                        drawPending={drawPending}
                        waitingLabel={t('productSoldOutWaiting')}
                        onAction={onAction}
                    />
                </div>
            </div>
        </article>
    );
}
