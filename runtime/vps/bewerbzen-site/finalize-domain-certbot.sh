#!/usr/bin/env bash
set -euo pipefail

DOMAIN="bewerbzen.de"
WWW="www.bewerbzen.de"
TARGET_IP="46.225.170.55"
LOG="/var/log/bewerbzen/finalize-domain-certbot.log"

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1

echo "[$(date -Is)] checking DNS for $DOMAIN and $WWW"

resolve_a() {
  getent ahostsv4 "$1" | awk "{print \$1}" | sort -u | tr "\n" " " | sed "s/ *$//"
}

root_a="$(resolve_a "$DOMAIN" || true)"
www_a="$(resolve_a "$WWW" || true)"

echo "[$(date -Is)] $DOMAIN -> ${root_a:-none}; $WWW -> ${www_a:-none}"

if [[ " $root_a " != *" $TARGET_IP "* || " $www_a " != *" $TARGET_IP "* ]]; then
  echo "[$(date -Is)] DNS not ready yet"
  exit 0
fi

if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  echo "[$(date -Is)] certificate already exists"
  systemctl disable --now bewerbzen-finalize-domain.timer || true
  exit 0
fi

echo "[$(date -Is)] DNS ready; requesting certificate"
certbot --nginx --non-interactive --agree-tos --email hello@bewerbzen.de -d "$DOMAIN" -d "$WWW" --redirect
nginx -t
systemctl reload nginx
systemctl disable --now bewerbzen-finalize-domain.timer || true
echo "[$(date -Is)] certificate installed and timer disabled"
