# BewerbZen Analytics VPS Runbook

Updated: `2026-04-28`

## Current Status

Live as of `2026-04-28 13:34 UTC`.

- VPS folder exists: `/srv/projects/bewerbzen/analytics`
- systemd service is active: `bewerbzen-analytics.service`
- public health endpoint answers: `http://46.225.170.55:3466/healthz`
- Postgres tables exist:
  - `bewerbzen_site_events`
  - `bewerbzen_gsc_daily`
- first smoke event is stored:
  - `vps_smoke_test`
  - page path `/`
  - source `deploy`

## Goal

Run a separate BewerbZen analytics service on the VPS, isolated from ADR runtime code.

## Target Paths

```text
/srv/projects/bewerbzen/analytics
/etc/systemd/system/bewerbzen-analytics.service
```

## Deploy

From the Mac, after SSH access works:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 'mkdir -p /srv/projects/bewerbzen/analytics'
rsync -av -e 'ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes' runtime/vps/bewerbzen-analytics/ root@46.225.170.55:/srv/projects/bewerbzen/analytics/
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 'cd /srv/projects/bewerbzen/analytics && npm install --omit=dev'
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 'cp /srv/projects/bewerbzen/analytics/.env.example /srv/projects/bewerbzen/analytics/.env'
```

Edit `/srv/projects/bewerbzen/analytics/.env` and set:

```text
PG_PASSWORD
BEWERBZEN_ANALYTICS_API_KEY
BEWERBZEN_ANALYTICS_PUBLIC_KEY
BEWERBZEN_ALLOWED_ORIGINS
```

Install systemd:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 'cp /srv/projects/bewerbzen/analytics/bewerbzen-analytics.service /etc/systemd/system/bewerbzen-analytics.service'
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 'systemctl daemon-reload && systemctl enable --now bewerbzen-analytics.service'
```

## Server Separation Rule

Keep every new project under `/srv/projects/<project>/`.

For BewerbZen:

```text
/srv/projects/bewerbzen/analytics
```

Do not place BewerbZen code under:

```text
/srv/adr-project
/opt/adr-ingest
/root/adr-*
```

ADR can stay where it is for now because it is already live. New Zen files must not depend on ADR folder layout.

## Smoke Checks

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 'systemctl status bewerbzen-analytics.service --no-pager'
curl -sS http://46.225.170.55:3466/healthz
```

Authenticated summary:

```bash
curl -sS \
  -H "X-BewerbZen-API-Key: $BEWERBZEN_ANALYTICS_API_KEY" \
  http://46.225.170.55:3466/v1/site/summary
```

Public browser write test:

```bash
curl -sS \
  -H "Origin: https://bewerbzen.de" \
  -H "Content-Type: application/json" \
  -H "X-BewerbZen-Public-Key: $BEWERBZEN_ANALYTICS_PUBLIC_KEY" \
  -d '{"event_name":"smoke_test","page_path":"/","source":"manual"}' \
  http://46.225.170.55:3466/v1/site/event
```

## Website Wiring

Production currently uses the Netlify same-origin proxy:

```text
/api/bz-analytics/v1/site/event
```

That proxy forwards to the VPS service. If a dedicated analytics subdomain is later configured, use:

```html
<script>
  window.BZ_ANALYTICS_ENDPOINT = "https://analytics.bewerbzen.de/v1/site/event";
  window.BZ_ANALYTICS_PUBLIC_KEY = "PUBLIC_KEY_FROM_VPS_ENV";
</script>
<script defer src="/scripts/analytics/browser-tracker.js"></script>
```

## Google Sheet

Sheet title:

```text
BewerbZen Site Analytics
```

The sheet should read from summary/rows exports after the endpoint is live. Until then it is a prepared reporting shell.
