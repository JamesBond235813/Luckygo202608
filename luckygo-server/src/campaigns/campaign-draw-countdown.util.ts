import { DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS } from './campaigns.constants';

export interface DrawCountdownRowInput {
  status: string;
  auto_draw_on_sellout: number | boolean;
  sellout_at: Date | string | null;
  auto_draw_countdown_seconds?: number | null;
}

export function mapDrawCountdownFields(row: DrawCountdownRowInput): Record<string, unknown> {
  const seconds = Number(row.auto_draw_countdown_seconds) || DEFAULT_AUTO_DRAW_COUNTDOWN_SECONDS;
  const selloutAt = row.sellout_at ? new Date(row.sellout_at).toISOString() : null;
  let drawScheduledAt: string | null = null;
  let drawCountdownRemaining = 0;
  let drawPending = false;

  const autoDraw = Boolean(row.auto_draw_on_sellout);
  if (row.status === 'sold_out' && autoDraw && row.sellout_at) {
    drawPending = true;
    const selloutMs = new Date(row.sellout_at).getTime();
    const drawAtMs = selloutMs + seconds * 1000;
    drawScheduledAt = new Date(drawAtMs).toISOString();
    const remainingRaw = Math.ceil((drawAtMs - Date.now()) / 1000);
    if (remainingRaw <= 0) {
      drawCountdownRemaining = 0;
    } else {
      drawCountdownRemaining = Math.min(remainingRaw, seconds);
    }
  } else if (row.status === 'drawing' && autoDraw) {
    drawPending = true;
    drawCountdownRemaining = 0;
  }

  return {
    autoDrawCountdownSeconds: seconds,
    selloutAt,
    drawScheduledAt,
    drawCountdownRemaining,
    drawPending,
  };
}
