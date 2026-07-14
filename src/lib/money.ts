/**
 * Money.  PKR. That is the only currency.
 *
 * MUDDARRIS LESSON, ENCODED THREE TIMES:
 *
 *   1. Type level  — `Currency` is the literal 'PKR'. Not a union. Not a
 *                    string. There is nothing else to pass.
 *   2. Runtime     — normalizeCurrency() throws on anything else.
 *   3. Database    — `create domain currency_code check (value = 'PKR')`.
 *                    Postgres physically refuses 'pkr', 'usd', 'PKr'.
 *
 * WHY NOT KEEP 'USD' AROUND "just in case"?
 *
 *   A currency you never use is a code path nobody ever tests. The day you
 *   finally take a USD payment, you find out which of your fifty money
 *   calculations quietly assumed PKR — in production, with real money.
 *
 *   Widen it deliberately, with tests, on the day you need it. Not before.
 */
export type Currency = 'PKR';

export const CURRENCY: Currency = 'PKR';

/**
 * Normalise ONCE, at the edge. Never compare raw currency strings anywhere else.
 */
export function normalizeCurrency(raw: string): Currency {
  const up = raw.trim().toUpperCase();
  if (up !== 'PKR') {
    throw new Error(
      `Unsupported currency: "${raw}". NearAppoint is PKR-only. ` +
      `Adding a currency means auditing every money calculation in the product — ` +
      `it is a deliberate project, not a config change.`,
    );
  }
  return 'PKR';
}

/**
 * Whole rupees. PKR has no practical subunit in this market — nobody prices a
 * haircut at Rs 1,500.50, and showing ".00" everywhere just adds noise.
 */
export function formatPKR(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * NOTE: bookingFeePKR() is NOT here. It reads a server env var and lives in
 * src/server/lib/money.ts.
 *
 * The client sends { service_ids, start_at }. It does not send a price, and it
 * does not send a fee. There is no field for either. If one ever appears in a
 * request body, reject it — someone is probing.
 */
