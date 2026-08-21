import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { App, Button, Form, Input, Modal, Select, Space, Table, Image } from 'antd';
import { ImageUpload } from '../components/ImageUpload';
import { resolveAssetUrl } from '../lib/asset-url';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PartitionOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import type { Product, ProductCategory, ProductPayload } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useAdminI18n } from '../lib/i18n';

const ProductList = () => {
    const { message, modal } = App.useApp();
    const { t } = useAdminI18n();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [form] = Form.useForm<ProductPayload>();

    const fetchProducts = async () => {
        setLoading(true);
        try {
            setProducts(await ApiClient.getProducts());
        } catch (e) {
            logUnexpectedApiError(e);
            message.error(getApiErrorMessage(e, t('saveProductFailed')));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchProducts();
        void ApiClient.getProductCategories()
            .then(setCategories)
            .catch((e) => logUnexpectedApiError(e));
    }, []);

    const filtered = useMemo(
        () => products.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())),
        [products, search],
    );

    const openCreate = () => {
        setEditingId(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (product: Product) => {
        setEditingId(product.id);
        form.setFieldsValue({
            title: product.title,
            description: product.description,
            image: product.image,
            tag: product.tag,
            categoryId: product.categoryId ?? undefined,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        const values = await form.validateFields();
        try {
            if (editingId) await ApiClient.updateProduct(editingId, values);
            else await ApiClient.createProduct(values);
            message.success(t('savedSuccessfully'));
            setModalOpen(false);
            await fetchProducts();
        } catch (e) {
            message.error(getApiErrorMessage(e, t('saveProductFailed')));
        }
    };

    const handleDelete = (id: number) => {
        modal.confirm({
            title: t('confirmDeleteProduct'),
            okType: 'danger',
            onOk: async () => {
                try {
                    await ApiClient.deleteProduct(id);
                    message.success(t('savedSuccessfully'));
                    await fetchProducts();
                } catch (e) {
                    message.error(getApiErrorMessage(e, t('deleteFailed')));
                }
            },
        });
    };

    const columns: ColumnsType<Product> = [
        {
            title: t('colProduct'),
            dataIndex: 'title',
            render: (_, p) => (
                <Space>
                    <Image src={resolveAssetUrl(p.image)} width={48} height={48} style={{ borderRadius: 8, objectFit: 'cover' }} preview={false} />
                    <div>
                        <div style={{ fontWeight: 500 }}>{p.title}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>ID: {p.id}</div>
                    </div>
                </Space>
            ),
        },
        {
            title: t('fieldTag'),
            dataIndex: 'tag',
            width: 140,
            render: (tag) => tag || '-',
        },
        {
            title: t('actions'),
            key: 'actions',
            width: 120,
            render: (_, p) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => openEdit(p)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(p.id)} />
                </Space>
            ),
        },
    ];

    return (
        <>
            <PageHeader
                extra={
                    <Space wrap>
                        <Link to="/campaigns">
                            <Button icon={<PartitionOutlined />}>{t('campaigns')}</Button>
                        </Link>
                        <Button icon={<ReloadOutlined />} onClick={() => void fetchProducts()}>
                            {t('refresh')}
                        </Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                            {t('addProduct')}
                        </Button>
                    </Space>
                }
            />

            <Input.Search
                style={{ maxWidth: 360, marginBottom: 16 }}
                placeholder={t('searchProducts')}
                allowClear
                onSearch={setSearch}
                onChange={(e) => setSearch(e.target.value)}
            />

            <Table<Product>
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={filtered}
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: loading ? t('loadingProducts') : t('noProductsMatch') }}
            />

            <Modal
                title={editingId ? t('editProduct') : t('newProduct')}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => void handleSave()}
                okText={t('save')}
                cancelText={t('cancel')}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="title" label={t('fieldTitle')} rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="image" label={t('fieldProductImage')} extra={t('uploadImageHint')}>
                        <ImageUpload />
                    </Form.Item>
                    <Form.Item name="description" label={t('fieldDescription')}>
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="tag" label={t('fieldTag')}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="categoryId" label={t('fieldProductCategory')}>
                        <Select
                            allowClear
                            placeholder={t('fieldProductCategory')}
                            options={categories.map((c) => ({
                                value: c.id,
                                label: c.nameZh ? `${c.nameZh} (${c.name})` : c.name,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ProductList;
