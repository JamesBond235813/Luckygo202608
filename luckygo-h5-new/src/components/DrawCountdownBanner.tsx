import { formatDrawCountdown } from '../lib/format-countdown';
import { useDrawCountdown } from '../hooks/useDrawCountdown';
import { useI18n } from '../lib/useI18n';

export type DrawCountdownBannerProps = {
  remainingSeconds: number;
  enabled: boolean;
  onExpire?: () => void;
  compact?: boolean;
};

export function DrawCountdownBanner({
  remainingSeconds,
  enabled,
  onExpire,
  compact = false,
}: DrawCountdownBannerProps) {
  const { t } = useI18n();
  const tick = useDrawCountdown(remainingSeconds, enabled, onExpire);
  const display = formatDrawCountdown(tick);

  if (!enabled) return null;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50/90 px-2 py-1.5 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:ring-amber-800/60">
        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-200">{t('productDrawCountdown')}</span>
        <span className="font-mono text-[11px] font-black tabular-nums text-ghana-red">{display}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/40">
      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200 mb-1">{t('productSoldOutWaiting')}</p>
      <p className="text-[10px] text-amber-700/90 dark:text-amber-300/80 mb-2">{t('productDrawCountdownHint')}</p>
      <div className="flex items-baseline justify-center gap-2">
        <span className="text-xs font-bold text-amber-900 dark:text-amber-100">{t('productDrawCountdown')}</span>
        <span className="font-mono text-2xl font-black tabular-nums text-ghana-red">{display}</span>
      </div>
    </div>
  );
}
