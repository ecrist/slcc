#!/usr/bin/env bash
# Swan Lake CC — Vultr VM setup
# Run ONCE as root on a fresh Ubuntu 24.04 server.
#
#   bash server-setup.sh
#
# The script installs all dependencies, creates the deploy user, generates
# the two SSH key pairs you'll need, sets up PostgreSQL, configures PM2 and
# nginx, and prints a clear checklist of the three things you must do in
# GitHub before the first deploy will work.
#
# It is safe to re-run; most steps are idempotent.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DEPLOY_USER="deploy"
APP_DIR="/var/www/swan-lake"
REPO_SSH="git@github.com:ecrist/slcc.git"
DOMAIN="slcc.secure-computing.net"
NODE_VERSION="22"
PG_DB="swanlake"
PG_USER="swanlake"

# ── Helpers ───────────────────────────────────────────────────────────────────
bold()  { echo -e "\n\033[1m$*\033[0m"; }
ok()    { echo "  ✓ $*"; }
warn()  { echo -e "  \033[33m⚠  $*\033[0m"; }
die()   { echo -e "\033[31mERROR: $*\033[0m" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash server-setup.sh"

# ── 1. System packages ────────────────────────────────────────────────────────
bold "[1/9] System packages"
apt-get update -y -q
apt-get upgrade -y -q
apt-get install -y -q \
  git curl wget gnupg2 ca-certificates lsb-release \
  nginx certbot python3-certbot-nginx \
  ufw fail2ban \
  postgresql postgresql-contrib \
  openssl
ok "Packages installed"

# ── 2. Node.js 22 LTS ─────────────────────────────────────────────────────────
bold "[2/9] Node.js ${NODE_VERSION}.x LTS"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v${NODE_VERSION}* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v) / npm $(npm -v)"

# ── 3. Deploy user ────────────────────────────────────────────────────────────
bold "[3/9] Deploy user: ${DEPLOY_USER}"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  ok "User created"
else
  ok "User already exists"
fi

DEPLOY_HOME="/home/${DEPLOY_USER}"
SSH_DIR="${DEPLOY_HOME}/.ssh"
mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

# Key A — GitHub deploy key (deploy user pulls from the private repo)
GITHUB_KEY="${SSH_DIR}/github_deploy"
if [ ! -f "$GITHUB_KEY" ]; then
  ssh-keygen -t ed25519 -C "swan-lake-server-deploy" -f "$GITHUB_KEY" -N ""
  ok "GitHub deploy key generated → ${GITHUB_KEY}"
fi

# Key B — GitHub Actions SSH key (GitHub Actions SSHes into this server)
ACTIONS_KEY="${SSH_DIR}/actions_deploy"
if [ ! -f "$ACTIONS_KEY" ]; then
  ssh-keygen -t ed25519 -C "github-actions-deploy" -f "$ACTIONS_KEY" -N ""
  ok "GitHub Actions key generated → ${ACTIONS_KEY}"
fi

# Authorise GitHub Actions public key for login
ACTIONS_PUBKEY=$(cat "${ACTIONS_KEY}.pub")
AUTH_KEYS="${SSH_DIR}/authorized_keys"
touch "$AUTH_KEYS"
if ! grep -qF "$ACTIONS_PUBKEY" "$AUTH_KEYS" 2>/dev/null; then
  echo "$ACTIONS_PUBKEY" >> "$AUTH_KEYS"
  ok "Actions public key added to authorized_keys"
fi

# SSH config — use the GitHub deploy key for github.com
SSH_CONFIG="${SSH_DIR}/config"
if ! grep -q "github.com" "$SSH_CONFIG" 2>/dev/null; then
  cat >> "$SSH_CONFIG" <<EOF

Host github.com
  HostName github.com
  User git
  IdentityFile ${GITHUB_KEY}
  StrictHostKeyChecking no
EOF
  ok "SSH config written"
fi

chmod 600 "$AUTH_KEYS" "$SSH_CONFIG" 2>/dev/null || true
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$SSH_DIR"

# ── 4. PM2 (global install, run as deploy user) ───────────────────────────────
bold "[4/9] PM2"
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
pm2 install pm2-logrotate 2>/dev/null || true
pm2 set pm2-logrotate:max_size 20M 2>/dev/null || true
pm2 set pm2-logrotate:retain 7 2>/dev/null || true
mkdir -p /var/log/pm2
chown "${DEPLOY_USER}:${DEPLOY_USER}" /var/log/pm2
ok "PM2 $(pm2 -v)"

# PM2 startup service for the deploy user
# This creates /etc/systemd/system/pm2-deploy.service
PM2_BIN=$(command -v pm2)
env PATH="${PATH}:$(dirname "$PM2_BIN")" \
  pm2 startup systemd -u "$DEPLOY_USER" --hp "$DEPLOY_HOME" \
  > /tmp/pm2-startup.log 2>&1 || true
