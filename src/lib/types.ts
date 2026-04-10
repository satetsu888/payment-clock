export interface Account {
  id: string;
  stripeAccountId: string;
  displayName: string | null;
  createdAt: string;
  lastUsedAt: string;
}

export interface AccountSummary {
  id: string;
  stripeAccountId: string;
  displayName: string | null;
  lastUsedAt: string;
}
