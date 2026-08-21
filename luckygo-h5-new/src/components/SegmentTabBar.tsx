type SegmentTab<T extends string> = {
    key: T;
    label: string;
};

type SegmentTabBarProps<T extends string> = {
    tabs: readonly SegmentTab<T>[];
    value: T;
    onChange: (key: T) => void;
    className?: string;
};

/** 与交易记录页一致的胶囊分段 Tab（灰底 + 白底选中项） */
export function SegmentTabBar<T extends string>({
    tabs,
    value,
    onChange,
    className = 'mb-4',
}: SegmentTabBarProps<T>) {
    return (
        <div
            className={`grid gap-1 rounded-xl bg-gray-200/50 p-1 transition-colors dark:bg-slate-800/50 ${className}`}
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            role="tablist"
        >
            {tabs.map((tab) => {
                const active = value === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.key)}
                        className={`rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 ${
                            active
                                ? 'bg-white text-ghana-green shadow-sm dark:bg-slate-700 dark:text-primary'
                                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
