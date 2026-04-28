# BewerbZen Analytics Source Of Truth

Updated: `2026-04-28`

## Decision

BewerbZen analytics must be stored on the VPS first.

Google Sheets is a readable reporting layer only. It is not the canonical raw event store.

## Current Deployment

Live as of `2026-04-28`.

- service: `bewerbzen-analytics.service`
- folder: `/srv/projects/bewerbzen/analytics`
- health: `http://46.225.170.55:3466/healthz`
- Google Sheet: `BewerbZen Site Analytics`
- spreadsheet id: `18LpO8h1Hvw6QKPOBy8I_M8eBzqs8zzVk-aTfaljADj8`

## Canonical Layers

| Layer | Owner | Storage | Role |
| --- | --- | --- | --- |
| `site_events_raw` | VPS `bewerbzen-analytics` | Postgres `bewerbzen_site_events` | Canonical raw website events |
| `search_console_raw` | VPS `bewerbzen-analytics` | Postgres `bewerbzen_gsc_daily` | Canonical imported GSC rows after access is granted |
| `site_summary_api` | VPS `bewerbzen-analytics` | `GET /v1/site/summary` | Machine-readable summary |
| `google_sheet_summary` | Google Sheets | `BewerbZen Site Analytics` | Human-readable presentation |
| `umami` | Umami Cloud | Vendor dashboard | Auxiliary only |

## VPS Location

Target live folder:

```text
/srv/projects/bewerbzen/analytics
```

Repo source folder:

```text
runtime/vps/bewerbzen-analytics
```

## VPS Project Separation

The VPS should be organized by project, not by random service names.

Recommended server layout:

```text
/srv/projects/
  bewerbzen/
    analytics/
    site/
    docs/
  next-project/
    analytics/
    site/
```

Existing ADR runtime currently lives separately:

```text
/srv/adr-project
/opt/adr-ingest
```

Do not put BewerbZen files inside ADR folders. If ADR is later cleaned up, it can move to `/srv/projects/adr/`, but that is a separate migration.

## Tables

### `bewerbzen_site_events`

Stores website events such as:

- `page_view`
- `signup_modal_open`
- `signup_submit`
- `click_open_bot_success`
- `click_buy_pack`
- `click_buy_pro`
- `lang_switch`

Visitor and session identifiers are SHA-256 hashes. Raw names, emails, Telegram handles, IP addresses, and form content must not be stored in this table.

### `bewerbzen_gsc_daily`

Stores Google Search Console rows by date/query/page/country/device.

This table becomes useful after the Search Console property for `bewerbzen.de` grants access to the service account.

## Conflict Rules

If numbers disagree:

1. VPS Postgres raw tables win.
2. VPS summary API must be fixed to match raw tables.
3. Google Sheet must be refreshed from the summary API.
4. Umami is useful as a sanity check, not a source of truth.

## Required Access

For Search Console automation, add this service account to the BewerbZen property:

```text
adr-search-console@adr-trainer.iam.gserviceaccount.com
```

Recommended property:

```text
sc-domain:bewerbzen.de
```

Fallback property:

```text
https://bewerbzen.de/
```
