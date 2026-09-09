# Deploying to Contabo

Every push to `main` lints and builds a Docker image on GitHub, pushes it to
GitHub Container Registry, then SSHs into your Contabo server to pull it and
restart — the same box already running kitoblarim, my-blog, and
reads-admin behind Caddy.

**Footprint:** one container (Next.js standalone output, ~100–150MB RAM),
no database of its own — it calls Reads-admin's API — joins the Caddy
network you already have, and reaches reads-admin-app directly over that
same internal network for server-side rendering.

## One-time server setup

Do this once, by hand, over SSH.

**1. Find Caddy's Docker network**

Already done — kitoblarim's Caddy container (`kitoblarim-caddy-1`) is on the
`kitoblarim_default` network, and `docker-compose.prod.yml` already targets
it (this is also the network reads-admin-app is on, so this container can
reach it by name). If kitoblarim's stack is ever rebuilt under a different
Compose project name, its network name changes too — re-check with:

```bash
docker inspect kitoblarim-caddy-1 --format '{{json .NetworkSettings.Networks}}'
```

and update the `name:` value under `networks: caddy_net:` in
`docker-compose.prod.yml` in the repo to match.

**2. Create the deploy directory and the real `.env`**

```bash
mkdir -p /opt/apps/reads
cd /opt/apps/reads
```

Create `.env` here (copy `.env.production.example` from the repo as a
starting point). This file stays on the server permanently — deploys never
touch it. It only needs `NODE_ENV` and the server-side `API_URL`; the
browser-facing `NEXT_PUBLIC_API_URL` is baked into the image at build time
instead (see the note in that file and in `deploy.yml`).

**3. Deploy Reads-admin first if it isn't already running**

This app calls `reads-admin-app` over the Docker network at request time
(server-side rendering), so Reads-admin should already be deployed and
healthy before the first deploy here — see its own `DEPLOY.md`. It isn't a
hard dependency for the container to *start*, but pages will fail to render
until it's reachable.

**4. Add the Caddy site block**

Copy the block from `deploy/Caddyfile.snippet` in the repo into your
existing Caddyfile, then reload Caddy (see the comment in that file for the
exact command). Caddy will fetch the Let's Encrypt certificate for
`tarjima.kitoblarim.uz` automatically the first time it's requested.

**5. Create a GHCR pull token**

The server needs its own long-lived credential to pull the (private by
default) image from GHCR — it's a different machine from the one that
pushed it. On GitHub: Settings → Developer settings → Personal access
tokens → Tokens (classic) → generate one with only the `read:packages`
scope. This is the `GHCR_PAT` secret below — reuse the same token you
created for reads-admin if you'd rather not manage two.

**6. Create the `production` environment and add its secrets**

The `deploy` job in `deploy.yml` targets a GitHub **environment** named
`production` (this also gives you a deployment record + a clickable link to
`https://tarjima.kitoblarim.uz` in the Actions run, and lets you require a
manual approval before every deploy if you want one).

Repo → Settings → Environments → New environment → name it exactly
`production` (case-sensitive, must match `deploy.yml`) → then add these as
**environment secrets** (not repo-level secrets):

| Secret | Value |
|---|---|
| `CONTABO_HOST` | Server IP or hostname |
| `CONTABO_USER` | SSH username |
| `CONTABO_PORT` | SSH port (usually `22`) |
| `CONTABO_SSH_KEY` | Private key (PEM) for a key whose public half is in that user's `~/.ssh/authorized_keys` |
| `CONTABO_DEPLOY_PATH` | `/opt/apps/reads` (or wherever you created it in step 2) |
| `GHCR_PAT` | The personal access token from step 5 |

`GITHUB_TOKEN` (used to push to GHCR in the `build-and-push` job) needs
nothing from you — GitHub generates and injects it automatically on every
run.

Don't reuse a personal key you need elsewhere — generate a dedicated
deploy keypair (`ssh-keygen -t ed25519 -f ~/.ssh/deploy_key_reads -N ""`),
add the `.pub` half to the server's `authorized_keys`, and put the contents
of the private half into `CONTABO_SSH_KEY`.

Optional but recommended since this server also runs kitoblarim, my-blog,
and reads-admin: on the `production` environment's settings page, turn on
"Required reviewers" and add yourself. That makes every deploy pause for a
manual click in the Actions tab after the image builds, before it ever
touches the server.

**7. First deploy**

Push to `main` (or run the workflow manually from the Actions tab). Watch
it in the Actions tab. Once it's green:

```bash
docker ps            # reads-app should be Up
docker compose -f docker-compose.prod.yml logs -f app
```

Visit `https://tarjima.kitoblarim.uz`.

## Everyday use

Just push to `main`. That's the whole pipeline — lint, build, push to GHCR,
pull on the server, restart.

## Rollback

Every image is also tagged with its commit SHA. To roll back:

```bash
cd /opt/apps/reads
IMAGE_TAG=<previous-commit-sha> docker compose -f docker-compose.prod.yml up -d
```

## Notes

- `NEXT_PUBLIC_API_URL` is compiled into the client bundle at *build* time,
  not read from `.env` at container start. To change the public API domain,
  edit the `env:` block at the top of `.github/workflows/deploy.yml` and
  redeploy — editing the server's `.env` has no effect on it.
- This container has no persistent volume — it's fully stateless, so a
  redeploy is just: build, pull, replace.
