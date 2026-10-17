# Off-site backups

> Oʻzbekcha: [offsite-backups.uz.md](offsite-backups.uz.md)

Every app on the Contabo server backs itself up each night, but into a
Docker volume **on the same server**. That covers a bad migration or a
deleted row. If the server itself is lost, the backups go with it.

`offsite-backup` (from `deploy/server/` here) runs as root every night at
04:30 UTC. It copies those backups, the apps' uploaded files and the
server's settings to a **Backblaze B2** bucket. rclone's `crypt` encrypts
everything before it leaves the server, so Backblaze only stores encrypted
bytes. **healthchecks.io** emails you if a night fails or never reports in,
including when the server is gone.

| App | What goes off-site | From (volume) | Off-site path |
|---|---|---|---|
| olgo (shop) | nightly `pg_dump` | `tma-commerce_backups/db` | `dumps/olgo/` |
| olgo | product photos, mirrored | `tma-commerce_uploads` | `files/olgo/` |
| kitoblarim | nightly `pg_dump` | `kitoblarim_db_backups` | `dumps/kitoblarim/` |
| kitoblarim | book covers, mirrored | `kitoblarim_uploads_data` | `files/kitoblarim/` |
| reads-admin | nightly SQLite copy | `reads-admin_db_backups` | `dumps/reads-admin/` |
| reads-admin | portraits/avatars, mirrored | `reads-admin_app_storage/app/public` | `files/reads-admin/` |
| my-blog | nightly SQLite copy (new `backup` service) | `my-blog_db_backups` | `dumps/my-blog/` |
| server | `/opt/apps`, `/etc/deploy-app`, `~/edge` (`.env` files included) | — | `dumps/server/` |

Reads has no database. Staging copies are not backed up.

**How long copies are kept.** Backblaze deletes `dumps/` copies after 30
days. In `files/`, a photo stays for as long as it exists, and an
overwritten one keeps its old version for 30 days. The script never deletes
anything off-site, and **Object Lock** stops even the server's own key from
deleting a file in its first 30 days. Someone who breaks into the server
can't wipe the history.

**What you must keep yourself, off the server:** the two crypt passwords.
Without them nobody can read the backups, you included. They go into your
password manager in step 4. That is the one step you can't skip.

---

## 1. Backblaze B2 (browser)

1. Sign up at backblaze.com → **B2 Cloud Storage**. Pick the region
   **EU Central**. The first 10 GB are free, with no card needed.
2. **Buckets → Create a Bucket**:
   - name: something unique, e.g. `sarvar-contabo-backups-7k2` (write it down)
   - Files in Bucket: **Private**
   - Default Encryption: **Enable**
   - Object Lock: **Enable**
3. On the new bucket, click **Object Lock** and set the default retention to
   **30 days**. If it asks for a mode, choose **Governance**.
4. On the bucket, **Lifecycle Settings** → custom rules, two of them:

   | File path (prefix) | Days till hide | Days till delete |
   |---|---|---|
   | `dumps/` | 30 | 1 |
   | `files/` | *(empty)* | 30 |

5. **Application Keys → Add a New Application Key**:
   - name `contabo-offsite`
   - Allow access to Bucket(s): **only your bucket**
   - Type of Access: **Read and Write**
   - everything else empty

   The page then shows `keyID` and `applicationKey` **once**. Keep the tab
   open until step 5.

## 2. healthchecks.io (browser)

1. Sign up at healthchecks.io (free) with your email.
2. **Add Check**: name `contabo-offsite`, **Period 1 day**, **Grace 2 hours**.
3. Optional: **Integrations → Telegram**, so the alert also reaches Telegram.
4. Copy the check's **Ping URL** (`https://hc-ping.com/…`).

## 3. Mac: send the files to the server

Once this repo's pull request is merged:

```bash
cd ~/dev/sites/Reads
git switch main && git pull
scp deploy/server/offsite-backup deploy/server/offsite-backup.service deploy/server/offsite-backup.timer deploy/server/offsite-backup.sources deploy/server/offsite-backup.conf sarvar@169.58.243.86:/tmp/
```

