import { getRawDb } from "./index";

type DailyRow = { date: string; successful_calls: number; service_errors: number };
type IncidentRow = { severity: string; title: string; status: string; opened_at: string; resolved_at: string | null };

function lastUtcDays(count: number) {
  const now = new Date();
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: count }, (_, index) => new Date(end - (count - index - 1) * 86_400_000).toISOString().slice(0, 10));
}

export async function getPublicTrustSnapshot() {
  const generatedAt = new Date().toISOString();
  const empty = {
    dataAvailable: false,
    generatedAt,
    successfulPaidCalls: 0,
    lastSuccessfulPaidCallAt: null as string | null,
    openIncidents: 0,
    reliability: { windowDays: 30, successfulPaidCalls: 0, recordedServiceErrors: 0, observedSuccessRate: null as number | null, daily: lastUtcDays(30).map((date) => ({ date, successfulPaidCalls: 0, recordedServiceErrors: 0 })) },
    recentIncidents: [] as IncidentRow[],
  };
  try {
    const db = getRawDb();
    const [summary, dailyResult, openIncident, incidentResult] = await Promise.all([
      db.prepare("SELECT paid_calls, last_paid_at FROM funnel_monitor_summary WHERE id = 1").first<{ paid_calls: number; last_paid_at: string | null }>(),
      db.prepare("SELECT substr(occurred_at, 1, 10) AS date, SUM(CASE WHEN kind = 'paid_call' THEN 1 ELSE 0 END) AS successful_calls, SUM(CASE WHEN kind = 'service_error' THEN 1 ELSE 0 END) AS service_errors FROM events WHERE kind IN ('paid_call', 'service_error') AND occurred_at >= datetime('now', '-30 days') GROUP BY substr(occurred_at, 1, 10) ORDER BY date").all<DailyRow>(),
      db.prepare("SELECT COUNT(*) AS total FROM incidents WHERE status = 'open'").first<{ total: number }>(),
      db.prepare("SELECT severity, title, status, opened_at, resolved_at FROM incidents ORDER BY opened_at DESC LIMIT 8").all<IncidentRow>(),
    ]);
    const byDate = new Map(dailyResult.results.map((row: DailyRow) => [row.date, row]));
    const daily = lastUtcDays(30).map((date) => {
      const row = byDate.get(date);
      return { date, successfulPaidCalls: Number(row?.successful_calls ?? 0), recordedServiceErrors: Number(row?.service_errors ?? 0) };
    });
    const successfulPaidCalls = daily.reduce((sum, day) => sum + day.successfulPaidCalls, 0);
    const recordedServiceErrors = daily.reduce((sum, day) => sum + day.recordedServiceErrors, 0);
    const observed = successfulPaidCalls + recordedServiceErrors;
    return {
      dataAvailable: true,
      generatedAt,
      successfulPaidCalls: Number(summary?.paid_calls ?? 0),
      lastSuccessfulPaidCallAt: summary?.last_paid_at ?? null,
      openIncidents: Number(openIncident?.total ?? 0),
      reliability: { windowDays: 30, successfulPaidCalls, recordedServiceErrors, observedSuccessRate: observed ? Number((successfulPaidCalls / observed * 100).toFixed(2)) : null, daily },
      recentIncidents: incidentResult.results,
    };
  } catch (error) {
    console.error("Public trust snapshot unavailable", error);
    return empty;
  }
}
