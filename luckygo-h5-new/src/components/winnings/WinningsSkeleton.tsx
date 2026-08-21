const pulse = 'animate-pulse bg-gray-200 dark:bg-slate-700';

function WinningsCardSkeleton() {
    return (
        <div
            className="relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-dark-card"
            aria-hidden
        >
            <div className={`absolute right-0 top-0 h-7 w-16 rounded-bl-2xl ${pulse}`} />
            <div className="flex gap-4">
                <div className={`h-24 w-24 shrink-0 rounded-xl ${pulse}`} />
                <div className="min-w-0 flex-1 space-y-2 pr-16 pt-0.5">
                    <div className={`h-5 w-full rounded ${pulse}`} />
                    <div className={`h-5 w-[75%] rounded ${pulse}`} />
                    <div className={`h-3 w-20 rounded ${pulse}`} />
                    <div className="flex items-center gap-2 pt-1">
                        <div className={`h-3 w-14 rounded ${pulse}`} />
                        <div className={`h-6 w-24 rounded ${pulse}`} />
                    </div>
                </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-800">
                <div className={`h-3 w-32 rounded ${pulse}`} />
                <div className={`h-10 w-28 rounded-lg ${pulse}`} />
            </div>
        </div>
    );
}

export function WinningsListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <WinningsCardSkeleton key={i} />
            ))}
        </>
    );
}
