import {
    supportEmailHref,
    supportPhoneHref,
    supportWhatsappHref,
    type SupportContactConfig,
} from '../lib/support-config';
import { useI18n } from '../lib/useI18n';

type Props = {
    config: SupportContactConfig;
    className?: string;
};

const linkClass =
    'block rounded-xl p-3 text-sm font-bold transition-colors active:scale-[0.99]';

export function SupportContactLinks({ config, className = 'space-y-3' }: Props) {
    const { t } = useI18n();

    const items = [
        config.phone && supportPhoneHref(config.phone)
            ? {
                  key: 'phone',
                  href: supportPhoneHref(config.phone)!,
                  label: t('mePhoneSupport'),
                  className:
                      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
              }
            : null,
        config.email && supportEmailHref(config.email)
            ? {
                  key: 'email',
                  href: supportEmailHref(config.email)!,
                  label: t('meEmailSupport'),
                  className: 'bg-gray-50 text-gray-700 dark:bg-slate-800 dark:text-slate-200',
              }
            : null,
        config.whatsapp && supportWhatsappHref(config.whatsapp)
            ? {
                  key: 'whatsapp',
                  href: supportWhatsappHref(config.whatsapp)!,
                  label: t('meWhatsappSupport'),
                  className: 'bg-green-50 text-ghana-green dark:bg-green-950/40',
                  external: true,
              }
            : null,
    ].filter(Boolean) as Array<{
        key: string;
        href: string;
        label: string;
        className: string;
        external?: boolean;
    }>;

    if (!items.length) return null;

    return (
        <div className={className}>
            {items.map((item) => (
                <a
                    key={item.key}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noreferrer' : undefined}
                    className={`${linkClass} ${item.className}`}
                >
                    {item.label}
                </a>
            ))}
        </div>
    );
}
