# Swan Lake Country Club — Deployment Setup

This guide covers deploying the app on a modern FreeBSD server (14.x or later)
as a production-grade, resilient service behind nginx with TLS.

---

## Architecture Overview

```
Internet → nginx (TLS termination, reverse proxy) → Next.js app (port 3000)
                                                           ↓
                                                    SQLite database
                                                    (swan-lake.db)
```

- **Next.js** runs as a Node.js process managed by **PM2**
- **nginx** handles HTTPS, serves as reverse proxy
- **SQLite** via `better-sqlite3` — file-based, no separate DB server needed
- **PM2** restarts the app automatically on crash and at boot via an rc.d script

---

## 1. Server Prerequisites

### Packages to install

```sh
pkg update && pkg upgrade
pkg install \
  node22 \
  npm-node22 \
  python3 \
  gmake \
  nginx \
  git \
  acme.sh
```

> **Why these?**
> - `node22` — Node.js 22 LTS (Next.js 15 requires Node 18.17+)
> - `python3` + `gmake` — required by `node-gyp` to compile `better-sqlite3` (native module)
> - `nginx` — reverse proxy and TLS termination
> - `acme.sh` — Let's Encrypt certificate management
> - `git` — for deploying app updates

### Verify Node version

```sh
node --version   # should be v22.x.x
npm --version    # should be 10.x.x
```

---

## 2. Create a Dedicated App User

Never run the app as root.

```sh
pw useradd swanlake -m -s /bin/sh -c "Swan Lake CC App"
```

---

## 3. Deploy the Application

### Copy files to the server

From your local machine:

```sh
rsync -avz --exclude node_modules --exclude .next --exclude swan-lake.db \
  /Users/ecrist/golf/swan-lake-cc/ \
  swanlake@your-server:/home/swanlake/app/
```

Or clone from a git repository:

```sh
su - swanlake
git clone https://your-repo-url/swan-lake-cc.git /home/swanlake/app
```

### Install dependencies and build

```sh
su - swanlake
cd /home/swanlake/app
npm ci --omit=dev
npm run build
```

> `npm ci` is preferred over `npm install` in production — it installs exactly
> what's in `package-lock.json` and is faster.

---

## 4. Configure Environment Variables

Create the production environment file:

```sh
su - swanlake
cp /home/swanlake/app/.env.local.example /home/swanlake/app/.env.local
vi /home/swanlake/app/.env.local
```

Fill in every value. See the full reference below.

### Environment Variable Reference

```sh
# ── Square Payments ──────────────────────────────────────────────────────────
# https://developer.squareup.com/apps → your app → Credentials
SQUARE_ACCESS_TOKEN=           # Production access token (starts with EAAAl...)
SQUARE_APPLICATION_ID=         # App ID (starts with sq0idp-)
SQUARE_LOCATION_ID=            # Location ID from Square Dashboard → Locations
SQUARE_ENVIRONMENT=production  # Change from "sandbox" to "production"

# These three are the same values as above but exposed to the browser
# (required for Google Pay / Apple Pay via Square Web Payments SDK)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=   # same as SQUARE_APPLICATION_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID=      # same as SQUARE_LOCATION_ID
NEXT_PUBLIC_SQUARE_ENVIRONMENT=production

# ── QuickBooks ───────────────────────────────────────────────────────────────
# https://developer.intuit.com → your app → Keys & OAuth
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REDIRECT_URI=https://book.swanlakecc.com/api/payments/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=production

# ── Application ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://book.swanlakecc.com

# ── Auth.js ──────────────────────────────────────────────────────────────────
# Generate a new secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET=<generate-a-new-random-value-for-production>

# Google OAuth — https://console.cloud.google.com/apis/credentials
# Create an OAuth 2.0 Client ID (Web application)
# Authorized redirect URI: https://book.swanlakecc.com/api/auth/callback/google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Apple Sign In — https://developer.apple.com/account/resources/identifiers/list/serviceId
# Create a Services ID, enable Sign In with Apple
# Return URL: https://book.swanlakecc.com/api/auth/callback/apple
APPLE_ID=               # your Services ID, e.g. com.swanlakecc.book
APPLE_SECRET=           # contents of your .p8 private key file (the whole PEM string)

# ── Admin Access ─────────────────────────────────────────────────────────────
# Comma-separated list of email addresses allowed to access /admin
ADMIN_EMAILS=you@youremail.com,otherperson@youremail.com
```

### Permissions

