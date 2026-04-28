(function () {
  var endpoint = window.BZ_ANALYTICS_ENDPOINT;
  var publicKey = window.BZ_ANALYTICS_PUBLIC_KEY;
  if (!endpoint || !publicKey || window.__bewerbzenAnalyticsLoaded) return;
  window.__bewerbzenAnalyticsLoaded = true;

  function id(key) {
    try {
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var next = Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(key, next);
      return next;
    } catch {
      return "";
    }
  }

  var sessionKey = "bz_session_id";
  var sessionStartedKey = "bz_session_started_at";
  var now = Date.now();
  try {
    var started = Number(sessionStorage.getItem(sessionStartedKey) || 0);
    if (!started || now - started > 30 * 60 * 1000) {
      sessionStorage.setItem(sessionKey, now.toString(36) + Math.random().toString(36).slice(2));
      sessionStorage.setItem(sessionStartedKey, String(now));
    }
  } catch {}

  function params() {
    var search = new URLSearchParams(window.location.search);
    return {
      utm_source: search.get("utm_source") || "",
      utm_medium: search.get("utm_medium") || "",
      utm_campaign: search.get("utm_campaign") || "",
      utm_content: search.get("utm_content") || "",
      utm_term: search.get("utm_term") || ""
    };
  }

  function track(eventName, metadata) {
    var utm = params();
    var payload = Object.assign({
      event_name: eventName || "page_view",
      page_url: window.location.href,
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      locale: document.documentElement.lang || navigator.language || "",
      source: "bewerbzen.de",
      visitor_id: id("bz_visitor_id"),
      session_id: (function () {
        try { return sessionStorage.getItem(sessionKey) || ""; } catch { return ""; }
      })(),
      occurred_at: new Date().toISOString(),
      metadata: metadata || {}
    }, utm);

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-BewerbZen-Public-Key": publicKey
      },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }

  window.bewerbzenTrack = track;
  track("page_view");
})();
