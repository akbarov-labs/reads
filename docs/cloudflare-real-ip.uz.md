# Cloudflare ortida tashrifchining haqiqiy IP manzili

> Bu [cloudflare-real-ip.md](cloudflare-real-ip.md) ning oʻzbekcha
> tarjimasi. Buyruqlar ikkalasida ham bir xil. Agar ular orasida farq
> chiqsa, inglizcha fayl toʻgʻri hisoblanadi.

2026-10-24 dan beri kitoblarim.uz saytlari Cloudflare proksisi orqali
ishlaydi (toʻq sariq bulut). Endi har bir soʻrov serverga Cloudflare
manzilidan keladi, shuning uchun ilovalar tashrifchini emas, Cloudflare'ni
koʻradi:

- tarjimonga soʻrov yuborish formasining cheklovi (har bir tashrifchiga
  daqiqasiga 5 ta, Reads-admin tekshiradi) bitta Cloudflare joylashuvidan
  keladigan hamma uchun umumiy boʻlib qoldi. Bitta spamchi yaqin atrofdagi
  hamma uchun formani bloklashi mumkin;
- Reads-admin'ning ochiq API cheklovi va panelga kirish cheklovi odamlarni
  emas, Cloudflare joylashuvlarini sanaydi.

Tuzatish ikki qismdan iborat:

1. **Edge Caddy Cloudflare'ga ishonadi.** Cloudflare manzilidan kelgan
   soʻrovda Caddy tashrifchining IP'sini Cloudflare qoʻshadigan
   `CF-Connecting-IP` sarlavhasidan oladi. Boshqa manzildan kelsa, bu
   sarlavha eʼtiborga olinmaydi, shuning uchun hech kim uni oʻzi yuborib
   IP'ni soxtalashtira olmaydi.
2. **Reads va Reads-admin shu IP'ni oladi.** Har biriga bitta label
   qoʻshilsa, Caddy ilovaga `X-Forwarded-For: <tashrifchi IP>` yuboradi.
   Label boʻlmasa, Caddy oxiriga Cloudflare manzilini qoʻshadi va ilovalar
   oʻshani oʻqiydi.

Serverdagi boshqa saytlarga taʼsir qilmaydi: olgo.uz, sarvarlogs.uz va
staging saytlari Cloudflare ortida emas, ularning soʻrovlari avvalgidek
toʻgʻridan-toʻgʻri tashrifchidan keladi. app.kitoblarim.uz hozir
tashrifchi IP'sidan foydalanmaydi, unga label kerak emas.

2026-10-24 da xuddi shu `caddy-docker-proxy:2.9-alpine` image bilan
sinaldi: label bilan ilova tashrifchining IP'sini oldi, labelsiz proksining
manzilini, ishonchli roʻyxatdan tashqaridagi soʻrov esa ikkala sarlavhani
ham soxtalashtira olmadi.

Hammasi **serverda** `sarvar` sifatida bajariladi. 1-qadamda (Caddy qayta
ishga tushadi) barcha saytlar, 2-qadamda esa har bir ilova bir necha
soniya ochilmay turadi.

## 1. Edge Caddy (`~/edge`)

Avval hozirgi faylni koʻring:

```bash
cat ~/edge/Caddyfile
```

Unda `email {$ACME_EMAIL}` qatori va `trusted_proxies static private_ranges`
boʻlgan `servers` bloki boʻlishi kerak, izohlardan boshqa hech narsa yoʻq.
Agar boshqa narsa ham boʻlsa, toʻxtang: quyidagi fayl uni oʻchirib yuboradi.

Nusxasini saqlang:

```bash
cd ~/edge && cp Caddyfile Caddyfile.bak-cloudflare
```

Yangi faylni yozing (butun blokni birdaniga qoʻying):

```bash
cat > ~/edge/Caddyfile <<'EOF'
{
    email {$ACME_EMAIL}
    servers {
        trusted_proxies static private_ranges 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32
        client_ip_headers CF-Connecting-IP X-Forwarded-For
    }
}
EOF
```

