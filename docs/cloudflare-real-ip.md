# Real visitor IPs behind Cloudflare

> Uzbek version: [cloudflare-real-ip.uz.md](cloudflare-real-ip.uz.md). The
> commands are the same in both; if the two ever disagree, this file is right.

Since 2026-10-24 the kitoblarim.uz sites go through Cloudflare's proxy (the
orange cloud). Every request now reaches the server from a Cloudflare
address, so the apps see Cloudflare instead of the visitor:

- the translator inquiry form's limit (5 a minute per visitor, enforced by
  Reads-admin) is shared by everyone who comes through the same Cloudflare
  location, so one spammer can lock the form for everybody nearby;
- Reads-admin's public API limit and panel login throttling count Cloudflare
  locations instead of people.

The fix has two parts:

1. **Edge Caddy trusts Cloudflare.** For a request from a Cloudflare
   address, Caddy takes the visitor's IP from the `CF-Connecting-IP` header
   Cloudflare adds. From any other address that header is ignored, so nobody
   can fake an IP by sending it themselves.
2. **Reads and Reads-admin get that IP.** One label on each makes Caddy send
   `X-Forwarded-For: <visitor IP>` to the app. Without it Caddy appends the
   Cloudflare address, and the apps read that one.

Other sites on the server are not affected: olgo.uz, sarvarlogs.uz and the
staging sites are not behind Cloudflare, so their requests come straight
from visitors as before. app.kitoblarim.uz does not use visitor IPs today and
needs no label.

Tested on 2026-10-24 with the same `caddy-docker-proxy:2.9-alpine` image:
with the label the app received the visitor's IP; without it, the proxy's;
and a request from outside the trusted ranges could not fake either header.

Everything runs **on the server** as `sarvar`. Expect a few seconds of
downtime for all sites in step 1 (Caddy restarts) and for each app in step
2.

## 1. Edge Caddy (`~/edge`)

Look at the current file first:

```bash
cat ~/edge/Caddyfile
```

It should contain an `email {$ACME_EMAIL}` line and a `servers` block with
`trusted_proxies static private_ranges`, and nothing else besides comments.
If it has anything more, stop: the file below would remove it.

Keep a copy:

```bash
cd ~/edge && cp Caddyfile Caddyfile.bak-cloudflare
```

Write the new file (paste the whole block at once):

```bash
cat > ~/edge/Caddyfile <<'EOF'
{
    email {$ACME_EMAIL}
    servers {
        trusted_proxies static private_ranges 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32
        client_ip_headers CF-Connecting-IP X-Forwarded-For
    }
}
EOF
```

