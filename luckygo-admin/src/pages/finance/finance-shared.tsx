import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ReloadOutlined } from '@ant-design/icons';
import { logUnexpectedApiError } from '../../lib/api-response';
import {
    formatTxAmountText,
    formatTxMethod,
    txAmountColor,
    txTypeLabel,
} from '../../lib/finance-labels';
import type { FinanceRecord } from '../../types';
import { useAdminI18n, type TranslationKey } from '../../lib/i18n';

const { RangePicker } = DatePicker;

/** 与 /campaigns 筛选栏一致的控件宽度 */
const FILTER_CONTROL_WIDTH = 200;
const FILTER_DATE_WIDTH = 240;

const filterControlStyle = { width: FILTER_CONTROL_WIDTH };
const filterDateStyle = { width: FILTER_DATE_WIDTH };

const currency = (value: number) =>
    `₵${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusTag = (status: string, t: (k: TranslationKey) => string) => {
    const s = String(status);
    if (s === 'Success') return <Tag color="success">{t('txStatusSuccess')}</Tag>;
    if (s === 'Processing') return <Tag color="warning">{t('txStatusProcessing')}</Tag>;
    if (s === 'Failed') return <Tag color="error">{t('txStatusFailed')}</Tag>;
    return <Tag>{s}</Tag>;
};

const paymentStatusTag = (status: string, t: (k: TranslationKey) => string) => {
    const s = String(status);
    const map: Record<string, { color: string; key: TranslationKey }> = {
        Unpaid: { color: 'default', key: 'paymentStatusUnpaid' },
        Paid: { color: 'success', key: 'paymentStatusPaid' },
        Refunding: { color: 'processing', key: 'paymentStatusRefunding' },
        Refunded: { color: 'purple', key: 'paymentStatusRefunded' },
        Processing: { color: 'default', key: 'paymentStatusUnpaid' },
        Success: { color: 'success', key: 'paymentStatusPaid' },
        Failed: { color: 'default', key: 'paymentStatusUnpaid' },
    };
    const hit = map[s];
    if (hit) return <Tag color={hit.color}>{t(hit.key)}</Tag>;
    return <Tag>{s}</Tag>;
};

type FinanceRecordVariant = 'payment' | 'withdrawal' | 'transaction';

/** 充值记录列宽合计，与 scroll.x 一致避免挤压 */
const PAYMENT_TABLE_SCROLL_X = 1580;

const renderPaymentMoney = (v: number | string | null | undefined) =>
    v != null && v !== '' ? (
        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{currency(Number(v))}</span>
    ) : (
        '-'
    );

const renderEllipsis = (value: string | null | undefined) => {
    const text = String(value ?? '').trim() || '-';
    if (text === '-') return text;
    return (
        <Tooltip title={text}>
            <span
                style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {text}
            </span>
        </Tooltip>
    );
};

const tableScrollX: Record<FinanceRecordVariant, number> = {
    payment: PAYMENT_TABLE_SCROLL_X,
    withdrawal: 1100,
    transaction: 1090,
};

type PaymentQuery = {
    userKeyword: string;
    status: string;
    clientReference: string;
    checkoutId: string;
    createdFrom?: string;
    createdTo?: string;
};

type TransactionQuery = {
    userKeyword: string;
    type: string;
    status: string;
    createdFrom?: string;
    createdTo?: string;
};

const EMPTY_PAYMENT_QUERY: PaymentQuery = {
    userKeyword: '',
    status: 'all',
    clientReference: '',
    checkoutId: '',
};

const EMPTY_TRANSACTION_QUERY: TransactionQuery = {
    userKeyword: '',
    type: 'all',
    status: 'all',
};

const matchUserKeyword = (row: FinanceRecord, keyword: string) => {
    const q = keyword.trim().toLowerCase();
    if (!q) return true;
    return (
        String(row.user_id).includes(q) ||
        (row.user_nickname ?? '').toLowerCase().includes(q) ||
        (row.user_phone ?? '').includes(keyword.trim())
    );
};

const matchCreatedRange = (createdAt: string, from?: string, to?: string) => {
    if (!from && !to) return true;
    const d = dayjs(createdAt);
    if (!d.isValid()) return false;
    if (from && d.isBefore(dayjs(from), 'day')) return false;
    if (to && d.isAfter(dayjs(to), 'day')) return false;
    return true;
};

type Props = {
    load: () => Promise<FinanceRecord[]>;
    showTypeColumn?: boolean;
    variant?: FinanceRecordVariant;
};

export function FinanceRecordsPage({
    load,
    showTypeColumn = false,
    variant = 'transaction',
}: Props) {
    const { t, tf } = useAdminI18n();
    const [rows, setRows] = useState<FinanceRecord[]>([]);
    const [search, setSearch] = useState('');
    const [paymentQuery, setPaymentQuery] = useState<PaymentQuery>(EMPTY_PAYMENT_QUERY);
    const [transactionQuery, setTransactionQuery] = useState<TransactionQuery>(EMPTY_TRANSACTION_QUERY);
    const [paymentDraft, setPaymentDraft] = useState<PaymentQuery>(EMPTY_PAYMENT_QUERY);
    const [transactionDraft, setTransactionDraft] = useState<TransactionQuery>(EMPTY_TRANSACTION_QUERY);
    const [paymentRangeDraft, setPaymentRangeDraft] = useState<[Dayjs, Dayjs] | null>(null);
    const [transactionRangeDraft, setTransactionRangeDraft] = useState<[Dayjs, Dayjs] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRows = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            setRows(await load());
        } catch (err) {
            logUnexpectedApiError(err);
            setError(t('financeLoadFailed'));
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [load, t]);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows]);

    const handlePaymentSearch = () => {
        setPaymentQuery({
            ...paymentDraft,
            createdFrom: paymentRangeDraft?.[0]?.format('YYYY-MM-DD'),
            createdTo: paymentRangeDraft?.[1]?.format('YYYY-MM-DD'),
        });
    };

    const handlePaymentReset = () => {
        setPaymentDraft(EMPTY_PAYMENT_QUERY);
        setPaymentRangeDraft(null);
        setPaymentQuery(EMPTY_PAYMENT_QUERY);
    };

    const handleTransactionSearch = () => {
        setTransactionQuery({
            ...transactionDraft,
            createdFrom: transactionRangeDraft?.[0]?.format('YYYY-MM-DD'),
            createdTo: transactionRangeDraft?.[1]?.format('YYYY-MM-DD'),
        });
    };

    const handleTransactionReset = () => {
        setTransactionDraft(EMPTY_TRANSACTION_QUERY);
        setTransactionRangeDraft(null);
        setTransactionQuery(EMPTY_TRANSACTION_QUERY);
    };

    const filtered = useMemo(() => {
        if (variant === 'payment') {
            return rows.filter((row) => {
                if (!matchUserKeyword(row, paymentQuery.userKeyword)) return false;
                if (paymentQuery.status !== 'all' && row.status !== paymentQuery.status) return false;
                const refQ = paymentQuery.clientReference.trim().toLowerCase();
                if (refQ && !(row.client_reference ?? '').toLowerCase().includes(refQ)) return false;
                const checkoutQ = paymentQuery.checkoutId.trim().toLowerCase();
                if (checkoutQ && !(row.checkout_id ?? '').toLowerCase().includes(checkoutQ)) return false;
                if (!matchCreatedRange(row.created_at, paymentQuery.createdFrom, paymentQuery.createdTo)) {
                    return false;
                }
                return true;
            });
        }

        if (variant === 'transaction') {
            return rows.filter((row) => {
                if (!matchUserKeyword(row, transactionQuery.userKeyword)) return false;
                if (transactionQuery.type !== 'all' && row.type !== transactionQuery.type) return false;
                if (transactionQuery.status !== 'all' && row.status !== transactionQuery.status) {
                    return false;
                }
                if (
                    !matchCreatedRange(row.created_at, transactionQuery.createdFrom, transactionQuery.createdTo)
                ) {
                    return false;
                }
                return true;
            });
        }

        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) => {
            const blob = [
                String(row.id),
                row.user_nickname,
                row.user_phone,
                row.type,
                row.status,
                row.method,
                row.channel,
                row.account_info,
                row.remark,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return blob.includes(q);
        });
    }, [rows, search, variant, paymentQuery, transactionQuery]);

    const paymentAmountColumns: ColumnsType<FinanceRecord> = [
        {
            title: t('colPaymentAmount'),
            dataIndex: 'amount',
            width: 108,
            align: 'right',
            render: renderPaymentMoney,
        },
        {
            title: t('colReceivedAmount'),
            dataIndex: 'hubtel_amount',
            width: 108,
            align: 'right',
            render: renderPaymentMoney,
        },
        {
            title: t('colPaymentFee'),
            dataIndex: 'fee',
            width: 88,
            align: 'right',
            render: renderPaymentMoney,
        },
    ];

    const columns: ColumnsType<FinanceRecord> = [
        ...(variant === 'withdrawal'
            ? [
                  {
                      title: t('colTxId'),
                      dataIndex: 'id',
                      width: 88,
                  } as const,
              ]
            : []),
        {
            title: t('colUser'),
            key: 'user',
            width: variant === 'payment' ? 132 : undefined,
            fixed: variant === 'payment' ? 'left' : undefined,
            ellipsis: variant === 'payment',
            render: (_, row) => (
                <>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.user_nickname || `#${row.user_id}`}
                    </div>
                    <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.user_phone || `ID ${row.user_id}`}
                    </div>
                </>
            ),
        },
        ...(showTypeColumn
            ? [
                  {
                      title: t('colTxType'),
                      dataIndex: 'type',
                      width: 120,
                      render: (type: string) => txTypeLabel(type, t),
                  } as const,
              ]
            : []),
        ...(variant !== 'payment'
            ? [
                  {
                      title: t('colTxAmountOrBeans'),
                      dataIndex: 'amount',
                      width: 132,
                      render: (_amount: number | string, row: FinanceRecord) => {
                          const color = txAmountColor(row);
                          return (
                              <span style={{ fontWeight: 600, color, whiteSpace: 'nowrap' }}>
                                  {formatTxAmountText(row, t)}
                              </span>
                          );
                      },
                  } as const,
              ]
            : []),
        {
            title: t('colTxStatus'),
            dataIndex: 'status',
            width: variant === 'payment' ? 92 : 110,
            render: (status: string) =>
                variant === 'payment' ? paymentStatusTag(status, t) : statusTag(status, t),
        },
        ...(variant === 'payment'
            ? [
                  {
                      title: t('colClientReference'),
                      dataIndex: 'client_reference',
                      width: 168,
                      ellipsis: { showTitle: false },
                      render: (v: string | null) => renderEllipsis(v),
                  } as const,
                  {
                      title: t('colTxnOrderNo'),
                      dataIndex: 'checkout_id',
                      width: 220,
                      ellipsis: { showTitle: false },
                      render: (v: string | null) => renderEllipsis(v),
                  } as const,
                  {
                      title: t('colPaymentType'),
                      dataIndex: 'payment_type',
                      width: 100,
                      ellipsis: { showTitle: false },
                      render: (v: string | null) => renderEllipsis(v),
                  } as const,
                  {
                      title: t('colPaymentChannel'),
                      dataIndex: 'channel',
                      width: 88,
                      ellipsis: { showTitle: false },
                      render: (v: string | null) => renderEllipsis(v),
                  } as const,
                  {
                      title: t('colPaymentAccount'),
                      dataIndex: 'payer_phone',
                      width: 126,
                      render: (v: string | null) => v || '-',
                  } as const,
                  ...paymentAmountColumns,
              ]
            : variant === 'withdrawal'
              ? [
                    {
                        title: t('colWithdrawChannel'),
                        dataIndex: 'channel',
                        width: 100,
                        render: (channel: string) => channel || '-',
                    } as const,
                    {
                        title: t('colWithdrawAccount'),
                        dataIndex: 'account_info',
                        width: 180,
                        ellipsis: true,
                        render: (v: string | null) => v || '-',
                    } as const,
                ]
              : [
                    {
                        title: t('colTxMethod'),
                        dataIndex: 'method',
                        width: 180,
                        ellipsis: true,
                        render: (method: string, row: FinanceRecord) =>
                            formatTxMethod(method, t, tf, row.asset),
                    } as const,
                ]),
        {
            title: t('colCreatedAt'),
            dataIndex: 'created_at',
            width: 166,
            render: (v: string) => (
                <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{v || '-'}</span>
            ),
        },
        ...(variant === 'payment' || variant === 'withdrawal' || variant === 'transaction'
            ? [
                  {
                      title: t('colUpdatedAt'),
                      dataIndex: 'updated_at',
                      width: 166,
                      render: (v: string | null | undefined) => (
                          <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{v || '-'}</span>
                      ),
                  } as const,
              ]
            : []),
    ];

    const paymentStatusOptions = ['all', 'Unpaid', 'Paid', 'Refunding', 'Refunded'] as const;
    const txTypeOptions = ['all', 'Recharge', 'Spend', 'Withdraw', 'Reward', 'BeanExchange'] as const;
    const txStatusOptions = ['all', 'Success', 'Processing', 'Failed'] as const;

    const paymentStatusLabel = (value: string) => {
        if (value === 'all') return t('financeFilterAll');
        const map: Record<string, TranslationKey> = {
            Unpaid: 'paymentStatusUnpaid',
            Paid: 'paymentStatusPaid',
            Refunding: 'paymentStatusRefunding',
            Refunded: 'paymentStatusRefunded',
        };
        return map[value] ? t(map[value]) : value;
    };

    const renderToolbar = () => {
        if (variant === 'payment') {
            return (
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
                        <Input
                            allowClear
                            placeholder={t('financeFilterUserPlaceholder')}
                            style={filterControlStyle}
                            value={paymentDraft.userKeyword}
                            onChange={(e) =>
                                setPaymentDraft((prev) => ({ ...prev, userKeyword: e.target.value }))
                            }
                            onPressEnter={handlePaymentSearch}
                        />
                        <Select
                            style={filterControlStyle}
                            value={paymentDraft.status}
                            onChange={(status) => setPaymentDraft((prev) => ({ ...prev, status }))}
                            options={paymentStatusOptions.map((value) => ({
                                value,
                                label: paymentStatusLabel(value),
                            }))}
                        />
                        <Input
                            allowClear
                            placeholder={t('financeFilterClientReferencePlaceholder')}
                            style={filterControlStyle}
                            value={paymentDraft.clientReference}
                            onChange={(e) =>
                                setPaymentDraft((prev) => ({
                                    ...prev,
                                    clientReference: e.target.value,
                                }))
                            }
                            onPressEnter={handlePaymentSearch}
                        />
                        <Input
                            allowClear
                            placeholder={t('financeFilterCheckoutIdPlaceholder')}
                            style={filterControlStyle}
                            value={paymentDraft.checkoutId}
                            onChange={(e) =>
                                setPaymentDraft((prev) => ({ ...prev, checkoutId: e.target.value }))
                            }
                            onPressEnter={handlePaymentSearch}
                        />
                        <RangePicker
                            value={paymentRangeDraft}
                            onChange={(values) => setPaymentRangeDraft(values as [Dayjs, Dayjs] | null)}
                            placeholder={[t('filterCreatedRange'), t('filterCreatedRange')]}
                            style={filterDateStyle}
                        />
                        <Button type="primary" onClick={handlePaymentSearch}>
                            {t('search')}
                        </Button>
                        <Button onClick={handlePaymentReset}>{t('filterReset')}</Button>
                    </Space>
                    <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={() => void fetchRows()} loading={loading}>
                            {t('refresh')}
                        </Button>
                    </Space>
                </div>
            );
        }

        if (variant === 'transaction') {
            return (
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
                        <Input
                            allowClear
                            placeholder={t('financeFilterUserPlaceholder')}
                            style={filterControlStyle}
                            value={transactionDraft.userKeyword}
                            onChange={(e) =>
                                setTransactionDraft((prev) => ({
                                    ...prev,
                                    userKeyword: e.target.value,
                                }))
                            }
                            onPressEnter={handleTransactionSearch}
                        />
                        <Select
                            style={filterControlStyle}
                            value={transactionDraft.type}
                            onChange={(type) => setTransactionDraft((prev) => ({ ...prev, type }))}
                            options={txTypeOptions.map((value) => ({
                                value,
                                label: value === 'all' ? t('financeFilterAll') : txTypeLabel(value, t),
                            }))}
                        />
                        <Select
                            style={filterControlStyle}
                            value={transactionDraft.status}
                            onChange={(status) =>
                                setTransactionDraft((prev) => ({ ...prev, status }))
                            }
                            options={txStatusOptions.map((value) => ({
                                value,
                                label:
                                    value === 'all'
                                        ? t('financeFilterAll')
                                        : value === 'Success'
                                          ? t('txStatusSuccess')
                                          : value === 'Processing'
                                            ? t('txStatusProcessing')
                                            : t('txStatusFailed'),
                            }))}
                        />
                        <RangePicker
                            value={transactionRangeDraft}
                            onChange={(values) =>
                                setTransactionRangeDraft(values as [Dayjs, Dayjs] | null)
                            }
                            placeholder={[t('filterCreatedRange'), t('filterCreatedRange')]}
                            style={filterDateStyle}
                        />
                        <Button type="primary" onClick={handleTransactionSearch}>
                            {t('search')}
                        </Button>
                        <Button onClick={handleTransactionReset}>{t('filterReset')}</Button>
                    </Space>
                    <Space wrap>
                        <Button icon={<ReloadOutlined />} onClick={() => void fetchRows()} loading={loading}>
                            {t('refresh')}
                        </Button>
                    </Space>
                </div>
            );
        }

        return (
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
                <Input
                    allowClear
                    placeholder={t('financeSearchPlaceholder')}
                    style={{ width: 320 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <Button icon={<ReloadOutlined />} onClick={() => void fetchRows()} loading={loading}>
                    {t('refresh')}
                </Button>
            </div>
        );
    };

    return (
        <>
            {renderToolbar()}
            {error ? <p style={{ color: '#cf1322', marginBottom: 16 }}>{error}</p> : null}
            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={filtered}
                tableLayout={variant === 'payment' ? 'fixed' : 'auto'}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                scroll={{ x: tableScrollX[variant] }}
            />
        </>
    );
}
