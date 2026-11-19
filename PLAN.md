# Kara Nal — oyun planı (taslak 3)

## Özü
Mağara içinde, döngü hâlinde bir pistte **10 atlı binici** (boş koltukta bot). Amaç bitiş çizgisine ilk varmak değil: **süre boyunca en çok kişiyi düşürmek.** Pist bitmez, kavga hiç kesilmez.

- **Ölünce:** binici **son geçtiği kontrol kapısında** yeniden doğar. Eşyaları yere düşer ve **ganimet** olur (yanından geçen alır); elleri boş kalır. Pist döngü olduğu için diğerlerinin önünde mi arkasında mı kaldığını bilemez. Yola çıkıp bir an önce kutu toplaması gerekir.
- **Geri gidilemez:** at istenen yöne sürülür, pist geniştir. Ama pistin akışına ters yönde, son geçilen noktadan birkaç adımdan fazla geri gidilemez: at şaha kalkar ve geri döner.
- **Öndeysen hedefsin:** öndeki kişi ya savunur (kalkan, duman) ya da arkasına tuzak bırakıp peşindekileri temizler. Arkadaki ise önündekini avlar. Kimseye saldırmamak seni korumaz.

## Kontroller (Juland'daki ata binme hissi)
| Tuş | İş |
|---|---|
| WASD | Atı kameraya göre sür; at gittiği yöne döner |
| Fare | Kamera ve nişan; binicinin gövdesi atın yönünden bağımsız döner. Örneğin A+W ile sola koşarken sağdakini vurabilirsin |
| **Sol tık** | **Saldırı silahı**: nişangâhtaki hedefe |
| **Sağ tık** | **Savunma eşyası**: arkaya ya da kendine |
| Tekerlek | Saldırı silahı değiştir |
| 1–5 | Savunma eşyası seç |
| Shift | Dörtnala (dayanım harcar) |
| Space | Engel atla |

Q ile fırlatma/bırakma yok. Her şey iki fare tuşundan yapılır.

## 5 saldırı + 5 savunma
**Saldırı (sol tık, nişana):**
1. **Tabanca:** 6 mermi, orta menzil, dengeli
2. **Çifte:** yakında çok güçlü, uzakta etkisiz
3. **Tüfek:** uzun menzil, yavaş, ağır vuruş
4. **Kement:** hedefi yavaşlatır ve sana doğru çeker; çifteyle birlikte ölümcül
5. **Dinamit:** nişana fırlatılır, alan hasarı verir, gecikmeli patlar

**Savunma (sağ tık, arkaya ya da kendine):**
1. **Mayın:** arkana bırakılır, üstünden geçen düşer
2. **Duman:** arkanda bulut bırakır; içindekiler nişan alamaz
3. **Çivi:** arkaya geniş şerit saçar; basan at topallar (yavaşlar)
4. **Çelik yelek:** birkaç darbeyi emer
5. **Mahmuz:** kısa ve çok hızlı kaçış; o sırada kement tutmaz

**Kutular:** kırmızı kutu saldırı silahı, mavi kutu savunma eşyası verir. Sağlam eşyalar riskli yerlerdedir: dar köprü, pist kenarı, çatalın tehlikeli kolu. Her eşyanın sınırlı mermisi ya da adedi vardır; aynı eşyayı yeniden alınca mermisi dolar.

## Skor ve maç
- **Maç:** 8 dakika. En çok puanı olan kazanır.
- **Puanlar:**
  - Düşürme: +100
  - Seri: 3'lü seri +50, 5'li +100
  - **Aranan:** o an en çok leşi olan oyuncunun başında ödül işareti olur, onu düşürene +100 daha. Lider herkesin hedefi olur.
  - Tuzakla (mayın, çivi, dinamit) düşürmek de sayılır. Ölmenin puan cezası yok; ceza, eşyaların gitmesi.
- **Ekran:** üstte leş akışı, Tab'da skor tablosu, kalan süre.

## Pist (Kara Nal mağarası, döngü)
Tribün Düzlüğü (KARA NAL kapısı, BAHİS tahtası) → Mağara Yolu → Maden Köprüsü (dar, iki yanı uçurum) → Şelale Geçidi → Fener Tüneli (maden destekleri) → Mağara Yolu → başa.

