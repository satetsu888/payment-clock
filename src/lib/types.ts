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

export interface TestClock {
  id: string;
  accountId: string;
  stripeTestClockId: string;
  name: string | null;
  frozenTime: string;
  status: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface Operation {
  id: number;
  accountId: string;
  testClockId: string | null;
  operationType: string;
  requestParams: string | null;
  responseSummary: string | null;
  createdAt: string;
}

export interface TestClockDetail {
  testClock: TestClock;
  operations: Operation[];
}
