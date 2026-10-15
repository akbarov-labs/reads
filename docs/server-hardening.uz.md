# Contabo serverni xavfsiz qilish

> Bu [server-hardening.md](server-hardening.md) ning oʻzbekcha tarjimasi.
> Buyruqlar (komandalar) ikkalasida ham bir xil. Agar ular orasida farq
> chiqsa, inglizcha fayl toʻgʻri hisoblanadi.

**Maqsad:** GitHub CI serverga hech qachon oddiy kirish (shell) olmasin.
Agar CI kaliti (SSH key) oʻgʻirlansa ham, u bilan faqat bitta ish qilish
mumkin boʻlsin: bitta ilovaning GitHubda allaqachon mavjud boʻlgan
versiyasini qayta deploy qilish. Boshqa hech narsa.

## Hozirgi holat

Allaqachon toʻgʻri sozlangan (2026-10-13 da tekshirildi):

- **root** SSH orqali kira olmaydi (`PermitRootLogin no`, `/root/.ssh/authorized_keys` boʻsh).
- Parol bilan kirish oʻchirilgan, faqat SSH kalit bilan kiriladi.
- Siz `sarvar` boʻlib kirasiz va `sudo` huquqingiz bor.

**Muammo:** barcha loyihalarning CI ham `sarvar` boʻlib kiradi.
`/home/sarvar/.ssh/authorized_keys` faylida ikkita CI kaliti bor:

| Kalit | Maxfiy (private) qismi qayerda |
|---|---|
| `…UXATOykq its_akbarov@Durdonas-MacBook-Air.local` | Mac'dagi `~/.ssh/deploy_key_contabo` va GitHub secrets |
| `…Mr7kQIq sarvar@vmi3536463` | Serverdagi `~/.ssh/gh_deploy_key` va GitHub secrets |

`sarvar` esa `docker` guruhida. `docker` guruhidagi har qanday foydalanuvchi
amalda **root** hisoblanadi, chunki bitta buyruq bilan butun diskni
egallab olishi mumkin:

```
docker run -v /:/host … chroot /host
```