Manzillar Cloudflare eʼlon qilgan roʻyxat
(<https://www.cloudflare.com/ips/>), 2026-10-24 holatiga. `private_ranges`
qoladi: server avvaldan shunga ishonib kelgan.

Caddy uni yuklashidan oldin tekshiring. `check.localhost` sayti faqat shu
uchun: ichida sayt boʻlmagan faylda Caddy bu sozlamalarni tekshirmaydi:

```bash
cd ~/edge && { cat Caddyfile; printf 'http://check.localhost {\n    respond ok\n}\n'; } > /tmp/Caddyfile.check
```

```bash
cd ~/edge && docker run --rm --env-file .env -v /tmp/Caddyfile.check:/Caddyfile:ro lucaslorentz/caddy-docker-proxy:2.9-alpine adapt --config /Caddyfile --adapter caddyfile --validate > /dev/null && echo CADDYFILE OK
```

Undan oldin bir nechta log qatori chiqishi normal (bittasi fayl "is not
formatted" deb ogohlantiradi: zararsiz, gap boʻsh joy va tab haqida). Faqat
oxirgi qator `CADDYFILE OK` boʻlsa, Caddy'ni qayta ishga tushiring:

```bash
cd ~/edge && docker compose restart caddy
```

Keyin xatolarni tekshiring (`0` chiqishi kerak):

```bash
cd ~/edge && sleep 10 && docker compose logs --since 2m caddy | grep -c '"level":"error"'
```

**Biror narsa notoʻgʻri boʻlsa**, eski faylni qaytaring:

```bash
cd ~/edge && cp Caddyfile.bak-cloudflare Caddyfile && docker compose restart caddy
```

## 2. Reads va Reads-admin'ga label

Compose fayllar serverda turadi, root'niki, deploy ularni hech qachon
ustidan yozmaydi, shuning uchun oʻzgarish oʻsha yerda qilinadi.

### Reads

```bash
cd /opt/apps/reads && sudo grep -q "reverse_proxy.header_up" docker-compose.prod.yml || sudo sed -i '/caddy.reverse_proxy: "{{upstreams 3000}}"/a\      caddy.reverse_proxy.header_up: "X-Forwarded-For {client_ip}"' docker-compose.prod.yml
```

```bash
cd /opt/apps/reads && sudo grep -n "reverse_proxy" docker-compose.prod.yml
```

Bir-birining ostida ikki qator koʻrinishi kerak:

```
      caddy.reverse_proxy: "{{upstreams 3000}}"
      caddy.reverse_proxy.header_up: "X-Forwarded-For {client_ip}"
```

Label'lar faqat konteyner qayta yaratilganda oʻzgaradi. Bu buyruq uni
hozir ishlab turgan image bilan qayta yaratadi (yangi versiya deploy
qilinmaydi):

```bash
cd /opt/apps/reads && IMG=$(docker inspect --format '{{.Config.Image}}' reads-app) && echo "$IMG" && sudo env IMAGE="${IMG%:*}" IMAGE_TAG="${IMG##*:}" docker compose -f docker-compose.prod.yml up -d
```

### Reads-admin

Papkasini toping va `UP_FLAGS` bor-yoʻqligini tekshiring:

```bash
cat /etc/deploy-app/reads-admin.conf
```

Quyida u koʻrsatgan `APP_DIR` dan foydalaning (`/opt/apps/reads-admin` deb
olingan). Agar qiymati bor `UP_FLAGS=` qatori boʻlsa, oʻsha qiymatni
`docker compose ... up -d` buyrugʻining oxiriga qoʻshing.

```bash
cd /opt/apps/reads-admin && sudo grep -q "reverse_proxy.header_up" docker-compose.prod.yml || sudo sed -i '/caddy.reverse_proxy: "{{upstreams 80}}"/a\      caddy.reverse_proxy.header_up: "X-Forwarded-For {client_ip}"' docker-compose.prod.yml
```

```bash
cd /opt/apps/reads-admin && sudo grep -n "reverse_proxy" docker-compose.prod.yml
```

```bash
cd /opt/apps/reads-admin && IMG=$(docker inspect --format '{{.Config.Image}}' reads-admin-app) && echo "$IMG" && sudo env IMAGE="${IMG%:*}" IMAGE_TAG="${IMG##*:}" docker compose -f docker-compose.prod.yml up -d
```

## 3. Tekshirish

Serverda ikkala konteynerda ham label bor:

```bash
for c in reads-app reads-admin-app; do echo "$c: $(docker inspect --format '{{index .Config.Labels "caddy.reverse_proxy.header_up"}}' $c)"; done
```

Har bir nomdan keyin `X-Forwarded-For {client_ip}` chiqishi kerak. Keyin
Caddy uni olganini tekshiring (`2` yoki koʻproq chiqishi kerak):

```bash
cd ~/edge && docker compose logs --since 5m caddy | grep -o 'header_up X-Forwarded-For {client_ip}' | wc -l
```

**Mac**'da saytlar javob beradi:

```bash
for u in https://kitoblarim.uz/uz https://dashboard.kitoblarim.uz/ https://app.kitoblarim.uz/ https://olgo.uz/; do curl -s -o /dev/null -w "%{http_code} $u\n" "$u"; done
```

Har biri uchun `200` chiqishi kerak (`dashboard` login sahifasiga `302`
qaytarishi mumkin).

## Keyinroq

- Cloudflare manzil roʻyxatiga kamdan-kam yangi qator qoʻshadi. Qoʻshsa,
  yangi roʻyxatdan kelgan tashrifchilar yana Cloudflare manzili boʻyicha
  sanaladi (hech narsa buzilmaydi). Har bir necha oyda `~/edge/Caddyfile`
  dagi roʻyxatni <https://www.cloudflare.com/ips/> bilan solishtiring.
- Repo'lardagi compose fayllarning namunaviy nusxalari (shu repo'ning
  `docker-compose.prod.yml`, Reads-admin'niki va online-shop-telegram-bot
  dagi `infra/edge-caddy/Caddyfile`) ham xuddi shu oʻzgarishni olishi kerak,
  shunda qayta qurilgan server ham uni oladi.
- olgo.uz'ni Cloudflare ortiga oʻtkazish uchun bundan koʻprogʻi kerak:
  uning cheklovlari `{remote_host}` ni oʻqiydi, toʻlov va Telegram
  callback'lari esa Cloudflare'ning bot tekshiruviga duch kelmasligi kerak.
