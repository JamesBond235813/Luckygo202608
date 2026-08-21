import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, InputNumber, Row, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../../lib/api';
import { logUnexpectedApiError } from '../../lib/api-response';
import { FormSection, TextAreaField, TextField } from '../../components/admin-form';
import { useAdminI18n } from '../../lib/i18n';
import { BASIC_CONFIG_SETTING_KEY } from './constants';

export type BasicConfigForm = {
    supportPhone: string;
    supportEmail: string;
    supportWhatsapp: string;
    minAge: number;
    homeNoticeText: string;
};

const defaultForm: BasicConfigForm = {
    supportPhone: '',
    supportEmail: '',
    supportWhatsapp: '',
    minAge: 18,
    homeNoticeText: '',
};

function normalizeForm(value: unknown): BasicConfigForm {
    const src =
        value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    const str = (key: keyof BasicConfigForm) => String(src[key] ?? '').trim();
    const minAge = Number(src.minAge ?? 18);
    return {
        supportPhone: str('supportPhone'),
        supportEmail: str('supportEmail'),
        supportWhatsapp: str('supportWhatsapp'),
        minAge: Number.isFinite(minAge) && minAge >= 1 ? Math.round(minAge) : 18,
        homeNoticeText: String(src.homeNoticeText ?? src.home_notice_text ?? '').trim(),
    };
}

/** 系统配置 · 基础配置（frontend.general：最低年龄、客服联系方式） */
export const BasicConfigPanel = () => {
    const { message } = App.useApp();
    const { t } = useAdminI18n();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [form, setForm] = useState<BasicConfigForm>(defaultForm);
    const [storedValue, setStoredValue] = useState<Record<string, unknown>>({});

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await ApiClient.getAppSettings();
            const row = rows.find((item) => item.key === BASIC_CONFIG_SETTING_KEY);
            const raw =
                row?.value && typeof row.value === 'object' && !Array.isArray(row.value)
                    ? (row.value as Record<string, unknown>)
                    : {};
            setStoredValue(raw);
            setForm(normalizeForm(raw));
            setUpdatedAt(row?.updatedAt ?? null);
        } catch (e) {
            logUnexpectedApiError(e);
            setError(getApiErrorMessage(e, t('basicConfigLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const patch = (patchValue: Partial<BasicConfigForm>) => {
        setForm((prev) => ({ ...prev, ...patchValue }));
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await ApiClient.updateAppSetting(BASIC_CONFIG_SETTING_KEY, {
                value: {
                    ...storedValue,
                    supportPhone: form.supportPhone.trim(),
                    supportEmail: form.supportEmail.trim(),
                    supportWhatsapp: form.supportWhatsapp.trim(),
                    minAge: form.minAge,
                    homeNoticeText: form.homeNoticeText.trim(),
                },
                description: t('basicConfigSettingDescription'),
                isPublic: true,
            });
            message.success(t('basicConfigSaved'));
            await load();
        } catch (e) {
            logUnexpectedApiError(e);
            setError(getApiErrorMessage(e, t('basicConfigSaveFailed')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div
                style={{
                    marginBottom: 16,
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'flex-start',
                }}
            >
                <div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                        {t('systemConfigSectionBasic')}
                    </Typography.Title>
                    <Typography.Text type="secondary">{t('basicConfigSubtitle')}</Typography.Text>
                </div>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    disabled={loading}
                    onClick={() => void save()}
                >
                    {t('save')}
                </Button>
            </div>

            {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} /> : null}

            <Card loading={loading}>
                <FormSection title={t('sectionBasicAge')}>
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <div style={{ marginBottom: 8, fontWeight: 600 }}>{t('fieldBasicMinAge')}</div>
                            <InputNumber
                                min={1}
                                max={99}
                                precision={0}
                                style={{ width: '100%' }}
                                value={form.minAge}
                                onChange={(v) => patch({ minAge: Number(v ?? 18) })}
                            />
                        </Col>
                    </Row>
                    <Typography.Text type="secondary">{t('hintBasicMinAge')}</Typography.Text>
                </FormSection>

                <FormSection title={t('sectionHomeNotice')}>
                    <TextAreaField
                        label={t('fieldHomeNoticeText')}
                        value={form.homeNoticeText}
                        rows={4}
                        onChange={(v) => patch({ homeNoticeText: v })}
                    />
                    <Typography.Text type="secondary">{t('hintHomeNoticeText')}</Typography.Text>
                </FormSection>

                <FormSection title={t('sectionSupportContact')}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <TextField
                                label={t('fieldSupportPhone')}
                                value={form.supportPhone}
                                onChange={(v) => patch({ supportPhone: v })}
                            />
                        </Col>
                        <Col xs={24} md={12}>
                            <TextField
                                label={t('fieldSupportEmail')}
                                value={form.supportEmail}
                                onChange={(v) => patch({ supportEmail: v })}
                            />
                        </Col>
                        <Col xs={24}>
                            <TextField
                                label={t('fieldSupportWhatsapp')}
                                value={form.supportWhatsapp}
                                onChange={(v) => patch({ supportWhatsapp: v })}
                            />
                        </Col>
                    </Row>
                    <Typography.Text type="secondary">{t('hintSupportContact')}</Typography.Text>
                </FormSection>

                {updatedAt ? (
                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        {t('basicConfigUpdatedAt')}: {updatedAt}
                    </Typography.Text>
                ) : null}
            </Card>
        </div>
    );
};