The addresses are Cloudflare's published ranges
(<https://www.cloudflare.com/ips/>) as of 2026-10-24. `private_ranges` stays:
it is what the server already trusted.

Check it before Caddy loads it. The `check.localhost` site is only there
because Caddy does not check these settings in a file with no site in it:

```bash
cd ~/edge && { cat Caddyfile; printf 'http://check.localhost {\n    respond ok\n}\n'; } > /tmp/Caddyfile.check
```

```bash
cd ~/edge && sudo docker run --rm --env-file .env -v /tmp/Caddyfile.check:/Caddyfile:ro lucaslorentz/caddy-docker-proxy:2.9-alpine adapt --config /Caddyfile --adapter caddyfile --validate > /dev/null && echo CADDYFILE OK
```

A few log lines above it are normal (one warns that the file "is not
formatted": harmless, it is about spaces versus tabs). Only if the last line
is `CADDYFILE OK`, restart Caddy:

```bash
cd ~/edge && sudo docker compose restart caddy
```

Then check for errors (expect `0`):

```bash
cd ~/edge && sleep 10 && sudo docker compose logs --since 2m caddy | grep -c '"level":"error"'
```

**If anything is wrong**, put the old file back:

```bash
cd ~/edge && cp Caddyfile.bak-cloudflare Caddyfile && sudo docker compose restart caddy
```

## 2. The label on Reads and Reads-admin

The compose files live on the server, owned by root, and deploys never
overwrite them, so the change is made there.

### Reads

```bash
cd /opt/apps/reads && sudo grep -q "reverse_proxy.header_up" docker-compose.prod.yml || sudo sed -i '/caddy.reverse_proxy: "{{upstreams 3000}}"/a\      caddy.reverse_proxy.header_up: "X-Forwarded-For {client_ip}"' docker-compose.prod.yml
```

```bash
cd /opt/apps/reads && sudo grep -n "reverse_proxy" docker-compose.prod.yml
```

You should see two lines, one under the other:

```
      caddy.reverse_proxy: "{{upstreams 3000}}"
      caddy.reverse_proxy.header_up: "X-Forwarded-For {client_ip}"
```

Labels only change when the container is recreated. This recreates it with
the image it is running now (no new version is deployed). Paste it exactly:
there is one `sudo`, before `env`. A second `sudo` before `docker compose`
clears `IMAGE` and `IMAGE_TAG`, and compose then tries to download
`reads:latest`, which fails with `unauthorized`:

```bash
cd /opt/apps/reads && IMG=$(sudo docker inspect --format '{{.Config.Image}}' reads-app) && echo "$IMG" && sudo env IMAGE="${IMG%:*}" IMAGE_TAG="${IMG##*:}" docker compose -f docker-compose.prod.yml up -d
```

### Reads-admin

Find its folder and check for `UP_FLAGS`:

```bash
cat /etc/deploy-app/reads-admin.conf
```

Use the `APP_DIR` it shows below (`/opt/apps/reads-admin` is assumed). If
there is an `UP_FLAGS=` line with a value, add that value to the end of the
`docker compose ... up -d` command.

```bash
cd /opt/apps/reads-admin && sudo grep -q "reverse_proxy.header_up" docker-compose.prod.yml || sudo sed -i '/caddy.reverse_proxy: "{{upstreams 80}}"/a\      caddy.reverse_proxy.header_up: "X-Forwarded-For {client_ip}"' docker-compose.prod.yml
```

```bash
cd /opt/apps/reads-admin && sudo grep -n "reverse_proxy" docker-compose.prod.yml
```

```bash
cd /opt/apps/reads-admin && IMG=$(sudo docker inspect --format '{{.Config.Image}}' reads-admin-app) && echo "$IMG" && sudo env IMAGE="${IMG%:*}" IMAGE_TAG="${IMG##*:}" docker compose -f docker-compose.prod.yml up -d
```

## 3. Check

On the server, both containers carry the label:

```bash
for c in reads-app reads-admin-app; do echo "$c: $(sudo docker inspect --format '{{index .Config.Labels "caddy.reverse_proxy.header_up"}}' $c)"; done
```

Expect `X-Forwarded-For {client_ip}` after each name. Then Caddy has picked
it up (expect `2` or more):

```bash
cd ~/edge && sudo docker compose logs --since 5m caddy | grep -o 'header_up X-Forwarded-For {client_ip}' | wc -l
```

On the **Mac**, the sites answer:

```bash
for u in https://kitoblarim.uz/uz https://dashboard.kitoblarim.uz/ https://app.kitoblarim.uz/ https://olgo.uz/; do curl -s -o /dev/null -w "%{http_code} $u\n" "$u"; done
```

Expect `200` for each (`dashboard` may answer `302` to its login page).

## Later

- Cloudflare rarely adds address ranges. If it does, visitors arriving from
  a new range are counted by Cloudflare's address again (nothing breaks).
  Compare the list in `~/edge/Caddyfile` with
  <https://www.cloudflare.com/ips/> every few months.
- The reference copies of the compose files in the repos (this repo's
  `docker-compose.prod.yml`, Reads-admin's, and
  `infra/edge-caddy/Caddyfile` in online-shop-telegram-bot) should carry the
  same change, so a rebuilt server gets it too.
- Moving olgo.uz behind Cloudflare needs more than this: its rate limits read
  `{remote_host}`, and payment and Telegram callbacks must not meet
  Cloudflare's bot checks.