```sh
chmod 600 /home/swanlake/app/.env.local
chown swanlake:swanlake /home/swanlake/app/.env.local
```

---

## 5. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project (or select an existing one)
3. Enable the **Google+ API** (or "People API")
4. Create an **OAuth 2.0 Client ID** → Web application
5. Add authorized JavaScript origins: `https://book.swanlakecc.com`
6. Add authorized redirect URIs: `https://book.swanlakecc.com/api/auth/callback/google`
7. Copy **Client ID** and **Client Secret** into `.env.local`

---

## 6. Set Up Apple Sign In

1. Go to [Apple Developer](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Create a **Services ID** (e.g. `com.swanlakecc.book`)
3. Enable **Sign In with Apple** and click Configure
4. Add your domain: `book.swanlakecc.com`
5. Add return URL: `https://book.swanlakecc.com/api/auth/callback/apple`
6. Create a **Key** with Sign In with Apple enabled — download the `.p8` file
7. In `.env.local`:
   - `APPLE_ID` = your Services ID
   - `APPLE_SECRET` = the full contents of the `.p8` file (include the `-----BEGIN PRIVATE KEY-----` header/footer)

---

## 7. Set Up Square for Google Pay and Apple Pay

### Google Pay

No extra setup needed beyond your Square credentials. Google Pay works automatically
in supporting browsers once your Square app is live.

### Apple Pay

Apple Pay requires domain verification:

1. Log in to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your app → **Apple Pay** tab
3. Click **Add a domain** → enter `book.swanlakecc.com`
4. Square will provide a domain association file
5. Download it and replace the placeholder on your server:

```sh
# The file must be served at this exact path with no file extension
cp ~/apple-developer-merchantid-domain-association \
  /home/swanlake/app/public/.well-known/apple-developer-merchantid-domain-association
```

Rebuild and restart the app after placing this file (see step 9).

---

## 8. Install PM2 (Process Manager)

```sh
npm install -g pm2
```

### Create a PM2 ecosystem config

```sh
su - swanlake
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

### Start the app

```sh
su - swanlake
cd /home/swanlake/app
pm2 start ecosystem.config.js
pm2 save   # saves the process list so PM2 can restore it on reboot
```

### Register PM2 as a boot service

```sh
# Run as root
pm2 startup freebsd -u swanlake --hp /home/swanlake
```

PM2 will print a command to run — copy and run it. It installs an rc.d script at
`/usr/local/etc/rc.d/pm2` and enables it automatically.

Enable it in `/etc/rc.conf`:

```sh
sysrc pm2_enable="YES"
```

Verify:

```sh
pm2 list         # should show swanlakecc as "online"
pm2 logs         # tail live logs
```

---

## 9. Configure nginx

### Create site config

```sh
cat > /usr/local/etc/nginx/sites-available/swanlakecc.conf << 'EOF'
server {
    listen 80;
    server_name book.swanlakecc.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/acme;
    }

    # Redirect all other HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    http2 on;
    server_name book.swanlakecc.com;

    ssl_certificate     /usr/local/etc/acme.sh/book.swanlakecc.com/fullchain.cer;
    ssl_certificate_key /usr/local/etc/acme.sh/book.swanlakecc.com/book.swanlakecc.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;

    # Apple Pay domain verification (served as a static file)
    location /.well-known/ {
        root /home/swanlake/app/public;
        default_type application/octet-stream;
    }

    # Next.js static assets (long cache)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
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
EOF
```

### Enable the site

```sh
mkdir -p /usr/local/etc/nginx/sites-enabled
ln -s /usr/local/etc/nginx/sites-available/swanlakecc.conf \
      /usr/local/etc/nginx/sites-enabled/swanlakecc.conf
```

Add this line to the `http {}` block in `/usr/local/etc/nginx/nginx.conf`:

```nginx
include /usr/local/etc/nginx/sites-enabled/*.conf;
```

### Enable nginx at boot

```sh
sysrc nginx_enable="YES"
```

---

## 10. Obtain a TLS Certificate with acme.sh

```sh
# Create webroot for ACME challenges
mkdir -p /var/www/acme

# Start nginx first (HTTP only, no SSL block yet — comment out the second server block temporarily)
service nginx start

# Obtain the certificate
acme.sh --issue -d book.swanlakecc.com -w /var/www/acme

# Install the cert to the path referenced in nginx config
acme.sh --install-cert -d book.swanlakecc.com \
  --cert-file      /usr/local/etc/acme.sh/book.swanlakecc.com/book.swanlakecc.com.cer \
  --key-file       /usr/local/etc/acme.sh/book.swanlakecc.com/book.swanlakecc.com.key \
  --fullchain-file /usr/local/etc/acme.sh/book.swanlakecc.com/fullchain.cer \
  --reloadcmd      "service nginx reload"
```

`acme.sh` installs a cron job automatically for renewal. Verify:

```sh
crontab -l   # should show an acme.sh renewal entry
```

Uncomment the HTTPS server block in nginx config, then reload:

```sh
nginx -t && service nginx reload
```

---

## 11. Configure the Firewall (pf)

```sh
cat > /etc/pf.conf << 'EOF'
# Network interface — change em0 to match yours (check with: ifconfig)
ext_if="em0"

# Block everything by default
block in all
block out all

# Allow loopback
pass quick on lo0 all

# Allow established outbound connections
pass out all keep state

# Allow SSH (change 22 to your port if different)
pass in on $ext_if proto tcp to port 22 keep state

# Allow HTTP and HTTPS
pass in on $ext_if proto tcp to port { 80, 443 } keep state
EOF
```

Enable and load:

```sh
sysrc pf_enable="YES"
service pf start
pfctl -f /etc/pf.conf
```

> **Note:** Make sure SSH is working before enabling pf or you may lock yourself out.

---

## 12. Initialize the Database

The database is created automatically when the app first starts. If you want to
pre-seed sample data:

```sh
su - swanlake
cd /home/swanlake/app
npx tsx src/lib/db/setup.ts
```

The database file lives at `/home/swanlake/app/swan-lake.db`.

---

## 13. Database Backups

SQLite is a single file — back it up with a cron job using SQLite's safe backup
command (works while the app is running):

```sh
# As root, create backup script
cat > /usr/local/sbin/backup-swanlakecc.sh << 'EOF'
#!/bin/sh
DEST=/var/backups/swanlakecc
mkdir -p $DEST
sqlite3 /home/swanlake/app/swan-lake.db ".backup '$DEST/swan-lake-$(date +%Y%m%d-%H%M%S).db'"
# Keep only last 30 days of backups
find $DEST -name "*.db" -mtime +30 -delete
EOF

chmod +x /usr/local/sbin/backup-swanlakecc.sh
```

Add to root's crontab (`crontab -e`):

```cron
# Back up Swan Lake CC database daily at 2am
0 2 * * * /usr/local/sbin/backup-swanlakecc.sh
```

---

## 14. Deploying Updates

```sh
su - swanlake
cd /home/swanlake/app

# Pull latest code
git pull

# Install any new dependencies
npm ci --omit=dev

# Rebuild
npm run build

# Reload app with zero downtime
pm2 reload swanlakecc
```

---

## 15. Useful Commands

```sh
# App status
pm2 list
pm2 show swanlakecc

# Live logs
pm2 logs swanlakecc

# Restart / stop / start
pm2 restart swanlakecc
pm2 stop swanlakecc
pm2 start swanlakecc

# nginx
nginx -t                  # test config syntax
service nginx reload      # reload config without dropping connections
service nginx restart

# Check TLS certificate expiry
acme.sh --list

# View database (for debugging)
sqlite3 /home/swanlake/app/swan-lake.db
```

---

## 16. DNS

Point the following DNS record at your server's IP before obtaining the TLS cert:

| Type | Name                  | Value           |
|------|-----------------------|-----------------|
| A    | book.swanlakecc.com   | your.server.ip  |

Then update the main swanlakecc.com Webflow site to link to
`https://book.swanlakecc.com` for the "Book a Tee Time" and "Become a Member"
buttons.

---

## Summary Checklist

- [ ] FreeBSD packages installed (`node22`, `nginx`, `acme.sh`, etc.)
- [ ] `swanlake` user created
- [ ] App deployed to `/home/swanlake/app`
- [ ] `.env.local` filled in with production values
- [ ] Google OAuth credentials configured and redirect URI set
- [ ] Apple Sign In Services ID configured and return URL set
- [ ] Square production credentials set; Apple Pay domain registered with Square
- [ ] Apple Pay domain association file placed in `public/.well-known/`
- [ ] `npm ci && npm run build` completed successfully
- [ ] PM2 started and registered as boot service
- [ ] nginx config in place and tested (`nginx -t`)
- [ ] TLS certificate issued via `acme.sh`
- [ ] Firewall enabled
- [ ] DNS A record pointing to server
- [ ] Database backup cron job in place
- [ ] `/admin` tested — only accessible with an email listed in `ADMIN_EMAILS`
