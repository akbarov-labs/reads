# Moving another project to deployer + staging

> Oʻzbekcha: [add-app.uz.md](add-app.uz.md)

What Reads went through by hand ([server-hardening.md](server-hardening.md),
[staging.md](staging.md)) is now two commands: `deploy/prepare-app` on the
Mac, `sudo add-app` on the server. Everything shared — the `deployer` user,
`deploy-app`, SSH settings, org variables, the `*.staging.sarvarlogs.uz` DNS
record — is already in place.

Each project ends up with:

| | Production | Staging |
|---|---|---|
| Address | its own domain | `<app>.staging.sarvarlogs.uz`, password protected (user `staging`) |
| Folder | `/opt/apps/<app>` | `/opt/apps/<app>-staging` |
| CI key | `production` environment | `staging` environment, can only deploy staging |
| Deploys | after you **Approve** | every push to `main` |

## 0. Once: install the tools on the server

Mac, from the Reads repo:

```bash
cd ~/dev/sites/Reads
git switch main && git pull
scp deploy/server/add-app deploy/server/deploy-app sarvar@169.58.243.86:/tmp/
```

Server:

```bash
sudo install -m 755 -o root -g root /tmp/add-app /usr/local/sbin/add-app
sudo install -m 755 -o root -g root /tmp/deploy-app /usr/local/sbin/deploy-app
```

## 1. The project's code (Claude does this part)

A pull request in the project that:

- adds `docker-compose.staging.yml` (own container name, `caddy.basic_auth.staging: STAGING_AUTH_HASH`);
- switches its deploy to build once → staging → approve → production
  through `deploy-to.yml`, as in Reads;
- notes anything special about its data in its `DEPLOY.md`.

**Don't merge it yet.**

## 2. Mac

```bash
cd ~/dev/sites/Reads
deploy/prepare-app <app> ~/dev/sites/<project folder>
```

It makes two keys (`~/.ssh/ci_<app>` and `~/.ssh/ci_<app>_staging`) and
sends the files to the server.

## 3. Server

Find where the app runs today and its image:

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Label "com.docker.compose.project.working_dir"}}'
```

Then (image without the `:tag`):

```bash
sudo add-app <app> ghcr.io/akbarov-labs/<image> /home/sarvar/<folder>
```

It asks for staging's password twice. It **stops** if staging's `DOMAIN`
isn't `<app>.staging.sarvarlogs.uz`, so the live site can't get staging's
login prompt again.

Then read staging's settings — nothing on staging may email, message or
charge real people:

```bash
sudo nano /opt/apps/<app>-staging/.env
```

Plus anything the project's `DEPLOY.md` lists under staging (e.g. copying
its data).

## 4. GitHub

**Private repository?** On GitHub's free plan it can't see the org's
variables. Add the same four in the project's repo → **Settings → Secrets
and variables → Actions → Variables → New repository variable**:
`CONTABO_HOST` (`169.58.243.86`), `CONTABO_PORT` (`22`), `CONTABO_USER`
(`deployer`), `CONTABO_KNOWN_HOSTS` (copy it from the org's Variables page).
A public repository needs nothing here.

Then in the project's repo → **Settings → Environments**:

**`staging`** (New environment):
- secret `CONTABO_SSH_KEY` = `pbcopy < ~/.ssh/ci_<app>_staging`
- variable `SITE_URL` = `https://<app>.staging.sarvarlogs.uz`
- Deployment branches → Selected branches → `main`

**`production`**:
- secret `CONTABO_SSH_KEY` = `pbcopy < ~/.ssh/ci_<app>` (replace the old one)
- variable `SITE_URL` = its real address
- **Required reviewers** → yourself. Only public repositories have this on
  GitHub's free plan. For a private one, the project's PR instead adds a
  **Promote to production** workflow (as in my-blog): staging deploys on
  every push, production when you press **Run workflow** there.
- Deployment branches → Selected branches → `main`
- delete the old `CONTABO_HOST`, `CONTABO_PORT`, `CONTABO_USER`,
  `CONTABO_DEPLOY_PATH` secrets (environment and repository level)

## 5. Merge and watch

Merge the PR. In Actions: staging deploys → open
`https://<app>.staging.sarvarlogs.uz` → **Review deployments → Approve and
deploy** (public repository), or **Promote to production → Run workflow**
(private repository). Then check the live site and, on the server:

```bash
docker inspect <container> --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}'
```

It must print `/opt/apps/<app>`.

## 6. Clean up

```bash
rm ~/.ssh/ci_<app> ~/.ssh/ci_<app>_staging
```

(Mac.) On the server, after a few days of green deploys:
`rm -rf /home/sarvar/<folder>` (keep a copy of its `.env` if you like).

If the app keeps data (a database, uploads), add its volumes to the nightly
off-site copy: [offsite-backups.md](offsite-backups.md), "Living with it".

When **every** project is moved, remove the two old keys from `sarvar` —
see the end of [server-hardening.md](server-hardening.md).
