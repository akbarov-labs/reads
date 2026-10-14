# Boshqa loyihani deployer + staging'ga oʻtkazish

> Bu [add-app.md](add-app.md) ning oʻzbekcha tarjimasi. Buyruqlar bir xil.

Reads uchun qoʻlda qilingan ishlar ([server-hardening.uz.md](server-hardening.uz.md),
[staging.uz.md](staging.uz.md)) endi ikkita buyruqqa aylandi: Mac'da
`deploy/prepare-app`, serverda `sudo add-app`. Umumiy narsalarning hammasi
allaqachon tayyor: `deployer` user, `deploy-app`, SSH sozlamalari, org
variable'lari va `*.staging.sarvarlogs.uz` DNS yozuvi.

Har bir loyiha oxirida shunday boʻladi:

| | Production | Staging |
|---|---|---|
| Manzil | oʻz domeni | `<app>.staging.sarvarlogs.uz`, parol bilan (user `staging`) |
| Papka | `/opt/apps/<app>` | `/opt/apps/<app>-staging` |
| CI kaliti | `production` environment | `staging` environment, faqat staging'ni deploy qila oladi |
| Qachon deploy boʻladi | siz **Approve** bosganingizdan keyin | `main` ga har bir push'da |

## 0. Bir marta: vositalarni serverga oʻrnatish

Mac'da, Reads repo'sidan:

```bash
cd ~/dev/sites/Reads
git switch main && git pull
scp deploy/server/add-app deploy/server/deploy-app sarvar@169.58.243.86:/tmp/
```

Serverda:

```bash
sudo install -m 755 -o root -g root /tmp/add-app /usr/local/sbin/add-app
sudo install -m 755 -o root -g root /tmp/deploy-app /usr/local/sbin/deploy-app
```

## 1. Loyiha kodi (bu qismni Claude qiladi)

Loyihada bitta pull request boʻladi. U:

- `docker-compose.staging.yml` qoʻshadi (oʻz konteyner nomi va
  `caddy.basic_auth.staging: STAGING_AUTH_HASH`);
- deploy'ni Reads'dagidek qiladi: bitta build → staging → Approve →
  production, `deploy-to.yml` orqali;
- loyiha ma'lumotlarining oʻziga xos tomonlarini uning `DEPLOY.md` iga
  yozadi.

**Hozircha merge qilmang.**

## 2. Mac

```bash
cd ~/dev/sites/Reads
deploy/prepare-app <app> ~/dev/sites/<loyiha papkasi>
```

Bu buyruq ikkita kalit yaratadi (`~/.ssh/ci_<app>` va
`~/.ssh/ci_<app>_staging`) va fayllarni serverga yuboradi.

## 3. Server

Ilova hozir qayerdan ishlayotganini va uning image'ini toping:

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Label "com.docker.compose.project.working_dir"}}'
```

Keyin (image'ni `:tag` qismisiz yozing):

```bash
sudo add-app <app> ghcr.io/akbarov-labs/<image> /home/sarvar/<papka>
```

Skript staging parolini ikki marta soʻraydi. Agar staging'ning `DOMAIN`
qiymati `<app>.staging.sarvarlogs.uz` boʻlmasa, u **toʻxtaydi**. Shunda
staging paroli yana haqiqiy saytga qoʻyilib qolmaydi.

Keyin staging sozlamalarini koʻrib chiqing. Staging hech qachon haqiqiy
odamlarga email, xabar yoki toʻlov yubormasligi kerak:

```bash
sudo nano /opt/apps/<app>-staging/.env
```

Bundan tashqari, loyihaning `DEPLOY.md` faylida staging boʻlimida
yozilganlarni ham bajaring (masalan, ma'lumotlarni nusxalash).

## 4. GitHub

**Private repo boʻlsa:** GitHub'ning bepul tarifida u org variable'larini
koʻra olmaydi. Xuddi shu toʻrttasini loyiha repo'sining oʻziga qoʻshing →
**Settings → Secrets and variables → Actions → Variables → New repository
variable**: `CONTABO_HOST` (`169.58.243.86`), `CONTABO_PORT` (`22`),
`CONTABO_USER` (`deployer`), `CONTABO_KNOWN_HOSTS` (org'ning Variables
sahifasidan nusxalang). Public repo uchun bu yerda hech narsa qilish
shart emas.

Keyin loyiha repo'sida → **Settings → Environments**:

**`staging`** (New environment):
- secret `CONTABO_SSH_KEY` = `pbcopy < ~/.ssh/ci_<app>_staging`
- variable `SITE_URL` = `https://<app>.staging.sarvarlogs.uz`
- Deployment branches → Selected branches → `main`

**`production`**:
- secret `CONTABO_SSH_KEY` = `pbcopy < ~/.ssh/ci_<app>` (eskisining oʻrniga)
- variable `SITE_URL` = saytning haqiqiy manzili
- **Required reviewers** → oʻzingizni qoʻshing. GitHub'ning bepul tarifida
  bu faqat **public** (ochiq) repo'larda bor. **Private** repo uchun
  loyihaning PR'i oʻrniga **Promote to production** workflow'ini qoʻshadi
  (my-blog'dagidek): staging har bir push'da deploy boʻladi, production
  esa siz u yerda **Run workflow** ni bosganingizda.
- Deployment branches → Selected branches → `main`
- eski `CONTABO_HOST`, `CONTABO_PORT`, `CONTABO_USER`, `CONTABO_DEPLOY_PATH`
  secret'larini oʻchiring (environment'da ham, repository'da ham)

## 5. Merge qilish va kuzatish

PR'ni merge qiling. Actions'da avval staging deploy boʻladi →
`https://<app>.staging.sarvarlogs.uz` ni oching → **Review deployments →
Approve and deploy** (public repo), yoki **Promote to production → Run
workflow** (private repo). Keyin haqiqiy saytni tekshiring va serverda:

```bash
docker inspect <konteyner> --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}'
```

`/opt/apps/<app>` chiqishi kerak.

## 6. Tozalash

Mac'da:

```bash
rm ~/.ssh/ci_<app> ~/.ssh/ci_<app>_staging
```

Serverda, bir necha kun deploy'lar yashil boʻlgandan keyin:
`rm -rf /home/sarvar/<papka>` (xohlasangiz, avval `.env` nusxasini saqlab
qoʻying).

**Hamma** loyihalar koʻchgandan keyin `sarvar` dagi ikkita eski kalitni
oʻchiring. Buning tartibi [server-hardening.uz.md](server-hardening.uz.md)
ning oxirida yozilgan.
