import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';

/**
 * 默认顶栏高度 60px。项目以 rem 为主时，按常见根字号 16px 折算为 `3.75rem`。
 * 若全局修改了 `html` 的 `font-size`，请改用 `height` 传入与设计稿一致的 rem。
 */
export const APP_PAGE_NAV_DEFAULT_HEIGHT = '3.75rem';

export interface AppPageNavProps {
    /** 导航栏标题，可传字符串或任意 React 节点 */
    title: React.ReactNode;
    /** 默认：`() => navigate(-1)` */
    onBack?: () => void;
    /**
     * 左侧区域：不传时使用默认圆形返回键；传入则**整体替换**左侧（可自行再放返回或其它内容）。
     * 传 `null` 可去掉左侧按钮但仍保留占位宽度。
     */
    left?: React.ReactNode;
    /**
     * 右侧区域：不传时为与左侧同宽的空占位，保证标题视觉居中；传入则在右侧展示。
     */
    right?: React.ReactNode;
    /**
     * 顶栏高度（建议使用 rem，如默认 `3.75rem` ≈ 60px @16px root）。
     */
    height?: string;
    /**
     * `true`：`fixed` 钉在视口顶部，并在组件内插入同高占位，避免遮挡下方内容。
     * `false`：`sticky top-0`，随文档流占位，无需占位条。
     * @default true
     */
    fixed?: boolean;
    /** 追加到 `header` 上的 className */
    className?: string;
    /** 左侧槽位宽度 class，默认 `w-10`；放多个按钮时可传 `w-[5.5rem]` */
    leftColClassName?: string;
    /**
     * 仅居中标题，不展示左右侧按钮/占位（无返回图标等）。
     * 用于首页、分类等主导航 Tab 页顶栏。
     */
    titleOnly?: boolean;
}

const defaultBackBtnClass =
    'flex size-10 items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-slate-800';

function DefaultBackButton({ onClick }: { onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={defaultBackBtnClass} aria-label="Back">
            <ArrowLeft size={22} strokeWidth={2.2} aria-hidden="true" />
        </button>
    );
}

/** 通用顶栏：左/右等宽槽位 + 居中标题；默认左侧为返回。需在 Router 内使用（默认返回依赖 `useNavigate`）。 */
export const AppPageNav: React.FC<AppPageNavProps> = ({
    title,
    onBack,
    left,
    right,
    height = APP_PAGE_NAV_DEFAULT_HEIGHT,
    fixed = true,
    className,
    leftColClassName = 'w-10',
    titleOnly = false,
}) => {
    const navigate = useNavigate();
    const handleBack = onBack ?? (() => navigate(-1));

    const heightStyle: React.CSSProperties = { height, minHeight: height };

    const header = titleOnly ? (
        <header
            style={heightStyle}
            className={cn(
                'z-50 box-border flex w-full items-center justify-center bg-white px-4 transition-colors dark:bg-dark-card',
                'border-b border-gray-100 dark:border-slate-800',
                fixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0',
                className,
            )}
        >
            <h1 className="min-w-0 truncate text-lg font-black text-gray-900 dark:text-slate-100">{title}</h1>
        </header>
    ) : (
        <header
            style={heightStyle}
            className={cn(
                'z-50 box-border flex w-full items-center bg-white px-4 transition-colors dark:bg-dark-card',
                'border-b border-gray-100 dark:border-slate-800',
                fixed ? 'fixed top-0 left-0 right-0' : 'sticky top-0',
                className,
            )}
        >
            <div className={cn('flex shrink-0 items-center justify-start', leftColClassName)}>
                {left !== undefined ? left : <DefaultBackButton onClick={handleBack} />}
            </div>
            <h2 className="min-w-0 flex-1 truncate px-2 text-center text-lg font-bold text-gray-900 dark:text-slate-100">
                {title}
            </h2>
            <div className="flex w-10 shrink-0 items-center justify-end">
                {right ?? <span className="size-10 shrink-0" aria-hidden />}
            </div>
        </header>
    );

    if (!fixed) {
        return header;
    }

    return (
        <>
            <div aria-hidden className="w-full shrink-0" style={heightStyle} />
            {header}
        </>
    );
};
