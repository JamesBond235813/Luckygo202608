/** 与服务端 `age-policy.constants.ts` 保持一致；升级协议时需同步迁移存量用户 */
export const COMPLIANCE_POLICY_VERSION = '1';

export function formatAgeTemplate(text: string, minAge: number): string {
    return text.replace(/\{age\}/g, String(minAge));
}

export function isPolicyVersionStale(
    storedVersion: string | null | undefined,
    currentVersion: string = COMPLIANCE_POLICY_VERSION,
): boolean {
    const v = String(storedVersion ?? '').trim();
    return !v || v !== currentVersion;
}
