/**
 * Mock Pacifica client — same interface as PacificaClient but all in-memory.
 * No network calls. Used when DEMO_MODE=true.
 */

interface MockAccount {
  address: string;
  balance: number;
  positions: Map<string, MockPosition>;
}

interface MockPosition {
  symbol: string;
  side: "bid" | "ask";
  size: number;
  entryPrice: number;
  leverage: number;
}

const accounts = new Map<string, MockAccount>();

export function mockCreateSubaccount(mainAddress: string, subAddress: string): { data: unknown } {
  if (!accounts.has(mainAddress)) {
    accounts.set(mainAddress, { address: mainAddress, balance: 0, positions: new Map() });
  }
  accounts.set(subAddress, { address: subAddress, balance: 0, positions: new Map() });
  return { data: { subaccount: subAddress } };
}

export function mockTransferFunds(fromAddress: string, toAddress: string, amount: number): { data: unknown } {
  const from = accounts.get(fromAddress);
  const to = accounts.get(toAddress);
  if (from) from.balance -= amount;
  if (to) to.balance += amount;
  else accounts.set(toAddress, { address: toAddress, balance: amount, positions: new Map() });
  return { data: { transferred: amount } };
}

export function mockCreateMarketOrder(
  address: string,
  symbol: string,
  side: "bid" | "ask",
  size: number,
  currentPrice: number
): { data: unknown } {
  const account = accounts.get(address);
  if (!account) return { data: null };

  const existing = account.positions.get(symbol);
  if (existing && existing.side === side) {
    // Increase position
    const totalSize = existing.size + size;
    existing.entryPrice = (existing.entryPrice * existing.size + currentPrice * size) / totalSize;
    existing.size = totalSize;
  } else if (existing && existing.side !== side) {
    // Reduce/close
    if (size >= existing.size) {
      const pnl = (currentPrice - existing.entryPrice) * existing.size * (existing.side === "bid" ? 1 : -1);
      account.balance += pnl;
      account.positions.delete(symbol);
      const remaining = size - existing.size;
      if (remaining > 0) {
        account.positions.set(symbol, { symbol, side, size: remaining, entryPrice: currentPrice, leverage: 5 });
      }
    } else {
      const pnl = (currentPrice - existing.entryPrice) * size * (existing.side === "bid" ? 1 : -1);
      account.balance += pnl;
      existing.size -= size;
    }
  } else {
    // New position
    account.positions.set(symbol, { symbol, side, size, entryPrice: currentPrice, leverage: 5 });
  }

  return { data: { order_id: Math.floor(Math.random() * 100000) } };
}

export function mockGetAccountInfo(address: string): { data: { balance: string; positions: unknown[] } } {
  const account = accounts.get(address);
  if (!account) return { data: { balance: "0", positions: [] } };

  const positions = Array.from(account.positions.values()).map((p) => ({
    symbol: p.symbol,
    side: p.side,
    size: String(p.size),
    entry_price: String(p.entryPrice),
    leverage: p.leverage,
  }));

  return { data: { balance: String(account.balance), positions } };
}

export function mockCancelAllOrders(): { data: unknown } {
  return { data: { cancelled: 0 } };
}

export function mockGetPositions(address: string): { data: unknown[] } {
  const account = accounts.get(address);
  if (!account) return { data: [] };
  return {
    data: Array.from(account.positions.values()).map((p) => {
      const markPrice = getMockPrice(p.symbol);
      const direction = p.side === "bid" ? 1 : -1;
      const unrealizedPnl = (markPrice - p.entryPrice) * p.size * direction;
      return {
        symbol: p.symbol,
        side: p.side,
        size: String(p.size),
        entry_price: String(p.entryPrice),
        mark_price: String(markPrice),
        leverage: p.leverage,
        unrealized_pnl: String(Math.round(unrealizedPnl * 100) / 100),
      };
    }),
  };
}

export function mockUpdateLeverage(): { data: unknown } {
  return { data: { success: true } };
}

export function getAccount(address: string): MockAccount | undefined {
  return accounts.get(address);
}

export function resetMockState(): void {
  accounts.clear();
}

// ── Global price tracking (updated by MockPriceGenerator, read by order-relay) ──
const mockPrices = new Map<string, number>([
  ["BTC", 87000],
  ["ETH", 2100],
  ["SOL", 148],
]);

export function updateMockPrice(symbol: string, price: number): void {
  mockPrices.set(symbol, price);
}

export function getMockPrice(symbol: string): number {
  return mockPrices.get(symbol) ?? 1;
}

/**
 * Compute total equity (balance + unrealized PnL) for a mock account.
 */
export function computeMockEquity(
  address: string,
  getPrice: (symbol: string) => number,
  startingCapital: number
): number {
  const account = accounts.get(address);
  if (!account) return startingCapital;

  let unrealizedPnL = 0;
  for (const [symbol, pos] of account.positions) {
    const currentPrice = getPrice(symbol) ?? pos.entryPrice;
    const direction = pos.side === "bid" ? 1 : -1;
    unrealizedPnL += (currentPrice - pos.entryPrice) * pos.size * direction;
  }
  return account.balance + unrealizedPnL;
}
