import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const lines = readFileSync(join(__dir, ".env"), "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^#=\s]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {}
}

loadEnv();

const PORT = Number(process.env.PORT ?? 3466);
const API_KEY = process.env.BEWERBZEN_ANALYTICS_API_KEY ?? "";
const PUBLIC_KEY = process.env.BEWERBZEN_ANALYTICS_PUBLIC_KEY ?? "";
const ALLOWED_ORIGINS = new Set(
  String(process.env.BEWERBZEN_ALLOWED_ORIGINS ?? "https://bewerbzen.de,https://www.bewerbzen.de")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

const pool = new pg.Pool({
  host: process.env.PG_HOST ?? "127.0.0.1",
  port: Number(process.env.PG_PORT ?? 5432),
  database: process.env.PG_DATABASE ?? "n8n",
  user: process.env.PG_USER ?? "n8n",
  password: process.env.PG_PASSWORD ?? "",
  max: 8,
  idleTimeoutMillis: 30000,
});

function hash(value) {
  const raw = text(value);
  if (!raw) return "";
  return createHash("sha256").update(raw).digest("hex");
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function asDate(value) {
  const parsed = new Date(text(value));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function json(res, status, body, origin = "") {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 64_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function adminAuth(req) {
  const key = req.headers["x-bewerbzen-api-key"] ?? "";
  return API_KEY && key === API_KEY;
}

function publicAuth(req, origin) {
  const key = req.headers["x-bewerbzen-public-key"] ?? "";
  return PUBLIC_KEY && key === PUBLIC_KEY && ALLOWED_ORIGINS.has(origin);
}

async function ensureSchema() {
  await pool.query(readFileSync(join(__dir, "schema.sql"), "utf8"));
}

async function writeSiteEvent(req, res, origin) {
  if (!publicAuth(req, origin) && !adminAuth(req)) {
    json(res, 401, { error: "unauthorized" }, origin);
    return;
  }

  const body = await readBody(req);
  const row = body.data?.[0] ?? body;
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};

  await pool.query(
    `INSERT INTO bewerbzen_site_events
     (event_name, page_url, page_path, page_title, referrer, locale, source,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      visitor_id_hash, session_id_hash, user_agent, metadata_json, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      text(row.event_name || row.event || "page_view"),
      text(row.page_url),
      text(row.page_path),
      text(row.page_title),
      text(row.referrer),
      text(row.locale),
      text(row.source),
      text(row.utm_source),
      text(row.utm_medium),
      text(row.utm_campaign),
      text(row.utm_content),
      text(row.utm_term),
      hash(row.visitor_id),
      hash(row.session_id),
      text(req.headers["user-agent"] || row.user_agent),
      JSON.stringify(metadata),
      asDate(row.occurred_at),
    ],
  );

  json(res, 200, { ok: true }, origin);
}

async function readRows(req, res) {
  if (!adminAuth(req)) {
    json(res, 401, { error: "unauthorized" });
    return;
  }
  const url = new URL(req.url, "http://localhost");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 500), 5000);
  const { rows } = await pool.query(
    `SELECT *
     FROM bewerbzen_site_events
     ORDER BY occurred_at DESC
     LIMIT $1`,
    [limit],
  );
  json(res, 200, { data: rows, nextCursor: null });
}

async function readSummary(req, res) {
  if (!adminAuth(req)) {
    json(res, 401, { error: "unauthorized" });
    return;
  }
  const summary = await pool.query(
    `SELECT
       COUNT(*)::INT AS events_total,
       COUNT(*) FILTER (WHERE event_name = 'page_view')::INT AS page_views_total,
       COUNT(DISTINCT session_id_hash)::INT AS sessions_total,
       COUNT(DISTINCT visitor_id_hash)::INT AS visitors_total,
       COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '24 hours')::INT AS events_24h,
       COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days')::INT AS events_7d,
       COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days')::INT AS events_30d,
       MIN(occurred_at) AS first_event_at,
       MAX(occurred_at) AS last_event_at
     FROM bewerbzen_site_events`,
  );
  const topPages = await pool.query(
    `SELECT page_path, COUNT(*)::INT AS events, COUNT(DISTINCT session_id_hash)::INT AS sessions
     FROM bewerbzen_site_events
     WHERE occurred_at >= NOW() - INTERVAL '30 days'
     GROUP BY page_path
     ORDER BY events DESC, page_path ASC
     LIMIT 20`,
  );
  const topEvents = await pool.query(
    `SELECT event_name, COUNT(*)::INT AS count
     FROM bewerbzen_site_events
     WHERE occurred_at >= NOW() - INTERVAL '30 days'
     GROUP BY event_name
     ORDER BY count DESC, event_name ASC
     LIMIT 20`,
  );
  const gsc = await pool.query(
    `SELECT
       COALESCE(SUM(clicks), 0)::INT AS clicks,
       COALESCE(SUM(impressions), 0)::INT AS impressions,
       CASE WHEN COALESCE(SUM(impressions), 0) = 0 THEN 0
            ELSE COALESCE(SUM(clicks), 0)::DOUBLE PRECISION / SUM(impressions)
       END AS ctr,
       COALESCE(AVG(NULLIF(position, 0)), 0) AS avg_position,
       MAX(imported_at) AS last_imported_at
     FROM bewerbzen_gsc_daily
     WHERE date >= CURRENT_DATE - INTERVAL '30 days'`,
  );

  json(res, 200, {
    generated_at: new Date().toISOString(),
    summary: summary.rows[0] ?? {},
    top_pages_30d: topPages.rows,
    top_events_30d: topEvents.rows,
    search_console_30d: gsc.rows[0] ?? {},
  });
}

const server = createServer(async (req, res) => {
  const origin = text(req.headers.origin);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-BewerbZen-Public-Key, X-BewerbZen-API-Key");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const path = new URL(req.url, "http://localhost").pathname;
  try {
    if (req.method === "POST" && path === "/v1/site/event") return await writeSiteEvent(req, res, origin);
    if (req.method === "GET" && path === "/v1/site/rows") return await readRows(req, res);
    if (req.method === "GET" && path === "/v1/site/summary") return await readSummary(req, res);
    if (path === "/healthz") return json(res, 200, { ok: true, service: "bewerbzen-analytics" }, origin);
    json(res, 404, { error: "not_found" }, origin);
  } catch (error) {
    console.error("[bewerbzen-analytics]", error);
    json(res, 500, { error: String(error?.message ?? error) }, origin);
  }
});

await ensureSchema();
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[bewerbzen-analytics] listening on :${PORT}`);
});
