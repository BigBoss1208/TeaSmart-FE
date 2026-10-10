export interface DashboardData {
  from: string; to: string; timezone: string; revenue: number; paidPayments: number;
  ordersCount: number; productsCount: number; customersCount: number;
  ordersByStatus: Record<string, number>;
  revenueByDay: { date: string; revenue: number; paymentsCount: number }[];
}
export interface CustomerData {
  userId: number; fullName: string; email: string; phone: string | null;
  status: string; createdAt: string; updatedAt: string; ordersCount: number; totalSpent: number;
}
export function vietnamToday(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (key: string) => parts.find(p => p.type === key)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function defaultRange(date = new Date()): { from: string; to: string } {
  const to = vietnamToday(date); const start = new Date(`${to}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 29);
  return { from: start.toISOString().slice(0, 10), to };
}
export function customerQuery(keyword: string, status: string, page: number): string {
  const params = new URLSearchParams({ page: String(page), size: "12" });
  if (keyword.trim()) params.set("keyword", keyword.trim());
  if (status) params.set("status", status);
  return `/admin/customers?${params}`;
}
export function chartHeight(amount: number, max: number): number {
  return max > 0 ? Math.max(0, Math.min(150, amount / max * 150)) : 0;
}
