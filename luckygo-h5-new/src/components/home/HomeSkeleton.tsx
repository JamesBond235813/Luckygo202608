const pulse = 'animate-pulse bg-gray-200 dark:bg-slate-700';

export function HomeHotPicksSkeleton() {
    return (
        <>
            {[0, 1].map((key) => (
                <div
                    key={key}
                    className="flex min-w-[272px] max-w-[272px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
                    aria-hidden
                >
                    <div className={`h-44 w-full ${pulse}`} />
                    <div className="space-y-2 p-2.5">
                        <div className={`h-9 w-full rounded ${pulse}`} />
                        <div className={`h-5 w-1/3 rounded ${pulse}`} />
                        <div className={`rounded-xl h-12 ${pulse}`} />
                        <div className={`h-10 w-full rounded-xl ${pulse}`} />
                    </div>
                </div>
            ))}
        </>
    );
}

export function HomeTrendingSkeleton({ showProgressBar = false }: { showProgressBar?: boolean }) {
    return (
        <>
            {Array.from({ length: 4 }, (_, i) => (
                <div
                    key={i}
                    className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]"
                    aria-hidden
                >
                    <div className={`aspect-square w-full shrink-0 ${pulse}`} />
                    <div className="flex flex-1 flex-col space-y-2 p-2.5">
                        <div className={`h-8 w-full rounded ${pulse}`} />
                        <div className={`h-4 w-2/3 rounded ${pulse}`} />
                        {showProgressBar ? <div className={`h-1 w-full rounded-full ${pulse}`} /> : null}
                        <div className="min-h-1 flex-1" />
                        <div className={`h-8 w-full rounded-lg ${pulse}`} />
                    </div>
                </div>
            ))}
        </>
    );
}
