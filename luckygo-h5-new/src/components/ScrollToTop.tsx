import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** 路由切换时将页面滚动条重置到顶部 */
export function ScrollToTop() {
    const { pathname, search } = useLocation();

    useLayoutEffect(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [pathname, search]);

    return null;
}