Demak, bugun GitHubdagi CI kaliti oʻgʻirlansa, **butun server** (barcha
ilovalar va ma'lumotlar bazalari) qoʻldan ketadi.

## Oxirida nima boʻladi

| Kim | Qaysi user boʻlib kiradi | Nima qila oladi |
|---|---|---|
| Siz | `sarvar`, faqat shaxsiy kalitingiz bilan | hamma narsani, `sudo` orqali |
| GitHub Actions (CI) | `deployer`, har bir loyiha uchun alohida kalit | faqat `/usr/local/sbin/deploy-app <ilova> <sha>` ni ishga tushiradi, boshqa hech narsa |

`deployer` **`docker` guruhiga qoʻshilmaydi.** Uning oʻrniga `sudo` unga
faqat bitta skriptni root sifatida ishga tushirishga ruxsat beradi. Skript
esa muhim narsalarning hammasini (compose fayl, `.env`, image nomi) faqat
root oʻzgartira oladigan fayllardan oladi. CI ularni oʻzgartira olmaydi.

Ish ikki bosqichda bajariladi:

- **1-bosqich** (shu sahifa, boshidan oxirigacha): faqat Reads yangi
  usulga oʻtadi. Qolgan loyihalar hozircha avvalgidek `sarvar` boʻlib
  deploy qilishda davom etadi, ularga tegilmaydi.
- **2-bosqich**: qolgan loyihalarni bittadan oʻtkazamiz, keyin ikkita eski
  kalitni oʻchiramiz.

---

## Boshlashdan oldin

- Serverga **`sarvar` boʻlib bitta SSH sessiya oching va oxirigacha uni
  yopmang.** Bu sizning "zaxira eshigingiz": agar biror qadam kirishni
  buzsa, shu ochiq oyna orqali tuzatasiz. Kirish bilan bogʻliq har bir
  oʻzgarishni **yangi** terminal oynasida sinab koʻring.
- Agar baribir kira olmay qolsangiz: Contabo boshqaruv paneli → VPS →
  **VNC console**. U SSH'siz kirishga imkon beradi.
- Quyidagi barcha **noutbuk** terminallarida avval shularni yozing:

  ```bash
  HOST=<server IP manzili>
  PORT=22
  ```

## 1. Sozlash fayllarini serverga yuborish

**Qayerda:** noutbukingizda, shu repo papkasida.

Bu qadam Reads uchun **alohida CI kalitini** ham yaratadi. Bu kalit faqat
shu repo'ning CI'si uchun: siz u bilan kirmaysiz, boshqa loyihalar ham uni
ishlatmaydi.

```bash
cd ~/dev/sites/Reads
mkdir -p ~/deploy-setup && cp deploy/server/* ~/deploy-setup/
ssh-keygen -t ed25519 -f ~/.ssh/ci_reads -N "" -C ci-reads
printf 'restrict,command="sudo -n /usr/local/sbin/deploy-app reads \\"$SSH_ORIGINAL_COMMAND\\"" %s\n' \
  "$(cat ~/.ssh/ci_reads.pub)" > ~/deploy-setup/deployer_authorized_keys
cat ~/deploy-setup/deployer_authorized_keys
```

Oxirgi buyruq chiqargan qator mana shunday boʻlishi kerak.
`$SSH_ORIGINAL_COMMAND` aynan shu koʻrinishda, harfma-harf qolishi shart:

```
restrict,command="sudo -n /usr/local/sbin/deploy-app reads \"$SSH_ORIGINAL_COMMAND\"" ssh-ed25519 AAAA… ci-reads
```

Bu qator nimani anglatadi:
- `restrict`: bu kalit bilan terminal ochib, port yoki agent forwarding
  qilib boʻlmaydi.
- `command="…"`: bu kalit bilan kim kirsa ham, faqat shu buyruq ishlaydi.
  CI nima yuborsa ham, u buyruq sifatida emas, faqat **tag** (image
  versiyasi) sifatida qabul qilinadi.

Fayllarni serverga yuboring:

```bash
scp -P $PORT -r ~/deploy-setup sarvar@$HOST:/tmp/
```

## 2. `deployer` user va deploy skripti

**Qayerda:** serverda, `sarvar` boʻlib.

```bash
# Paroli umuman yoʻq ('*'), lekin "bloklanmagan", shuning uchun kalit bilan kira oladi.
sudo useradd --create-home --shell /bin/bash deployer
sudo usermod -p '*' deployer
id deployer                       # natijada docker ham, sudo ham BOʻLMASLIGI kerak

# Skript va Reads sozlamasi. Ikkalasi ham root'niki.
sudo install -m 755 -o root -g root /tmp/deploy-setup/deploy-app /usr/local/sbin/deploy-app
sudo install -d -m 755 -o root -g root /etc/deploy-app
sudo install -m 644 -o root -g root /tmp/deploy-setup/reads.conf /etc/deploy-app/reads.conf

# deployer root sifatida faqat shu bitta skriptni ishga tushira oladi.
echo 'deployer ALL=(root) NOPASSWD: /usr/local/sbin/deploy-app' | sudo tee /etc/sudoers.d/deployer >/dev/null
sudo chmod 440 /etc/sudoers.d/deployer
sudo visudo -cf /etc/sudoers.d/deployer
sudo -l -U deployer               # → (root) NOPASSWD: /usr/local/sbin/deploy-app

# deployer'ning kalitlar fayli. Egasi root, shuning uchun deployer uni o'zgartira olmaydi.
sudo install -d -m 755 -o root -g root /home/deployer/.ssh
sudo install -m 644 -o root -g root /tmp/deploy-setup/deployer_authorized_keys /home/deployer/.ssh/authorized_keys
```

`id deployer` natijasida `docker` yoki `sudo` koʻrinsa, toʻxtang va menga
yozing.

## 3. Reads uchun root'ga tegishli papka

**Qayerda:** serverda, `sarvar` boʻlib.

**Nega:** hozir Reads `/home/sarvar/reads` papkasidan ishlaydi. Boshqa
loyihalarning CI'si hali ham `sarvar` boʻlib kirgani uchun, ular Reads'ning
compose faylini oʻzgartira olishi mumkin. Shuning uchun fayllarni
`/opt/apps/reads` ga koʻchiramiz, uning egasi root boʻladi.

Papka nomi baribir `reads` boʻlib qoladi. Docker compose buni oʻsha loyiha
deb taniydi va keyingi deploy `reads-app` konteynerini shunchaki yangisiga
almashtiradi.

```bash
sudo install -d -m 755 -o root -g root /opt/apps /opt/apps/reads
sudo install -m 644 -o root -g root ~/reads/docker-compose.prod.yml /opt/apps/reads/
sudo install -m 600 -o root -g root ~/reads/.env /opt/apps/reads/
sudo ls -la /opt/apps/reads       # ikkala fayl ham bor, ikkalasining egasi root
```

Eski `~/reads` papkasini hozircha **oʻchirmang**. Yangi joydan birinchi
deploy muvaffaqiyatli boʻlganidan keyin (6-qadam) oʻchirasiz.

## 4. SSH sozlamalarini mustahkamlash

**Qayerda:** serverda, `sarvar` boʻlib.

Sozlamalaringiz hozir ham toʻgʻri. Bu fayl ularni **shunday qotirib
qoʻyadi**: paket yangilanishi yoki Contabo'ning cloud-init fayli ularni
qaytarib oʻzgartira olmaydi. Qoʻshimcha ravishda `AllowUsers` qoʻshiladi,
ya'ni serverga faqat `sarvar` va `deployer` kira oladi.

```bash
sudo install -m 644 -o root -g root /tmp/deploy-setup/00-hardening.conf /etc/ssh/sshd_config.d/
sudo sshd -t && echo "config OK"
sudo sshd -T | grep -Ei '^(passwordauthentication|permitrootlogin|allowusers)'
# kutilgan natija: passwordauthentication no / permitrootlogin no / allowusers sarvar va deployer
sudo systemctl reload ssh || sudo systemctl restart ssh
sudo rm -rf /tmp/deploy-setup
```

⚠️ Eski SSH oynasini **yopmang**. Noutbukda **yangi** terminal ochib
tekshiring:

```bash
ssh -p $PORT sarvar@$HOST
```

Kira olsangiz, hammasi joyida. Kira olmasangiz, ochiq oynadan
`sudo rm /etc/ssh/sshd_config.d/00-hardening.conf && sudo systemctl reload ssh`
qiling va menga yozing.

## 5. CI kaliti boshqa hech narsa qila olmasligini tekshirish

**Qayerda:** noutbukingizda.

```bash
ssh -p $PORT -i ~/.ssh/ci_reads -o IdentitiesOnly=yes deployer@$HOST
ssh -p $PORT -i ~/.ssh/ci_reads -o IdentitiesOnly=yes deployer@$HOST 'cat /etc/shadow'
```

Ikkalasida ham `deploy-app: bad image tag` chiqib, ulanish yopilsa,
hammasi toʻgʻri: terminal ochilmaydi, yuborilgan buyruq esa shunchaki "tag"
deb qabul qilinib rad etiladi. Kalit faqat deploy qila oladi.
`PTY allocation request failed` chiqishi ham normal: bu kalitga terminal
ochish taqiqlangan.

> Eslatma: kod bloklaridagi `# …` bilan boshlanadigan izohlarni Mac
> terminaliga nusxalamang. zsh ularni buyruq deb oʻylab xato beradi.

Serverda barcha rad etishlar yoziladi: `sudo journalctl -t deploy-app -n 20`.

## 6. GitHub: yangi sozlamalar, keyin merge

**Avval serverning "host key"ini olamiz.** CI aynan **sizning**
serveringizga ulanayotganini shu kalit orqali tekshiradi, soxta serverga
emas. Uni noutbukda oling, keyin barmoq izini (fingerprint) serverning
oʻzidagi bilan solishtiring:

```bash
ssh-keyscan -p $PORT -t ed25519 $HOST 2>/dev/null > ~/deploy-setup/known_hosts
ssh-keygen -lf ~/deploy-setup/known_hosts
ssh -p $PORT sarvar@$HOST 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'   # ikkalasi BIR XIL boʻlishi kerak
```

Ikkala `SHA256:…` qiymati bir xil boʻlmasa, davom etmang va menga yozing.

**Umumiy sozlamalar, butun tashkilot (org) uchun bir marta.** Ochiladigan
joy: **akbarov-labs → Settings → Secrets and variables → Actions →
Variables** yorligʻi. Bular **variables**, secrets emas: ularning hech biri
maxfiy emas va keyin qiymatini qayta koʻra olasiz. Soʻralsa, repo'larga
ruxsat bering.

| Variable | Qiymat | Qanday olinadi |
|---|---|---|
| `CONTABO_HOST` | server IP manzili | — |
| `CONTABO_PORT` | `22` | — |
| `CONTABO_USER` | `deployer` | — |
| `CONTABO_KNOWN_HOSTS` | host key qatori | `pbcopy < ~/deploy-setup/known_hosts` |

`pbcopy < fayl` buyrugʻi faylni nusxalaydi (Cmd+C kabi), keyin GitHub'ga
Cmd+V bilan qoʻyasiz.

Agar org sahifasi private repo'larga bu variable'larni ishlatishga ruxsat
bermasa (ba'zi GitHub tariflarida shunday), xuddi shu toʻrttasini
**akbarov-labs/reads** ichida **repository** variable sifatida yarating.
Workflow ularni baribir bir xil oʻqiydi.

**Kalit, har bir repo uchun alohida.** Ochiladigan joy:
**akbarov-labs/reads → Settings → Environments → production → Environment
secrets**.

| Secret | Qiymat | Qanday olinadi |
|---|---|---|
| `CONTABO_SSH_KEY` | Reads'ning yangi private kaliti. Butun fayl, `-----BEGIN` va `-----END` qatorlari bilan birga | `pbcopy < ~/.ssh/ci_reads` |

Keyin environment'dan ham, repo'dan ham eski **secrets**larni oʻchiring:
`CONTABO_HOST`, `CONTABO_PORT`, `CONTABO_USER` va `CONTABO_DEPLOY_PATH`.
Birinchi uchtasining oʻrnini variable'lar egalladi. Papka yoʻli esa endi
serverdagi `/etc/deploy-app/reads.conf` faylida turadi.

⚠️ `CONTABO_SSH_KEY` ni **hech qachon org darajasiga qoʻymang.** Har bir
repo'ning (keyinchalik har bir environment'ning ham) oʻz kaliti boʻladi.
Shunda bitta kalit oʻgʻirlansa, faqat bitta ilovani qayta deploy qilish
mumkin boʻladi.

**Keyin darhol PR'ni merge qiling** (`deploy.yml` ni `deployer`ga
oʻtkazadigan PR). Merge qilinmaguncha eski workflow bilan boshlangan deploy
xato bilan toʻxtaydi. Bu zararsiz, hech narsa ishga tushmaydi.

