/** H5 用户资料：不返回数据库 id */
export function toH5UserProfile(row: Record<string, unknown>): Record<string, unknown> {
  const raw = row as Record<string, unknown>;
  const { id: _id, password_hash: _ph, age_confirmed_at, age_policy_version, ...rest } = raw;
  return {
    ...rest,
    ageConfirmed: Boolean(age_confirmed_at),
    agePolicyVersion:
      age_policy_version != null && String(age_policy_version).trim()
        ? String(age_policy_version).trim()
        : null,
  };
}
