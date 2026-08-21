/** 表格空值统一显示为半角 `-` */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const text = String(value).trim();
  return text.length > 0 ? text : '-';
}
