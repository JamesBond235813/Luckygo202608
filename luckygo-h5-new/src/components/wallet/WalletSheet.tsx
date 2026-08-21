import React from 'react';

export const WalletSheet = ({
    title,
    children,
    onClose,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}) => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 pb-24">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-card">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">{title}</h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="size-9 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>
            </div>
            {children}
        </div>
    </div>
);

export const WalletInfoRow = ({
    label,
    value,
    valueClassName,
}: {
    label: string;
    value: React.ReactNode;
    valueClassName?: string;
}) => (
    <div className="flex justify-between gap-4 rounded-xl bg-gray-50 p-3 dark:bg-slate-800/50">
        <span className="text-gray-500 dark:text-slate-400">{label}</span>
        <strong
            className={`break-all text-right font-semibold ${valueClassName ?? 'text-gray-900 dark:text-slate-100'}`}
        >
            {value}
        </strong>
    </div>
);
