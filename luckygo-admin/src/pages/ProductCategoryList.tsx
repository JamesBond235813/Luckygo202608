import { useEffect, useMemo, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import type { ProductCategory, ProductCategoryPayload } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useAdminI18n } from '../lib/i18n';

const ProductCategoryList = () => {
    const { message, modal } = App.useApp();
    const { t } = useAdminI18n();
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm<ProductCategoryPayload>();

    const fetchCategories = async () => {
        setLoading(true);
        try {
            setCategories(await ApiClient.getProductCategories());
        } catch (e) {
            logUnexpectedApiError(e);
            message.error(getApiErrorMessage(e, t('saveCategoryFailed')));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchCategories();
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return categories.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.nameZh.toLowerCase().includes(q),
        );
    }, [categories, search]);

    const openCreate = () => {
        setEditingId(null);
        form.setFieldsValue({ name: '', nameZh: '', sortOrder: 0 });
        setModalOpen(true);
    };

    const openEdit = (category: ProductCategory) => {
        setEditingId(category.id);
        form.setFieldsValue({
            name: category.name,
            nameZh: category.nameZh,
            sortOrder: category.sortOrder,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        try {
            if (editingId) await ApiClient.updateProductCategory(editingId, values);
            else await ApiClient.createProductCategory(values);
            message.success(t('savedSuccessfully'));
            setModalOpen(false);
            await fetchCategories();
        } catch (e) {
            message.error(getApiErrorMessage(e, t('saveCategoryFailed')));
        }
    };

    const handleDelete = (id: number) => {
        modal.confirm({
            title: t('confirmDeleteCategory'),
            onOk: async () => {
                try {
                    await ApiClient.deleteProductCategory(id);
                    message.success(t('savedSuccessfully'));
                    await fetchCategories();
                } catch (e) {
                    message.error(getApiErrorMessage(e, t('deleteFailed')));
                }
            },
        });
    };

    const columns: ColumnsType<ProductCategory> = [
        { title: t('colCategoryName'), dataIndex: 'name', width: 160 },
        {
            title: t('colCategoryNameZh'),
            dataIndex: 'nameZh',
            width: 140,
            render: (v) => v || '-',
        },
        { title: t('colSortOrder'), dataIndex: 'sortOrder', width: 100 },
        {
            title: t('actions'),
            key: 'actions',
            width: 120,
            render: (_, row) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(row)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row.id)} />
                </Space>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={() => void fetchCategories()}>
                            {t('refresh')}
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            {t('addCategory')}
                        </Button>
                    </Space>
                }
            />

            <Input.Search
                placeholder={t('searchCategories')}
                allowClear
                onSearch={setSearch}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 16, maxWidth: 360 }}
            />

            <Table<ProductCategory>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={filtered}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                locale={{ emptyText: loading ? t('loadingCategories') : t('noCategoriesMatch') }}
            />

            <Modal
                title={editingId ? t('editCategory') : t('newCategory')}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => void handleSave()}
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="name" label={t('fieldCategoryName')} rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="nameZh" label={t('fieldCategoryNameZh')}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="sortOrder" label={t('fieldSortOrder')} rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ProductCategoryList;
