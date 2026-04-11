#!/usr/bin/env bash
# Swan Lake CC — initial Vultr VM setup
# Run once as root on a fresh Ubuntu 24.04 server.
# Usage: curl -fsSL <url> | bash   OR   bash server-setup.sh
set -euo pipefail

DEPLOY_USER="deploy"
APP_DIR="/var/www/swan-lake"
REPO_URL="git@github.com:ecrist/slcc.git"   # update if repo URL changes

echo "=== [1/8] System update ==="
apt-get update -y && apt-get upgrade -y
apt-get install -y git curl nginx certbot python3-certbot-nginx ufw

echo "=== [2/8] Node.js 22.x LTS (NodeSource) ==="
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node -v && npm -v

echo "=== [3/8] PostgreSQL 16 ==="
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo "=== [4/8] PM2 + pm2-logrotate ==="
npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 7
mkdir -p /var/log/pm2

echo "=== [5/8] Deploy user ==="
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
mkdir -p /home/$DEPLOY_USER/.ssh
chmod 700 /home/$DEPLOY_USER/.ssh
# Paste your deploy public key below, or add it manually after setup
# echo "ssh-ed25519 AAAA... deploy@github" >> /home/$DEPLOY_USER/.ssh/authorized_keys
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null || true
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh

echo "=== [6/8] PostgreSQL — create DB and user ==="
# Run as postgres user
sudo -u postgres psql <<'SQL'
CREATE USER swanlake WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE swanlake OWNER swanlake;
GRANT ALL PRIVILEGES ON DATABASE swanlake TO swanlake;
SQL
echo "  !! Change the DB password in the SQL above and in .env.local !!"

echo "=== [7/8] App directory ==="
mkdir -p "$APP_DIR"
chown -R $DEPLOY_USER:www-data "$APP_DIR"
chmod -R 750 "$APP_DIR"
# Allow nginx to read static assets
usermod -aG www-data nginx 2>/dev/null || true

echo "=== [8/8] Firewall ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "============================================================"
echo " NEXT STEPS (manual)"
echo "============================================================"
echo ""
echo "1. Clone the repo as the deploy user:"
echo "   su - $DEPLOY_USER"
echo "   git clone $REPO_URL $APP_DIR"
echo "   cd $APP_DIR"
echo ""
echo "2. Create /var/www/swan-lake/.env.local:"
echo "   DATABASE_URL=postgresql://swanlake:CHANGE_ME@localhost/swanlake"
echo "   AUTH_SECRET=\$(openssl rand -base64 32)"
echo "   NEXTAUTH_URL=https://book.swanlakecc.com"
echo ""
echo "3. Install deps, migrate, build, start:"
echo "   npm ci --legacy-peer-deps"
echo "   npm run db:migrate"
echo "   npm run build"
echo "   pm2 start /var/www/swan-lake/ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup   # follow the printed command to enable on reboot"
echo ""
echo "4. Configure nginx:"
echo "   cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/swan-lake"
echo "   ln -s /etc/nginx/sites-available/swan-lake /etc/nginx/sites-enabled/"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "5. Issue SSL certificate:"
echo "   certbot --nginx -d book.swanlakecc.com"
echo ""
echo "6. Add GitHub Actions secrets (Settings → Secrets → Actions):"
echo "   DEPLOY_HOST  = <server IP>"
echo "   DEPLOY_USER  = $DEPLOY_USER"
echo "   DEPLOY_SSH_KEY = <private key matching the authorized_keys above>"
echo ""