Before the first run, my-blog needs its new `backup` service: my-blog's
`DEPLOY.md`, "Backups and restore".

## 4. Server: install, and make the crypt passwords

```bash
sudo apt-get update && sudo apt-get install -y rclone
sudo install -m 755 -o root -g root /tmp/offsite-backup /usr/local/sbin/offsite-backup
sudo install -m 644 -o root -g root /tmp/offsite-backup.service /tmp/offsite-backup.timer /etc/systemd/system/
sudo install -d -m 700 -o root -g root /etc/offsite-backup
sudo install -m 600 -o root -g root /tmp/offsite-backup.sources /etc/offsite-backup/sources
sudo install -m 600 -o root -g root /tmp/offsite-backup.conf /etc/offsite-backup/offsite-backup.conf
```

Make the two crypt passwords and show them **once**:

```bash
P1=$(openssl rand -hex 32)
P2=$(openssl rand -hex 32)
printf 'crypt password 1: %s\ncrypt password 2: %s\n' "$P1" "$P2"
```

**Now** make a password-manager entry "Contabo off-site backups" with:
both passwords, the bucket name, your Backblaze login email and the line
`crypt over b2:<bucket>, directory_name_encryption=false`. Don't go on until
it is saved.

## 5. Server: connect to the bucket

In the **same** terminal, because `P1` and `P2` are still set there. Each
`read` waits for a paste. What you paste is not shown and does not land in
the shell history.

```bash
read -rsp "B2 keyID: " B2_ID; echo
read -rsp "B2 applicationKey: " B2_KEY; echo
read -rp "Bucket name: " BUCKET
sudo rclone --config /etc/offsite-backup/rclone.conf config create b2 b2 account="$B2_ID" key="$B2_KEY"
sudo rclone --config /etc/offsite-backup/rclone.conf config create offsite crypt remote="b2:$BUCKET" directory_name_encryption=false password="$P1" password2="$P2" --obscure
sudo chmod 600 /etc/offsite-backup/rclone.conf
unset B2_ID B2_KEY P1 P2
```

Put the healthchecks.io ping URL in `HEALTHCHECK_URL=`:

```bash
sudo nano /etc/offsite-backup/offsite-backup.conf
```

## 6. Server: check, first run, then every night

Check the volume names in `sources` against what the server really has:

```bash
sudo docker volume ls
sudo offsite-backup check
```

Every line must say `ok`. A `FAIL` names a volume that doesn't exist: fix
the name with `sudo nano /etc/offsite-backup/sources`. The project prefix is
whatever `docker volume ls` shows.

The first run uploads everything, so it may take a while:

```bash
sudo offsite-backup run
```

