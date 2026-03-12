# OMEN Tor Mirror Setup

## Hetzner VPS Setup

1. Create CX11 instance (€4/month) — Ubuntu 22.04
2. SSH in: `ssh root@YOUR_IP`
3. Update: `apt update && apt upgrade -y`
4. Install Tor: `apt install tor -y`
5. Install nginx: `apt install nginx -y`

## Nginx Config

Create `/etc/nginx/sites-available/omen-tor`:

```nginx
server {
  listen 127.0.0.1:8080;
  root /var/www/omen-tor;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/omen-tor /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Tor Hidden Service Config

Add to `/etc/tor/torrc`:

```
HiddenServiceDir /var/lib/tor/omen/
HiddenServicePort 80 127.0.0.1:8080
```

## Get your .onion address

```bash
sudo systemctl restart tor
cat /var/lib/tor/omen/hostname
```

## Deploy static export

From your local machine:

```bash
bash scripts/buildTorExport.sh
rsync -avz out/ root@YOUR_IP:/var/www/omen-tor/
```

## Update

Run `buildTorExport.sh` and rsync again on every significant ledger update.

## Notes

- The static export strips all server-side API routes. The Tor mirror is read-only — ledger browsing only, no auth or contributions.
- Ensure `output: 'export'` is re-commented in `next.config.ts` after each Tor build, or the production Next.js server will break.
- The `.onion` address is stable as long as `/var/lib/tor/omen/` is not deleted. Back up that directory.
