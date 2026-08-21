import { useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/* This module owns an imperative API and its private React view. */
/* eslint-disable react-refresh/only-export-components */

let host: HTMLDivElement | undefined;
let reactRoot: Root | undefined;

function ToastView({ message, onClose }: { message: string; onClose: () => void }) {
    useEffect(() => {
        const id = window.setTimeout(onClose, 2200);
        return () => window.clearTimeout(id);
    }, [message, onClose]);

    return (
        <div
            role="status"
            className="pointer-events-none fixed left-1/2 top-[42%] z-[5000] max-w-[min(90vw,320px)] -translate-x-1/2 rounded-lg bg-[rgba(0,0,0,0.75)] px-3 py-2 text-center text-sm leading-snug text-white shadow-lg"
        >
            {message}
        </div>
    );
}

function destroyHost() {
    try {
        reactRoot?.unmount();
    } catch {
        // ignore
    }
    reactRoot = undefined;
    host?.remove();
    host = undefined;
}

/** 与 antd-mobile Toast 类似：短时提示；兼容 React 19（不依赖 react-dom 上的 createRoot / unmountComponentAtNode）。 */
export function showSimpleToast(message: string): void {
    destroyHost();
    host = document.createElement('div');
    host.setAttribute('data-luckygo-simple-toast', '');
    document.body.appendChild(host);
    reactRoot = createRoot(host);
    reactRoot.render(
        <ToastView
            message={message}
            onClose={() => {
                destroyHost();
            }}
        />,
    );
}
