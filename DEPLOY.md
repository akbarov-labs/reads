# Deploying to Contabo

Every push to `main` lints and builds a Docker image on GitHub, pushes it to
GitHub Container Registry, then SSHs into your Contabo server to pull it and
restart — the same box already running kitoblarim, my-blog, and
reads-admin.

CI logs in as `deployer`, a user that can only run
`/usr/local/sbin/deploy-app reads <sha>` and has no shell. Setting that up,
and taking root off SSH, is in
[`docs/server-hardening.md`](docs/server-hardening.md); do it before step 6.

**Footprint:** one container (Next.js standalone output, ~100–150MB RAM),
no database of its own — it calls Reads-admin's API. It joins two external
Docker networks, created outside of this repo's compose file:

- `edge` — the standalone `edge` Caddy (caddy-docker-proxy), which picks up
  routing automatically from the `caddy:` / `caddy.reverse_proxy:` labels on
  the `app` service in `docker-compose.prod.yml`. No shared Caddyfile for any
  project to own. That Caddy's own setup lives outside this repo (`~/edge`
  on the server, mirrored in `infra/edge-caddy/` in
  `online-shop-telegram-bot`).
- `reads_net` — a small network shared only with `reads-admin-app`, so
  server-side rendering can reach the API by container name without
  depending on any other project's network.

Routing this app used to go through kitoblarim's own Caddy container on its
`kitoblarim_default` network. That direct coupling — one project's compose
stack gating another's public traffic — caused an outage on 2026-09-19 and
was replaced with the `edge` / `reads_net` split above so Reads no longer
depends on kitoblarim's stack being up.

## One-time server setup

Do this once, by hand, over SSH.

**1. Confirm the two external networks exist**

`docker-compose.prod.yml` expects both `edge` and `reads_net` to already
exist as external networks — it does not create them.

`edge` should already exist if the standalone caddy-docker-proxy setup
(`~/edge` on the server) is running. Verify with:

```bash
sudo docker network inspect edge >/dev/null && echo "edge exists"
```

