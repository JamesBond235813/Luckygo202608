import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Typography } from 'antd';
import { ApiClient, getApiErrorMessage, setAuthToken } from '../lib/api';
import { logUnexpectedApiError } from '../lib/api-response';
import { adminLanguages, useAdminI18n, type AdminLanguage } from '../lib/i18n';

interface Props {
    onLoginSuccess: () => void;
}

const Login = ({ onLoginSuccess }: Props) => {
    const { language, setLanguage, t } = useAdminI18n();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (values: { phone: string; password: string }) => {
        setError('');
        setLoading(true);
        try {
            const res = await ApiClient.login(values.phone, values.password);
            setAuthToken(res.token);
            onLoginSuccess();
        } catch (err: unknown) {
            logUnexpectedApiError(err);
            setError(getApiErrorMessage(err, t('loginFailed')));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                background: 'linear-gradient(135deg, #ecfdf5 0%, #f9fafb 100%)',
            }}
        >
            <Card style={{ width: '100%', maxWidth: 420 }} bordered={false}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Typography.Title level={3} style={{ marginBottom: 4 }}>
                        {t('signInTitle')}
                    </Typography.Title>
                    <Typography.Text type="secondary">{t('signInSubtitle')}</Typography.Text>
                </div>

                <Form.Item label={t('adminLanguage')} style={{ marginBottom: 16 }}>
                    <Select
                        value={language}
                        onChange={(v) => setLanguage(v as AdminLanguage)}
                        options={adminLanguages.map((item) => ({
                            value: item.code,
                            label: item.nativeName,
                        }))}
                    />
                </Form.Item>

                {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}

                <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
                    <Form.Item
                        name="phone"
                        label={t('username')}
                        rules={[{ required: true, message: t('username') }]}
                    >
                        <Input autoComplete="username" size="large" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label={t('password')}
                        rules={[{ required: true, message: t('password') }]}
                    >
                        <Input.Password autoComplete="current-password" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large">
                        {t('signIn')}
                    </Button>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
