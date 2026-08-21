import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Row, Typography } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { ApiClient, getApiErrorMessage } from '../../lib/api';
import { logUnexpectedApiError } from '../../lib/api-response';
import { CheckboxField, FormSection, NumberField } from '../../components/admin-form';
import { useAdminI18n } from '../../lib/i18n';
import { CHECKIN_REWARDS_SETTING_KEY } from './constants';

export type CheckinRewardsConfigForm = {
    enabled: boolean;
    dailyBeans: number;
    streakBonusEnabled: boolean;
    streakDays: number;
    streakBonusBeans: number;
};

const defaultForm: CheckinRewardsConfigForm = {
    enabled: true,
    dailyBeans: 50,
    streakBonusEnabled: true,
    streakDays: 7,
    streakBonusBeans: 100,
};

function normalizeForm(value: unknown): CheckinRewardsConfigForm {
    const src =
        value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    const num = (key: keyof CheckinRewardsConfigForm, fallback: number, min: number) => {
        const n = Number(src[key]);
        return Number.isFinite(n) ? Math.max(min, Math.round(n)) : fallback;
    };
    return {
        enabled: src.enabled !== false,
        dailyBeans: num('dailyBeans', defaultForm.dailyBeans, 0),
        streakBonusEnabled: src.streakBonusEnabled !== false,
        streakDays: num('streakDays', defaultForm.streakDays, 1),
        streakBonusBeans: num('streakBonusBeans', defaultForm.streakBonusBeans, 0),
    };
}

/** 系统配置 · 签到有礼 */
export const CheckinRewardsPanel = () => {
    const { message } = App.useApp();
    const { t } = useAdminI18n();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [form, setForm] = useState<CheckinRewardsConfigForm>(defaultForm);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rows = await ApiClient.getAppSettings();
            const row = rows.find((item) => item.key === CHECKIN_REWARDS_SETTING_KEY);
            setForm(normalizeForm(row?.value ?? defaultForm));
            setUpdatedAt(row?.updatedAt ?? null);
        } catch (e) {
            logUnexpectedApiError(e);
            setError(getApiErrorMessage(e, t('checkinRewardsLoadFailed')));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const patch = (patchValue: Partial<CheckinRewardsConfigForm>) => {
        setForm((prev) => ({ ...prev, ...patchValue }));
    };

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await ApiClient.updateAppSetting(CHECKIN_REWARDS_SETTING_KEY, {
                value: form,
                description: t('checkinRewardsSettingDescription'),
                isPublic: true,
            });
            message.success(t('checkinRewardsSaved'));
            await load();
        } catch (e) {
            logUnexpectedApiError(e);
            setError(getApiErrorMessage(e, t('checkinRewardsSaveFailed')));
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
                        {t('systemConfigSectionCheckin')}
                    </Typography.Title>
                    <Typography.Text type="secondary">{t('checkinRewardsSubtitle')}</Typography.Text>
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
                <CheckboxField
                    label={t('checkinRewardsEnabled')}
                    checked={form.enabled}
                    onChange={(enabled) => patch({ enabled })}
                />

                <FormSection title={t('checkinRewardsDailySection')}>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <NumberField
                                label={t('fieldCheckinDailyBeans')}
                                value={form.dailyBeans}
                                onChange={(v) => patch({ dailyBeans: v })}
                            />
                        </Col>
                    </Row>
                    <Typography.Text type="secondary">{t('checkinRewardsDailyHint')}</Typography.Text>
                </FormSection>

                <FormSection title={t('checkinRewardsStreakSection')}>
                    <CheckboxField
                        label={t('checkinRewardsStreakEnabled')}
                        checked={form.streakBonusEnabled}
                        onChange={(streakBonusEnabled) => patch({ streakBonusEnabled })}
                    />
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <NumberField
                                label={t('fieldCheckinStreakDays')}
                                value={form.streakDays}
                                onChange={(v) => patch({ streakDays: Math.max(1, v) })}
                            />
                        </Col>
                        <Col xs={24} md={12}>
                            <NumberField
                                label={t('fieldCheckinStreakBonusBeans')}
                                value={form.streakBonusBeans}
                                onChange={(v) => patch({ streakBonusBeans: v })}
                            />
                        </Col>
                    </Row>
                    <Typography.Text type="secondary">{t('checkinRewardsStreakHint')}</Typography.Text>
                </FormSection>

                {updatedAt ? (
                    <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        {t('checkinRewardsUpdatedAt')}: {updatedAt}
                    </Typography.Text>
                ) : null}
            </Card>
        </div>
    );
};
