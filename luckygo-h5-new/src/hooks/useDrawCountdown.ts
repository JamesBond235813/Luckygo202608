import { useEffect, useRef, useState } from 'react';

export type DrawCountdownTick = {
  seconds: number;
  milliseconds: number;
};

/** 开奖倒计时：总秒数 + 每秒内毫秒 999→0（约 2 秒走完一圈，视觉减半） */
export function useDrawCountdown(
  remainingSeconds: number | undefined,
  enabled: boolean,
  onExpire?: () => void,
): DrawCountdownTick {
  const endAtRef = useRef(0);
  const expiredRef = useRef(false);
  const [tick, setTick] = useState<DrawCountdownTick>({ seconds: 0, milliseconds: 0 });

  useEffect(() => {
    expiredRef.current = false;
    if (!enabled) {
      const timer = window.setTimeout(() => setTick({ seconds: 0, milliseconds: 0 }), 0);
      return () => window.clearTimeout(timer);
    }
    const sec = Math.max(0, remainingSeconds ?? 0);
    endAtRef.current = Date.now() + sec * 1000;
    const timer = window.setTimeout(() => setTick({ seconds: sec, milliseconds: 999 }), 0);
    return () => window.clearTimeout(timer);
  }, [enabled, remainingSeconds]);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    const loop = () => {
      const left = Math.max(0, endAtRef.current - Date.now());
      const seconds = Math.floor(left / 1000);
      const subMs = left % 1000;
      const milliseconds = 999 - Math.floor((subMs * 999) / 2000);

      setTick({ seconds, milliseconds });

      if (left <= 0) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire?.();
        }
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, remainingSeconds, onExpire]);

  return tick;
}
