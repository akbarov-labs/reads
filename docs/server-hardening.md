# Hardening the Contabo server

> Oʻzbekcha: [server-hardening.uz.md](server-hardening.uz.md)

Goal: CI never gets a shell, and a leaked CI key can do one thing only —
redeploy an image that already exists for one app.

## Where things stand

Already right (checked 2026-10-13):

- Root cannot log in over SSH (`PermitRootLogin no`, empty `/root/.ssh/authorized_keys`).
- Passwords are refused; keys only.
- You log in as `sarvar`, who has `sudo`.

The problem: **every project's CI also logs in as `sarvar`**, with one of two
keys in `/home/sarvar/.ssh/authorized_keys`:

| Key | Private half |
|---|---|
| `…UXATOykq its_akbarov@Durdonas-MacBook-Air.local` | `~/.ssh/deploy_key_contabo` on the Mac, and GitHub secrets |
| `…Mr7kQIq sarvar@vmi3536463` | `~/.ssh/gh_deploy_key` on the server, and GitHub secrets |

`sarvar` is in the `docker` group, and anyone in that group is root
(`docker run -v /:/host … chroot /host`). So today a leaked CI secret = the
whole server, every database included.

## Where this ends up

| Who | Logs in as | Can do |
|---|---|---|
| You | `sarvar`, your personal key only | anything, via `sudo` |
| GitHub Actions | `deployer`, one key per repo | run `/usr/local/sbin/deploy-app <that app> <sha>` — nothing else |

`deployer` is **not** in the `docker` group. Sudo lets it run the one
root-owned script, and the script takes everything that matters from
root-owned files.

**Phase 1** (this page, top to bottom) moves Reads. The other projects keep
deploying as `sarvar` meanwhile, untouched. **Phase 2** moves them one at a
time, then removes the two old keys.

---

## Before you start

- Open **one SSH session as `sarvar` and keep it open until the end.** If a
  step breaks login, you fix it from there. Test every login change in a
  *new* terminal.
- Last resort if you do get locked out: Contabo control panel → your VPS →
  **VNC console** logs in without SSH.
- In every laptop terminal below, set these first:

  ```bash
  HOST=<server IP>
  PORT=22
  ```

## 1. Copy the setup files to the server

On your laptop, from this repo. This also makes Reads' own CI key: used only
by this repo's CI, never by you, never by another repo.

```bash
cd ~/dev/sites/Reads
mkdir -p ~/deploy-setup && cp deploy/server/* ~/deploy-setup/
ssh-keygen -t ed25519 -f ~/.ssh/ci_reads -N "" -C ci-reads
printf 'restrict,command="sudo -n /usr/local/sbin/deploy-app reads \\"$SSH_ORIGINAL_COMMAND\\"" %s\n' \
  "$(cat ~/.ssh/ci_reads.pub)" > ~/deploy-setup/deployer_authorized_keys
cat ~/deploy-setup/deployer_authorized_keys
```

The last line must look like this, with `$SSH_ORIGINAL_COMMAND` literally:

```
restrict,command="sudo -n /usr/local/sbin/deploy-app reads \"$SSH_ORIGINAL_COMMAND\"" ssh-ed25519 AAAA… ci-reads
```

```bash
scp -P $PORT -r ~/deploy-setup sarvar@$HOST:/tmp/
```

## 2. The `deployer` user and the deploy script

On the server, as `sarvar`:

```bash
# No password at all ('*'), but not "locked", so key login still works.
sudo useradd --create-home --shell /bin/bash deployer
sudo usermod -p '*' deployer
id deployer                       # must NOT list docker or sudo

# The script and its per-app config, owned by root.
sudo install -m 755 -o root -g root /tmp/deploy-setup/deploy-app /usr/local/sbin/deploy-app
sudo install -d -m 755 -o root -g root /etc/deploy-app
sudo install -m 644 -o root -g root /tmp/deploy-setup/reads.conf /etc/deploy-app/reads.conf

# deployer may run that one script as root, nothing else.
echo 'deployer ALL=(root) NOPASSWD: /usr/local/sbin/deploy-app' | sudo tee /etc/sudoers.d/deployer >/dev/null
sudo chmod 440 /etc/sudoers.d/deployer
sudo visudo -cf /etc/sudoers.d/deployer
sudo -l -U deployer               # → (root) NOPASSWD: /usr/local/sbin/deploy-app

# Its authorized_keys, owned by root so deployer can never edit it.
sudo install -d -m 755 -o root -g root /home/deployer/.ssh
sudo install -m 644 -o root -g root /tmp/deploy-setup/deployer_authorized_keys /home/deployer/.ssh/authorized_keys
```

