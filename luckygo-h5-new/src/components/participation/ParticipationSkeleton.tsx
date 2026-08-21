const pulse = 'animate-pulse bg-gray-200 dark:bg-slate-700';

function ParticipationCardSkeleton() {
    return (
        <div
            className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-dark-card"
            aria-hidden
        >
            <div className="flex gap-4">
                <div className={`h-24 w-24 shrink-0 rounded-xl ${pulse}`} />
                <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                    <div className="space-y-2">
                        <div className={`h-4 w-full rounded ${pulse}`} />
                        <div className={`h-4 w-[85%] rounded ${pulse}`} />
                        <div className={`h-5 w-16 rounded-full ${pulse}`} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-y-1">
                        <div className={`h-2.5 w-14 rounded ${pulse}`} />
                        <div className={`h-2.5 w-16 justify-self-end rounded ${pulse}`} />
                        <div className={`h-4 w-20 rounded ${pulse}`} />
                        <div className={`h-4 w-24 justify-self-end rounded ${pulse}`} />
                    </div>
                </div>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-gray-50 pt-3 dark:border-slate-800">
                <div className={`h-3 w-28 rounded ${pulse}`} />
                <div className={`h-8 w-24 rounded-lg ${pulse}`} />
            </div>
        </div>
    );
}

export function ParticipationListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <ParticipationCardSkeleton key={i} />
            ))}
        </>
    );
}
