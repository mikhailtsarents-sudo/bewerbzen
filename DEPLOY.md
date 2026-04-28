# BewerbZen — VPS Deploy, DNS и Google Indexing Runbook

Обновлено: `2026-04-28`

## Статус

Production hosting переносится с Netlify на VPS, потому что Netlify team paused из-за `credit limit / usage_exceeded`.

Текущий рабочий VPS endpoint:

```text
http://46.225.170.55/
```

Текущий домен пока еще указывает на Netlify:

```text
bewerbzen.de      A      75.2.60.5
www.bewerbzen.de  A      75.2.60.5
```

Nameserver-ы домена:

```text
ns1.your-server.de
ns.second-ns.com
ns3.second-ns.de
```

Это Hetzner/your-server DNS, не Netlify DNS.

## Цель

Сайт должен открываться по:

```text
https://bewerbzen.de/
https://www.bewerbzen.de/
```

И при этом:

- отдавать `200 OK` для главной;
- отдавать `200 OK` для `robots.txt`;
- отдавать `200 OK` для `sitemap.xml`;
- не блокировать Googlebot;
- сохранять canonical URL на `https://bewerbzen.de/`;
- писать события сайта в VPS analytics через `/api/bz-analytics/*`.

## VPS Layout

```text
/srv/projects/bewerbzen/site
/srv/projects/bewerbzen/analytics
```

ADR-файлы не смешивать с Zen:

```text
/srv/adr-project
/opt/adr-ingest
```

## Web Server

nginx установлен и активен.

Активный конфиг:

```text
/etc/nginx/sites-available/bewerbzen
/etc/nginx/sites-enabled/bewerbzen
```

Repo-шаблон:

```text
runtime/vps/bewerbzen-site/bewerbzen.nginx
```

Проверки:

```bash
curl -I http://46.225.170.55/
curl -I http://46.225.170.55/robots.txt
curl -I http://46.225.170.55/sitemap.xml
curl -I http://46.225.170.55/api/bz-analytics/healthz
```

## DNS Switch

В Hetzner/your-server DNS нужно заменить записи:

```text
@    A    46.225.170.55
www  A    46.225.170.55
```

Если в панели используются полные имена:

```text
bewerbzen.de      A      46.225.170.55
www.bewerbzen.de  A      46.225.170.55
```

Удалить или заменить старые Netlify A-записи:

```text
75.2.60.5
```

Проверка DNS после изменения:

```bash
dig +short A bewerbzen.de
dig +short A www.bewerbzen.de
```

Ожидаемо:

```text
46.225.170.55
```

## HTTPS После DNS

Когда DNS уже смотрит на VPS:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 \
  'certbot --nginx -d bewerbzen.de -d www.bewerbzen.de'
```

После certbot проверить:

```bash
curl -I https://bewerbzen.de/
curl -I https://bewerbzen.de/robots.txt
curl -I https://bewerbzen.de/sitemap.xml
```

На VPS также установлен авто-финализатор:

```text
bewerbzen-finalize-domain.timer
bewerbzen-finalize-domain.service
/srv/projects/bewerbzen/ops/finalize-domain-certbot.sh
```

Он раз в 5 минут проверяет DNS. Когда `bewerbzen.de` и `www.bewerbzen.de` начнут резолвиться в `46.225.170.55`, он сам запустит `certbot --nginx`, включит HTTPS/redirect и отключит timer после успешной установки сертификата.

Проверка:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 \
  'systemctl status bewerbzen-finalize-domain.timer --no-pager && tail -n 40 /var/log/bewerbzen/finalize-domain-certbot.log'
```

## Google Indexing Checklist

После DNS + HTTPS:

- `https://bewerbzen.de/` возвращает `200 OK`;
- `https://bewerbzen.de/robots.txt` возвращает `200 OK`;
- `robots.txt` содержит `Allow: /`;
- `robots.txt` указывает на `https://bewerbzen.de/sitemap.xml`;
- `https://bewerbzen.de/sitemap.xml` возвращает `200 OK`;
- sitemap содержит все SEO landing pages;
- canonical tags указывают на `https://bewerbzen.de/...`;
- Search Console property `sc-domain:bewerbzen.de` имеет доступ для service account.

Service account для Search Console:

```text
adr-search-console@adr-trainer.iam.gserviceaccount.com
```

## SEO Pages

В sitemap входят:

```text
/
/bewerbung-schreiben-lassen-russisch-deutschland.html
/anschreiben-erstellen-lassen.html
/lebenslauf-deutschland-russisch.html
/bewerbung-vorlage-russisch-deutsch.html
/jobsuche-deutschland-bewerbung-hilfe.html
```

## Analytics

VPS analytics:

```text
service: bewerbzen-analytics.service
path: /srv/projects/bewerbzen/analytics
health: /api/bz-analytics/healthz
event endpoint: /api/bz-analytics/v1/site/event
```

Google Sheet:

```text
BewerbZen Site Analytics
https://docs.google.com/spreadsheets/d/18LpO8h1Hvw6QKPOBy8I_M8eBzqs8zzVk-aTfaljADj8/edit
```

## Smoke Test

```bash
curl -sS -i 'http://46.225.170.55/api/bz-analytics/v1/site/event' \
  -H 'Origin: http://46.225.170.55' \
  -H 'Content-Type: application/json' \
  -H 'X-BewerbZen-Public-Key: PUBLIC_KEY_FROM_VPS_ENV' \
  --data '{"event_name":"manual_smoke_test","page_path":"/","source":"manual"}'
```

Проверка Postgres:

```bash
ssh -i ~/.ssh/adr_vps_key -o IdentitiesOnly=yes root@46.225.170.55 \
  'docker exec n8n-selfhost-postgres-1 psql -U n8n -d n8n -c "select event_name, source, occurred_at from bewerbzen_site_events order by occurred_at desc limit 10;"'
```

## What Not To Use As Production

Netlify больше не production source для BewerbZen. Его можно оставить как fallback/preview только после восстановления billing, но canonical hosting — VPS.