## 3. Give Reads a root-owned home

Reads runs from `/home/sarvar/reads` today, where the other projects' CI (still
`sarvar`) could rewrite its compose file. Copy it to `/opt/apps/reads`, owned
by root. The folder is still called `reads`, so compose sees the same project
and the next deploy simply replaces the `reads-app` container.

```bash
sudo install -d -m 755 -o root -g root /opt/apps /opt/apps/reads
sudo install -m 644 -o root -g root ~/reads/docker-compose.prod.yml /opt/apps/reads/
sudo install -m 600 -o root -g root ~/reads/.env /opt/apps/reads/
sudo ls -la /opt/apps/reads       # both files, both root's
```

Leave `~/reads` where it is until the first deploy from the new place is
green (step 6).

## 4. Pin the SSH settings

They're already right; this file keeps them right (a package update or
cloud-init file can't flip them) and adds `AllowUsers`, so only `sarvar` and
`deployer` can log in at all.

```bash
sudo install -m 644 -o root -g root /tmp/deploy-setup/00-hardening.conf /etc/ssh/sshd_config.d/
sudo sshd -t && echo "config OK"
sudo sshd -T | grep -Ei '^(passwordauthentication|permitrootlogin|allowusers)'
# expect: passwordauthentication no / permitrootlogin no / allowusers sarvar + deployer
sudo systemctl reload ssh || sudo systemctl restart ssh
sudo rm -rf /tmp/deploy-setup
```

Test in a **new** terminal on your laptop: `ssh -p $PORT sarvar@$HOST` still works.

## 5. Prove the CI key can't do anything else

On your laptop:

```bash
ssh -p $PORT -i ~/.ssh/ci_reads -o IdentitiesOnly=yes deployer@$HOST
ssh -p $PORT -i ~/.ssh/ci_reads -o IdentitiesOnly=yes deployer@$HOST 'cat /etc/shadow'
```

Both must answer `deploy-app: bad image tag` and close: no shell, and the
command is just treated as a tag. `PTY allocation request failed` is
expected too — the key may not open a terminal.

Refusals are logged on the server: `sudo journalctl -t deploy-app -n 20`.

## 6. GitHub: new secrets, then merge

The server's host key, so CI talks only to *your* server. Get it from the
laptop, then check the fingerprint against the server's own:

```bash
ssh-keyscan -p $PORT -t ed25519 $HOST 2>/dev/null > ~/deploy-setup/known_hosts
ssh-keygen -lf ~/deploy-setup/known_hosts
ssh -p $PORT sarvar@$HOST 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'   # must match
```

**Shared settings, once for the whole org** — **akbarov-labs → Settings →
Secrets and variables → Actions → Variables tab** (variables, not secrets:
none of these is private, and you can read them back). Give the
repositories access when asked.

| Variable | Value | Get it with |
|---|---|---|
| `CONTABO_HOST` | server IP | — |
| `CONTABO_PORT` | `22` | — |
| `CONTABO_USER` | `deployer` | — |
| `CONTABO_KNOWN_HOSTS` | the host key line | `pbcopy < ~/deploy-setup/known_hosts` |

If the org page won't let private repositories use them (some GitHub plans
don't), create the same four as **repository** variables in
akbarov-labs/reads instead. The workflow reads them the same way.

**The key, per repo** — **akbarov-labs/reads → Settings → Environments →
production → Environment secrets**:

| Secret | Value | Get it with |
|---|---|---|
| `CONTABO_SSH_KEY` | Reads' new private key, whole file including the `-----BEGIN`/`END` lines | `pbcopy < ~/.ssh/ci_reads` |

