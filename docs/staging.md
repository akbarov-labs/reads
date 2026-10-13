# Staging for Reads

> Oʻzbekcha: [staging.uz.md](staging.uz.md)

Every push to `main` now builds **one** image and:

1. deploys it to **staging** automatically;
2. waits for your **Approve** click in the Actions tab;
3. deploys **the same image** to production.

So production only ever runs an image you already saw working on staging.
Nothing environment-specific is inside the image; each environment's `.env`
on the server supplies it.

| | Production | Staging |
|---|---|---|
| Folder | `/opt/apps/reads` | `/opt/apps/reads-staging` |
| Container | `reads-app` | `reads-staging-app` |
| deploy-app name | `reads` | `reads-staging` |
| CI key | `production` env secret | `staging` env secret (can only deploy staging) |
| Visitors | everyone | login prompt (user `staging`) |
| Data | Reads-admin | reads production's Reads-admin; inquiry form off |

Staging reads production's catalogue until Reads-admin has a staging copy
of its own. It never writes there: `INQUIRIES_DISABLED=true` turns the form
off.

Do this **before merging** the PR that adds staging. Until it's done, the
staging job fails and production waits — nothing breaks, but nothing deploys.

Same safety rules as [server-hardening.md](server-hardening.md): keep one
`sarvar` session open, and in every laptop terminal first set:

```bash
HOST=169.58.243.86
PORT=22
STAGING_DOMAIN=reads.staging.sarvarlogs.uz
```

## 1. DNS

Every staging site lives under `staging.sarvarlogs.uz`:
`reads.staging.sarvarlogs.uz`, later `reads-admin.staging…`, `shop.staging…`.
In the DNS panel for `sarvarlogs.uz` (ahost.uz), add one record:

| Type | Name | Value |
|---|---|---|
| `A` | `*.staging` | `169.58.243.86` |

The wildcard points every name under `staging.sarvarlogs.uz` at the server,
so later projects need no DNS work. The blog at `sarvarlogs.uz` itself is not
touched. If staging moves to its own server one day, you change this one
record. (If the panel refuses a wildcard, add `reads.staging` as a plain `A`
record instead, and one more per project later.)

Check from the laptop (can take a few minutes):

```bash
dig +short $STAGING_DOMAIN
```

It must print `169.58.243.86`.

## 2. Staging's CI key and files (laptop)

```bash
cd ~/dev/sites/Reads
mkdir -p ~/staging-setup
cp deploy/server/reads-staging.conf docker-compose.staging.yml ~/staging-setup/
ssh-keygen -t ed25519 -f ~/.ssh/ci_reads_staging -N "" -C ci-reads-staging
printf 'restrict,command="sudo -n /usr/local/sbin/deploy-app reads-staging \\"$SSH_ORIGINAL_COMMAND\\"" %s\n' \
  "$(cat ~/.ssh/ci_reads_staging.pub)" > ~/staging-setup/deployer_staging_key
cat ~/staging-setup/deployer_staging_key
scp -P $PORT -r ~/staging-setup sarvar@$HOST:/tmp/
```

The printed line must say `deploy-app reads-staging`, not `reads`.

## 3. Staging on the server

On the server, as `sarvar`:

```bash
sudo install -m 644 -o root -g root /tmp/staging-setup/reads-staging.conf /etc/deploy-app/
sudo install -d -m 755 -o root -g root /opt/apps/reads-staging
sudo install -m 644 -o root -g root /tmp/staging-setup/docker-compose.staging.yml /opt/apps/reads-staging/
sudo install -m 600 -o root -g root /opt/apps/reads/.env /opt/apps/reads-staging/.env
sudo tee -a /home/deployer/.ssh/authorized_keys < /tmp/staging-setup/deployer_staging_key >/dev/null
sudo cat /home/deployer/.ssh/authorized_keys
```

The last command must show **two** lines: `… reads \"$SSH…` and
`… reads-staging \"$SSH…`.

Now edit staging's `.env` (a copy of production's). **Do it now, before
anything deploys staging:** the copy still says `DOMAIN=kitoblarim.uz`, and a
staging container started with it puts staging's login prompt in front of
the live site. (`deploy-app` refuses such a deploy since this happened once,
but don't rely on it.)

```bash
sudo nano /opt/apps/reads-staging/.env
```

Change these, leave the rest:

```
DOMAIN=reads.staging.sarvarlogs.uz
SITE_URL=https://reads.staging.sarvarlogs.uz
INQUIRIES_DISABLED=true
REVALIDATE_SECRET=
```

`REVALIDATE_SECRET` is emptied on purpose: Reads-admin only pings
production, and an empty secret refuses every call.

## 4. Staging's password

Still on the server. Pick a password; it's typed, not shown:

```bash
read -rs -p 'Staging password: ' P; echo
HASH=$(sudo docker exec edge-caddy-1 caddy hash-password --plaintext "$P"); unset P
sudo sed -i "s|STAGING_AUTH_HASH|${HASH//\$/\$\$}|" /opt/apps/reads-staging/docker-compose.staging.yml
sudo grep basic_auth /opt/apps/reads-staging/docker-compose.staging.yml
sudo rm -rf /tmp/staging-setup
```

The `grep` line must show `caddy.basic_auth.staging: $$2a$$14$$…` — every
`$` doubled. The username is `staging`.

## 5. Check the key (laptop)

```bash
ssh -p $PORT -i ~/.ssh/ci_reads_staging -o IdentitiesOnly=yes deployer@$HOST
```

Must answer `deploy-app: bad image tag`, like the production key did.

## 6. GitHub

**akbarov-labs/reads → Settings → Environments → New environment →
`staging`**:

- Environment secret `CONTABO_SSH_KEY` = `pbcopy < ~/.ssh/ci_reads_staging`
- Environment variable `SITE_URL` = `https://reads.staging.sarvarlogs.uz`
- Deployment branches and tags → **Selected branches** → `main`

**Environments → `production`**:

- **Required reviewers** → add yourself. This is the Approve step; without
  it, production deploys straight after staging.
- Environment variable `SITE_URL` = the production address (today
  `https://kitoblarim.uz`)
- Deployment branches and tags → **Selected branches** → `main`

Then merge the PR. In the Actions tab: staging deploys, then the run waits
at **deploy-production → Review deployments**. Open staging, check it, then
**Approve and deploy**.

Check staging asks for the password:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://$STAGING_DOMAIN/    # 401
curl -s -o /dev/null -w '%{http_code}\n' -u staging https://$STAGING_DOMAIN/uz   # asks the password, then 200
```

Clean up on the laptop:

```bash
rm ~/.ssh/ci_reads_staging
rm -rf ~/staging-setup
```

## Day to day

- **Push to `main`** → staging updates by itself → look at it → **Approve**
  in Actions → production gets that same image.
- **Don't approve** a build you don't like: push a fix, and approve the
  newer run instead. The old one can be left waiting or cancelled.
- **Change staging's password**: put `STAGING_AUTH_HASH` back in
  `/opt/apps/reads-staging/docker-compose.staging.yml` (or edit the line by
  hand), repeat step 4, then re-run the latest staging deploy.
- **Staging's own data**: when Reads-admin gets staging, point `API_URL` in
  staging's `.env` at `http://reads-admin-staging-app:80/api`, remove
  `INQUIRIES_DISABLED`, and recreate.
