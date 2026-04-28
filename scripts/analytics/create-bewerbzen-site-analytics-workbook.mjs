import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/bewerbzen-site-analytics");
const outputPath = path.join(outputDir, "bewerbzen-site-analytics.xlsx");

function writeRows(sheet, range, rows) {
  sheet.getRange(range).values = rows;
}

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Summary");
writeRows(summary, "A1:F1", [["BewerbZen Site Analytics", "", "", "", "", ""]]);
writeRows(summary, "A3:B13", [
  ["Metric", "Value"],
  ["Status", "Prepared, waiting for VPS endpoint"],
  ["Canonical raw storage", "VPS Postgres"],
  ["VPS folder", "/srv/projects/bewerbzen/analytics"],
  ["Raw events table", "bewerbzen_site_events"],
  ["GSC table", "bewerbzen_gsc_daily"],
  ["Summary endpoint", "/v1/site/summary"],
  ["Google Sheet role", "Presentation only"],
  ["Updated", "2026-04-28"],
  ["Domain", "bewerbzen.de"],
  ["Notes", "Do not treat this sheet as source of truth"],
]);

const daily = workbook.worksheets.add("Daily");
writeRows(daily, "A1:J1", [[
  "date",
  "events",
  "page_views",
  "visitors",
  "sessions",
  "signup_submits",
  "bot_clicks",
  "gsc_impressions",
  "gsc_clicks",
  "notes",
]]);

const events = workbook.worksheets.add("Events");
writeRows(events, "A1:P1", [[
  "occurred_at",
  "event_name",
  "page_path",
  "page_title",
  "referrer",
  "locale",
  "source",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "visitor_id_hash",
  "session_id_hash",
  "user_agent",
  "metadata_json",
  "received_at",
  "notes",
]]);

const gsc = workbook.worksheets.add("GSC Queries");
writeRows(gsc, "A1:J1", [[
  "date",
  "query",
  "page",
  "country",
  "device",
  "clicks",
  "impressions",
  "ctr",
  "position",
  "imported_at",
]]);

const config = workbook.worksheets.add("Config");
writeRows(config, "A1:C14", [
  ["Key", "Value", "Notes"],
  ["project", "bewerbzen", ""],
  ["sheet_role", "presentation_only", "VPS Postgres wins on conflicts"],
  ["vps_folder", "/srv/projects/bewerbzen/analytics", ""],
  ["service", "bewerbzen-analytics.service", ""],
  ["events_table", "bewerbzen_site_events", ""],
  ["gsc_table", "bewerbzen_gsc_daily", ""],
  ["summary_endpoint", "https://analytics.bewerbzen.de/v1/site/summary", "planned public hostname"],
  ["rows_endpoint", "https://analytics.bewerbzen.de/v1/site/rows", "admin key required"],
  ["domain", "https://bewerbzen.de/", ""],
  ["search_console_property", "sc-domain:bewerbzen.de", "preferred"],
  ["search_console_service_account", "adr-search-console@adr-trainer.iam.gserviceaccount.com", "needs property access"],
  ["umami_website_id", "eafea19f-454f-4093-9d3f-45f67357428b", "auxiliary only"],
  ["created_at", "2026-04-28", ""],
]);

const runbook = workbook.worksheets.add("Runbook");
writeRows(runbook, "A1:B12", [
  ["Step", "Action"],
  ["1", "Create /srv/projects/bewerbzen/analytics on the VPS"],
  ["2", "Copy runtime/vps/bewerbzen-analytics into that folder"],
  ["3", "Create .env from .env.example and set Postgres/API keys"],
  ["4", "Run npm install --omit=dev"],
  ["5", "Install and start bewerbzen-analytics.service"],
  ["6", "Smoke test /healthz and /v1/site/event"],
  ["7", "Wire browser-tracker.js into bewerbzen.de"],
  ["8", "Add Search Console service account to bewerbzen.de property"],
  ["9", "Refresh this sheet from VPS summary and rows endpoints"],
  ["10", "Treat this sheet as reporting only, never canonical raw storage"],
  ["Docs", "See BOT_ARCHITECTURE.md"],
]);

await fs.mkdir(outputDir, { recursive: true });
const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);
console.log(outputPath);
