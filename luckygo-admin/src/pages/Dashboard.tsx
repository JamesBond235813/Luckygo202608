import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    List,
    Progress,
    Row,
    Spin,
    Statistic,
    Table,
    Tag,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    DollarOutlined,
    GiftOutlined,
    ReloadOutlined,
    ShoppingOutlined,
    TeamOutlined,
    TruckOutlined,
} from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import type { Campaign, CheckoutOrder, User, WinningRecord } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useAdminI18n } from '../lib/i18n';

const currency = (value: number) => `₵${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const Dashboard = () => {
    const { t, tf, productStatusLabel, winningStatusLabel } = useAdminI18n();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [winningRecords, setWinningRecords] = useState<WinningRecord[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<CheckoutOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [campaignData, winningData, userData, orderData] = await Promise.all([
                ApiClient.getCampaigns(),
                ApiClient.getWinningRecords(),
                ApiClient.getUsers(),
                ApiClient.getOrders(),
            ]);
            setCampaigns(campaignData);
            setWinningRecords(winningData);
            setUsers(userData);
            setOrders(orderData);
        } catch (e) {
            logUnexpectedApiError(e);
            setError(getApiErrorMessage(e, t('dashboardLoadError')));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, []);

    const stats = useMemo(() => {
        const totalRevenue = campaigns.reduce((sum, c) => sum + c.pricePerShare * c.sharesSold, 0);
        return {
            totalRevenue,
            activeCampaigns: campaigns.filter((c) => c.status === 'selling').length,
            totalUsers: users.length,
            pendingShipments: winningRecords.filter((w) => w.status !== 'Received').length,
        };
    }, [campaigns, users, winningRecords]);

    const liveCampaigns = useMemo(
        () =>
            campaigns
                .filter((c) => c.status === 'selling')
                .sort((a, b) => b.sharesSold - a.sharesSold)
                .slice(0, 4),
        [campaigns],
    );

    const orderColumns: ColumnsType<CheckoutOrder> = [
        {
            title: t('colProduct'),
            dataIndex: 'product_title',
            render: (title, row) => (
                <>
                    <div>{title}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t('idPrefix')}: {row.product_id}
                    </Typography.Text>
                </>
            ),
        },
        {
            title: t('colUser'),
            key: 'user',
            render: (_, row) => (
                <>
                    <div>{row.user_nickname}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {row.user_phone}
                    </Typography.Text>
                </>
            ),
        },
        { title: t('colCount'), dataIndex: 'count', width: 80 },
        {
            title: t('colAmount'),
            key: 'amount',
            render: (_, row) => currency(row.count * row.price_per_share),
        },
        {
            title: t('colTime'),
            dataIndex: 'created_at',
            render: (v) => (v ? String(v) : '-'),
        },
        {
            title: t('colStatus'),
            key: 'status',
            render: (_, row) => (
                <Tag>{productStatusLabel(row.campaign_status || row.product_status || '')}</Tag>
            ),
        },
    ];

    return (
        <Spin spinning={loading}>
            <PageHeader
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => void loadData()}>
                        {t('refresh')}
                    </Button>
                }
            />

            {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic
                            title={t('statRevenue')}
                            value={stats.totalRevenue}
                            prefix={<DollarOutlined />}
                            formatter={(v) => currency(Number(v))}
                        />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {t('statRevenueHint')}
                        </Typography.Text>
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic
                            title={t('statActiveCampaigns')}
                            value={stats.activeCampaigns}
                            prefix={<ShoppingOutlined />}
                        />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {t('statActiveCampaignsHint')}
                        </Typography.Text>
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic title={t('statUsers')} value={stats.totalUsers} prefix={<TeamOutlined />} />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {t('statUsersHint')}
                        </Typography.Text>
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic
                            title={t('statPendingShipments')}
                            value={stats.pendingShipments}
                            prefix={<TruckOutlined />}
                        />
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {t('statPendingShipmentsHint')}
                        </Typography.Text>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={12}>
                    <Card
                        title={t('liveCampaigns')}
                        extra={<Tag color="success">{tf('activeCount', { count: liveCampaigns.length })}</Tag>}
                    >
                        <List
                            dataSource={liveCampaigns}
                            locale={{ emptyText: t('noActiveCampaigns') }}
                            renderItem={(c) => {
                                const pct = Math.round((c.sharesSold / Math.max(c.totalShares, 1)) * 100);
                                return (
                                    <List.Item
                                        actions={[
                                            <span key="pct">
                                                {tf('percentSold', { percent: pct })}
                                            </span>,
                                        ]}
                                    >
                                        <List.Item.Meta
                                            title={c.title}
                                            description={tf('sharesSold', {
                                                sold: c.sharesSold,
                                                total: c.totalShares,
                                            })}
                                        />
                                        <Progress percent={pct} size="small" style={{ width: 80 }} />
                                    </List.Item>
                                );
                            }}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title={t('latestWinnings')} extra={<GiftOutlined />}>
                        <List
                            dataSource={winningRecords.slice(0, 5)}
                            locale={{ emptyText: t('noWinningRecords') }}
                            renderItem={(record) => (
                                <List.Item
                                    actions={[
                                        <Tag key="s">{winningStatusLabel(record.status)}</Tag>,
                                        <strong key="n">{record.winning_number}</strong>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={record.productName}
                                        description={tf('winnerLabel', {
                                            name: record.winnerName || '-',
                                        })}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                title={t('recentOrders')}
                extra={<Tag color="blue">{tf('ordersTotal', { count: orders.length })}</Tag>}
                style={{ marginTop: 16 }}
            >
                <Table
                    rowKey="id"
                    columns={orderColumns}
                    dataSource={orders.slice(0, 5)}
                    pagination={false}
                    locale={{ emptyText: t('noOrdersYet') }}
                />
            </Card>
        </Spin>
    );
};

export default Dashboard;
