#!/usr/bin/env bash
# Swan Lake CC — dev branch environment setup
# Run once as root after server-setup.sh to add the boxfort and gorilla environments.
#
#   bash deploy/branch-setup.sh
#
# Creates /var/www/boxfort (port 3001) and /var/www/gorilla (port 3002),
# each with their own PostgreSQL database, .env.local, PM2 process,
# and nginx vhost. Prints certbot commands to run after DNS propagates.

set -euo pipefail

DEPLOY_USER="deploy"
REPO_SSH="git@github.com:ecrist/slcc.git"
BASE_DOMAIN="secure-computing.net"

bold() { echo -e "\n\033[1m$*\033[0m"; }
ok()   { echo "  ✓ $*"; }
warn() { echo -e "  \033[33m⚠  $*\033[0m"; }
die()  { echo -e "\033[31mERROR: $*\033[0m" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash deploy/branch-setup.sh"

DEPLOY_HOME="/home/${DEPLOY_USER}"

setup_env() {
  local BRANCH="$1"   # e.g. boxfort
  local PORT="$2"     # e.g. 3001
  local APP_DIR="/var/www/${BRANCH}"
  local DOMAIN="${BRANCH}.${BASE_DOMAIN}"
  local PG_DB="swanlake_${BRANCH}"
  local PG_USER="swanlake_${BRANCH}"
  local PG_PASS_FILE="/root/.swanlake_${BRANCH}_db_password"

  bold "── ${BRANCH} (port ${PORT}) ──────────────────────────────────────────────"

  # ── PostgreSQL ──────────────────────────────────────────────────────────────
  if [ ! -f "$PG_PASS_FILE" ]; then
    openssl rand -base64 24 | tr -d '=/+' | head -c 32 > "$PG_PASS_FILE"
  fi
  DB_PASS=$(cat "$PG_PASS_FILE")

  sudo -u postgres psql -v ON_ERROR_STOP=0 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${PG_USER}') THEN
    CREATE USER ${PG_USER} WITH PASSWORD '${DB_PASS}';
  ELSE
    ALTER USER ${PG_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${PG_DB}') \gexec
GRANT ALL PRIVILEGES ON DATABASE ${PG_DB} TO ${PG_USER};
SQL
  # Grant schema permissions (needed in PostgreSQL 15+)
  sudo -u postgres psql -d "$PG_DB" -c "GRANT ALL ON SCHEMA public TO ${PG_USER};" 2>/dev/null || true
  ok "Database '${PG_DB}' ready"

  # ── App directory ───────────────────────────────────────────────────────────
  mkdir -p "$APP_DIR"
  chown -R "${DEPLOY_USER}:www-data" "$APP_DIR"
  chmod -R 750 "$APP_DIR"
  usermod -aG www-data "$DEPLOY_USER" 2>/dev/null || true
  ok "${APP_DIR} created"

  # ── .env.local ──────────────────────────────────────────────────────────────
  ENV_FILE="${APP_DIR}/.env.local"
  if [ ! -f "$ENV_FILE" ]; then
    AUTH_SECRET=$(openssl rand -base64 32)
    cat > "$ENV_FILE" <<ENV
DATABASE_URL=postgresql://${PG_USER}:${DB_PASS}@localhost/${PG_DB}
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=https://${DOMAIN}
PORT=${PORT}
ENV
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    ok ".env.local written"
  else
    ok ".env.local already exists, skipping"
  fi

  # ── Clone repo and install ──────────────────────────────────────────────────
  if [ ! -d "${APP_DIR}/.git" ]; then
    sudo -u "$DEPLOY_USER" bash -c "
      cd ${APP_DIR}
      git init
      git remote add origin ${REPO_SSH}
      git fetch origin
      git checkout -t origin/${BRANCH}
    "
    ok "Repo cloned (branch: ${BRANCH})"
  else
    ok "Repo already present, skipping clone"
  fi

  # Install deps and build
  sudo -u "$DEPLOY_USER" bash -c "
    cd ${APP_DIR}
    npm ci --legacy-peer-deps
    npm run db:migrate
    npm run build
  "
  ok "Dependencies installed and app built"

  # ── PM2 process ─────────────────────────────────────────────────────────────
  # Start as the deploy user
  sudo -u "$DEPLOY_USER" bash -c "
    export PATH=\"\$PATH:/usr/bin\"
    pm2 describe ${BRANCH} > /dev/null 2>&1 && \
      pm2 reload ${BRANCH} --update-env || \
      pm2 start ${APP_DIR}/node_modules/.bin/next \
        --name ${BRANCH} \
        --cwd ${APP_DIR} \
        -- start
    pm2 save
  "
  ok "PM2 process '${BRANCH}' running on port ${PORT}"

  # ── nginx vhost ─────────────────────────────────────────────────────────────
  NGINX_CONF="/etc/nginx/sites-available/${BRANCH}"
  if [ ! -f "$NGINX_CONF" ]; then
    cat > "$NGINX_CONF" <<NGINX
# ${BRANCH} dev environment — temporary HTTP config (certbot will add SSL)
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass         http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }

    location /_next/static/ {
        alias ${APP_DIR}/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
NGINX
    ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/${BRANCH}"
    ok "nginx vhost written for ${DOMAIN}"
  else
    ok "nginx vhost already exists, skipping"
  fi

  echo ""
  warn "Run certbot after DNS propagates:"
  warn "  certbot --nginx -d ${DOMAIN}"
  warn "Then replace the nginx config with the final SSL version:"
  warn "  cp ${APP_DIR}/deploy/nginx-${BRANCH}.conf /etc/nginx/sites-available/${BRANCH}"
  warn "  nginx -t && systemctl reload nginx"
}

# ── Run for each branch ────────────────────────────────────────────────────────
setup_env "boxfort" "3001"
setup_env "gorilla"  "3002"

nginx -t && systemctl reload nginx
ok "nginx reloaded"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " BRANCH ENVIRONMENTS READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  boxfort → http://boxfort.${BASE_DOMAIN}  (port 3001)"
echo "  gorilla  → http://gorilla.${BASE_DOMAIN}   (port 3002)"
echo ""
echo "  CI/CD will auto-deploy on push to each branch."
echo "  Run certbot for each domain to enable HTTPS."
echo ""
