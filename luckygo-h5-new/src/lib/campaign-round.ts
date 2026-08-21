/** 期号展示：0518001 */
export function formatCampaignRoundNo(roundNo: number): string {
    if (!Number.isFinite(roundNo) || roundNo <= 0) return '';
    return String(Math.trunc(roundNo)).padStart(7, '0');
}
