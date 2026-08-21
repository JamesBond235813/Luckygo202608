import { useEffect, useState } from 'react';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import { ApiClient, getApiErrorMessage } from '../lib/api';
import { resolveAssetUrl } from '../lib/asset-url';
import { useAdminI18n } from '../lib/i18n';

type ImageUploadProps = {
    value?: string;
    onChange?: (url: string) => void;
};

export const ImageUpload = ({ value, onChange }: ImageUploadProps) => {
    const { message } = App.useApp();
    const { t } = useAdminI18n();
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    useEffect(() => {
        if (value) {
            setFileList([
                {
                    uid: '-1',
                    name: 'image',
                    status: 'done',
                    url: resolveAssetUrl(value),
                },
            ]);
        } else {
            setFileList([]);
        }
    }, [value]);

    const customRequest: UploadProps['customRequest'] = async (options) => {
        const { file, onSuccess, onError } = options;
        setUploading(true);
        try {
            const { url } = await ApiClient.uploadImage(file as File);
            onChange?.(url);
            onSuccess?.({ url });
        } catch (e) {
            message.error(getApiErrorMessage(e, t('uploadImageFailed')));
            onError?.(e as Error);
        } finally {
            setUploading(false);
        }
    };

    const handleChange: UploadProps['onChange'] = ({ fileList: next }) => {
        setFileList(next);
        if (next.length === 0) {
            onChange?.('');
        }
    };

    const handleRemove = () => {
        onChange?.('');
        return true;
    };

    return (
        <Upload
            listType="picture-card"
            fileList={fileList}
            maxCount={1}
            accept="image/jpeg,image/png,image/webp,image/gif"
            customRequest={customRequest}
            onChange={handleChange}
            onRemove={handleRemove}
            showUploadList={{ showPreviewIcon: true }}
        >
            {fileList.length >= 1 ? null : (
                <button type="button" style={{ border: 0, background: 'none' }}>
                    {uploading ? <LoadingOutlined /> : <PlusOutlined />}
                    <div style={{ marginTop: 8 }}>{t('uploadImage')}</div>
                </button>
            )}
        </Upload>
    );
};
