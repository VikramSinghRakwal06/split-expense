/**
 * All money values shown in the UI come straight from the backend's
 * BigDecimal responses (WalletResponse.balance, TransactionResponse.amount,
 * LedgerEntryResponse.amount/balanceAfter) and are only ever formatted here,
 * never computed — see the requirement that the frontend must not do
 * arithmetic on amounts.
 */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
