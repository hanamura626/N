import { AlertTriangle, Globe, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { AccountStatus } from '@/types/accounts';

const STATUS_STYLES: Record<AccountStatus, { label: string; className: string }> = {
  starting: { label: 'Menyiapkan', className: 'bg-tertiary-container text-tertiary-on-container' },
  ready: { label: 'Aktif', className: 'bg-success-container text-success-on-container' },
  error: { label: 'Gagal', className: 'bg-error-container text-error-on-container' },
};

interface HeaderProps {
  status: AccountStatus | null;
  domain: string;
  onReload: () => void;
  loading: boolean;
}

export default function Header({ status, domain, onReload, loading }: HeaderProps) {
  const statusStyle = status ? STATUS_STYLES[status] : null;

  return (
    <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-on">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium text-on-surface">Akun VPN</h1>
            {domain ? (
              <p className="flex items-center gap-1 truncate text-sm text-on-surface-variant">
                <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{domain}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusStyle ? (
            <span className={`hidden items-center gap-2 rounded-full px-3 py-1 text-sm font-medium sm:inline-flex ${statusStyle.className}`}>
              {status === 'starting' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              {status === 'error' ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {statusStyle.label}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            aria-label="Muat ulang akun"
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
