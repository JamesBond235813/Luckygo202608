import { Space } from 'antd';
import type { ReactNode } from 'react';

/** 页面顶栏操作区（标题已由全局面包屑展示） */
export const PageHeader = ({ extra }: { extra?: ReactNode }) => {
    if (!extra) return null;
    return (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Space wrap>{extra}</Space>
        </div>
    );
};
