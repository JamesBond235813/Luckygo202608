import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PullToRefresh from '../components/PullToRefresh';
import { HomeHeroCarousel } from '../components/home/HomeHeroCarousel';
import { HomeScrollingNotice } from '../components/home/HomeScrollingNotice';
import { HomeTrendingCard } from '../components/home/HomeProductCards';
import { HomeTrendingSkeleton } from '../components/home/HomeSkeleton';
import { useUserProfile } from '../context/UserProfileContext';
import { ApiService, getApiErrorMessage } from '../services/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { promptLogin } from '../lib/require-login';
import { showSimpleToast } from '../lib/simpleToast';
import { useSupportContact } from '../hooks/useSupportContact';
import { useI18n } from '../lib/useI18n';
import type { Product } from '../types';
import { ChevronRight, Zap } from 'lucide-react';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { homeNoticeMessages } = useSupportContact();
    const { user } = useUserProfile();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const beansDisplay = user?.beans != null ? user.beans.toLocaleString() : '0';

    const load = useCallback(async () => {
        try {
            const rows = await ApiService.getCampaigns();
            setProducts(rows);
        } catch (error) {
            logUnexpectedApiError(error);
            showSimpleToast(getApiErrorMessage(error, t('historyLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const recommendedProducts = useMemo(() => {
        const activeStatuses = new Set(['selling', 'sold_out', 'drawing']);
        return products.filter((product) => activeStatuses.has(product.status) && Boolean(product.tag)).slice(0, 12);
    }, [products]);

    const recommendedRows = useMemo(
        () => [
            recommendedProducts.filter((_, index) => index % 2 === 0),
            recommendedProducts.filter((_, index) => index % 2 === 1),
        ].filter((row) => row.length > 0),
        [recommendedProducts],
    );

    const openProduct = (id: number) => navigate(`/product-details/${id}`);

    const openWallet = () => {
        if (promptLogin(navigate, t('authLoginRequired'), '/wallet')) {
            navigate('/wallet');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24 dark:bg-dark-surface">
            <PullToRefresh
                onRefresh={async () => {
                    setLoading(true);
                    await load();
                }}
            >
                <header className="sticky top-0 z-20 box-border flex h-[61px] min-h-[61px] shrink-0 items-center justify-between bg-white px-4 dark:bg-dark-card">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" className="size-8 rounded-full object-contain" alt="" />
                        <span className="text-lg font-black text-ghana-green">{t('appName')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={openWallet}
                        className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 transition-transform active:scale-95 dark:bg-slate-800"
                    >
                        <span
                            className="inline-block size-[14px] shrink-0 rounded-full bg-primary ring-2 ring-primary/40"
                            aria-hidden
                        />
                        <span className="text-sm font-bold tabular-nums text-gray-800 dark:text-slate-200">{beansDisplay}</span>
                    </button>
                </header>

                <main className="px-2">
                    {homeNoticeMessages.length > 0 ? (
                        <div className="pb-2 pt-2">
                            <HomeScrollingNotice messages={homeNoticeMessages} />
                        </div>
                    ) : null}

                    <div className="space-y-5 pt-1">
                        <HomeHeroCarousel />

                        <section>
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-base font-black text-gray-900 dark:text-slate-100">
                                    <span className="flex size-7 items-center justify-center rounded-lg bg-red-50 text-ghana-red dark:bg-red-950/40"><Zap size={16} strokeWidth={2.6} fill="currentColor" /></span>
                                    {t('hotPicks')}
                                </h3>
                                <button type="button" onClick={() => navigate('/categories')} className="flex items-center gap-0.5 text-xs font-bold text-ghana-green">
                                    {t('categories')} <ChevronRight size={14} strokeWidth={2.5} aria-hidden="true" />
                                </button>
                            </div>

                            {loading ? (
                                <div className="space-y-2.5">
                                    <HomeTrendingSkeleton />
                                </div>
                            ) : recommendedProducts.length === 0 ? (
                                <p className="py-8 text-center text-sm text-gray-500">{t('walletNoTransactions')}</p>
                            ) : (
                                <div className="space-y-3">
                                    {recommendedRows.map((row, rowIndex) => (
                                        <div
                                            key={rowIndex}
                                            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                        >
                                            {row.map((product) => (
                                                <div key={product.id} className="w-full min-w-full shrink-0">
                                                    <HomeTrendingCard
                                                        product={product}
                                                        t={t}
                                                        actionLabel={t('join')}
                                                        onOpen={() => openProduct(product.id)}
                                                        onAction={(event) => {
                                                            event.stopPropagation();
                                                            openProduct(product.id);
                                                        }}
                                                        onCountdownExpire={() => void load()}
                                                        showProgressBar
                                                        compact
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </PullToRefresh>
        </div>
    );
};

export default Home;
