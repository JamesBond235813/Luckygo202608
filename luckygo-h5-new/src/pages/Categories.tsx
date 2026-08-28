import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppPageNav } from '../components/AppPageNav';
import PullToRefresh from '../components/PullToRefresh';
import { CategoryTopBar, CategoryTopBarSkeleton } from '../components/categories/CategoryTopBar';
import { HomeTrendingCard } from '../components/home/HomeProductCards';
import { HomeTrendingSkeleton } from '../components/home/HomeSkeleton';
import { ApiService, getApiErrorMessage } from '../services/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { showSimpleToast } from '../lib/simpleToast';
import { useI18n } from '../lib/useI18n';
import type { Product, ProductCategory } from '../types';

const Categories: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [campaigns, setCampaigns] = useState<Product[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const selectedCategoryIdRef = useRef<number | null>(null);
    selectedCategoryIdRef.current = selectedCategoryId;

    const loadCategories = useCallback(async (): Promise<number | null> => {
        try {
            const rows = await ApiService.getProductCategories();
            const sorted = rows.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
            setCategories(sorted);
            const nextId = (() => {
                const current = selectedCategoryIdRef.current;
                if (current != null && sorted.some((c) => c.id === current)) return current;
                return sorted[0]?.id ?? null;
            })();
            setSelectedCategoryId(nextId);
            return nextId;
        } catch (error) {
            logUnexpectedApiError(error);
            showSimpleToast(getApiErrorMessage(error, t('categoriesLoadFailed')));
            return null;
        } finally {
            setLoadingCategories(false);
        }
    }, [t]);

    const loadCampaigns = useCallback(async (categoryId = selectedCategoryId) => {
        if (categoryId == null) {
            setCampaigns([]);
            return;
        }
        setLoadingCampaigns(true);
        try {
            const rows = await ApiService.getCampaigns(categoryId);
            setCampaigns(rows);
        } catch (error) {
            logUnexpectedApiError(error);
            showSimpleToast(getApiErrorMessage(error, t('categoriesLoadFailed')));
        } finally {
            setLoadingCampaigns(false);
        }
    }, [selectedCategoryId, t]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        void loadCampaigns();
    }, [loadCampaigns]);

    const openProduct = (id: number) => navigate(`/product-details/${id}`);

    const productList = useMemo(
        () => campaigns.filter((p) => p.status === 'selling' || p.status === 'sold_out'),
        [campaigns],
    );

    const refreshAll = async () => {
        const categoryId = await loadCategories();
        await loadCampaigns(categoryId);
    };

    const productGrid = loadingCampaigns ? (
        <div className="grid grid-cols-2 gap-2">
            <HomeTrendingSkeleton showProgressBar />
        </div>
    ) : productList.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
            {productList.map((product) => (
                <HomeTrendingCard
                    key={product.id}
                    product={product}
                    t={t}
                    showProgressBar
                    actionLabel={t('join')}
                    onOpen={() => openProduct(product.id)}
                    onAction={(event) => {
                        event.stopPropagation();
                        openProduct(product.id);
                    }}
                    onCountdownExpire={() => void loadCampaigns()}
                />
            ))}
        </div>
    ) : (
        <p className="py-16 text-center text-sm text-gray-500 dark:text-slate-400">
            {t('categoriesEmptyCampaigns')}
        </p>
    );

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 pb-24 dark:bg-dark-surface">
            <AppPageNav title={t('categoriesTitle')} titleOnly fixed={false} className="z-30 shadow-sm" />

            {loadingCategories ? (
                <>
                    <CategoryTopBarSkeleton />
                    <div className="min-h-0 flex-1 px-2 py-3">
                        <div className="grid grid-cols-2 gap-2">
                            <HomeTrendingSkeleton showProgressBar />
                        </div>
                    </div>
                </>
            ) : categories.length === 0 ? (
                <p className="py-20 text-center text-sm text-gray-500 dark:text-slate-400">{t('categoriesEmpty')}</p>
            ) : (
                <>
                    <CategoryTopBar
                        categories={categories}
                        selectedId={selectedCategoryId}
                        onSelect={setSelectedCategoryId}
                    />
                    <PullToRefresh onRefresh={refreshAll} className="min-h-0 flex-1">
                        <main key={selectedCategoryId ?? 'none'} className="px-2 py-3">
                            {productGrid}
                        </main>
                    </PullToRefresh>
                </>
            )}
        </div>
    );
};

export default Categories;