`reads_net` is specific to this app and reads-admin; create it once if it
isn't there yet, then make sure `reads-admin-app`'s own compose file also
joins it (see reads-admin's `DEPLOY.md`):

```bash
sudo docker network create reads_net
```

**2. Create the deploy directory and the real `.env`**

```bash
sudo mkdir -p /opt/apps/reads
cd /opt/apps/reads
```

Copy `docker-compose.prod.yml` from the repo here too: deploys no longer
send it, so the server's copy is the one that runs (see "Changing
`docker-compose.prod.yml`" in `docs/server-hardening.md`). Both files stay
root-owned.

Create `.env` here (copy `.env.production.example` from the repo as a
starting point). This file stays on the server permanently — deploys never
touch it. Everything environment-specific lives here and is read at
runtime — no address is baked into the image, which is what lets the same
image run on staging first and then in production.

**3. Deploy Reads-admin first if it isn't already running**

This app calls `reads-admin-app` over the Docker network at request time
(server-side rendering), so Reads-admin should already be deployed and
healthy before the first deploy here — see its own `DEPLOY.md`. It isn't a
hard dependency for the container to *start*, but pages will fail to render
until it's reachable.

**4. Set `DOMAIN` in `.env`**

There is no Caddyfile to edit. The `edge` Caddy (caddy-docker-proxy) reads
routing straight off this container's Docker labels
(`caddy: ${DOMAIN}` / `caddy.reverse_proxy: {{upstreams 3000}}` in
`docker-compose.prod.yml`), so the only step here is setting `DOMAIN` in the
server's `.env` (`DOMAIN=kitoblarim.uz`). Caddy fetches the
Let's Encrypt certificate for it automatically the first time it's
requested — nothing to reload by hand.

Reads lives on `kitoblarim.uz` (decided 2026-10-15; the planned move to
`tarjima.kitoblarim.uz` was dropped). `SITE_URL` must be on the same address
as `DOMAIN`: `deploy-app` refuses a deploy where it isn't.

For a while every canonical link and the sitemap pointed at
`tarjima.kitoblarim.uz`, so search engines know that address. The second
site in `docker-compose.prod.yml`'s labels (`caddy_1`) answers it with a
permanent redirect to the same path on `kitoblarim.uz`. Keep it until
Search Console stops listing `tarjima` URLs.

**5. Log the server in to GHCR (one time, for manual operations)**

The deploy workflow authenticates its own pull using the `GITHUB_TOKEN`
GitHub generates per run, so **automated deploys need nothing from you
here**. But that token dies with the run, so a *manual* `docker compose
pull` / `up` on the server later fails with `error from registry: denied`.

To be able to intervene by hand, log the server in once with a classic
personal access token scoped to `read:packages` (reuse the same one you
made for reads-admin):

```bash
echo '<the token>' | sudo docker login ghcr.io -u <your-github-username> --password-stdin
```

**6. Create the `production` environment and add its secrets**

The `deploy` job in `deploy.yml` targets a GitHub **environment** named
`production` (this also gives you a deployment record + a clickable link to
`https://kitoblarim.uz` in the Actions run, and lets you require a
manual approval before every deploy if you want one).

Repo → Settings → Environments → New environment → name it exactly
`production` (case-sensitive, must match `deploy.yml`) → then add these as
**environment secrets** (not repo-level secrets):

| Secret | Value |
|---|---|
| `CONTABO_HOST` | Server IP or hostname |
| `CONTABO_USER` | `deployer` |
| `CONTABO_PORT` | SSH port (usually `22`) |
| `CONTABO_SSH_KEY` | Private half of this repo's own CI key (`ci_reads`), whose public half sits in `/home/deployer/.ssh/authorized_keys` behind the forced command |
| `CONTABO_KNOWN_HOSTS` | The server's host key line, from `ssh-keyscan` and checked against its fingerprint |

The deploy path is not a secret any more: it lives in
`/etc/deploy-app/reads.conf` on the server.

`GITHUB_TOKEN` (used to push to GHCR in `build-and-push`, and to pull on the
server in `deploy`) needs nothing from you — GitHub generates and injects it
automatically on every run. The token from step 5 is only for your own manual
`docker` commands on the server; it is not a repository secret.

The exact commands for the key, the host key and these secrets are in
steps 1 and 6 of `docs/server-hardening.md`. Never reuse a personal key, and
never share one CI key between repos.

Optional but recommended since this server also runs kitoblarim, my-blog,
and reads-admin: on the `production` environment's settings page, turn on
"Required reviewers" and add yourself. That makes every deploy pause for a
manual click in the Actions tab after the image builds, before it ever
touches the server.

**7. First deploy**

Push to `main` (or run the workflow manually from the Actions tab). Watch
it in the Actions tab. Once it's green:

```bash
sudo docker ps           # reads-app should be Up
sudo docker compose -f docker-compose.prod.yml logs -f app
```

Visit `https://kitoblarim.uz`.

## Everyday use

Push to `main`. The pipeline lints, tests and builds one image, deploys it
to **staging**, then waits for your **Approve** in the Actions tab before
deploying that same image to production. Setting staging up is in
[`docs/staging.md`](docs/staging.md) ([oʻzbekcha](docs/staging.uz.md)).

The one exception: a change to `docker-compose.prod.yml` has to be copied to
the server by hand before it takes effect (see `docs/server-hardening.md`).

## Changing `.env` on the server

After editing `.env`, you must **recreate** the container, not restart it:

```bash
sudo docker compose -f docker-compose.prod.yml up -d --force-recreate
```

`docker compose restart` reuses the existing container, and a container's
environment is captured once when it is *created* — so `.env` edits appear
to have no effect until it's recreated.

Also: never quote values in `.env`. Compose's `env_file:` reader does not
strip quotes, so `FOO="bar"` becomes the literal string `"bar"` inside the
container.

## Search-engine setup

Three variables in the server's `.env` drive everything SEO-related, plus
`DOMAIN` for routing (see step 4 above). They are read at runtime, so
changing one needs a container recreate (see "Changing `.env` on the
server" above) but not a rebuild:

```
DOMAIN=kitoblarim.uz
SITE_URL=https://kitoblarim.uz
SITE_NAME=Kitoblarim
REVALIDATE_SECRET=<openssl rand -hex 32>
```

`SITE_URL` is the origin every canonical URL, hreflang alternate, sitemap
entry and `og:image` is built from. Get it wrong and the whole site tells
Google it lives somewhere else.

`REVALIDATE_SECRET` must be **identical** to `SEO_REVALIDATE_SECRET` in
Reads-admin's `.env` on the same server. It authenticates
`POST /api/revalidate`, which Reads-admin calls after every save so a new
book appears on the site — and in the sitemap — within seconds instead of
after the 5-minute ISR window. If the two do not match, the site still
works; content just takes up to five minutes to appear, and the admin's
`storage/logs/laravel.log` fills with "Site revalidation was rejected".

Check it end to end from the server:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST -H "Authorization: Bearer $REVALIDATE_SECRET" \
  https://kitoblarim.uz/api/revalidate     # expect 200
```

**After the first deploy**, submit the sitemap once in Google Search Console
and Bing Webmaster Tools (`https://kitoblarim.uz/sitemap.xml`). It
regenerates itself from then on; nothing needs resubmitting when a
translator or book is added.

Worth knowing about the routes this adds:

| Path | What it is |
| --- | --- |
| `/sitemap.xml` | Every profile in every language, with hreflang alternates and a real `lastmod` |
| `/robots.txt` | Allows the answer-engine crawlers by name (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, …) |
| `/llms.txt` | Plain-text index of every translator and book, for language models |
| `/og/<locale>/<slug>` | Generated 1200×630 share card, unless an admin uploaded one |
| `/api/revalidate` | The webhook above. Rejects everything without the secret |

## Rollback

Every image is also tagged with its commit SHA, and the last three stay on
the server. Easiest: re-run an older successful run of the workflow from the
Actions tab. By hand:

```bash
cd /opt/apps/reads
sudo IMAGE_TAG=<previous-commit-sha> docker compose -f docker-compose.prod.yml up -d --force-recreate
```

Note that `IMAGE_TAG` defaults to `latest`, which the server never pulls
during normal deploys (the workflow pulls by commit SHA). If a bare
`docker compose up` fails with `error from registry: denied`, either log in
per step 5 above, or point it at an image already on the box:

```bash
sudo docker images ghcr.io/akbarov-labs/reads   # see what's local
sudo IMAGE_TAG=<one-of-those-tags> docker compose -f docker-compose.prod.yml up -d
```

## Notes

- The image carries no environment-specific value: the inquiry form posts
  to the site's own `/api/inquiries`, which forwards to `API_URL` from
  `.env`. Never reintroduce a `NEXT_PUBLIC_*` setting — it would be frozen
  into the build and break promoting one image from staging to production.
- This container has no persistent volume — it's fully stateless, so a
  redeploy is just: build, pull, replace.
