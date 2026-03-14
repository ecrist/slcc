# Swan Lake Country Club — Deployment Setup

This guide covers deploying the app as a production-grade, resilient service
behind nginx with TLS. Step-by-step instructions are provided for both
**FreeBSD 14** and **Red Hat Enterprise Linux 9** (including Rocky Linux,
AlmaLinux, and CentOS Stream 9).

---

## Architecture Overview

```
Internet → nginx (TLS termination, reverse proxy) → Next.js app (port 3000)
                                                           ↓
                                                    SQLite database
                                                    (swan-lake.db)
```

- **Next.js** runs as a Node.js process managed by **PM2**
- **nginx** handles HTTPS and acts as a reverse proxy
- **SQLite** via `better-sqlite3` — file-based, no separate DB server needed
- **PM2** restarts the app on crash and registers it as a system service

---

## External Services Setup

These steps are the same regardless of operating system.

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create or select a project
3. Enable the **People API**
4. Create an **OAuth 2.0 Client ID** → Web application
5. Authorized JavaScript origins: `https://book.swanlakecc.com`
6. Authorized redirect URI: `https://book.swanlakecc.com/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret** into `.env.local`

### Apple Sign In

1. Go to [Apple Developer](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Create a **Services ID** (e.g. `com.swanlakecc.book`)
3. Enable **Sign In with Apple** → Configure
4. Domain: `book.swanlakecc.com`
5. Return URL: `https://book.swanlakecc.com/api/auth/callback/apple`
6. Create a **Key** with Sign In with Apple enabled — download the `.p8` file
7. In `.env.local`:
   - `APPLE_ID` = your Services ID
   - `APPLE_SECRET` = full contents of the `.p8` file (including the `-----BEGIN PRIVATE KEY-----` header/footer)

### Square (Google Pay / Apple Pay / Card)

Google Pay works automatically once Square credentials are live.

For **Apple Pay**, domain verification is required:

1. [Square Developer Dashboard](https://developer.squareup.com/apps) → your app → **Apple Pay** tab
2. Click **Add a domain** → enter `book.swanlakecc.com`
3. Download the domain association file Square provides
4. Replace the placeholder on your server:
   ```sh
   cp ~/apple-developer-merchantid-domain-association \
     /home/swanlake/app/public/.well-known/apple-developer-merchantid-domain-association
   ```
5. Rebuild and restart the app after placing the file

---

## Environment Variable Reference

All variables go in `/home/swanlake/app/.env.local`.

```sh
# ── Square Payments ──────────────────────────────────────────────────────────
SQUARE_ACCESS_TOKEN=           # Production access token (starts with EAAAl...)
SQUARE_APPLICATION_ID=         # App ID (starts with sq0idp-)
SQUARE_LOCATION_ID=            # Location ID from Square Dashboard → Locations
SQUARE_ENVIRONMENT=production

# Browser-side vars for Google Pay / Apple Pay
NEXT_PUBLIC_SQUARE_APPLICATION_ID=   # same as SQUARE_APPLICATION_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID=      # same as SQUARE_LOCATION_ID
NEXT_PUBLIC_SQUARE_ENVIRONMENT=production

# ── QuickBooks ───────────────────────────────────────────────────────────────
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=https://book.swanlakecc.com/api/payments/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=production

# ── Application ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://book.swanlakecc.com

# ── Auth.js ──────────────────────────────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET=<generate-a-new-random-value>

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Apple Sign In
APPLE_ID=               # Services ID, e.g. com.swanlakecc.book
APPLE_SECRET=           # Full contents of the .p8 private key file

# ── Admin ─────────────────────────────────────────────────────────────────────
# Seeds the first admin on a fresh database. Always retains access as a recovery
# fallback. Manage all other admins through /admin/settings after first login.
INITIAL_ADMIN_EMAIL=you@youremail.com
```

Set correct permissions:

```sh
chmod 600 /home/swanlake/app/.env.local
chown swanlake:swanlake /home/swanlake/app/.env.local
```

---

## PM2 Ecosystem Config

This config file is the same on both platforms. Create it as the `swanlake` user:

```sh
cat > /home/swanlake/app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "swanlakecc",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/swanlake/app",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
EOF
```

---

## nginx Site Config

This config is the same on both platforms. The file path differs — see the
platform sections below.

```nginx
server {
    listen 80;
    server_name book.swanlakecc.com;

    location /.well-known/acme-challenge/ {
        root /var/www/acme;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name book.swanlakecc.com;

    # Certificate paths — see platform sections for exact locations
    ssl_certificate     /etc/ssl/swanlakecc/fullchain.cer;
    ssl_certificate_key /etc/ssl/swanlakecc/swanlakecc.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;

    # Apple Pay domain verification
    location /.well-known/ {
        root /home/swanlake/app/public;
        default_type application/octet-stream;
    }

    # Next.js static assets — long cache
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Proxy everything else to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

---

---

# FreeBSD Deployment

Tested on FreeBSD 14.x.

## FreeBSD — 1. Install Packages

```sh
pkg update && pkg upgrade
pkg install \
  node22 \
  npm-node22 \
  python3 \
  gmake \
  nginx \
  git \
  acme.sh \
  sqlite3
```

> - `python3` + `gmake` — required by `node-gyp` to compile `better-sqlite3`
> - `acme.sh` — Let's Encrypt client

```sh
node --version   # v22.x.x
npm --version    # 10.x.x
```

## FreeBSD — 2. Create App User

```sh
pw useradd swanlake -m -s /bin/sh -c "Swan Lake CC App"
```

## FreeBSD — 3. Deploy the App

```sh
# From your local machine
rsync -avz --exclude node_modules --exclude .next --exclude swan-lake.db \
  /Users/ecrist/golf/swan-lake-cc/ \
  swanlake@your-server:/home/swanlake/app/

# On the server
su - swanlake
cd /home/swanlake/app
npm ci --omit=dev
npm run build
```

## FreeBSD — 4. Configure Environment

```sh
su - swanlake
cp /home/swanlake/app/.env.local.example /home/swanlake/app/.env.local
vi /home/swanlake/app/.env.local
chmod 600 /home/swanlake/app/.env.local
```

## FreeBSD — 5. Install PM2 and Register Boot Service

```sh
npm install -g pm2

su - swanlake
cd /home/swanlake/app
pm2 start ecosystem.config.js
pm2 save

# As root — generates and enables the rc.d script
pm2 startup freebsd -u swanlake --hp /home/swanlake
# Run the command PM2 prints, then:
sysrc pm2_enable="YES"
```

## FreeBSD — 6. Configure nginx

```sh
mkdir -p /usr/local/etc/nginx/sites-available \
         /usr/local/etc/nginx/sites-enabled

# Paste the nginx config from above into this file,
# updating the ssl_certificate paths to:
#   /usr/local/etc/acme.sh/book.swanlakecc.com/fullchain.cer
#   /usr/local/etc/acme.sh/book.swanlakecc.com/book.swanlakecc.com.key
vi /usr/local/etc/nginx/sites-available/swanlakecc.conf

ln -s /usr/local/etc/nginx/sites-available/swanlakecc.conf \
      /usr/local/etc/nginx/sites-enabled/swanlakecc.conf
```

Add to the `http {}` block in `/usr/local/etc/nginx/nginx.conf`:

```nginx
include /usr/local/etc/nginx/sites-enabled/*.conf;
```

```sh
sysrc nginx_enable="YES"
service nginx start
```

## FreeBSD — 7. Obtain TLS Certificate (acme.sh)

```sh
mkdir -p /var/www/acme

# Issue — start nginx with HTTP-only config first (comment out SSL server block)
acme.sh --issue -d book.swanlakecc.com -w /var/www/acme

# Install certs
acme.sh --install-cert -d book.swanlakecc.com \
  --cert-file      /usr/local/etc/acme.sh/book.swanlakecc.com/book.swanlakecc.com.cer \
  --key-file       /usr/local/etc/acme.sh/book.swanlakecc.com/book.swanlakecc.com.key \
  --fullchain-file /usr/local/etc/acme.sh/book.swanlakecc.com/fullchain.cer \
  --reloadcmd      "service nginx reload"

# Uncomment SSL server block, then reload
nginx -t && service nginx reload
```

Renewal is handled automatically via cron (`crontab -l` to verify).

## FreeBSD — 8. Configure Firewall (pf)

```sh
cat > /etc/pf.conf << 'EOF'
# Change em0 to your interface (check with: ifconfig)
ext_if="em0"

block in all
block out all
pass quick on lo0 all
pass out all keep state
pass in on $ext_if proto tcp to port 22 keep state
pass in on $ext_if proto tcp to port { 80, 443 } keep state
EOF

sysrc pf_enable="YES"
service pf start
pfctl -f /etc/pf.conf
```

> Verify SSH is working before enabling pf.

## FreeBSD — 9. Database Backup

```sh
cat > /usr/local/sbin/backup-swanlakecc.sh << 'EOF'
#!/bin/sh
DEST=/var/backups/swanlakecc
mkdir -p $DEST
sqlite3 /home/swanlake/app/swan-lake.db \
  ".backup '$DEST/swan-lake-$(date +%Y%m%d-%H%M%S).db'"
find $DEST -name "*.db" -mtime +30 -delete
EOF

chmod +x /usr/local/sbin/backup-swanlakecc.sh
```

Add to root's crontab (`crontab -e`):

```cron
0 2 * * * /usr/local/sbin/backup-swanlakecc.sh
```

## FreeBSD — Useful Commands

```sh
pm2 list / pm2 logs swanlakecc / pm2 reload swanlakecc
service nginx reload
acme.sh --list
sqlite3 /home/swanlake/app/swan-lake.db
```

---

---

# Red Hat / RHEL Deployment

Tested on RHEL 9, Rocky Linux 9, and AlmaLinux 9.

## RHEL — 1. Install Packages

```sh
# EPEL provides certbot and other packages
dnf install -y epel-release

# Node.js 22 via NodeSource
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

# Remaining dependencies
dnf install -y \
  nginx \
  git \
  python3 \
  make \
  gcc-c++ \
  sqlite \
  certbot \
  python3-certbot-nginx
```

> - `make` + `gcc-c++` — required by `node-gyp` to compile `better-sqlite3`
> - `certbot` + `python3-certbot-nginx` — Let's Encrypt with nginx plugin

```sh
node --version   # v22.x.x
npm --version    # 10.x.x
```

## RHEL — 2. Create App User

```sh
useradd -m -s /bin/bash swanlake
```

## RHEL — 3. Deploy the App

```sh
# From your local machine
rsync -avz --exclude node_modules --exclude .next --exclude swan-lake.db \
  /Users/ecrist/golf/swan-lake-cc/ \
  swanlake@your-server:/home/swanlake/app/

# On the server
su - swanlake
cd /home/swanlake/app
npm ci --omit=dev
npm run build
```

## RHEL — 4. Configure Environment

```sh
su - swanlake
cp /home/swanlake/app/.env.local.example /home/swanlake/app/.env.local
vi /home/swanlake/app/.env.local
chmod 600 /home/swanlake/app/.env.local
```

## RHEL — 5. Install PM2 and Register Boot Service

```sh
npm install -g pm2

su - swanlake
cd /home/swanlake/app
pm2 start ecosystem.config.js
pm2 save

# As root — generates a systemd unit file
pm2 startup systemd -u swanlake --hp /home/swanlake
# Run the command PM2 prints, then:
systemctl enable pm2-swanlake
systemctl start pm2-swanlake
```

## RHEL — 6. Configure nginx

```sh
# Paste the nginx config from above into this file,
# updating the ssl_certificate paths to:
#   /etc/letsencrypt/live/book.swanlakecc.com/fullchain.pem
#   /etc/letsencrypt/live/book.swanlakecc.com/privkey.pem
vi /etc/nginx/conf.d/swanlakecc.conf

nginx -t
systemctl enable --now nginx
```

## RHEL — 7. Obtain TLS Certificate (certbot)

```sh
mkdir -p /var/www/acme

# Issue certificate — certbot edits the nginx config automatically
certbot --nginx -d book.swanlakecc.com

# Verify auto-renewal timer is active
systemctl status certbot-renew.timer
```

Certbot installs a systemd timer for automatic renewal. Test it with:

```sh
certbot renew --dry-run
```

## RHEL — 8. Configure Firewall (firewalld)

```sh
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
firewall-cmd --list-all   # verify
```

## RHEL — 9. SELinux

SELinux is enabled by default on RHEL. nginx must be permitted to proxy
requests to the Next.js process on port 3000:

```sh
setsebool -P httpd_can_network_connect 1
```

If the app writes files (e.g. database) in a non-standard location, label
it appropriately:

```sh
semanage fcontext -a -t httpd_sys_rw_content_t "/home/swanlake/app(/.*)?"
restorecon -Rv /home/swanlake/app
```

## RHEL — 10. Database Backup

```sh
cat > /usr/local/sbin/backup-swanlakecc.sh << 'EOF'
#!/bin/bash
DEST=/var/backups/swanlakecc
mkdir -p $DEST
sqlite3 /home/swanlake/app/swan-lake.db \
  ".backup '$DEST/swan-lake-$(date +%Y%m%d-%H%M%S).db'"
find $DEST -name "*.db" -mtime +30 -delete
EOF

chmod +x /usr/local/sbin/backup-swanlakecc.sh
```

Add to root's crontab (`crontab -e`):

```cron
0 2 * * * /usr/local/sbin/backup-swanlakecc.sh
```

## RHEL — Useful Commands

```sh
pm2 list / pm2 logs swanlakecc / pm2 reload swanlakecc
systemctl reload nginx
certbot certificates
sqlite3 /home/swanlake/app/swan-lake.db
journalctl -u pm2-swanlake -f    # systemd logs for PM2
```

---

---

## Deploying Updates (Both Platforms)

```sh
su - swanlake
cd /home/swanlake/app

git pull
npm ci --omit=dev
npm run build
pm2 reload swanlakecc   # zero-downtime reload
```

---

## First Login and Admin Setup

On first run, `INITIAL_ADMIN_EMAIL` is seeded into the `admin_users` table
automatically. Sign in at `https://book.swanlakecc.com/login` with that
account, then go to `/admin/settings` to:

- Add additional admin users
- Review and adjust site configuration (fees, booking window, season dates, etc.)

`INITIAL_ADMIN_EMAIL` always retains access as a recovery mechanism even if
removed from the admin table.

---

## DNS

Point the following DNS record at your server's IP **before** obtaining the
TLS certificate:

| Type | Name | Value |
|------|------|-------|
| A | book.swanlakecc.com | your.server.ip |

Then update the Webflow site to link to `https://book.swanlakecc.com` from the
"Book a Tee Time" and "Become a Member" buttons.

---

## Summary Checklist

### Common
- [ ] DNS A record pointing to server
- [ ] App deployed to `/home/swanlake/app`
- [ ] `.env.local` filled in with all production values
- [ ] Google OAuth credentials configured with correct redirect URI
- [ ] Apple Sign In Services ID configured with correct return URL
- [ ] Square production credentials set
- [ ] Apple Pay domain registered with Square; association file deployed
- [ ] `npm ci && npm run build` completed successfully
- [ ] PM2 started; process list saved
- [ ] nginx config tested (`nginx -t`) and running
- [ ] TLS certificate issued and HTTPS confirmed
- [ ] Firewall enabled; SSH, 80, 443 open
- [ ] Database backup cron job in place
- [ ] Signed in at `/admin` with `INITIAL_ADMIN_EMAIL`; settings reviewed

### FreeBSD-specific
- [ ] `pkg install node22 npm-node22 python3 gmake nginx git acme.sh sqlite3`
- [ ] `sysrc pm2_enable="YES"` and rc.d script registered
- [ ] `sysrc nginx_enable="YES"` and `sysrc pf_enable="YES"`
- [ ] `acme.sh` renewal verified in crontab

### Red Hat-specific
- [ ] NodeSource repo added; `node22` installed via `dnf`
- [ ] `systemctl enable pm2-swanlake` and `systemctl enable nginx`
- [ ] `setsebool -P httpd_can_network_connect 1` applied
- [ ] `firewalld` rules for ssh, http, https applied
- [ ] `certbot-renew.timer` active and `--dry-run` passes