Then delete the old `CONTABO_HOST`, `CONTABO_PORT`, `CONTABO_USER` and
`CONTABO_DEPLOY_PATH` **secrets** from the environment and the repo: the
variables replace the first three, and the path now lives in
`/etc/deploy-app/reads.conf`.

Never put `CONTABO_SSH_KEY` at org level: each repo, and later each
environment, gets its own key, so one leak can only redeploy one app.

Merge the PR that switches `deploy.yml` to `deployer` **right after**: until it
lands, a deploy from the old workflow fails (harmlessly, nothing runs).
Watch the run in the Actions tab, then check https://tarjima.kitoblarim.uz and:

```bash
docker inspect reads-app --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}'
# → /opt/apps/reads
```

Once it's green, clean up:

```bash
# laptop: the private key only needs to live in GitHub
rm ~/.ssh/ci_reads
rm -rf ~/deploy-setup
# server: the old copy (keep its .env somewhere safe first if you like)
rm -rf ~/reads
```

Lost the key later? Make a new one (step 1), swap the line in
`/home/deployer/.ssh/authorized_keys`, update the secret.

---

## Living with it

**Changing `docker-compose.prod.yml`.** CI no longer copies it. When it
changes in the repo, put it on the server by hand, then redeploy:

```bash
scp -P $PORT docker-compose.prod.yml sarvar@$HOST:/tmp/
ssh -t -p $PORT sarvar@$HOST 'sudo install -m 644 -o root -g root /tmp/docker-compose.prod.yml /opt/apps/reads/'
```

**Changing `.env`.** `sudo nano /opt/apps/reads/.env`, then recreate (see DEPLOY.md).

**Rolling back.** Re-run an older successful run of the workflow from the
Actions tab, or by hand on the server (the last 3 images stay on disk):

```bash
cd /opt/apps/reads
sudo docker images ghcr.io/akbarov-labs/reads
sudo IMAGE_TAG=<sha> docker compose -f docker-compose.prod.yml up -d --force-recreate
```

**Audit trail.** Every deploy and every refusal: `sudo journalctl -t deploy-app`.

## Phase 2: the other projects, then the old keys go

For each of reads-admin, my-blog, online-shop-telegram-bot, kitoblarim (and
any repo that only runs backups):

1. Move it to `/opt/apps/<app>` as in step 3 (keep the same folder name so
   compose sees the same project).
2. Add `/etc/deploy-app/<app>.conf` (copy `reads.conf`, change `APP_DIR` and `REPO`).
3. Make that repo its own key (step 1 with its name) and **add** its line to
   `/home/deployer/.ssh/authorized_keys`, with `reads` replaced by the app name.
4. Switch its workflow's deploy job to the same shape as this repo's, and its
   secrets as in step 6. Check its old deploy step first: anything beyond
   pull + `up` (migrations, several services, backups) has to move into
   `deploy-app` or the image, never back into a CI shell.

When **no** repo logs in as `sarvar` any more:

```bash
# Keep only your personal key (…6nsu01dI itsakbarov98@gmail.com):
nano ~/.ssh/authorized_keys        # delete the …UXATOykq and …Mr7kQIq lines
rm ~/.ssh/gh_deploy_key ~/.ssh/gh_deploy_key.pub
```

Test `ssh sarvar@$HOST` in a new terminal before closing your open session.
Optional: `sudo gpasswd -d sarvar docker`, so docker on the server needs
`sudo` (and your password) like everything else that is root.

To see which old key is still in use while you migrate:

```bash
ssh-keygen -lf ~/.ssh/authorized_keys
sudo journalctl -u ssh --since "30 days ago" | grep "Accepted publickey"
```

## Also worth doing

- **2FA on your GitHub account and the akbarov-labs org.** Whoever can push to
  `main` can deploy, so this matters more than anything above.
- **Required reviewers** on each `production` environment (Settings →
  Environments), so a deploy waits for your click.
- **Security updates on their own:** `sudo apt install unattended-upgrades`.
- **Firewall:** only 22, 80, 443 open. If you use `ufw`, know that ports Docker
  publishes bypass it; publish only what Caddy needs.
