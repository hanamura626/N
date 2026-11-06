import { Gauge, Layers, Shield, Zap, type LucideIcon } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import type { Account } from '@/types/accounts';

interface ProtocolStyle {
  icon: LucideIcon;
  badge: string;
}

const PROTOCOL_STYLES: Record<string, ProtocolStyle> = {
  VLESS: { icon: Zap, badge: 'bg-primary-container text-primary-on-container' },
  VMess: { icon: Layers, badge: 'bg-tertiary-container text-tertiary-on-container' },
  Trojan: { icon: Shield, badge: 'bg-secondary-container text-secondary-on-container' },
};

const FALLBACK_STYLE: ProtocolStyle = {
  icon: Gauge,
  badge: 'bg-surface-high text-on-surface',
};

interface AccountCardProps {
  account: Account;
}

export default function AccountCard({ account }: AccountCardProps) {
  const style = PROTOCOL_STYLES[account.protocol] ?? FALLBACK_STYLE;
  const Icon = style.icon;

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-outline-variant bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.badge}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-medium leading-[1.2] text-on-surface">{account.protocol}</h3>
            <p className="truncate text-sm leading-[1.5] text-on-surface-variant">{account.name}</p>
          </div>
        </div>
        <CopyButton text={account.link} label={account.protocol} />
      </div>
      <p className="max-h-24 overflow-hidden break-all rounded-2xl bg-surface-container p-4 font-mono text-xs leading-[1.5] text-on-surface-variant">
        {account.link}
      </p>
    </article>
  );
}
