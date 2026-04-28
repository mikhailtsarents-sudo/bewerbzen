# VPS Project Layout

Updated: `2026-04-28`

## Rule

Every new project gets its own folder under:

```text
/srv/projects/<project>/
```

No new project should write code, env files, logs, or scripts into another project's folder.

## BewerbZen

Target layout:

```text
/srv/projects/bewerbzen/
  analytics/
    server.mjs
    schema.sql
    .env
    package.json
  site/
  docs/
```

The first live component is:

```text
/srv/projects/bewerbzen/analytics
```

## ADR

Current live ADR layout is legacy and should stay untouched during the BewerbZen analytics setup:

```text
/srv/adr-project
/opt/adr-ingest
```

Do not add BewerbZen files there.

If we later normalize ADR, move it in a dedicated migration to:

```text
/srv/projects/adr/
```

## Future Projects

Future projects should follow the same pattern:

```text
/srv/projects/<project-name>/analytics
/srv/projects/<project-name>/site
/srv/projects/<project-name>/docs
```

Systemd services should also include the project name:

```text
bewerbzen-analytics.service
futureproject-analytics.service
```
