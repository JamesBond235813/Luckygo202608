import React, { useState, useRef, type ReactNode } from 'react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: ReactNode;
    className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className = "" }) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const threshold = 70; // Distance required to trigger refresh

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current && containerRef.current.scrollTop === 0 && !isRefreshing) {
            startY.current = e.touches[0].pageY;
        } else {
            startY.current = 0;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (startY.current === 0 || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY.current;

        if (diff > 0) {
            // Add resistance to the pull
            const dampenedDiff = Math.pow(diff, 0.85);
            setPullDistance(dampenedDiff);

            // Prevent scrolling while pulling
            if (diff > 10 && e.cancelable) {
                // e.preventDefault(); // Commented out to avoid passive listener issues in React 18+ for now
            }
        }
    };

    const handleTouchEnd = async () => {
        if (startY.current === 0 || isRefreshing) return;

        if (pullDistance >= threshold) {
            setIsRefreshing(true);
            setPullDistance(threshold);
            await onRefresh();
            setIsRefreshing(false);
        }

        setPullDistance(0);
        startY.current = 0;
    };

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative overflow-y-auto no-scrollbar flex-1 ${className}`}
            style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
        >
            {/* Pull Indicator Area */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200 pointer-events-none"
                style={{
                    height: `${threshold}px`,
                    transform: `translateY(${pullDistance - threshold}px)`,
                    opacity: pullDistance / threshold
                }}
            >
                <div className={`p-2 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-gray-100 dark:border-slate-700 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}>
                    <span
                        className="material-symbols-outlined text-ghana-green block"
                        style={{ transform: `rotate(${pullDistance * 3}deg)` }}
                    >
                        refresh
                    </span>
                </div>
            </div>

            {/* Content area that moves down when pulling */}
            <div
                className="transition-transform duration-200"
                style={{ transform: `translateY(${isRefreshing ? threshold : pullDistance}px)` }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
