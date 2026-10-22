import { getRawDb } from "./index";

type DailyRow = { date: string; successful_calls: number; service_errors: number; payment_protocol_errors: number; target_observation_failures: number };
type ErrorBreakdownRow = { endpoint: string | null; client_type: string | null; status_code: number | null; total: number };
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
    reliability: { windowDays: 30, successfulPaidCalls: 0, recordedServiceErrors: 0, recordedPaymentProtocolErrors: 0, recordedTargetObservationFailures: 0, observedSuccessRate: null as number | null, errorBreakdown: [] as Array<{ endpoint: string; clientType: string; statusCode: number; total: number }>, daily: lastUtcDays(30).map((date) => ({ date, successfulPaidCalls: 0, recordedServiceErrors: 0, recordedPaymentProtocolErrors: 0, recordedTargetObservationFailures: 0 })) },
    recentIncidents: [] as IncidentRow[],
  };
  try {
    const db = getRawDb();
    const [summary, dailyResult, errorBreakdownResult, openIncident, incidentResult] = await Promise.all([
      db.prepare("SELECT paid_calls, last_paid_at FROM funnel_monitor_summary WHERE id = 1").first<{ paid_calls: number; last_paid_at: string | null }>(),
      db.prepare("SELECT substr(occurred_at, 1, 10) AS date, SUM(CASE WHEN kind = 'paid_call' THEN 1 ELSE 0 END) AS successful_calls, SUM(CASE WHEN kind = 'service_error' AND COALESCE(status_code, 500) <> 503 AND NOT (endpoint IN ('/api/check', '/api/verify') AND status_code = 502) THEN 1 ELSE 0 END) AS service_errors, SUM(CASE WHEN kind = 'payment_protocol_error' OR (kind = 'service_error' AND status_code = 503) THEN 1 ELSE 0 END) AS payment_protocol_errors, SUM(CASE WHEN kind = 'service_error' AND endpoint IN ('/api/check', '/api/verify') AND status_code = 502 THEN 1 ELSE 0 END) AS target_observation_failures FROM events WHERE kind IN ('paid_call', 'service_error', 'payment_protocol_error') AND occurred_at >= datetime('now', '-30 days') GROUP BY substr(occurred_at, 1, 10) ORDER BY date").all<DailyRow>(),
      db.prepare("SELECT endpoint, COALESCE(client_type, 'unattributed') AS client_type, status_code, COUNT(*) AS total FROM events WHERE kind = 'service_error' AND COALESCE(status_code, 500) <> 503 AND NOT (endpoint IN ('/api/check', '/api/verify') AND status_code = 502) AND occurred_at >= datetime('now', '-30 days') GROUP BY endpoint, COALESCE(client_type, 'unattributed'), status_code ORDER BY total DESC, endpoint LIMIT 25").all<ErrorBreakdownRow>(),
      db.prepare("SELECT COUNT(*) AS total FROM incidents WHERE status = 'open'").first<{ total: number }>(),
      db.prepare("SELECT severity, title, status, opened_at, resolved_at FROM incidents ORDER BY opened_at DESC LIMIT 8").all<IncidentRow>(),
    ]);
    const byDate = new Map(dailyResult.results.map((row: DailyRow) => [row.date, row]));
    const daily = lastUtcDays(30).map((date) => {
      const row = byDate.get(date);
      return { date, successfulPaidCalls: Number(row?.successful_calls ?? 0), recordedServiceErrors: Number(row?.service_errors ?? 0), recordedPaymentProtocolErrors: Number(row?.payment_protocol_errors ?? 0), recordedTargetObservationFailures: Number(row?.target_observation_failures ?? 0) };
    });
    const successfulPaidCalls = daily.reduce((sum, day) => sum + day.successfulPaidCalls, 0);
    const recordedServiceErrors = daily.reduce((sum, day) => sum + day.recordedServiceErrors, 0);
    const recordedPaymentProtocolErrors = daily.reduce((sum, day) => sum + day.recordedPaymentProtocolErrors, 0);
    const recordedTargetObservationFailures = daily.reduce((sum, day) => sum + day.recordedTargetObservationFailures, 0);
    const observed = successfulPaidCalls + recordedServiceErrors;
    const errorBreakdown = errorBreakdownResult.results.map((row: ErrorBreakdownRow) => ({ endpoint: row.endpoint ?? "unknown", clientType: row.client_type ?? "unattributed", statusCode: Number(row.status_code ?? 500), total: Number(row.total) }));
    return {
      dataAvailable: true,
      generatedAt,
      successfulPaidCalls: Number(summary?.paid_calls ?? 0),
      lastSuccessfulPaidCallAt: summary?.last_paid_at ?? null,
      openIncidents: Number(openIncident?.total ?? 0),
      reliability: { windowDays: 30, successfulPaidCalls, recordedServiceErrors, recordedPaymentProtocolErrors, recordedTargetObservationFailures, observedSuccessRate: observed ? Number((successfulPaidCalls / observed * 100).toFixed(2)) : null, errorBreakdown, daily },
      recentIncidents: incidentResult.results,
    };
  } catch (error) {
    console.error("Public trust snapshot unavailable", error);
    return empty;
  }
}
