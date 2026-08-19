import { env } from "cloudflare:workers";

export type SourceRequestInput = {
  name: string;
  email: string;
  company: string;
  description: string;
  quantity: string;
  neededBy: string;
  budgetRange: string;
  drawingUrl: string;
};

export async function ensureSourcingSchema() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sourcing_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'new',
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      quantity TEXT NOT NULL,
      needed_by TEXT NOT NULL DEFAULT '',
      budget_range TEXT NOT NULL DEFAULT '',
      drawing_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sourcing_requests_status_created_at ON sourcing_requests(status, created_at)"),
  ]);
}

export async function createSourcingRequest(input: SourceRequestInput) {
  await ensureSourcingSchema();
  const requestId = `AWP-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO sourcing_requests
    (request_id, status, name, email, company, description, quantity, needed_by, budget_range, drawing_url, created_at)
    VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(requestId, input.name, input.email, input.company, input.description, input.quantity, input.neededBy, input.budgetRange, input.drawingUrl, createdAt)
    .run();
  return { requestId, createdAt };
}

export async function getSourcingCounts() {
  await ensureSourcingSchema();
  const rows = await env.DB.prepare("SELECT status, COUNT(*) AS count FROM sourcing_requests GROUP BY status").all<{ status: string; count: number }>();
  const byStatus = Object.fromEntries(rows.results.map((row) => [row.status, Number(row.count)]));
  return { total: Object.values(byStatus).reduce((sum, value) => sum + value, 0), byStatus };
}
