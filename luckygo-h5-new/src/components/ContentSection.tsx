import type React from 'react';

type ContentSectionProps = {
    icon: string;
    title: string;
    intro?: string;
    children?: React.ReactNode;
    tone?: 'amber' | 'default';
};

export function ContentSection({ icon, title, intro, children, tone = 'default' }: ContentSectionProps) {
    const isAmber = tone === 'amber';
    return (
        <section
            className={
                isAmber
                    ? 'rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/30'
                    : 'rounded-2xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-dark-card'
            }
        >
            <div
                className={`mb-2 flex items-center gap-2 ${isAmber ? 'text-amber-700 dark:text-amber-400' : 'text-gray-800 dark:text-slate-200'}`}
            >
                <span className="material-symbols-outlined">{icon}</span>
                <h2 className="text-sm font-black">{title}</h2>
            </div>
            {intro ? (
                <p
                    className={`mb-3 text-sm leading-relaxed ${isAmber ? 'text-amber-900/90 dark:text-amber-100/90' : 'text-gray-600 dark:text-slate-400'}`}
                >
                    {intro}
                </p>
            ) : null}
            {children}
        </section>
    );
}

type BulletListProps = {
    items: string[];
    tone?: 'amber' | 'default';
};

export function ContentBulletList({ items, tone = 'default' }: BulletListProps) {
    const isAmber = tone === 'amber';
    return (
        <ul
            className={`space-y-2 text-sm ${isAmber ? 'text-amber-900/90 dark:text-amber-100/90' : 'text-gray-700 dark:text-slate-300'}`}
        >
            {items.map((item) => (
                <li key={item} className="flex gap-2">
                    <span
                        className={`material-symbols-outlined shrink-0 text-base ${isAmber ? 'text-amber-600 dark:text-amber-400' : 'text-ghana-green'}`}
                    >
                        {isAmber ? 'info' : 'check_circle'}
                    </span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

type FaqListProps = {
    items: Array<{ question: string; answer: string }>;
};

export function ContentFaqList({ items }: FaqListProps) {
    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div key={item.question} className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.question}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-slate-400">{item.answer}</p>
                </div>
            ))}
        </div>
    );
}
