import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import AccountCard from '@/components/AccountCard';
import Header from '@/components/Header';
import { useAccounts } from '@/hooks/useAccounts';

function SkeletonGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-40 animate-pulse rounded-3xl border border-outline-variant bg-surface-container" />
      ))}
    </div>
  );
}

interface NoticeProps {
  title: string;
  description: string;
  onRetry?: () => void;
  icon: 'error' | 'empty';
}

function Notice({ title, description, onRetry, icon }: NoticeProps) {
  const Icon = icon === 'error' ? AlertTriangle : Inbox;
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-outline-variant bg-white px-6 py-12 text-center animate-fade-up">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          icon === 'error' ? 'bg-error-container text-error-on-container' : 'bg-surface-high text-on-surface-variant'
        }`}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-medium leading-[1.2] text-on-surface">{title}</h2>
        <p className="text-base leading-[1.5] text-on-surface-variant">{description}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-on transition-all duration-200 hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}

export default function App() {
  const { data, error, loading, reload } = useAccounts();

  const renderBody = () => {
    if (!data) {
      if (error) {
        return (
          <Notice
            icon="error"
            title="Tidak bisa memuat akun"
            description="Periksa koneksi Anda, lalu coba lagi."
            onRetry={reload}
          />
        );
      }
      return <SkeletonGrid />;
    }

    if (data.status === 'starting') {
      return (
        <div className="space-y-6">
          <Notice
            icon="empty"
            title="Layanan sedang disiapkan"
            description="Halaman ini akan memperbarui sendiri begitu akun siap digunakan."
          />
          <SkeletonGrid />
        </div>
      );
    }

    if (data.status === 'error') {
      return (
        <Notice
          icon="error"
          title="Layanan belum berjalan"
          description={data.message || 'Terjadi kesalahan saat menyiapkan layanan.'}
          onRetry={reload}
        />
      );
    }

    if (data.accounts.length === 0) {
      return (
        <Notice
          icon="empty"
          title="Belum ada akun"
          description="Layanan aktif, tetapi belum ada akun yang dibuat."
        />
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {data.accounts.map((account, index) => (
          <div key={account.id} className="animate-fade-up" style={{ animationDelay: `${index * 60}ms` }}>
            <AccountCard account={account} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Header
        status={data?.status ?? null}
        domain={data?.argoDomain ?? ''}
        onReload={reload}
        loading={loading}
      />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="mb-8 space-y-2">
          <h2 className="text-2xl font-medium leading-[1.2] text-on-surface sm:text-3xl">Akun Anda</h2>
          <p className="max-w-2xl text-base leading-[1.5] text-on-surface-variant">
            Tekan tombol Salin pada akun yang ingin dipakai, lalu tempel di aplikasi klien Anda.
          </p>
        </section>
        {renderBody()}
      </main>
    </div>
  );
}
