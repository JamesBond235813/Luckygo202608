import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Input, Row, Space, Statistic, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { ApiClient } from '../lib/api';
import { getApiErrorMessage, logUnexpectedApiError } from '../lib/api-response';
import { formatCampaignRoundNo } from '../lib/campaign-round';
import type { CheckoutOrder } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useAdminI18n } from '../lib/i18n';

const currency = (value: number) =>
    `₵${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY = '-';

const campaignStatusFilterOptions = [
    'all',
    'selling',
    'sold_out',
    'drawing',
    'ended',
    'draft',
    'cancelled',
] as const;

const LotteryRecords = () => {
    const { t, tf, productStatusLabel } = useAdminI18n();
    const [rows, setRows] = useState<CheckoutOrder[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const fetchRows = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            setRows(await ApiClient.getOrders());
        } catch (error) {
            logUnexpectedApiError(error);
            setLoadError(getApiErrorMessage(error, t('lotteryRecordsLoadFailed')));
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows]);

    const stats = useMemo(() => {
        const totalShares = rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);
        const totalAmount = rows.reduce(
            (sum, r) => sum + (Number(r.count) || 0) * (Number(r.price_per_share) || 0),
            0,
        );
        return { count: rows.length, totalShares, totalAmount };
    }, [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            const title = (row.campaign_title || row.product_title || '').toLowerCase();
            const round = formatCampaignRoundNo(Number(row.round_no)).toLowerCase();
            const numbers = Array.isArray(row.numbers) ? row.numbers.map(String).join(' ') : '';
            const matchesSearch =
                !q ||
                title.includes(q) ||
                round.includes(q) ||
                numbers.toLowerCase().includes(q) ||
                row.user_nickname?.toLowerCase().includes(q) ||
                row.user_phone?.includes(search.trim()) ||
                String(row.campaign_id ?? '').includes(q) ||
                String(row.user_id).includes(q);
            const status = row.campaign_status || '';
            const matchesStatus = statusFilter === 'all' || status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [rows, search, statusFilter]);

    const columns: ColumnsType<CheckoutOrder> = [
        {
            title: t('colParticipant'),
            key: 'user',
            width: 132,
            fixed: 'left',
            render: (_, row) => (
                <>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.user_nickname || `#${row.user_id}`}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>{row.user_phone || EMPTY}</div>
                </>
            ),
        },
        {
            title: t('colCampaignRound'),
            key: 'campaign',
            width: 200,
            ellipsis: true,
            render: (_, row) => {
                const title = row.campaign_title || row.product_title || EMPTY;
                const round =
                    row.round_no != null ? formatCampaignRoundNo(Number(row.round_no)) : EMPTY;
                return (
                    <>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                        </div>
                        <div style={{ fontSize: 12, color: '#888' }}>
                            {round !== EMPTY ? tf('roundLabel', { round }) : EMPTY}
                            {row.campaign_id ? ` · ${t('idPrefix')}${row.campaign_id}` : ''}
                        </div>
                    </>
                );
            },
        },
        {
            title: t('colCampaignStatus'),
            key: 'campaign_status',
            width: 100,
            render: (_, row) => {
                const s = row.campaign_status || '';
                return s ? <Tag>{productStatusLabel(s)}</Tag> : EMPTY;
            },
        },
        {
            title: t('colShareCount'),
            dataIndex: 'count',
            width: 88,
            align: 'right',
            render: (count: number) => tf('shareCount', { count: Number(count) || 0 }),
        },
        {
            title: t('colParticipationAmount'),
            key: 'amount',
            width: 108,
            align: 'right',
            render: (_, row) => (
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {currency((Number(row.count) || 0) * (Number(row.price_per_share) || 0))}
                </span>
            ),
        },
        {
            title: t('colLotteryNumbers'),
            dataIndex: 'numbers',
            width: 200,
            render: (numbers: unknown) => {
                const list = Array.isArray(numbers) ? numbers.map(String) : [];
                if (!list.length) return EMPTY;
                const preview = list.slice(0, 4).join(', ');
                const more = list.length > 4 ? tf('numbersMore', { count: list.length - 4 }) : '';
                const full = list.join(', ');
                return (
                    <Tooltip title={full}>
                        <span style={{ fontSize: 12 }}>
                            {preview}
                            {more ? ` ${more}` : ''}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: t('colParticipationTime'),
            dataIndex: 'created_at',
            width: 166,
            render: (v) => (
                <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{v ? String(v) : EMPTY}</span>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => void fetchRows()} loading={loading}>
                        {t('refresh')}
                    </Button>
                }
            />

            {loadError ? <p style={{ color: '#cf1322', marginBottom: 16 }}>{loadError}</p> : null}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} md={8}>
                    <Card size="small">
                        <Statistic title={t('statParticipationCount')} value={stats.count} />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card size="small">
                        <Statistic title={t('statParticipationShares')} value={stats.totalShares} />
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card size="small">
                        <Statistic title={t('statParticipationAmount')} value={currency(stats.totalAmount)} />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Space wrap style={{ marginBottom: 16 }} direction="vertical" size="middle">
                    <Input
                        allowClear
                        placeholder={t('searchOrders')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: 360 }}
                    />
                    <Space wrap>
                        <span style={{ color: '#888', marginRight: 4 }}>{t('filterCampaignStatus')}:</span>
                        {campaignStatusFilterOptions.map((s) => (
                            <Button
                                key={s}
                                size="small"
                                type={statusFilter === s ? 'primary' : 'default'}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s === 'all' ? t('all') : productStatusLabel(s)}
                            </Button>
                        ))}
                    </Space>
                </Space>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={filtered}
                    tableLayout="fixed"
                    scroll={{ x: 1000 }}
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                    locale={{ emptyText: loading ? t('loadingOrders') : t('noOrdersMatch') }}
                />
            </Card>
        </>
    );
};

export default LotteryRecords;
