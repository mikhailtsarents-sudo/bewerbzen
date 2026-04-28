CREATE TABLE IF NOT EXISTS bewerbzen_site_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  page_path TEXT NOT NULL DEFAULT '',
  page_title TEXT NOT NULL DEFAULT '',
  referrer TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_content TEXT NOT NULL DEFAULT '',
  utm_term TEXT NOT NULL DEFAULT '',
  visitor_id_hash TEXT NOT NULL DEFAULT '',
  session_id_hash TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bewerbzen_site_events_occurred_at_idx
  ON bewerbzen_site_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS bewerbzen_site_events_event_name_idx
  ON bewerbzen_site_events (event_name);

CREATE INDEX IF NOT EXISTS bewerbzen_site_events_page_path_idx
  ON bewerbzen_site_events (page_path);

CREATE TABLE IF NOT EXISTS bewerbzen_gsc_daily (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  query TEXT NOT NULL DEFAULT '',
  page TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr DOUBLE PRECISION NOT NULL DEFAULT 0,
  position DOUBLE PRECISION NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, query, page, country, device)
);

CREATE INDEX IF NOT EXISTS bewerbzen_gsc_daily_date_idx
  ON bewerbzen_gsc_daily (date DESC);

CREATE INDEX IF NOT EXISTS bewerbzen_gsc_daily_query_idx
  ON bewerbzen_gsc_daily (query);
