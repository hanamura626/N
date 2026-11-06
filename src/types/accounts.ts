export type AccountStatus = 'starting' | 'ready' | 'error';

export interface Account {
  id: string;
  protocol: string;
  name: string;
  link: string;
}

export interface AccountsResponse {
  status: AccountStatus;
  message: string;
  argoDomain: string;
  accounts: Account[];
}

const STATUSES: readonly AccountStatus[] = ['starting', 'ready', 'error'];

function isAccount(value: unknown): value is Account {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.protocol === 'string' &&
    typeof item.name === 'string' &&
    typeof item.link === 'string'
  );
}

export function parseAccountsResponse(data: unknown): AccountsResponse {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Respons server tidak valid');
  }
  const body = data as Record<string, unknown>;
  if (!STATUSES.includes(body.status as AccountStatus)) {
    throw new Error('Respons server tidak valid');
  }
  if (!Array.isArray(body.accounts) || !body.accounts.every(isAccount)) {
    throw new Error('Respons server tidak valid');
  }
  return {
    status: body.status as AccountStatus,
    message: typeof body.message === 'string' ? body.message : '',
    argoDomain: typeof body.argoDomain === 'string' ? body.argoDomain : '',
    accounts: body.accounts,
  };
}
