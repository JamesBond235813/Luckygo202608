import type { DrawCountdownTick } from '../hooks/useDrawCountdown';

/** 开奖倒计时：分:秒.毫秒，如 02:45.999 */
export function formatDrawCountdown(tick: DrawCountdownTick | number): string {
  const totalSec = typeof tick === 'number' ? Math.max(0, Math.floor(tick)) : Math.max(0, tick.seconds);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const ms =
    typeof tick === 'number'
      ? 0
      : Math.max(0, Math.min(999, tick.milliseconds));
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
