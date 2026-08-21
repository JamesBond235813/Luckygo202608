import { useEffect, useMemo, useState } from 'react';
import { App, Avatar, Button, Form, Input, InputNumber, Modal, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { cellText } from '../lib/cell';
import type { User } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useAdminI18n } from '../lib/i18n';

const UserList = () => {
    const { message } = App.useApp();
    const { t, tf } = useAdminI18n();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm<{
        nickname: string;
        balance: number;
        exchange_balance: number;
        beans: number;
        newPassword?: string;
    }>();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            setUsers(await ApiClient.getUsers());
        } catch (error) {
            logUnexpectedApiError(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchUsers();
    }, []);

    const filteredUsers = useMemo(
        () =>
            users.filter((u) => {
                const q = search.toLowerCase();
                return (
                    u.nickname.toLowerCase().includes(q) ||
                    u.phone?.includes(search) ||
                    (u.invite_code || '').toLowerCase().includes(q) ||
                    (u.inviter_nickname || '').toLowerCase().includes(q) ||
                    (u.inviter_phone || '').includes(search)
                );
            }),
        [users, search],
    );

    const openEdit = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            nickname: user.nickname,
            balance: user.balance,
            exchange_balance: user.exchange_balance,
            beans: user.beans,
            newPassword: '',
        });
    };

    const handleUpdate = async () => {
        if (!editingUser?.invite_code) return;
        const values = await form.validateFields();
        const newPassword = String(values.newPassword ?? '').trim();
        try {
            await ApiClient.updateUser(editingUser.invite_code, {
                nickname: values.nickname,
                balance: values.balance,
                exchange_balance: values.exchange_balance,
                beans: values.beans,
            });
            if (newPassword) {
                if (newPassword.length < 6) {
                    message.error(t('userPasswordTooShort'));
                    return;
                }
                await ApiClient.resetUserPassword(editingUser.invite_code, newPassword);
            }
            message.success(newPassword ? t('userUpdatedAndPasswordReset') : t('userUpdated'));
            setEditingUser(null);
            await fetchUsers();
        } catch (e) {
            message.error(getApiErrorMessage(e, newPassword ? t('userPasswordResetFailed') : t('userUpdateFailed')));
        }
    };

    const formatMoney = (v: number) => `₵${Number(v).toFixed(2)}`;

    const columns: ColumnsType<User> = [
        {
            title: t('colUser'),
            key: 'user',
            render: (_, user) => (
                <Space>
                    <Avatar src={user.avatar || undefined}>{user.nickname?.[0]}</Avatar>
                    <div>
                        <div>{cellText(user.nickname)}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{cellText(user.phone)}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: t('colInviteCode'),
            dataIndex: 'invite_code',
            render: (v: string | undefined) => cellText(v),
        },
        {
            title: t('colInviter'),
            key: 'inviter',
            render: (_, user) => {
                if (!user.inviter_nickname && !user.inviter_phone) return '-';
                const name = cellText(user.inviter_nickname);
                const phone = user.inviter_phone ? ` · ${user.inviter_phone}` : '';
                return `${name}${phone}`;
            },
        },
        {
            title: t('colBalance'),
            dataIndex: 'balance',
            render: (v) => formatMoney(Number(v)),
        },
        {
            title: t('colExchangeBalance'),
            dataIndex: 'exchange_balance',
            render: (v) => formatMoney(Number(v)),
        },
        {
            title: t('colBeans'),
            dataIndex: 'beans',
            render: (v) => cellText(v != null ? Number(v).toLocaleString() : null),
        },
        {
            title: t('colCreatedAt'),
            dataIndex: 'created_at',
            render: (v) => cellText(v),
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 80,
            fixed: 'right',
            render: (_, user) => (
                <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(user)} />
            ),
        },
    ];

    return (
        <>
            <PageHeader
                extra={
                    <Button icon={<ReloadOutlined />} onClick={() => void fetchUsers()}>
                        {t('refresh')}
                    </Button>
                }
            />

            <Input.Search
                placeholder={t('searchUsers')}
                allowClear
                onSearch={setSearch}
                onChange={(e) => setSearch(e.target.value)}
                style={{ maxWidth: 360, marginBottom: 16 }}
            />

            <Table
                rowKey="invite_code"
                loading={loading}
                columns={columns}
                dataSource={filteredUsers}
                scroll={{ x: 960 }}
                pagination={{ pageSize: 15, showSizeChanger: true }}
                locale={{ emptyText: loading ? t('loadingUsers') : t('noUsersMatch') }}
            />

            <Modal
                title={editingUser ? tf('editUserTitle', { name: editingUser.nickname }) : ''}
                open={Boolean(editingUser)}
                onCancel={() => setEditingUser(null)}
                onOk={() => void handleUpdate()}
                okText={t('saveChanges')}
                cancelText={t('cancel')}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="nickname" label={t('fieldNickname')} rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="balance" label={t('fieldBalance')} rules={[{ required: true }]}>
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="exchange_balance" label={t('fieldExchangeBalance')} rules={[{ required: true }]}>
                        <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="beans" label={t('fieldBeans')} rules={[{ required: true }]}>
                        <InputNumber min={0} step={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="newPassword" label={t('fieldNewLoginPassword')} extra={t('fieldNewLoginPasswordHint')}>
                        <Input.Password autoComplete="new-password" placeholder={t('fieldNewLoginPasswordPlaceholder')} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default UserList;