systemctl daemon-reload 2>/dev/null || true
# The service will be enabled once `pm2 save` is run as the deploy user
ok "PM2 systemd service configured for user ${DEPLOY_USER}"

# ── 5. PostgreSQL ─────────────────────────────────────────────────────────────
bold "[5/9] PostgreSQL"
systemctl enable postgresql --quiet
systemctl start postgresql

# Generate a random DB password if not already saved
PG_PASS_FILE="/root/.swanlake_db_password"
if [ ! -f "$PG_PASS_FILE" ]; then
  openssl rand -base64 24 | tr -d '=/+' | head -c 32 > "$PG_PASS_FILE"
fi
DB_PASS=$(cat "$PG_PASS_FILE")

# Create DB user and database (idempotent)
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

ok "Database '${PG_DB}' ready — password saved to ${PG_PASS_FILE}"

# ── 6. App directory ──────────────────────────────────────────────────────────
bold "[6/9] App directory"
mkdir -p "$APP_DIR"
chown -R "${DEPLOY_USER}:www-data" "$APP_DIR"
chmod -R 750 "$APP_DIR"
usermod -aG www-data "$DEPLOY_USER"
ok "${APP_DIR} → owner ${DEPLOY_USER}:www-data"

# ── 7. nginx ──────────────────────────────────────────────────────────────────
bold "[7/9] nginx"
systemctl enable nginx --quiet
systemctl start nginx

# Write a temporary HTTP-only config so nginx works before SSL is issued
NGINX_CONF="/etc/nginx/sites-available/swan-lake"
if [ ! -f "$NGINX_CONF" ]; then
  cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }
}
NGINX
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/swan-lake
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  ok "nginx HTTP config written — SSL will be added after DNS propagates"
else
  ok "nginx config already exists, skipping"
fi

# ── 8. Firewall ───────────────────────────────────────────────────────────────
bold "[8/9] Firewall"
ufw --force reset > /dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "UFW active (ssh, 80, 443)"

# fail2ban — basic SSH brute-force protection
systemctl enable fail2ban --quiet
systemctl start fail2ban
ok "fail2ban active"

# ── 9. .env.local template ────────────────────────────────────────────────────
bold "[9/9] .env.local template"
ENV_FILE="${APP_DIR}/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  cat > "$ENV_FILE" <<ENV
DATABASE_URL=postgresql://${PG_USER}:${DB_PASS}@localhost/${PG_DB}
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=https://${DOMAIN}
ENV
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  ok ".env.local written to ${ENV_FILE}"
else
  ok ".env.local already exists, skipping"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
GITHUB_DEPLOY_PUBKEY=$(cat "${GITHUB_KEY}.pub")
ACTIONS_PRIVKEY=$(cat "${ACTIONS_KEY}")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " SETUP COMPLETE — 3 things to do in GitHub before first deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "─── STEP 1: Add deploy key to GitHub repo ───────────────────────────"
echo "  https://github.com/ecrist/slcc/settings/keys → New deploy key"
echo "  Title: swan-lake-server"
echo "  Allow write access: NO (read-only is enough)"
echo "  Key:"
echo ""
echo "$GITHUB_DEPLOY_PUBKEY"
echo ""
echo "─── STEP 2: Add GitHub Actions secrets ─────────────────────────────"
echo "  https://github.com/ecrist/slcc/settings/secrets/actions"
echo ""
echo "  DEPLOY_HOST   = $(curl -sf https://ifconfig.me || echo '<your-server-IP>')"
echo "  DEPLOY_USER   = ${DEPLOY_USER}"
echo "  DEPLOY_SSH_KEY = (paste the block below, including the BEGIN/END lines)"
echo ""
echo "$ACTIONS_PRIVKEY"
echo ""
echo "─── STEP 3: Point DNS ───────────────────────────────────────────────"
echo "  Add an A record:"
echo "    ${DOMAIN} → $(curl -sf https://ifconfig.me || echo '<your-server-IP>')"
echo "  Wait for it to propagate, then run:"
echo "    certbot --nginx -d ${DOMAIN}"
echo ""
echo "─── AFTER DNS + deploy key are in place: first deploy ───────────────"
echo "  su - ${DEPLOY_USER}"
echo "  git clone ${REPO_SSH} ${APP_DIR}"
echo "  cd ${APP_DIR}"
echo "  npm ci --legacy-peer-deps"
echo "  npm run db:migrate"
echo "  npm run build"
echo "  pm2 start ${APP_DIR}/ecosystem.config.js"
echo "  pm2 save"
echo ""
echo "  Then back as root, copy the final nginx config:"
echo "  cp ${APP_DIR}/deploy/nginx.conf /etc/nginx/sites-available/swan-lake"
echo "  nginx -t && systemctl reload nginx"
echo "  certbot --nginx -d ${DOMAIN}"
echo ""
echo "  After that, every push to main deploys automatically."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
warn "DB password saved to ${PG_PASS_FILE} — keep this file secure."
warn ".env.local written to ${ENV_FILE} — review before first run."
echo ""