- 10 kontrol kapısı (0. kapı KARA NAL).
- Pist geniştir: yan yana birkaç at sığar ve manevra alanı kalır.
- Çatallar, çitler, alçak kirişler ve maden vagonları siper ve tuzak yeri olarak kullanılır.

## Teknik
- **Altyapı:** Tetik Meydanı düzeni (Three.js, aynı Oda sınıfı tarayıcıda botlu ve sunucuda çevrim içi, ws, Worker + Docker + tunnel). Sunucu ateşi geri sararak hesaplar.
- **Hareket:** Juland'daki kameraya göre sürüş. At ile binicinin gövdesi ayrı yönlere bakar.
- **Pist ve botlar:** pist bir eğri (spline) ve genişlikten oluşur. "Geri gidilemez" kuralı ve kontrol noktaları bu eğri üzerindeki ilerlemeden çıkar; botlar da yollarını buradan bulur.
- **Modeller:** Juland binicileri kullanılır, kutu at yeni yapılır.
- **Bot kişilikleri:** avcı (saldırgan), kaçak (savunmacı), pusucu (tuzak bırakır, bekler).
- **Ek kurallar:** araç çubuğu standardı korunur; müzik onaysız girmez; `npm test` ile benzetim testleri yazılır.

## Aşamalar
1. **Faz 0:** pist döngüsü, at sürüşü ve serbest nişan, kamera, 9 bot, geri gidilmez kuralı, kontrol noktaları
2. **Faz 1:** 10 eşya, kutular, ölüm, eşya düşürme, kontrol noktasından yeniden doğma, skor, aranan
3. **Faz 2:** bot kişilikleri
4. **Faz 3:** çevrim içi oda (10 koltuk)
5. **Faz 4:** engeller, çatallar, sesler
6. **Faz 5:** yayın (karanal.josephuz.com, GitHub, josephuz.com kartı)

## Kararlar (2026-10-20)
1. Yeniden doğma: son geçilen kapı.
2. Maç süresi: 8 dakika.
3. Ölünce eşyalar yere düşer, ganimet olur.
4. Bahis Kara Nal'da yok; Juland'a entegre ederken düşünülecek. Tribündeki BAHİS tahtası yalnız süs.

## Durum
- **Faz 0 bitti (2026-10-20):** döngü pist (5 bölüm, 10 kapı, ~750 blok), at sürüşü (tırıs/dörtnala, dayanım, zıplama), serbest nişan, üçüncü şahıs kamera, 9 bot, geri gidilmez kuralı (şaha kalkma), kapı sayımı, 8 dk koşu, mini harita, ana ekranda koşan botlar.
- **Faz 1 bitti (2026-10-21):** 33 sandık (kırmızı saldırı, mavi savunma, 12 sn'de yenilenir), 5 saldırı + 5 savunma (değerler `src/ayar.js`), atış geri sarmalı, kafa/gövde/at vuruş bölgeleri, çelik yelek zırhı, düşme, ganimet torbası (25 sn), son kapıda 3 sn sonra eli boş doğuş (2 sn dokunulmaz), puan (düşürme 100, üçleme +50, beşleme +100, aranan +100), aranan işareti (başında altın yıldız, haritada kırmızı), Tab sıralaması.
- **Faz 2 bitti:** botlar Kolay/Orta/Zor; huylar avcı, kaçak, pusucu. Kendisine saldırana karşılık verir, arananı kovalar, mesafeye göre silah seçer, peşindekine mayın/çivi/duman bırakır, yelek ve mahmuz kullanır, sandığa ve ganimete sapar, tuzaktan ve engelden kaçar, çiti atlar.
- **Faz 3 bitti:** çevrim içi odalar (10 koltuk, botlar boş koltukta, koşu sürerken katılım): açık oda listesi, Hızlı katıl, Oda kur (Özel oda: yalnız kodla), 4 harflik kod ve `?oda=KOD` linki.
- **Faz 4 bitti:** engeller: Şelale Geçidi'nde yolu ikiye ayıran kaya ada (çatal), Mağara Yolu'nda alçak çitler (zıplanır), Fener Tüneli'nde devrik maden vagonları (siper; atış geçirmez). Bütün silah, tuzak ve at sesleri WebAudio ile.
- **Faz 5:** yayın (Worker, GitHub, Docker, josephuz.com kartı). `npm test`: 14 test.
