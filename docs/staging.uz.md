# Reads uchun staging

> Bu [staging.md](staging.md) ning oʻzbekcha tarjimasi. Buyruqlar bir xil.

Endi `main` ga har bir push **bitta** image yasaydi va:

1. uni **staging**ga avtomatik deploy qiladi;
2. Actions yorligʻida sizning **Approve** (tasdiqlash) bosishingizni kutadi;
3. **aynan oʻsha image**ni production'ga deploy qiladi.

Demak, production'ga faqat siz staging'da ishlayotganini koʻrgan image
chiqadi. Image ichida muhitga (environment) bogʻliq hech narsa yoʻq: har bir
muhit uchun kerakli sozlamalar serverdagi oʻz `.env` faylidan olinadi.

| | Production | Staging |
|---|---|---|
| Papka | `/opt/apps/reads` | `/opt/apps/reads-staging` |
| Konteyner | `reads-app` | `reads-staging-app` |
| deploy-app nomi | `reads` | `reads-staging` |
| CI kaliti | `production` environment secret'i | `staging` environment secret'i (faqat staging'ni deploy qila oladi) |
| Kim koʻra oladi | hamma | faqat login/parol bilan (user: `staging`) |
| Ma'lumot | Reads-admin | production Reads-admin'dan **faqat oʻqiydi**, aloqa formasi oʻchiq |

Reads-admin'ning oʻz staging nusxasi paydo boʻlguncha, staging production
katalogini oʻqiydi. U yerga hech narsa yozmaydi: `INQUIRIES_DISABLED=true`
aloqa formasini oʻchirib qoʻyadi.

Bularni staging'ni qoʻshadigan PR'ni **merge qilishdan oldin** bajaring.
Bajarilmaguncha staging qadami xato bilan toʻxtaydi va production kutib
turadi. Hech narsa buzilmaydi, lekin hech narsa deploy ham boʻlmaydi.

Xavfsizlik qoidalari [server-hardening.uz.md](server-hardening.uz.md)
dagidek: bitta `sarvar` sessiyasini ochiq qoldiring. Har bir noutbuk
terminalida avval shularni yozing:

```bash
HOST=169.58.243.86
PORT=22
STAGING_DOMAIN=reads.staging.sarvarlogs.uz
```

## 1. DNS

Barcha staging saytlar `staging.sarvarlogs.uz` ostida boʻladi:
`reads.staging.sarvarlogs.uz`, keyinchalik `reads-admin.staging…`,
`shop.staging…`. `sarvarlogs.uz` ning DNS paneliga (ahost.uz) bitta yozuv
qoʻshing:

| Turi | Nomi | Qiymati |
|---|---|---|
| `A` | `*.staging` | `169.58.243.86` |

`*.staging` (wildcard) `staging.sarvarlogs.uz` ostidagi barcha nomlarni
serverga yoʻnaltiradi. Shuning uchun keyingi loyihalar uchun DNS'da hech
narsa qilish shart emas. `sarvarlogs.uz` dagi blogingizga tegilmaydi. Bir
kun staging alohida serverga koʻchsa, faqat shu bitta yozuvni
oʻzgartirasiz. (Agar panel wildcard'ni qabul qilmasa, oʻrniga oddiy `A`
yozuv sifatida `reads.staging` ni qoʻshing. Keyin har bir loyiha uchun
yana bittadan qoʻshasiz.)

Noutbukda tekshiring (bir necha daqiqa vaqt olishi mumkin):

```bash
dig +short $STAGING_DOMAIN
```

`169.58.243.86` chiqishi kerak.

## 2. Staging'ning CI kaliti va fayllari (noutbukda)

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

Chiqqan qatorda `deploy-app reads` emas, `deploy-app reads-staging`
yozilgan boʻlishi kerak.

## 3. Serverda staging

Serverda, `sarvar` boʻlib:

```bash
sudo install -m 644 -o root -g root /tmp/staging-setup/reads-staging.conf /etc/deploy-app/
sudo install -d -m 755 -o root -g root /opt/apps/reads-staging
sudo install -m 644 -o root -g root /tmp/staging-setup/docker-compose.staging.yml /opt/apps/reads-staging/
sudo install -m 600 -o root -g root /opt/apps/reads/.env /opt/apps/reads-staging/.env
sudo tee -a /home/deployer/.ssh/authorized_keys < /tmp/staging-setup/deployer_staging_key >/dev/null
sudo cat /home/deployer/.ssh/authorized_keys
```

Oxirgi buyruq **ikkita** qator koʻrsatishi kerak: `… reads \"$SSH…` va
`… reads-staging \"$SSH…`.

Endi staging'ning `.env` faylini tahrirlang (bu production `.env` ning
nusxasi):

