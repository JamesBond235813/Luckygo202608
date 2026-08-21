import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeGameplayRulesModal } from './HomeGameplayRulesModal';
import type { HomeBannerSlideRemote } from '../../types/home-banner';

const HERO_GRADIENT = 'bg-gradient-to-r from-ghana-green via-[#00875a] to-[#006b3f]';
const AUTOPLAY_MS = 5000;

/** 轮播固定高度 200px；整图 Banner 比例 9:5（如 360×200、720×400） */
export const HOME_CAROUSEL_HEIGHT_PX = 200;
export const HOME_CAROUSEL_ASPECT_RATIO = '9 / 5';
const SLIDE_HEIGHT = 'h-[200px]';

/** 默认整图 Banner（英文文案/按钮已 baked in；后台可替换 imageUrl） */
const WIN_BIG_BANNER_SRC = '/banners/win-big-banner-en.png';
const INVITE_BANNER_SRC = '/banners/invite-rewards-banner-en.png';

type HomeHeroCarouselProps = {
    /** 后台动态轮播；暂无接口时传空数组，仅展示前 2 屏 */
    dynamicBanners?: HomeBannerSlideRemote[];
};

const FullImageBannerSlide = ({
    imageUrl,
    linkTo,
    onAction,
    onNavigate,
}: {
    imageUrl: string;
    linkTo?: string;
    onAction?: () => void;
    onNavigate: (to: string) => void;
}) => {
    const img = (
        <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="h-full w-full object-cover object-center"
        />
    );

    if (onAction) {
        return (
            <button
                type="button"
                onClick={onAction}
                className={`relative block h-full w-full overflow-hidden rounded-2xl text-left ${SLIDE_HEIGHT}`}
            >
                {img}
            </button>
        );
    }

    if (linkTo) {
        return (
            <button
                type="button"
                onClick={() => onNavigate(linkTo)}
                className={`relative block h-full w-full overflow-hidden rounded-2xl text-left ${SLIDE_HEIGHT}`}
            >
                {img}
            </button>
        );
    }

    return <div className={`relative overflow-hidden rounded-2xl ${SLIDE_HEIGHT}`}>{img}</div>;
};

