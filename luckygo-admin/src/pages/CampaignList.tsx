import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    App,
    Button,
    Checkbox,
    DatePicker,
    Descriptions,
    Drawer,
    Form,
    Input,
    InputNumber,
    Modal,
    Progress,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
    StopOutlined,
    GiftOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    ReloadOutlined,
    UnorderedListOutlined,
    PushpinOutlined,
} from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import type { Campaign, CampaignNumbersSummary, CampaignPayload, LotteryNumberRow } from '../types';
import { formatCampaignRoundNo } from '../lib/campaign-round';
import { useAdminI18n } from '../lib/i18n';
import type { TranslationKey } from '../lib/i18n/en';

const statusKey = (s: Campaign['status']): TranslationKey => {
    const map: Record<Campaign['status'], TranslationKey> = {
        draft: 'campaignStatusDraft',
        selling: 'campaignStatusSelling',
        sold_out: 'campaignStatusSoldOut',
        drawing: 'campaignStatusDrawing',
        ended: 'campaignStatusEnded',
        cancelled: 'campaignStatusCancelled',
    };
    return map[s];
};

const statusColor: Record<Campaign['status'], string> = {
    draft: 'default',
    selling: 'processing',
    sold_out: 'warning',
    drawing: 'purple',
    ended: 'success',
    cancelled: 'error',
};

const STATUS_TABS = ['all', 'draft', 'selling', 'sold_out', 'drawing', 'ended', 'cancelled'] as const;

type CampaignQuery = {
    productId?: number;
    roundNo: string;
    createdFrom?: string;
    createdTo?: string;
};

const EMPTY_QUERY: CampaignQuery = { roundNo: '' };

const { RangePicker } = DatePicker;

