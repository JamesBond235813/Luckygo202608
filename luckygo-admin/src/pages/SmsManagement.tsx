import { useCallback, useEffect, useState } from 'react';
import { App, Button, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import type { SmsSendLog } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useAdminI18n } from '../lib/i18n';

const EMPTY = '-';

const sceneLabel = (scene: string, t: (k: 'smsSceneLoginOtp' | 'smsSceneMarketing') => string) => {
    if (scene === 'login_otp') return t('smsSceneLoginOtp');
    if (scene === 'marketing') return t('smsSceneMarketing');
    return scene || EMPTY;
};

const SmsManagement = () => {
    const { message } = App.useApp();
    const { t } = useAdminI18n();
    const [logs, setLogs] = useState<SmsSendLog[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            setLogs(await ApiClient.getSmsSendLogs(200));
        } catch (e) {
            logUnexpectedApiError(e);
            message.error(getApiErrorMessage(e, t('smsLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [message, t]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const columns: ColumnsType<SmsSendLog> = [
        {
            title: t('fieldTemplateScene'),
            dataIndex: 'scene',
            width: 120,
            render: (s) => sceneLabel(s, t),
        },
        {
            title: t('colPhone'),
            dataIndex: 'phone',
            width: 150,
            render: (v, row) => v || row.phoneMasked || EMPTY,
        },
        {
            title: t('fieldStatus'),
            dataIndex: 'status',
            width: 90,
            render: (s) => {
                const color = s === 'success' ? 'green' : s === 'failed' ? 'red' : 'default';
                return <Tag color={color}>{s}</Tag>;
            },
        },
        {
            title: t('fieldGatewayErrcode'),
            dataIndex: 'gatewayErrcode',
            width: 160,
            render: (v) => v || EMPTY,
        },
        {
            title: t('fieldGatewayMessage'),
            dataIndex: 'gatewayMessage',
            render: (v) => (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: 200 }}>
                    {v || EMPTY}
                </div>
            ),
        },
        {
            title: t('fieldContentPreview'),
            dataIndex: 'contentPreview',
            render: (v) => (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', minWidth: 280 }}>
                    {v || EMPTY}
                </div>
            ),
        },
        { title: t('colTime'), dataIndex: 'createdAt', width: 170, render: (v) => v || EMPTY },
    ];

    return (
        <>
            <PageHeader
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => void refresh()}>
                        {t('refresh')}
                    </Button>
                }
            />

            <Table<SmsSendLog>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={logs}
                scroll={{ x: 1280 }}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                locale={{ emptyText: t('smsNoLogs') }}
            />
        </>
    );
};

export default SmsManagement;
