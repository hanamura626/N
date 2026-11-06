import { useCallback, useEffect, useState } from 'react';
import { parseAccountsResponse, type AccountsResponse } from '@/types/accounts';

const POLL_INTERVAL_MS = 3000;

export function useAccounts() {
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounts', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parseAccountsResponse(await response.json());
      setData(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat akun');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data || data.status !== 'starting') return;
    const timer = window.setTimeout(load, POLL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [data, load]);

  return { data, error, loading, reload: load };
}