```bash
sudo nano /opt/apps/reads-staging/.env
```

Shu qatorlarni oʻzgartiring yoki qoʻshing, qolganiga tegmang:

```
DOMAIN=reads.staging.sarvarlogs.uz
SITE_URL=https://reads.staging.sarvarlogs.uz
INQUIRIES_DISABLED=true
REVALIDATE_SECRET=
```

`REVALIDATE_SECRET` atayin boʻsh qoldiriladi: Reads-admin faqat
production'ga signal yuboradi, boʻsh secret esa har qanday chaqiruvni rad
etadi.

nano'da saqlash: **Ctrl+O**, keyin **Enter**. Chiqish: **Ctrl+X**.

## 4. Staging paroli

Hali ham serverda. Parol oʻylab toping. Yozayotganingizda u ekranda
koʻrinmaydi:

```bash
read -rs -p 'Staging password: ' P; echo
HASH=$(sudo docker exec edge-caddy-1 caddy hash-password --plaintext "$P"); unset P
sudo sed -i "s|STAGING_AUTH_HASH|${HASH//\$/\$\$}|" /opt/apps/reads-staging/docker-compose.staging.yml
sudo grep basic_auth /opt/apps/reads-staging/docker-compose.staging.yml
sudo rm -rf /tmp/staging-setup
```

`grep` chiqargan qator `caddy.basic_auth.staging: $$2a$$14$$…` koʻrinishida
boʻlishi kerak: har bir `$` ikki marta yozilgan. Login (username):
`staging`.

Bu parolni xavfsiz joyga yozib qoʻying (masalan, parollar menejeriga).
Serverda u faqat shifrlangan (hash) holda saqlanadi.

## 5. Kalitni tekshirish (noutbukda)

```bash
ssh -p $PORT -i ~/.ssh/ci_reads_staging -o IdentitiesOnly=yes deployer@$HOST
```

Production kaliti kabi `deploy-app: bad image tag` deb javob berishi kerak.

## 6. GitHub

**akbarov-labs/reads → Settings → Environments → New environment →
`staging`**:

- Environment secret: `CONTABO_SSH_KEY` = `pbcopy < ~/.ssh/ci_reads_staging`
- Environment variable: `SITE_URL` = `https://reads.staging.sarvarlogs.uz`
- Deployment branches and tags → **Selected branches** → `main`

**Environments → `production`**:

- **Required reviewers** → oʻzingizni qoʻshing. Bu Approve qadami. Busiz
  production staging'dan keyin darhol, tasdiqsiz deploy boʻladi.
- Environment variable: `SITE_URL` = production manzili (hozir
  `https://kitoblarim.uz`)
- Deployment branches and tags → **Selected branches** → `main`

Keyin PR'ni merge qiling. Actions yorligʻida avval staging deploy boʻladi,
keyin ish **deploy-production → Review deployments** da toʻxtab turadi.
Staging'ni oching, tekshiring, keyin **Approve and deploy** ni bosing.

Staging parol soʻrayotganini tekshiring:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://$STAGING_DOMAIN/
curl -s -o /dev/null -w '%{http_code}\n' -u staging https://$STAGING_DOMAIN/uz
```

Birinchisi `401` chiqarishi kerak (parolsiz kirib boʻlmaydi). Ikkinchisi
parolni soʻraydi, keyin `200` chiqaradi.

Noutbukda tozalang:

```bash
rm ~/.ssh/ci_reads_staging
rm -rf ~/staging-setup
```

## Kundalik ish

- **`main` ga push** → staging oʻzi yangilanadi → uni koʻrib chiqasiz →
  Actions'da **Approve** → production aynan oʻsha image'ni oladi.
- **Yoqmagan versiyani tasdiqlamang.** Tuzatishni push qiling va yangi
  run'ni tasdiqlang. Eskisi kutib turaversin yoki uni bekor qiling (Cancel).
- **Staging parolini oʻzgartirish:**
  `/opt/apps/reads-staging/docker-compose.staging.yml` dagi hash oʻrniga
  yana `STAGING_AUTH_HASH` soʻzini yozing (yoki qatorni qoʻlda
  tahrirlang). Keyin 4-qadamni takrorlang va oxirgi staging deploy'ni qayta
  ishga tushiring (Re-run).
- **Staging'ning oʻz ma'lumoti:** Reads-admin'ning staging'i paydo boʻlganda,
  staging `.env` dagi `API_URL` ni `http://reads-admin-staging-app:80/api`
  ga oʻzgartiring, `INQUIRIES_DISABLED` qatorini oʻchiring va konteynerni
  qayta yarating.