It ends with `finished …: OK`, and healthchecks.io shows the check green.
Then turn on the nightly timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now offsite-backup.timer
systemctl list-timers offsite-backup.timer
```

**Prove Object Lock works.** Upload a small test file, then try to delete it
for good with the server's own key. The delete must **fail**:

```bash
read -rp "Bucket name: " BUCKET
echo lock-test | sudo rclone --config /etc/offsite-backup/rclone.conf rcat "b2:$BUCKET/dumps/lock-test.txt"
sudo rclone --config /etc/offsite-backup/rclone.conf deletefile --b2-hard-delete "b2:$BUCKET/dumps/lock-test.txt"
```

The second command must end in an error that says the file is locked or
access is denied. If it says nothing and exits, the lock isn't on: go back
to step 1.3. The test file disappears by itself after 31 days.

## 7. Restore drill: from the Mac, with the server out of the picture

This proves what matters: with only your password manager and Backblaze,
the data comes back.

1. Backblaze → **Application Keys → Add a New Application Key**: name
   `mac-drill`, your bucket only, **Read Only**.
2. Mac:

```bash
brew install rclone
read -rs "B2_ID?B2 keyID (mac-drill): "; echo
read -rs "B2_KEY?B2 applicationKey (mac-drill): "; echo
read -rs "P1?crypt password 1: "; echo
read -rs "P2?crypt password 2: "; echo
read -r "BUCKET?Bucket name: "
rclone config create drill-b2 b2 account="$B2_ID" key="$B2_KEY"
rclone config create drill crypt remote="drill-b2:$BUCKET" directory_name_encryption=false password="$P1" password2="$P2" --obscure
unset B2_ID B2_KEY P1 P2
rclone lsl drill:dumps
```

You should see real file names (`reads-admin-….sqlite.gz`, `library-….sql.gz`,
…). If you get errors or garbled names, the passwords in the password
manager are wrong: fix that now, while the server is still alive.

Restore reads-admin's newest database and open it:

```bash
mkdir -p ~/offsite-drill && cd ~/offsite-drill
rclone copy drill:dumps/reads-admin --max-age 2d .
F=$(ls -t reads-admin-*.sqlite.gz | head -1)
gunzip -c "$F" > reads-admin.sqlite
sqlite3 reads-admin.sqlite "PRAGMA integrity_check; SELECT count(*) FROM editions;"
```

It should print `ok` and the number of editions the panel shows. Then the
other apps and the server settings:

```bash
rclone copy drill:dumps/kitoblarim --max-age 2d .
gzip -dc "$(ls -t library-*.sql.gz | head -1)" | grep -c "PostgreSQL database dump complete"
rclone copy drill:dumps/server --max-age 2d .
tar -tzf "$(ls -t configs-*.tar.gz | head -1)" | grep '\.env$'
```

The first prints `1`: the dump has pg_dump's end marker, so it is complete. The second lists every
app's `.env`.

Clean up. The folder holds real data, and the drill key isn't needed any
more:

```bash
cd ~ && rm -rf ~/offsite-drill
rclone config delete drill
rclone config delete drill-b2
```

Delete the `mac-drill` key in Backblaze. Write the date into the "Drill
log" below.

For a full database restore of the shop from its off-site copy, see the
shop's `docs/RUNBOOK.md`, "Restore from backup".

## Living with it

- **Logs:** `sudo journalctl -u offsite-backup --since "2 days ago"`
- **What is off-site:** `sudo offsite-backup list dumps/olgo` (or `files/kitoblarim`, `dumps/server`, …)
- **Fetch one file or folder back:** `sudo offsite-backup fetch dumps/reads-admin/<file> /root/offsite-restore`
- **healthchecks.io emailed you:** read the log above. Each failing line
  starts with `FAIL` and names the app. "newest backup is …h old" means
  that app's own `backup` service stopped:
  `sudo docker ps -a | grep backup`, then that app's DEPLOY.md.
- **A new app with data:** add its lines to `/etc/offsite-backup/sources`
  (`sudo nano`), then `sudo offsite-backup check`.
- **A changed script in this repo:** step 3's `scp`, then step 4's first
  `install` line again.
- **Bucket key leaked or rotated:** make a new key (step 1.5), delete the
  old one, then
  `sudo rclone --config /etc/offsite-backup/rclone.conf config update b2 account=<keyID> key=<applicationKey>`.
  Never change the crypt passwords: the old backups would no longer be readable.

## When the server is lost

1. New server: Docker, your `sarvar` user, the steps in
   [server-hardening.md](server-hardening.md) and [add-app.md](add-app.md) step 0.
2. Steps 3–5 above, with a **new** Backblaze key and the crypt passwords
   **from the password manager**. Don't make new ones.
3. Get the server settings back:

   ```bash
   sudo offsite-backup list dumps/server
   sudo offsite-backup fetch dumps/server/<newest configs-….tar.gz> /root/offsite-restore
   sudo tar -xzf /root/offsite-restore/configs-<time>.tar.gz -C /
   ```

   This restores `/opt/apps/*` (compose files, `.env`, hooks),
   `/etc/deploy-app` and `~/edge`.
4. Start `~/edge`, then follow each app's own restore steps (its DEPLOY.md or
   RUNBOOK). Each one fetches its dump with `offsite-backup fetch`.
5. Point DNS at the new server's IP. Then deploy each app once from GitHub.

## Drill log

| Date | What was restored | Where | Result |
|---|---|---|---|
|  |  |  |  |