Actions yorligʻida ishni kuzating. Yashil boʻlgach,
https://kitoblarim.uz ni oching va serverda tekshiring:

```bash
docker inspect reads-app --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}'
# → /opt/apps/reads
```

Hammasi ishlasa, tozalang:

```bash
# noutbukda: private kalit endi faqat GitHub'da kerak
rm ~/.ssh/ci_reads
rm -rf ~/deploy-setup
# serverda: eski nusxa (xohlasangiz, avval .env faylini xavfsiz joyga saqlab qoʻying)
rm -rf ~/reads
```

Keyinchalik kalit yoʻqolsa: 1-qadamdagidek yangisini yarating,
`/home/deployer/.ssh/authorized_keys` dagi qatorni almashtiring va
GitHub'dagi secret'ni yangilang.

---

## Kundalik ish

**`docker-compose.prod.yml` oʻzgarsa.** CI uni endi serverga
koʻchirmaydi. Repo'da oʻzgarganda, uni qoʻlda serverga qoʻying, keyin
qayta deploy qiling:

```bash
scp -P $PORT docker-compose.prod.yml sarvar@$HOST:/tmp/
ssh -t -p $PORT sarvar@$HOST 'sudo install -m 644 -o root -g root /tmp/docker-compose.prod.yml /opt/apps/reads/'
```

