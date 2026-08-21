export type AgeGateStatus = 'adult' | 'minor' | '';

const STATUS_KEY = 'luckygo_age_gate_status';
const POLICY_KEY = 'luckygo_age_policy_version';

export function readAgeGateStatus(): AgeGateStatus {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw === 'adult' || raw === 'minor') return raw;
    return '';
}

export function readStoredPolicyVersion(): string {
    return localStorage.getItem(POLICY_KEY) ?? '';
}

export function setAgeGateAdult(policyVersion: string) {
    localStorage.setItem(STATUS_KEY, 'adult');
    localStorage.setItem(POLICY_KEY, policyVersion);
}

export function setAgeGateMinor() {
    localStorage.setItem(STATUS_KEY, 'minor');
    localStorage.removeItem(POLICY_KEY);
}

export function clearAgeGate() {
    localStorage.removeItem(STATUS_KEY);
    localStorage.removeItem(POLICY_KEY);
}

export function isPolicyVersionStale(currentVersion: string): boolean {
    const stored = readStoredPolicyVersion();
    const status = readAgeGateStatus();
    if (status !== 'adult') return false;
    return Boolean(stored && currentVersion && stored !== currentVersion);
}
