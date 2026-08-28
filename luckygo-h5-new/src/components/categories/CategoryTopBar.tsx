import { Popover } from 'antd-mobile';
import { useMemo, useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import { APP_PAGE_NAV_DEFAULT_HEIGHT } from '../AppPageNav';
import { pickCategoryName } from '../../lib/category-display';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/useI18n';
import type { ProductCategory } from '../../types';

const MAX_INLINE = 4;

function buildInlineCategories(categories: ProductCategory[], selectedId: number | null): ProductCategory[] {
    if (categories.length <= MAX_INLINE) return categories;
    const head = categories.slice(0, MAX_INLINE);
    if (selectedId == null || head.some((c) => c.id === selectedId)) return head;
    const selected = categories.find((c) => c.id === selectedId);
    if (!selected) return head;
    return [...categories.slice(0, MAX_INLINE - 1), selected];
}

type TabButtonProps = {
    label: string;
    active: boolean;
    onClick: () => void;
};

function TabButton({ label, active, onClick }: TabButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'min-h-[30px] min-w-0 rounded-md px-1.5 py-1 text-center text-[11px] font-bold leading-tight transition-all duration-200',
                active
                    ? 'bg-white text-ghana-green shadow-sm dark:bg-slate-700 dark:text-primary'
                    : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200',
            )}
        >
            <span className="block truncate">{label}</span>
        </button>
    );
}

type CategoryTopBarProps = {
    categories: ProductCategory[];
    selectedId: number | null;
    onSelect: (id: number) => void;
};

export function CategoryTopBar({ categories, selectedId, onSelect }: CategoryTopBarProps) {
    const { t, language } = useI18n();
    const [moreOpen, setMoreOpen] = useState(false);

    const inlineCategories = useMemo(
        () => buildInlineCategories(categories, selectedId),
        [categories, selectedId],
    );

    const moreCategories = useMemo(() => {
        const inlineIds = new Set(inlineCategories.map((c) => c.id));
        return categories.filter((c) => !inlineIds.has(c.id));
    }, [categories, inlineCategories]);

    const showMore = moreCategories.length > 0;
    const moreActive =
        moreOpen || (selectedId != null && moreCategories.some((c) => c.id === selectedId));

    const gridColumns = showMore
        ? `repeat(${inlineCategories.length}, minmax(0, 1fr)) minmax(2rem, 0.5fr)`
        : `repeat(${inlineCategories.length}, minmax(0, 1fr))`;

    const pickCategory = (id: number) => {
        onSelect(id);
        setMoreOpen(false);
    };

    const moreMenu = (
        <div
            className="max-h-56 min-w-[9rem] overflow-y-auto overscroll-contain py-1"
            role="listbox"
            aria-label={t('categoriesMore')}
        >
            {moreCategories.map((category) => {
                const active = category.id === selectedId;
                const label = pickCategoryName(category, language);
                return (
                    <button
                        key={category.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => pickCategory(category.id)}
                        className={cn(
                            'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors active:bg-gray-100 dark:active:bg-slate-700',
                            active ? 'font-bold text-ghana-green dark:text-primary' : 'text-gray-800 dark:text-slate-200',
                        )}
                    >
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {active ? (
                            <Check size={17} strokeWidth={2.5} className="shrink-0 text-ghana-green dark:text-primary" aria-hidden="true" />
                        ) : null}
                    </button>
                );
            })}
        </div>
    );

    const moreTrigger = (
        <button
            type="button"
            aria-label={t('categoriesMore')}
            aria-expanded={moreOpen}
            className={cn(
                'relative flex min-h-[30px] w-full min-w-0 items-center justify-center rounded-md py-1 transition-all duration-200',
                moreActive
                    ? 'bg-white text-ghana-green shadow-sm dark:bg-slate-700 dark:text-primary'
                    : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200',
            )}
        >
            <MoreHorizontal size={19} strokeWidth={2.4} aria-hidden="true" />
        </button>
    );

    return (
        <div
            className="sticky z-20 shrink-0 border-b border-gray-100 bg-white px-2 py-1 shadow-sm dark:border-slate-800 dark:bg-dark-card dark:shadow-none"
            style={{ top: APP_PAGE_NAV_DEFAULT_HEIGHT }}
        >
            <div
                className="grid gap-0.5 rounded-lg bg-gray-200/60 p-0.5 dark:bg-slate-800/60"
                style={{ gridTemplateColumns: gridColumns }}
                role="tablist"
            >
                {inlineCategories.map((category) => (
                    <TabButton
                        key={category.id}
                        label={pickCategoryName(category, language)}
                        active={category.id === selectedId}
                        onClick={() => {
                            setMoreOpen(false);
                            onSelect(category.id);
                        }}
                    />
                ))}
                {showMore ? (
                    <Popover
                        visible={moreOpen}
                        onVisibleChange={setMoreOpen}
                        trigger="click"
                        placement="bottom-end"
                        getContainer={() => document.body}
                        destroyOnHide
                        content={moreMenu}
                    >
                        {moreTrigger}
                    </Popover>
                ) : null}
            </div>
        </div>
    );
}

export function CategoryTopBarSkeleton() {
    return (
        <div
            className="sticky z-20 shrink-0 border-b border-gray-100 bg-white px-2 py-1 dark:border-slate-800 dark:bg-dark-card"
            style={{ top: APP_PAGE_NAV_DEFAULT_HEIGHT }}
        >
            <div className="grid grid-cols-4 gap-0.5 rounded-lg bg-gray-200/60 p-0.5 dark:bg-slate-800/60">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-[30px] animate-pulse rounded-md bg-gray-300/50 dark:bg-slate-700" />
                ))}
            </div>
        </div>
    );
}
