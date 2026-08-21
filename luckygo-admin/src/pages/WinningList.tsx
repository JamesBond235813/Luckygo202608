import { useEffect, useMemo, useState } from 'react';
import { App, Alert, Button, Input, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, GiftOutlined, ReloadOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import type { WinningRecord } from '../types';
import { PageHeader } from '../components/PageHeader';
import { formatCampaignRoundNo } from '../lib/campaign-round';
import { useAdminI18n } from '../lib/i18n';

const statusColor: Record<WinningRecord['status'], string> = {
    Processing: 'gold',
    Shipped: 'gold',
    Received: 'green',
};

type WinningsFilter = 'all' | 'Processing' | 'Received';

function matchesAdminWinningFilter(record: WinningRecord, filter: WinningsFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'Received') return record.status === 'Received';
    return record.status === 'Processing' || record.status === 'Shipped';
}

const WinningList = () => {
    const { message } = App.useApp();
    const { t, tf, winningStatusLabel } = useAdminI18n();
    const [winnings, setWinnings] = useState<WinningRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<WinningsFilter>('all');

    const fetchWinnings = async () => {
        setLoading(true);
        try {
            setWinnings(await ApiClient.getWinningRecords());
        } catch (error) {
            logUnexpectedApiError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchWinnings();
    }, []);

    const updateStatus = async (id: number, newStatus: WinningRecord['status']) => {
        try {
            await ApiClient.updateWinningStatus(id, newStatus);
            message.success(t('savedSuccessfully'));
            await fetchWinnings();
        } catch (e) {
            message.error(getApiErrorMessage(e, t('updateStatusFailed')));
        }
    };

    const filteredWinnings = useMemo(
        () =>
            winnings.filter((record) => {
                const matchesStatus = matchesAdminWinningFilter(record, statusFilter);
                const q = search.toLowerCase();
                const roundText = formatCampaignRoundNo(record.round_no ?? 0).toLowerCase();
                return (
                    matchesStatus &&
                    (record.productName.toLowerCase().includes(q) ||
                        roundText.includes(q) ||
                        (record.winnerName || '').toLowerCase().includes(q) ||
                        record.winning_number.includes(search))
                );
            }),
        [winnings, search, statusFilter],
    );

    const columns: ColumnsType<WinningRecord> = [
        {
            title: t('colWinningProduct'),
            key: 'product',
            width: 460,
            ellipsis: true,
            render: (_, row) => {
                const round =
                    row.round_no != null ? formatCampaignRoundNo(Number(row.round_no)) : '';
                return (
                    <>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.productName}
                        </div>
                        {round ? (
                            <div style={{ fontSize: 12, color: '#888' }}>{tf('roundLabel', { round })}</div>
                        ) : null}
                    </>
                );
            },
        },
        {
            title: t('colWinner'),
            key: 'winner',
            render: (_, row) => (
                <>
                    <div>{row.winnerName || '-'}</div>
                    {row.winnerPhone ? (
                        <div style={{ fontSize: 12, color: '#888' }}>{row.winnerPhone}</div>
                    ) : null}
                </>
            ),
        },
        {
            title: t('colLuckyNumber'),
            dataIndex: 'winning_number',
            render: (n) => <Tag color="green">{n}</Tag>,
        },
        {
            title: t('colTime'),
            dataIndex: 'draw_time',
            render: (v) => (v ? String(v) : '-'),
        },
        {
            title: t('colStatus'),
            dataIndex: 'status',
            render: (s: WinningRecord['status']) => (
                <Tag color={statusColor[s]}>{winningStatusLabel(s)}</Tag>
            ),
        },
        {
            title: t('actions'),
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {(record.status === 'Processing' || record.status === 'Shipped') && (
                        <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => void updateStatus(record.id, 'Received')}
                        >
                            {t('actionMarkClaimed')}
                        </Button>
                    )}
                    {record.status === 'Received' && (
                        <Tag icon={<GiftOutlined />} color="success">
                            {t('actionCompleted')}
                        </Tag>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => void fetchWinnings()}>
                        {t('refresh')}
                    </Button>
                }
            />

            <Alert type="info" showIcon message={t('winningsOfflineBanner')} style={{ marginBottom: 16 }} />

            <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }} size="middle">
                <Input.Search
                    placeholder={t('searchWinnings')}
                    allowClear
                    onSearch={setSearch}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 360 }}
                />
                <Space wrap>
                    {(['all', 'Processing', 'Received'] as const).map((status) => (
                        <Button
                            key={status}
                            type={statusFilter === status ? 'primary' : 'default'}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status === 'all' ? t('all') : winningStatusLabel(status)}
                        </Button>
                    ))}
                </Space>
            </Space>

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={filteredWinnings}
                pagination={{ pageSize: 15, showSizeChanger: true }}
                locale={{ emptyText: loading ? t('loadingWinnings') : t('noWinningsMatch') }}
            />
        </>
    );
};

export default WinningList;