**`.env` ni oʻzgartirish.** `sudo nano /opt/apps/reads/.env`, keyin
konteynerni qayta yarating (DEPLOY.md ga qarang).

**Eski versiyaga qaytish (rollback).** Actions yorligʻida eski muvaffaqiyatli
ishni qayta ishga tushiring (**Re-run**). Yoki serverda qoʻlda (oxirgi 3 ta
image diskda saqlanadi):

```bash
cd /opt/apps/reads
sudo docker images ghcr.io/akbarov-labs/reads
sudo IMAGE_TAG=<sha> docker compose -f docker-compose.prod.yml up -d --force-recreate
```

**Kim nima qilganini koʻrish.** Har bir deploy va har bir rad etish:
`sudo journalctl -t deploy-app`.

## 2-bosqich: qolgan loyihalar, keyin eski kalitlarni oʻchirish

Har biri uchun: reads-admin, my-blog, online-shop-telegram-bot, kitoblarim
(va faqat backup qiladigan repo'lar ham):

1. Loyihani 3-qadamdagidek `/opt/apps/<ilova>` ga koʻchiring. Papka
   nomini avvalgidek qoldiring, shunda compose uni oʻsha loyiha deb taniydi.
2. `/etc/deploy-app/<ilova>.conf` qoʻshing: `reads.conf` dan nusxa oling,
   `APP_DIR` va `REPO` ni oʻzgartiring.
3. Shu repo uchun alohida kalit yarating (1-qadamdagidek, oʻz nomi bilan) va
   uning qatorini `/home/deployer/.ssh/authorized_keys` ga **qoʻshing**.
   Qatordagi `reads` soʻzini ilova nomiga almashtiring.
4. Repo'ning workflow'idagi deploy qismini Reads'dagidek qiling, secret'larni
   esa 6-qadamdagidek sozlang. Avval eski deploy qadamini koʻrib chiqing:
   oddiy pull + `up` dan boshqa narsa boʻlsa (migratsiyalar, bir nechta
   servis, backup), u `deploy-app` ga yoki image ichiga koʻchishi kerak.
   Hech qachon yana CI shell'iga qaytmasin.

**Hech bir repo `sarvar` boʻlib kirmay qolganda:**

```bash
# Faqat shaxsiy kalitingiz qolsin (…6nsu01dI itsakbarov98@gmail.com):
nano ~/.ssh/authorized_keys        # …UXATOykq va …Mr7kQIq qatorlarini oʻchiring
rm ~/.ssh/gh_deploy_key ~/.ssh/gh_deploy_key.pub
```

Ochiq oynani yopishdan oldin yangi terminalda `ssh sarvar@$HOST` bilan
tekshiring.

Ixtiyoriy: `sudo gpasswd -d sarvar docker`. Shunda serverda docker'ni ham,
root bilan bogʻliq boshqa hamma narsa kabi, faqat `sudo` (va parolingiz)
bilan ishlatasiz.

Oʻtish davomida qaysi eski kalit hali ishlatilayotganini koʻrish uchun:

```bash
ssh-keygen -lf ~/.ssh/authorized_keys
sudo journalctl -u ssh --since "30 days ago" | grep "Accepted publickey"
```

## Bundan tashqari qilish foydali

- **GitHub akkauntingiz va akbarov-labs org uchun 2FA (ikki bosqichli
  himoya).** `main` ga push qila olgan odam deploy ham qila oladi. Shuning
  uchun bu yuqoridagilarning hammasidan muhimroq.
- **Required reviewers.** Har bir `production` environment'ida yoqing
  (Settings → Environments). Shunda deploy sizning tasdigʻingizni
  (Approve tugmasini) kutadi.
- **Xavfsizlik yangilanishlari avtomatik oʻrnatilsin:**
  `sudo apt install unattended-upgrades`.
- **Firewall:** faqat 22, 80, 443 portlar ochiq boʻlsin. Agar `ufw`
  ishlatsangiz, bilib qoʻying: Docker ochgan portlar `ufw` ni chetlab
  oʻtadi. Shuning uchun faqat Caddy'ga kerakli portlarni oching.
