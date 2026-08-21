const pulse = 'animate-pulse bg-gray-200 dark:bg-slate-700';

export function HistoryListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    className="rounded-2xl border border-white bg-white shadow-sm dark:border-slate-800 dark:bg-dark-card"
                    aria-hidden
                >
                    <div className="flex gap-4 p-4">
                        <div className={`h-20 w-20 shrink-0 rounded-xl ${pulse}`} />
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                            <div className="space-y-2">
                                <div className="flex justify-between gap-2">
                                    <div className={`h-4 w-2/3 rounded ${pulse}`} />
                                    <div className={`h-4 w-12 shrink-0 rounded ${pulse}`} />
                                </div>
                                <div className={`h-3 w-1/2 rounded ${pulse}`} />
                            </div>
                            <div className="mt-3 flex items-end justify-between">
                                <div className="space-y-1.5">
                                    <div className={`h-2.5 w-14 rounded ${pulse}`} />
                                    <div className={`h-6 w-24 rounded ${pulse}`} />
                                </div>
                                <div className={`size-7 rounded-full ${pulse}`} />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </>
    );
}

export function HistoryToolbarSkeleton() {
    return (
        <div className="flex items-center justify-between px-1" aria-hidden>
            <div className={`h-3 w-28 rounded ${pulse}`} />
            <div className={`h-6 w-16 rounded-full ${pulse}`} />
        </div>
    );
}
