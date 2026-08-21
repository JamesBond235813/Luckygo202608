import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Row, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../../lib/api';
import { logUnexpectedApiError } from '../../lib/api-response';
import { FormSection, NumberField, SwitchField } from '../../components/admin-form';
import { useAdminI18n } from '../../lib/i18n';
import { INVITE_REWARDS_SETTING_KEY } from './constants';

export type InviteRewardsConfigForm = {
    enabled: boolean;
    signupInviterBeans: number;
    signupInviteeBeans: number;
    spendUnitGhs: number;
    spendBeansPerUnit: number;
};

const defaultForm: InviteRewardsConfigForm = {
    enabled: true,
    signupInviterBeans: 100,
    signupInviteeBeans: 100,
    spendUnitGhs: 100,
    spendBeansPerUnit: 100,
};

function normalizeForm(value: unknown): InviteRewardsConfigForm {
    const src =
        value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    const num = (key: keyof InviteRewardsConfigForm, fallback: number, min: number) => {
        const n = Number(src[key]);
        return Number.isFinite(n) ? Math.max(min, Math.round(n)) : fallback;
    };
    return {
        enabled: src.enabled !== false,
        signupInviterBeans: num('signupInviterBeans', defaultForm.signupInviterBeans, 0),
        signupInviteeBeans: num('signupInviteeBeans', defaultForm.signupInviteeBeans, 0),
        spendUnitGhs: num('spendUnitGhs', defaultForm.spendUnitGhs, 1),
        spendBeansPerUnit: num('spendBeansPerUnit', defaultForm.spendBeansPerUnit, 0),
    };
}

/** 系统配置 · 邀请有礼 */
export const InviteRewardsPanel = () => {
    const { message } = App.useApp();
    const { t } = useAdminI18n();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [form, setForm] = useState<InviteRewardsConfigForm>(defaultForm);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await ApiClient.getAppSettings();
            const row = rows.find((item) => item.key === INVITE_REWARDS_SETTING_KEY);
            setForm(normalizeForm(row?.value ?? defaultForm));
            setUpdatedAt(row?.updatedAt ?? null);
        } catch (e) {
            logUnexpectedApiError(e);
            setError(getApiErrorMessage(e, t('inviteRewardsLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const patch = (patchValue: Partial<InviteRewardsConfigForm>) => {
        setForm((prev) => ({ ...prev, ...patchValue }));
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await ApiClient.updateAppSetting(INVITE_REWARDS_SETTING_KEY, {
                value: form,
                description: t('inviteRewardsSettingDescription'),
                isPublic: true,
            });
            message.success(t('inviteRewardsSaved'));
            await load();
        } catch (e) {
            logUnexpectedApiError(e);
            setError(getApiErrorMessage(e, t('inviteRewardsSaveFailed')));
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
                        {t('systemConfigSectionInvite')}
                    </Typography.Title>
                    <Typography.Text type="secondary">{t('inviteRewardsSubtitle')}</Typography.Text>
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
                <SwitchField
                    label={t('inviteRewardsEnabled')}
                    checked={form.enabled}
                    checkedChildren={t('switchOn')}
                    unCheckedChildren={t('switchOff')}
                    onChange={(enabled) => patch({ enabled })}
                />

                <FormSection title={t('inviteRewardsSignupSection')}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <NumberField
                                label={t('fieldSignupInviterBeans')}
                                value={form.signupInviterBeans}
                                onChange={(v) => patch({ signupInviterBeans: v })}
                            />
                        </Col>
                        <Col xs={24} md={12}>
                            <NumberField
                                label={t('fieldSignupInviteeBeans')}
                                value={form.signupInviteeBeans}
                                onChange={(v) => patch({ signupInviteeBeans: v })}
                            />
                        </Col>
                    </Row>
                    <Typography.Text type="secondary">{t('inviteRewardsSignupHint')}</Typography.Text>
                </FormSection>

                <FormSection title={t('inviteRewardsSpendSection')}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <NumberField
                                label={t('fieldSpendUnitGhs')}
                                value={form.spendUnitGhs}
                                onChange={(v) => patch({ spendUnitGhs: Math.max(1, v) })}
                            />
                        </Col>
                        <Col xs={24} md={12}>
                            <NumberField
                                label={t('fieldSpendBeansPerUnit')}
                                value={form.spendBeansPerUnit}
                                onChange={(v) => patch({ spendBeansPerUnit: v })}
                            />
                        </Col>
                    </Row>
                    <Typography.Text type="secondary">{t('inviteRewardsSpendHint')}</Typography.Text>
                </FormSection>

                {updatedAt ? (
                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        {t('inviteRewardsUpdatedAt')}: {updatedAt}
                    </Typography.Text>
                ) : null}
            </Card>
        </div>
    );
};