const CampaignList = () => {
    const { message, modal } = App.useApp();
    const { t } = useAdminI18n();
    const [products, setProducts] = useState<{ id: number; title: string }[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [statusTab, setStatusTab] = useState<(typeof STATUS_TABS)[number]>('all');
    const [query, setQuery] = useState<CampaignQuery>(EMPTY_QUERY);
    const [productDraft, setProductDraft] = useState<number | undefined>();
    const [roundDraft, setRoundDraft] = useState('');
    const [rangeDraft, setRangeDraft] = useState<[Dayjs, Dayjs] | null>(null);
    const [form] = Form.useForm<CampaignPayload>();

    const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
    const [numbersLoading, setNumbersLoading] = useState(false);
    const [numbers, setNumbers] = useState<LotteryNumberRow[]>([]);
    const [numbersTotal, setNumbersTotal] = useState(0);
    const [numbersSummary, setNumbersSummary] = useState<CampaignNumbersSummary | null>(null);
    const [numberStatusFilter, setNumberStatusFilter] = useState<string>('all');
    const [numberSearch, setNumberSearch] = useState('');
    const [numberPage, setNumberPage] = useState(1);

    const [designateCampaign, setDesignateCampaign] = useState<Campaign | null>(null);
    const [designateNumber, setDesignateNumber] = useState<string | null>(null);
    const [pickerOptions, setPickerOptions] = useState<{ value: string; label: string }[]>([]);
    const [createdSortOrder, setCreatedSortOrder] = useState<'ascend' | 'descend' | null>(null);

    const fetchCampaigns = useCallback(
        async (status: (typeof STATUS_TABS)[number], filters: CampaignQuery) => {
            setLoading(true);
            try {
                const rows = await ApiClient.getCampaigns({
                    productId: filters.productId,
                    status: status === 'all' ? undefined : status,
                    roundNo: filters.roundNo.trim() || undefined,
                    createdFrom: filters.createdFrom,
                    createdTo: filters.createdTo,
                });
                setCampaigns(rows);
            } catch (e) {
                logUnexpectedApiError(e);
                message.error(getApiErrorMessage(e, t('campaignActionFailed')));
            } finally {
                setLoading(false);
            }
        },
        [message, t],
    );

    const loadProducts = useCallback(async () => {
        try {
            const p = await ApiClient.getProducts();
            setProducts(p);
        } catch (e) {
            logUnexpectedApiError(e);
            message.error(getApiErrorMessage(e, t('campaignActionFailed')));
        }
    }, [message, t]);

    const load = useCallback(async () => {
        await loadProducts();
        await fetchCampaigns(statusTab, query);
    }, [fetchCampaigns, loadProducts, query, statusTab]);

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        void fetchCampaigns(statusTab, query);
    }, [fetchCampaigns, query, statusTab]);

    const handleSearch = () => {
        setCreatedSortOrder(null);
        setQuery({
            productId: productDraft,
            roundNo: roundDraft,
            createdFrom: rangeDraft?.[0]?.format('YYYY-MM-DD'),
            createdTo: rangeDraft?.[1]?.format('YYYY-MM-DD'),
        });
    };

    const handleResetFilters = () => {
        setProductDraft(undefined);
        setRoundDraft('');
        setRangeDraft(null);
        setCreatedSortOrder(null);
        setQuery(EMPTY_QUERY);
    };

    const tableData = useMemo(() => {
        if (!createdSortOrder) return campaigns;
        return [...campaigns].sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return createdSortOrder === 'ascend' ? ta - tb : tb - ta;
        });
    }, [campaigns, createdSortOrder]);

    const hasActiveFilters =
        Boolean(query.productId) ||
        Boolean(query.roundNo.trim()) ||
        Boolean(query.createdFrom) ||
        Boolean(query.createdTo) ||
        statusTab !== 'all';

    const run = async (fn: () => Promise<unknown>, okMsg?: string) => {
        try {
            await fn();
            if (okMsg) message.success(okMsg);
            await load();
        } catch (e) {
            logUnexpectedApiError(e);
            message.error(getApiErrorMessage(e, t('campaignActionFailed')));
        }
    };

    const openCreate = () => {
        form.setFieldsValue({
            productId: products[0]?.id,
            totalShares: 100,
            pricePerShare: 1,
            autoDrawOnSellout: false,
            autoDrawCountdownSeconds: 60,
        });
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        const values = await form.validateFields();
        if (!values.productId) {
            message.warning(t('selectProduct'));
            return;
        }
        await run(
            () =>
                ApiClient.createCampaign({
                    productId: values.productId,
                    totalShares: values.totalShares,
                    pricePerShare: values.pricePerShare,
                    autoDrawOnSellout: values.autoDrawOnSellout,
                    autoDrawCountdownSeconds: values.autoDrawOnSellout
                        ? values.autoDrawCountdownSeconds
                        : undefined,
                }),
            t('campaignSaved'),
        );
        setCreateOpen(false);
    };

    const loadNumbers = useCallback(
        async (campaign: Campaign, page = 1, status = numberStatusFilter, search = numberSearch) => {
            setNumbersLoading(true);
            try {
                const data = await ApiClient.getCampaignNumbers(campaign.id, {
                    page,
                    pageSize: 50,
                    status: status === 'all' ? undefined : status,
                    search: search.trim() || undefined,
                });
                setNumbers(data.items);
                setNumbersTotal(data.total);
                setNumbersSummary(data.summary);
                setNumberPage(page);
            } catch (e) {
                logUnexpectedApiError(e);
                message.error(getApiErrorMessage(e, t('campaignActionFailed')));
            } finally {
                setNumbersLoading(false);
            }
        },
        [message, numberSearch, numberStatusFilter, t],
    );

    const openNumbersDetail = async (campaign: Campaign) => {
        setDetailCampaign(campaign);
        setNumberStatusFilter('all');
        setNumberSearch('');
        setNumberPage(1);
        await loadNumbers(campaign, 1, 'all', '');
    };

    const openDesignate = async (campaign: Campaign) => {
        setDesignateCampaign(campaign);
        setDesignateNumber(campaign.designatedWinningNumber);
        try {
            const data = await ApiClient.getCampaignNumbers(campaign.id, { pageSize: 200 });
            setPickerOptions(
                data.items.map((row) => ({
                    value: row.number,
                    label: `${row.number} (${row.status === 'sold' ? t('numberStatusSold') : t('numberStatusAvailable')})`,
                })),
            );
        } catch {
            setPickerOptions([]);
        }
    };

    const saveDesignate = async () => {
        if (!designateCampaign) return;
        try {
            await ApiClient.designateCampaign(designateCampaign.id, designateNumber);
            message.success(t('campaignSaved'));
            setDesignateCampaign(null);
            await load();
            if (detailCampaign?.id === designateCampaign.id) {
                const updated = campaigns.find((c) => c.id === designateCampaign.id);
                if (updated) await loadNumbers(updated, numberPage);
            }
        } catch (e) {
            logUnexpectedApiError(e);
            message.error(getApiErrorMessage(e, t('campaignActionFailed')));
        }
    };

    const numberColumns: ColumnsType<LotteryNumberRow> = [
        {
            title: t('colLotteryNumber'),
            dataIndex: 'number',
            render: (num) => (
                <Space>
                    <Typography.Text code>{num}</Typography.Text>
                    {numbersSummary?.designatedWinningNumber === num ? (
                        <Tag color="gold">{t('designatedTag')}</Tag>
                    ) : null}
                    {detailCampaign?.winningNumber === num && detailCampaign?.status === 'ended' ? (
                        <Tag color="green">{t('drawWinner')}</Tag>
                    ) : null}
                </Space>
            ),
        },
        {
            title: t('colNumberStatus'),
            dataIndex: 'status',
            render: (s: string) => (
                <Tag color={s === 'sold' ? 'blue' : 'default'}>
                    {s === 'sold' ? t('numberStatusSold') : t('numberStatusAvailable')}
                </Tag>
            ),
        },
        {
            title: t('colHolder'),
            key: 'holder',
            render: (_, row) =>
                row.user_nickname ? (
                    <span>
                        {row.user_nickname}
                        {row.user_phone ? ` (${row.user_phone})` : ''}
                    </span>
                ) : (
                    '-'
                ),
        },
        {
            title: t('colTime'),
            dataIndex: 'sold_at',
            render: (v) => (v ? String(v) : '-'),
        },
    ];

    const columns: ColumnsType<Campaign> = [
        {
            title: t('colCampaignProduct'),
            dataIndex: 'title',
            render: (_, c) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                        {t('colRound')}: {formatCampaignRoundNo(c.roundNo)}
                        {c.designatedWinningNumber ? (
                            <Tag color="gold" style={{ marginLeft: 8 }}>
                                {t('designatedTag')}: {c.designatedWinningNumber}
                            </Tag>
                        ) : null}
                    </div>
                </div>
            ),
        },
        {
            title: t('colRound'),
            dataIndex: 'roundNo',
            width: 80,
            render: (n: number) => formatCampaignRoundNo(n),
        },
        {
            title: t('colPricePerShare'),
            dataIndex: 'pricePerShare',
            width: 100,
            align: 'right',
            render: (v: number) => <Typography.Text strong>₵{v}</Typography.Text>,
        },
        {
            title: t('colAutoDrawOnSellout'),
            dataIndex: 'autoDrawOnSellout',
            width: 120,
            align: 'center',
            render: (on: boolean) => (
                <Tag color={on ? 'success' : 'default'}>{on ? t('commonYes') : t('commonNo')}</Tag>
            ),
        },
        {
            title: t('colAutoDrawCountdown'),
            dataIndex: 'autoDrawCountdownSeconds',
            width: 110,
            align: 'center',
            render: (sec: number, c) =>
                c.autoDrawOnSellout ? (
                    <span>
                        {sec}
                        {t('secondsUnit')}
                    </span>
                ) : (
                    '-'
                ),
        },
        {
            title: t('colProgress'),
            key: 'progress',
            width: 200,
            render: (_, c) => {
                const pct = Math.round((c.sharesSold / Math.max(c.totalShares, 1)) * 100);
                return (
                    <div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                            {c.sharesSold}/{c.totalShares}
                        </div>
                        <Progress percent={pct} size="small" showInfo={false} />
                    </div>
                );
            },
        },
        {
            title: t('colCreatedAt'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 170,
            sortOrder: createdSortOrder,
            sortDirections: ['descend', 'ascend'],
            sorter: true,
            render: (v?: string) => (v ? String(v) : '-'),
        },
        {
            title: t('colStatus'),
            dataIndex: 'status',
            width: 110,
            render: (s: Campaign['status']) => <Tag color={statusColor[s]}>{t(statusKey(s))}</Tag>,
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 220,
            render: (_, c) => (
                <Space wrap size="small">
                    <Tooltip title={t('lotteryNumbersDetail')}>
                        <Button size="small" icon={<UnorderedListOutlined />} onClick={() => void openNumbersDetail(c)} />
                    </Tooltip>
                    {['draft', 'selling', 'sold_out'].includes(c.status) && (
                        <Tooltip title={t('designateWinning')}>
                            <Button size="small" icon={<PushpinOutlined />} onClick={() => void openDesignate(c)} />
                        </Tooltip>
                    )}
                    {c.status === 'draft' && (
                        <Tooltip title={t('publishCampaign')}>
                            <Button
                                size="small"
                                type="primary"
                                ghost
                                icon={<PlayCircleOutlined />}
                                onClick={() =>
                                    modal.confirm({
                                        title: t('publishCampaign'),
                                        content: t('confirmPublish'),
                                        onOk: () => run(() => ApiClient.publishCampaign(c.id), t('campaignSaved')),
                                    })
                                }
                            />
                        </Tooltip>
                    )}
                    {['selling', 'sold_out'].includes(c.status) && (
                        <Tooltip title={t('drawWinner')}>
                            <Button
                                size="small"
                                icon={<GiftOutlined />}
                                onClick={() =>
                                    modal.confirm({
                                        title: t('drawWinner'),
                                        content: t('confirmDraw'),
                                        onOk: () => run(() => ApiClient.drawCampaign(c.id), t('drawSuccess')),
                                    })
                                }
                            />
                        </Tooltip>
                    )}
                    {['draft', 'selling'].includes(c.status) && (
                        <Tooltip title={t('cancelCampaign')}>
                            <Button
                                size="small"
                                danger
                                icon={<StopOutlined />}
                                onClick={() =>
                                    modal.confirm({
                                        title: t('cancelCampaign'),
                                        content: t('confirmCancelCampaign'),
                                        onOk: () => run(() => ApiClient.cancelCampaign(c.id)),
                                    })
                                }
                            />
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div
                style={{
                    marginBottom: 16,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                }}
            >
                <Space wrap align="start">
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        placeholder={t('filterCampaignProduct')}
                        style={{ width: 200 }}
                        value={productDraft}
                        onChange={(value) => setProductDraft(value)}
                        options={products.map((p) => ({ value: p.id, label: p.title }))}
                    />
                    <Input
                        allowClear
                        placeholder={t('searchCampaignRoundPlaceholder')}
                        style={{ width: 200 }}
                        value={roundDraft}
                        onChange={(event) => setRoundDraft(event.target.value)}
                        onPressEnter={handleSearch}
                    />
                    <RangePicker
                        value={rangeDraft}
                        onChange={(values) => setRangeDraft(values as [Dayjs, Dayjs] | null)}
                        placeholder={[t('filterCreatedRange'), t('filterCreatedRange')]}
                        style={{ width: 240 }}
                    />
                    <Button type="primary" onClick={handleSearch}>
                        {t('search')}
                    </Button>
                    <Button onClick={handleResetFilters}>{t('filterReset')}</Button>
                </Space>
                <Space wrap>
                    <Button icon={<ReloadOutlined />} onClick={() => void load()}>
                        {t('refresh')}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        {t('addCampaign')}
                    </Button>
                </Space>
            </div>

            <Tabs
                activeKey={statusTab}
                onChange={(key) => {
                    setStatusTab(key as (typeof STATUS_TABS)[number]);
                    setCreatedSortOrder(null);
                }}
                style={{ marginBottom: 16 }}
                items={STATUS_TABS.map((s) => ({
                    key: s,
                    label: s === 'all' ? t('all') : t(statusKey(s as Campaign['status'])),
                }))}
            />

            <Table<Campaign>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={tableData}
                scroll={{ x: 1100 }}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                locale={{
                    emptyText: loading
                        ? t('loadingCampaigns')
                        : hasActiveFilters
                          ? t('noCampaignsMatch')
                          : t('noCampaigns'),
                }}
                onChange={(_pagination, _filters, sorter) => {
                    const item = Array.isArray(sorter) ? sorter[0] : sorter;
                    if (item && (item.columnKey === 'createdAt' || item.field === 'createdAt')) {
                        setCreatedSortOrder(item.order ?? null);
                    }
                }}
            />

            <Modal
                title={t('addCampaign')}
                open={createOpen}
                onCancel={() => setCreateOpen(false)}
                onOk={() => void handleCreate()}
                okText={t('save')}
                cancelText={t('cancel')}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="productId" label={t('selectProduct')} rules={[{ required: true }]}>
                        <Select
                            options={products.map((p) => ({ value: p.id, label: p.title }))}
                            placeholder={t('selectProduct')}
                        />
                    </Form.Item>
                    <Form.Item name="totalShares" label={t('fieldTotalShares')} rules={[{ required: true }]}>
                        <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="pricePerShare"
                        label={t('fieldPricePerShare')}
                        extra={t('fieldPricePerShareHint')}
                        rules={[
                            { required: true },
                            {
                                type: 'integer',
                                min: 1,
                                message: t('fieldPricePerShareHint'),
                            },
                        ]}
                    >
                        <InputNumber min={1} precision={0} step={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="autoDrawOnSellout"
                        label={t('fieldAutoDrawOnSellout')}
                        valuePropName="checked"
                    >
                        <Checkbox>{t('fieldAutoDrawOnSellout')}</Checkbox>
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.autoDrawOnSellout !== cur.autoDrawOnSellout}>
                        {({ getFieldValue }) =>
                            getFieldValue('autoDrawOnSellout') ? (
                                <Form.Item
                                    name="autoDrawCountdownSeconds"
                                    label={t('fieldAutoDrawCountdownSeconds')}
                                    extra={t('fieldAutoDrawCountdownSecondsHint')}
                                    rules={[
                                        { required: true },
                                        { type: 'integer', min: 1, max: 3600, message: t('fieldAutoDrawCountdownSecondsHint') },
                                    ]}
                                >
                                    <InputNumber min={1} max={3600} precision={0} addonAfter={t('secondsUnit')} style={{ width: '100%' }} />
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>
                </Form>
            </Modal>

            <Drawer
                title={t('lotteryNumbersDetail')}
                width={720}
                open={Boolean(detailCampaign)}
                onClose={() => setDetailCampaign(null)}
            >
                {detailCampaign && numbersSummary ? (
                    <>
                        <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label={t('colCampaignProduct')}>
                                {detailCampaign.title} #{formatCampaignRoundNo(detailCampaign.roundNo)}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('colPricePerShare')}>
                                ₵{detailCampaign.pricePerShare}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('colAutoDrawOnSellout')}>
                                {detailCampaign.autoDrawOnSellout ? t('commonYes') : t('commonNo')}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('colAutoDrawCountdown')}>
                                {detailCampaign.autoDrawOnSellout
                                    ? `${detailCampaign.autoDrawCountdownSeconds}${t('secondsUnit')}`
                                    : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('colLotteryNumber')}>
                                {numbersSummary.total}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('numberStatusAvailable')}>
                                {numbersSummary.available}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('numberStatusSold')}>
                                {numbersSummary.sold}
                            </Descriptions.Item>
                            <Descriptions.Item label={t('designatedTag')} span={2}>
                                {numbersSummary.designatedWinningNumber || '-'}
                            </Descriptions.Item>
                        </Descriptions>
                        <Space wrap style={{ marginBottom: 16 }}>
                            <Input.Search
                                placeholder={t('searchLotteryNumber')}
                                allowClear
                                style={{ width: 200 }}
                                onSearch={(v) => {
                                    setNumberSearch(v);
                                    void loadNumbers(detailCampaign, 1, numberStatusFilter, v);
                                }}
                            />
                            {['all', 'available', 'sold'].map((s) => (
                                <Button
                                    key={s}
                                    size="small"
                                    type={numberStatusFilter === s ? 'primary' : 'default'}
                                    onClick={() => {
                                        setNumberStatusFilter(s);
                                        void loadNumbers(detailCampaign, 1, s, numberSearch);
                                    }}
                                >
                                    {s === 'all'
                                        ? t('all')
                                        : s === 'available'
                                          ? t('numberStatusAvailable')
                                          : t('numberStatusSold')}
                                </Button>
                            ))}
                        </Space>
                        <Table<LotteryNumberRow>
                            rowKey="id"
                            size="small"
                            loading={numbersLoading}
                            columns={numberColumns}
                            dataSource={numbers}
                            pagination={{
                                current: numberPage,
                                pageSize: 50,
                                total: numbersTotal,
                                showSizeChanger: false,
                                onChange: (p) => detailCampaign && void loadNumbers(detailCampaign, p),
                            }}
                        />
                    </>
                ) : null}
            </Drawer>

            <Modal
                title={t('designateWinning')}
                open={Boolean(designateCampaign)}
                onCancel={() => setDesignateCampaign(null)}
                onOk={() => void saveDesignate()}
                okText={t('save')}
                cancelText={t('cancel')}
                footer={(_, { OkBtn, CancelBtn }) => (
                    <>
                        <Button
                            onClick={() => {
                                if (!designateCampaign) return;
                                void (async () => {
                                    try {
                                        await ApiClient.designateCampaign(designateCampaign.id, null);
                                        message.success(t('campaignSaved'));
                                        setDesignateCampaign(null);
                                        await load();
                                    } catch (e) {
                                        logUnexpectedApiError(e);
                                        message.error(getApiErrorMessage(e, t('campaignActionFailed')));
                                    }
                                })();
                            }}
                        >
                            {t('clearDesignated')}
                        </Button>
                        <CancelBtn />
                        <OkBtn />
                    </>
                )}
            >
                <Typography.Paragraph type="secondary">{t('designateHint')}</Typography.Paragraph>
                <Select
                    showSearch
                    allowClear
                    style={{ width: '100%' }}
                    placeholder={t('fieldDesignatedNumber')}
                    value={designateNumber ?? undefined}
                    options={pickerOptions}
                    onChange={(v) => setDesignateNumber(v ?? null)}
                    filterOption={(input, option) =>
                        String(option?.label ?? '').includes(input) || String(option?.value ?? '').includes(input)
                    }
                />
            </Modal>
        </>
    );
};

export default CampaignList;