const RemoteBannerSlide = ({ banner, onNavigate }: { banner: HomeBannerSlideRemote; onNavigate: (to: string) => void }) => {
    const handleAction = () => {
        if (banner.linkTo) onNavigate(banner.linkTo);
    };

    if (banner.imageUrl) {
        const hasOverlayCopy = Boolean(banner.title || banner.subtitle || banner.actionLabel);
        if (!hasOverlayCopy) {
            return <FullImageBannerSlide imageUrl={banner.imageUrl} linkTo={banner.linkTo} onNavigate={onNavigate} />;
        }

        return (
            <button
                type="button"
                onClick={handleAction}
                disabled={!banner.linkTo}
                className={`relative block w-full overflow-hidden rounded-2xl text-left disabled:cursor-default ${SLIDE_HEIGHT}`}
            >
                <img src={banner.imageUrl} alt="" className={`absolute inset-0 w-full ${SLIDE_HEIGHT} object-cover`} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-8 text-white">
                    {banner.title ? <p className="text-lg font-black leading-tight">{banner.title}</p> : null}
                    {banner.subtitle ? <p className="mt-1 text-xs opacity-90">{banner.subtitle}</p> : null}
                    {banner.actionLabel && banner.linkTo ? (
                        <span className="mt-2 inline-block rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-ghana-green">
                            {banner.actionLabel}
                        </span>
                    ) : null}
                </div>
            </button>
        );
    }

    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-xl ${HERO_GRADIENT} ${SLIDE_HEIGHT}`}>
            <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
            <div className="relative z-10 flex h-full flex-col justify-center">
                {banner.title ? <h2 className="text-xl font-black leading-tight">{banner.title}</h2> : null}
                {banner.subtitle ? <p className="mt-1 text-sm opacity-90">{banner.subtitle}</p> : null}
                {banner.actionLabel && banner.linkTo ? (
                    <button
                        type="button"
                        onClick={handleAction}
                        className="mt-3 w-fit rounded-lg bg-yellow-400 px-4 py-2 text-xs font-bold text-ghana-green shadow-lg active:scale-95"
                    >
                        {banner.actionLabel}
                    </button>
                ) : null}
            </div>
        </div>
    );
};

export const HomeHeroCarousel = ({ dynamicBanners = [] }: HomeHeroCarouselProps) => {
    const navigate = useNavigate();
    const trackRef = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [gameplayRulesOpen, setGameplayRulesOpen] = useState(false);

    const handleRemoteLink = useCallback(
        (linkTo: string) => {
            if (/^https?:\/\//i.test(linkTo)) {
                window.location.href = linkTo;
                return;
            }
            navigate(linkTo.startsWith('/') ? linkTo : `/${linkTo}`);
        },
        [navigate],
    );

    const remoteSlides = useMemo(
        () => dynamicBanners.filter((b) => b.imageUrl || b.title || b.subtitle),
        [dynamicBanners],
    );

    const slideCount = 2 + remoteSlides.length;

    const scrollToIndex = useCallback(
        (index: number) => {
            const track = trackRef.current;
            if (!track || slideCount <= 0) return;
            const width = track.clientWidth;
            track.scrollTo({ left: index * width, behavior: 'smooth' });
            setActiveIndex(index);
        },
        [slideCount],
    );

    const syncIndexFromScroll = useCallback(() => {
        const track = trackRef.current;
        if (!track || slideCount <= 0) return;
        const width = track.clientWidth;
        if (width <= 0) return;
        const index = Math.round(track.scrollLeft / width);
        setActiveIndex(Math.min(Math.max(index, 0), slideCount - 1));
    }, [slideCount]);

    useEffect(() => {
        if (slideCount <= 1) return;
        const timer = window.setInterval(() => {
            scrollToIndex((activeIndex + 1) % slideCount);
        }, AUTOPLAY_MS);
        return () => window.clearInterval(timer);
    }, [activeIndex, scrollToIndex, slideCount]);

    return (
        <>
            <div className={`relative overflow-hidden rounded-2xl shadow-xl ${SLIDE_HEIGHT}`}>
                <div
                    ref={trackRef}
                    className={`flex snap-x snap-mandatory overflow-x-auto no-scrollbar ${SLIDE_HEIGHT}`}
                    onScroll={syncIndexFromScroll}
                    aria-roledescription="carousel"
                >
                    <div className={`w-full shrink-0 snap-center snap-always ${SLIDE_HEIGHT}`}>
                        <FullImageBannerSlide
                            imageUrl={WIN_BIG_BANNER_SRC}
                            onAction={() => setGameplayRulesOpen(true)}
                            onNavigate={handleRemoteLink}
                        />
                    </div>

                <div className={`w-full shrink-0 snap-center snap-always ${SLIDE_HEIGHT}`}>
                    <FullImageBannerSlide
                        imageUrl={INVITE_BANNER_SRC}
                        linkTo="/invite"
                        onNavigate={handleRemoteLink}
                    />
                </div>

                {remoteSlides.map((banner) => (
                    <div key={banner.id} className={`w-full shrink-0 snap-center snap-always ${SLIDE_HEIGHT}`}>
                        <RemoteBannerSlide banner={banner} onNavigate={handleRemoteLink} />
                    </div>
                ))}
            </div>

            {slideCount > 1 ? (
                <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
                    {Array.from({ length: slideCount }, (_, i) => (
                        <button
                            key={i}
                            type="button"
                            aria-label={`Slide ${i + 1}`}
                            onClick={() => scrollToIndex(i)}
                            className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                                i === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/45'
                            }`}
                        />
                    ))}
                </div>
            ) : null}
            </div>

            <HomeGameplayRulesModal open={gameplayRulesOpen} onClose={() => setGameplayRulesOpen(false)} />
        </>
    );
};
