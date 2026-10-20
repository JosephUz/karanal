# Kara Nal

Juland'ın kutu karakterleriyle mağarada atlı çatışma. On binici bitmeyen bir döngü pistte koşar; amaç bitişe ilk
varmak değil, süre boyunca en çok kişiyi düşürmek. Geri dönüş yok: akışın tersine giden at şaha kalkar.
Yolda kırmızı sandıktan saldırı silahı (sol tık), mavi sandıktan savunma eşyası (sağ tık) toplanır; düşen eşyalarını
ganimet bırakır ve son geçtiği kapıdan eli boş çıkar. Oyun tasarımı: [PLAN.md](PLAN.md).

## Çalıştırma

```
npm install
npm start          # http://127.0.0.1:5220  (Baslat.cmd tarayıcıyı da açar)
npm test           # benzetim + sunucu testleri
```

`?otomatik=1` botlu koşuyu hemen başlatır, `?cevrimdisi=1` sunucuya bağlanmayı denemez, `?sunucu=ws://…` başka sunucu,
`?oda=KOD` o odaya katılır.

## Düzen

| Dosya | Ne yapar |
| --- | --- |
| `src/ayar.js` | Bütün sayılar: at, geri gidilmez payı, maç, puan, 5 saldırı + 5 savunma, bot zorlukları ve huyları |
| `src/pist.js` | Döngü pist: denetim noktalarından eğri, 1 blokta bir örnek; (s, yanal) ↔ dünya, bölümler, kapılar, engeller, sandık yerleri |
| `src/at.js` | At sürüşü (istemci ve botlar aynı işlev): dönüş, tırıs/dörtnala/mahmuz, dayanım, çitler, engeller, geri gidilmez, topal, kement |
| `src/fizik.js` | Işın–dönük kutu, binici/at vuruş kutuları, engellerin atış kesen kutuları, tohumlu saçılma |
| `src/mac.js` | Maç: atış (geri sarmalı), hasar, düşme, ganimet, kapıda doğuş, sandıklar, mayın, çivi, duman, dinamit, puan, aranan |
| `src/bot.js` | Bot: avcı / kaçak / pusucu huyu, hedef seçimi (karşılık, aranan), silah seçimi, tuzak, sandığa sapma, engel atlama |
| `src/oda.js`, `src/ag.js` | Maçı istemcilere bağlar; botlu oyunda tarayıcıda, çevrim içi sunucuda aynı sınıf |
| `src/main.js` | İstemci: giriş, kendi atın, kamera, nişan, ara değerleme, göstergeler, mini harita, menüler, lobi |
| `src/sahne.js`, `src/karakter.js` | Three.js: mağara, çitler, kapılar, tribün, köprü, şelale, tünel, engeller, sandıklar, tuzaklar; binici + kutu at + silahlar |
| `src/avatar-veri.js` | Juland'dan kopya (6 hazır karakter). Juland'da değişirse buraya da kopyala |
| `server.mjs`, `server/odalar.mjs` | Statik dosyalar + WebSocket lobisi (açık oda listesi, hızlı katıl, özel oda, kodla katılım) ve 30 Hz odalar |

Ağ: herkes kendi atını yürütür ve konumunu yollar (30 Hz); oda ateşi istemcinin gördüğü ana (en çok 0,4 sn) geri sararak
hesaplar. Atı etkileyenler (çivi, kement, mahmuz) istemciye `etki` mesajıyla gider. Oda 10 koltuk; boş koltuklarda bot koşar.

## Yayın

- İstemci: Cloudflare Worker, `karanal.josephuz.com` → `npm run deploy:web`
- Sunucu: Docker + Cloudflare Tunnel, `karanal-sunucu.josephuz.com` → `docker compose --profile tunnel up -d --build`
  (`.env` içinde `TUNNEL_TOKEN`, paneldeki rota `http://localhost:5220`).
