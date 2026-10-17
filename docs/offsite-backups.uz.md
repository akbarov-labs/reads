# Serverdan tashqaridagi zaxira nusxalar

> Bu [offsite-backups.md](offsite-backups.md) ning oʻzbekcha tarjimasi.
> Buyruqlar ikkalasida ham bir xil. Agar ular orasida farq chiqsa,
> inglizcha fayl toʻgʻri hisoblanadi.

Contabo serverdagi har bir ilova har kecha oʻzining zaxira nusxasini oladi.
Lekin nusxa **oʻsha serverning oʻzidagi** Docker volume'ga yoziladi. Bu
notoʻgʻri migratsiya yoki oʻchirib yuborilgan qatordan himoya qiladi. Server
yoʻqolsa esa nusxalar ham u bilan birga yoʻqoladi.

`offsite-backup` skripti (shu repo'dagi `deploy/server/` dan) har kecha
04:30 UTC da root sifatida ishlaydi. U shu nusxalarni, ilovalarga yuklangan
fayllarni va serverning sozlamalarini **Backblaze B2** bucket'iga
koʻchiradi. Hamma narsa serverdan chiqishidan oldin rclone `crypt` bilan
shifrlanadi, shuning uchun Backblaze faqat shifrlangan baytlarni koʻradi.
Biror kecha xato boʻlsa yoki skript umuman xabar bermasa (server oʻlib
qolganda ham), **healthchecks.io** sizga email yuboradi.

| Ilova | Nima ketadi | Qayerdan (volume) | Bucket'dagi joyi |
|---|---|---|---|
| olgo (doʻkon) | har kechagi `pg_dump` | `tma-commerce_backups/db` | `dumps/olgo/` |
| olgo | mahsulot rasmlari, nusxasi | `tma-commerce_uploads` | `files/olgo/` |
| kitoblarim | har kechagi `pg_dump` | `kitoblarim_db_backups` | `dumps/kitoblarim/` |
| kitoblarim | kitob muqovalari, nusxasi | `kitoblarim_uploads_data` | `files/kitoblarim/` |
| reads-admin | har kechagi SQLite nusxasi | `reads-admin_db_backups` | `dumps/reads-admin/` |
| reads-admin | portret/avatarlar, nusxasi | `reads-admin_app_storage/app/public` | `files/reads-admin/` |
| my-blog | har kechagi SQLite nusxasi (yangi `backup` xizmati) | `my-blog_db_backups` | `dumps/my-blog/` |
| server | `/opt/apps`, `/etc/deploy-app`, `~/edge` (`.env` fayllar bilan) | — | `dumps/server/` |

Reads'da ma'lumotlar bazasi yoʻq. Staging'lar zaxiralanmaydi.

**Nusxalar qancha saqlanadi.** `dumps/` dagi nusxalarni Backblaze 30 kundan
keyin oʻzi oʻchiradi. `files/` da esa rasm toki u mavjud ekan saqlanadi.
Ustidan yozilgan rasmning eski versiyasi yana 30 kun turadi. Skript
bucket'dan hech qachon hech narsa oʻchirmaydi. **Object Lock** esa yangi
faylni birinchi 30 kun ichida hatto serverning oʻz kaliti bilan ham
oʻchirib boʻlmaydigan qiladi. Serverni buzib kirgan odam ham tarixni
oʻchira olmaydi.

**Serverdan tashqarida oʻzingiz saqlashingiz shart boʻlgan narsa:** ikkita
crypt paroli. Ularsiz nusxalarni hech kim, hatto siz ham ocha olmaysiz.
Ular 4-qadamda parol menejeringizga yoziladi. Faqat shu qadamni tashlab
ketib boʻlmaydi.

---

## 1. Backblaze B2 (brauzerda)

1. backblaze.com da roʻyxatdan oʻting → **B2 Cloud Storage**. Region:
   **EU Central**. Birinchi 10 GB bepul, karta shart emas.
2. **Buckets → Create a Bucket**:
   - nomi: takrorlanmas boʻlsin, masalan `sarvar-contabo-backups-7k2` (yozib qoʻying)
   - Files in Bucket: **Private**
   - Default Encryption: **Enable**
   - Object Lock: **Enable**
3. Yangi bucket'da **Object Lock** ni bosing va default retention'ni
   **30 kun** qiling. Rejim (mode) soʻralsa, **Governance** ni tanlang.
4. Bucket'da **Lifecycle Settings** → custom rules, ikkita qoida:

   | File path (prefix) | Days till hide | Days till delete |
   |---|---|---|
   | `dumps/` | 30 | 1 |
   | `files/` | *(boʻsh)* | 30 |

5. **Application Keys → Add a New Application Key**:
   - nomi `contabo-offsite`
   - Allow access to Bucket(s): **faqat sizning bucket'ingiz**
   - Type of Access: **Read and Write**
   - qolganlari boʻsh

   Sahifa `keyID` va `applicationKey` ni **faqat bir marta** koʻrsatadi.
   5-qadamgacha shu tab'ni yopmang.

## 2. healthchecks.io (brauzerda)

1. healthchecks.io da email bilan roʻyxatdan oʻting (bepul).
2. **Add Check**: nomi `contabo-offsite`, **Period 1 day**, **Grace 2 hours**.
3. Ixtiyoriy: **Integrations → Telegram**, ogohlantirish Telegram'ga ham
   kelsin desangiz.
4. Check'ning **Ping URL** manzilini nusxalang (`https://hc-ping.com/…`).

## 3. Mac: fayllarni serverga yuborish

Shu repo'dagi pull request merge boʻlgandan keyin:

```bash
cd ~/dev/sites/Reads
git switch main && git pull
scp deploy/server/offsite-backup deploy/server/offsite-backup.service deploy/server/offsite-backup.timer deploy/server/offsite-backup.sources deploy/server/offsite-backup.conf sarvar@169.58.243.86:/tmp/
```

Birinchi ishga tushirishdan oldin my-blog'ning yangi `backup` xizmati
ishlab turishi kerak: my-blog'dagi `DEPLOY.md`, "Backups and restore" boʻlimi.

## 4. Server: oʻrnatish va crypt parollarini yaratish

```bash
sudo apt-get update && sudo apt-get install -y rclone
sudo install -m 755 -o root -g root /tmp/offsite-backup /usr/local/sbin/offsite-backup
sudo install -m 644 -o root -g root /tmp/offsite-backup.service /tmp/offsite-backup.timer /etc/systemd/system/
sudo install -d -m 700 -o root -g root /etc/offsite-backup
sudo install -m 600 -o root -g root /tmp/offsite-backup.sources /etc/offsite-backup/sources
sudo install -m 600 -o root -g root /tmp/offsite-backup.conf /etc/offsite-backup/offsite-backup.conf
```

Ikkita crypt parolini yarating. Ular ekranda **bir marta** koʻrinadi:

```bash
P1=$(openssl rand -hex 32)
P2=$(openssl rand -hex 32)
printf 'crypt password 1: %s\ncrypt password 2: %s\n' "$P1" "$P2"
```

**Hozir** parol menejeringizda "Contabo off-site backups" degan yozuv
oching va unga yozing: ikkala parol, bucket nomi, Backblaze'ga kiradigan
emailingiz va `crypt over b2:<bucket>, directory_name_encryption=false`
degan qator. Yozuv saqlanmaguncha keyingi qadamga oʻtmang.

## 5. Server: bucket'ga ulash

**Oʻsha** terminalda davom eting, chunki `P1` va `P2` hali oʻsha yerda
turibdi. Har bir `read` sizdan qiymat kutadi, uni paste qilasiz. Paste
qilganingiz ekranda koʻrinmaydi va shell tarixiga yozilmaydi.

```bash
read -rsp "B2 keyID: " B2_ID; echo
read -rsp "B2 applicationKey: " B2_KEY; echo
read -rp "Bucket name: " BUCKET
sudo rclone --config /etc/offsite-backup/rclone.conf config create b2 b2 account="$B2_ID" key="$B2_KEY"
sudo rclone --config /etc/offsite-backup/rclone.conf config create offsite crypt remote="b2:$BUCKET" directory_name_encryption=false password="$P1" password2="$P2" --obscure
sudo chmod 600 /etc/offsite-backup/rclone.conf
unset B2_ID B2_KEY P1 P2
```

healthchecks.io'dagi Ping URL'ni `HEALTHCHECK_URL=` ga qoʻying:

```bash
sudo nano /etc/offsite-backup/offsite-backup.conf
```

## 6. Server: tekshirish, birinchi ishga tushirish, keyin har kecha

`sources` dagi volume nomlarini serverda haqiqatda bor nomlar bilan
solishtiring:

```bash
sudo docker volume ls
sudo offsite-backup check
```

Hamma qator `ok` boʻlishi kerak. `FAIL` chiqsa, oʻsha qatordagi volume
serverda yoʻq degani. Nomini `sudo nano /etc/offsite-backup/sources` bilan
toʻgʻrilang. Nomning boshidagi loyiha qismi `docker volume ls` da qanday
boʻlsa, shunday yozing.

Birinchi ishga tushirish hamma narsani yuklaydi, biroz vaqt olishi mumkin:

```bash
sudo offsite-backup run
```

Oxirida `finished …: OK` chiqadi, healthchecks.io'da check yashil boʻladi.
Keyin har kechagi timer'ni yoqing:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now offsite-backup.timer
systemctl list-timers offsite-backup.timer
```

**Object Lock ishlayotganini tekshiring.** Kichik test fayl yuklang, keyin
uni serverning oʻz kaliti bilan butunlay oʻchirishga urinib koʻring.
Oʻchirish **xato bilan tugashi** kerak:

```bash
read -rp "Bucket name: " BUCKET
echo lock-test | sudo rclone --config /etc/offsite-backup/rclone.conf rcat "b2:$BUCKET/dumps/lock-test.txt"
sudo rclone --config /etc/offsite-backup/rclone.conf deletefile --b2-hard-delete "b2:$BUCKET/dumps/lock-test.txt"
```

Ikkinchi buyruq fayl qulflangani (locked) yoki ruxsat yoʻqligi (access
denied) haqida xato bilan tugashi kerak. Hech narsa demay tugasa, qulf
yoqilmagan: 1-qadamning 3-bandiga qayting. Test fayl 31 kundan keyin oʻzi
oʻchib ketadi.

## 7. Tiklash mashqi: Mac'dan, serversiz

Bu eng muhimini isbotlaydi: faqat parol menejeringiz va Backblaze bilan
ma'lumotlar qaytib keladi.

1. Backblaze → **Application Keys → Add a New Application Key**: nomi
   `mac-drill`, faqat sizning bucket'ingiz, **Read Only**.
2. Mac'da:

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

Haqiqiy fayl nomlari koʻrinishi kerak (`reads-admin-….sqlite.gz`,
`library-….sql.gz`, …). Xato yoki tushunarsiz nomlar chiqsa, parol
menejeridagi parollar notoʻgʻri. Server hali tirikligida buni hozir
toʻgʻrilang.

reads-admin'ning eng yangi bazasini tiklab, ochib koʻring:

```bash
mkdir -p ~/offsite-drill && cd ~/offsite-drill
rclone copy drill:dumps/reads-admin --max-age 2d .
F=$(ls -t reads-admin-*.sqlite.gz | head -1)
gunzip -c "$F" > reads-admin.sqlite
sqlite3 reads-admin.sqlite "PRAGMA integrity_check; SELECT count(*) FROM editions;"
```

`ok` va paneldagi nashrlar soni chiqishi kerak. Keyin qolgan ilovalar va
server sozlamalari:

```bash
rclone copy drill:dumps/kitoblarim --max-age 2d .
gzip -dc "$(ls -t library-*.sql.gz | head -1)" | grep -c "PostgreSQL database dump complete"
rclone copy drill:dumps/server --max-age 2d .
tar -tzf "$(ls -t configs-*.tar.gz | head -1)" | grep '\.env$'
```

Birinchisi `1` ni chiqaradi: dump'da pg_dump'ning oxirgi belgisi bor, demak u toʻliq. Ikkinchisi
har bir ilovaning `.env` faylini roʻyxat qiladi.

Tozalash. Papkada haqiqiy ma'lumotlar bor, drill kaliti esa endi kerak emas:

```bash
cd ~ && rm -rf ~/offsite-drill
rclone config delete drill
rclone config delete drill-b2
```

Backblaze'da `mac-drill` kalitini oʻchiring. Sanani pastdagi "Mashqlar
jurnali" ga yozing.

Doʻkon bazasini bucket'dagi nusxadan toʻliq tiklash: doʻkonning
`docs/RUNBOOK.md`, "Restore from backup" boʻlimi.

## Kundalik ish

- **Loglar:** `sudo journalctl -u offsite-backup --since "2 days ago"`
- **Bucket'da nima bor:** `sudo offsite-backup list dumps/olgo` (yoki `files/kitoblarim`, `dumps/server`, …)
- **Bitta fayl yoki papkani qaytarib olish:** `sudo offsite-backup fetch dumps/reads-admin/<fayl> /root/offsite-restore`
- **healthchecks.io email yubordi:** yuqoridagi logni oʻqing. Har bir xato
  qatori `FAIL` bilan boshlanadi va ilova nomini aytadi. "newest backup is
  …h old" degani shu ilovaning oʻz `backup` xizmati toʻxtab qolgan:
  `sudo docker ps -a | grep backup`, keyin oʻsha ilovaning DEPLOY.md fayli.
- **Ma'lumoti bor yangi ilova:** uning qatorlarini
  `/etc/offsite-backup/sources` ga qoʻshing (`sudo nano`), keyin
  `sudo offsite-backup check`.
- **Repo'da skript oʻzgardi:** 3-qadamdagi `scp`, keyin 4-qadamning birinchi
  `install` qatori.
- **Bucket kaliti sizib chiqdi yoki almashtirilmoqda:** yangi kalit yarating
  (1-qadam, 5-band), eskisini oʻchiring, keyin
  `sudo rclone --config /etc/offsite-backup/rclone.conf config update b2 account=<keyID> key=<applicationKey>`.
  Crypt parollarini hech qachon almashtirmang: eski nusxalarni ochib
  boʻlmay qoladi.

## Server yoʻqolsa

1. Yangi server: Docker, `sarvar` useringiz, [server-hardening.uz.md](server-hardening.uz.md)
   dagi qadamlar va [add-app.uz.md](add-app.uz.md) ning 0-qadami.
2. Yuqoridagi 3–5-qadamlar, **yangi** Backblaze kaliti va **parol
   menejeridagi** crypt parollari bilan. Yangi parol yaratmang.
3. Server sozlamalarini qaytarib oling:

   ```bash
   sudo offsite-backup list dumps/server
   sudo offsite-backup fetch dumps/server/<eng yangi configs-….tar.gz> /root/offsite-restore
   sudo tar -xzf /root/offsite-restore/configs-<vaqt>.tar.gz -C /
   ```

   Bu `/opt/apps/*` (compose fayllar, `.env`, hooks), `/etc/deploy-app` va
   `~/edge` ni joyiga qaytaradi.
4. `~/edge` ni ishga tushiring, keyin har bir ilovaning oʻz tiklash
   qadamlarini bajaring (uning DEPLOY.md yoki RUNBOOK fayli). Har biri oʻz
   dump'ini `offsite-backup fetch` bilan oladi.
5. DNS'ni yangi serverning IP manziliga yoʻnaltiring. Keyin har bir
   ilovani GitHub'dan bir marta deploy qiling.

## Mashqlar jurnali

| Sana | Nima tiklandi | Qayerda | Natija |
|---|---|---|---|
|  |  |  |  |
