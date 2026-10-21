import { randomBytes } from 'node:crypto';
import { Oda } from '../src/oda.js';
import { MAC, ZORLUK } from '../src/ayar.js';
import { kodUret, kodDuzelt } from '../src/kod.js';
import { adDuzelt, avatarDuzelt } from '../src/avatar-veri.js';

/**
 * Çevrim içi odalar (josephuz oda standardı, docs/oda-standardi.md): açık oda listesi, hızlı katıl, oda kur, kodla
 * katıl, bekleme odası ve her koşu için 30 Hz benzetim.
 *
 * Oda 10 koltukludur ve bir kuranı vardır. Bekleme odasında (durum 'lobi') oyuncular koltuk seçer, kuran ayarları
 * (bot zorluğu, herkese açık / özel) değiştirir, oyuncuları taşır ve MAÇI BAŞLAT der. Koşuda (durum 'mac') boş ve
 * kopuk koltuklarda bot koşar; koşu sürerken gelen doğrudan koşuya girer, bir botun yerini alır. Koşu bitince
 * oda bekleme odasına döner (kendiliğinden yeni koşu yok).
 *
 * Kod KPRT-4 biçimindedir. Özel oda listede görünmez, yalnız kodla ya da linkle (?oda=KOD) girilir. Her üyeye bir
 * jeton verilir: bağlantısı kopan üye `kopmaSure` boyunca koltuğunu tutar ('koptu'), jetonla dönerse geri alır.
 * Kuran çıkınca kuranlık sıradaki insana geçer; insan kalmayınca oda kapanır.
 */
export function createRooms({ log = () => {}, sure, kopmaSure = 60000 } = {}) {
  const odalar = new Map(), baglar = new Set();
  const KISI = MAC.kisi;
  let uyeNo = 1, simdi = performance.now();
  const yolla = (b, m) => b?.yolla(JSON.stringify(m));
  const uyeler = r => r.koltuk.filter(Boolean);
  const sonrakiKuran = r => uyeler(r).find(u => u.b) ?? uyeler(r)[0] ?? null;

  // ——— Açık oda listesi: odada olmayan bağlantılara değişince (250 ms toplayarak) gider ———
  function liste() {
    return [...odalar.values()].filter(r => !r.ozel)
      .sort((a, c) => (a.durum === 'lobi' ? 0 : 1) - (c.durum === 'lobi' ? 0 : 1) || uyeler(c).length - uyeler(a).length)
      .slice(0, 20)
      .map(r => ({ kod: r.kod, kuran: r.kuran?.ad ?? '', zorluk: r.zorluk, n: uyeler(r).length, max: KISI, durum: r.durum }));
  }
  const ozet = () => ({ t: 'lobi', cevrimici: baglar.size, odalar: liste() });
  let yayT = null;
  function lobiyeYay() {
    if (yayT) return;
    yayT = setTimeout(() => { yayT = null; const m = JSON.stringify(ozet()); for (const b of baglar) if (!b.uye) b.yolla(m); }, 250);
  }

  // ——— Oda ———
  function odaKur(zorluk) {
    const r = { kod: kodUret(k => odalar.has(k)), zorluk: ZORLUK[zorluk] ? zorluk : 'orta', ozel: false, durum: 'lobi', koltuk: Array(KISI).fill(null), kuran: null, oda: null };
    odalar.set(r.kod, r); log('oda açıldı', r.kod);
    return r;
  }
  const canli = r => odalar.get(r.kod) === r;
  function odaKapat(r) {
    for (const u of uyeler(r)) clearTimeout(u.kopT);
    r.oda = null; odalar.delete(r.kod); log('oda kapandı', r.kod);
  }
  /** Bekleme odası durumu: her üyeye kendi `ben`'iyle. */
  function durumYolla(r) {
    const koltuk = r.koltuk.map(u => u && { u: u.u, ad: u.ad, koptu: !u.b });
    for (const u of uyeler(r)) if (u.b) yolla(u.b, { t: 'oda', kod: r.kod, ozel: r.ozel, zorluk: r.zorluk, durum: r.durum, kuran: r.kuran?.u ?? 0, ben: u.u, koltuk });
  }
  /** Üyeyi süren koşuya sokar (bir botun yerini alır). */
  function macaSok(r, u) { u.id = r.oda.katil(m => u.b?.yolla(JSON.stringify(m)), u.ad, u.avatar); }

  function gir(b, r, m) {
    if (uyeler(r).length >= KISI) { yolla(b, { t: 'hata', m: 'Oda dolu' }); return; }
    ayril(b);
    const u = { u: uyeNo++, jeton: randomBytes(12).toString('hex'), ad: adDuzelt(m.ad) || 'Binici', avatar: avatarDuzelt(m.avatar), b, id: null, kopT: null };
    r.koltuk[r.koltuk.indexOf(null)] = u; b.uye = u; b.r = r;
    if (!r.kuran?.b) r.kuran = u; // kuransız ya da kuranı kopuk odada gelen kuran olur
    log('katıldı', r.kod, u.ad);
    yolla(b, { t: 'katildi', kod: r.kod, jeton: u.jeton });
    durumYolla(r);
    if (r.durum === 'mac') macaSok(r, u);
    lobiyeYay();
  }
  /** Jetonla geri dönüş: koltuk tutuluyorsa geri alınır, yoksa sıradan katılım. */
  function don(b, m) {
    const r = odalar.get(kodDuzelt(m.kod));
    if (!r) { yolla(b, { t: 'hata', m: 'Böyle bir oda yok' }); return; }
    const u = typeof m.jeton === 'string' && uyeler(r).find(x => x.jeton === m.jeton);
    if (!u) { gir(b, r, m); return; }
    ayril(b);
    if (u.b && u.b !== b) { u.b.uye = null; u.b.r = null; }
    if (r.oda && u.id != null) { r.oda.ayril(u.id); u.id = null; }
    clearTimeout(u.kopT); u.kopT = null; u.b = b; b.uye = u; b.r = r;
    if (!r.kuran?.b) r.kuran = u;
    log('geri döndü', r.kod, u.ad);
    yolla(b, { t: 'katildi', kod: r.kod, jeton: u.jeton, don: true });
    durumYolla(r);
    if (r.durum === 'mac') macaSok(r, u);
    lobiyeYay();
  }
  function uyeCikar(r, u) {
    clearTimeout(u.kopT); u.kopT = null;
    if (!canli(r)) return;
    if (r.oda && u.id != null) r.oda.ayril(u.id);
    u.id = null;
    const i = r.koltuk.indexOf(u); if (i >= 0) r.koltuk[i] = null;
    if (r.kuran === u) r.kuran = sonrakiKuran(r);
    if (!uyeler(r).length) odaKapat(r); else durumYolla(r);
    lobiyeYay();
  }
  /** Odadan çık (isteyerek): koltuk hemen boşalır. */
  function ayril(b) {
    const u = b.uye, r = b.r; if (!u) return;
    b.uye = null; b.r = null;
    if (u.b === b) { u.b = null; uyeCikar(r, u); }
  }
  /** Bağlantı koptu: koltuk kopmaSure boyunca tutulur, koşudaysa yerini bot oynar. */
  function koptu(b) {
    const u = b.uye, r = b.r; if (!u) return;
    b.uye = null; b.r = null;
    if (u.b !== b || !canli(r)) return;
    u.b = null;
    if (r.oda && u.id != null) { r.oda.ayril(u.id); u.id = null; }
    if (r.kuran === u) r.kuran = sonrakiKuran(r);
    u.kopT = setTimeout(() => uyeCikar(r, u), kopmaSure);
    durumYolla(r); lobiyeYay();
  }

  // ——— Bekleme odası işleri ———
  function baslat(r) {
    r.durum = 'mac';
    r.oda = new Oda({ ad: 'Kara Nal', zorluk: r.zorluk, sure, kod: r.kod, ozel: r.ozel, tekKosu: true });
    for (const u of r.koltuk) if (u?.b) macaSok(r, u);
    // Çıkış dizilişi koltuk sırasıyla: insan koltuğunda o, boş ya da kopuk koltukta sıradaki bot
    const botlar = [...r.oda.mac.oyuncular.values()].filter(o => o.bot).map(o => o.id);
    r.oda.mac.diz(r.koltuk.map(u => u?.id ?? botlar.shift()));
    r.oda.dagit();
    log('koşu başladı', r.kod, uyeler(r).length + ' insan');
    durumYolla(r); lobiyeYay();
  }
  /** Koşu bitti: herkes bekleme odasına, kuran yeniden başlatır. */
  function lobiyeDon(r) {
    r.oda = null; r.durum = 'lobi';
    for (const u of uyeler(r)) u.id = null;
    durumYolla(r); lobiyeYay();
  }
  function odaMesaji(b, m) {
    const u = b.uye, r = b.r, kuran = r.kuran === u, lobide = r.durum === 'lobi';
    switch (m.t) {
      case 'cik': ayril(b); return;
      case 'otur': { // boş koltuğa geç
        const i = m.i | 0;
        if (lobide && i >= 0 && i < KISI && !r.koltuk[i]) { r.koltuk[r.koltuk.indexOf(u)] = null; r.koltuk[i] = u; durumYolla(r); }
        return;
      }
      case 'tasi': { // kuran: oyuncuyu koltuğa taşı, dolu koltuksa yer değiştir
        const v = uyeler(r).find(x => x.u === m.u), i = m.i | 0;
        if (kuran && lobide && v && i >= 0 && i < KISI) { const j = r.koltuk.indexOf(v); r.koltuk[j] = r.koltuk[i]; r.koltuk[i] = v; durumYolla(r); }
        return;
      }
      case 'ayar':
        if (kuran && lobide) { if (ZORLUK[m.zorluk]) r.zorluk = m.zorluk; if (typeof m.ozel === 'boolean') r.ozel = m.ozel; durumYolla(r); lobiyeYay(); }
        return;
      case 'basla': if (kuran && lobide) baslat(r); return;
      default: if (r.oda && u.id != null) r.oda.mesaj(u.id, m);
    }
  }

  const tik = setInterval(() => {
    const t = performance.now(), dt = Math.min(0.1, (t - simdi) / 1000); simdi = t;
    for (const r of odalar.values()) if (r.oda) { r.oda.adim(dt); if (r.oda.mac.durum === 'son') lobiyeDon(r); }
  }, 1000 / MAC.tik);

  return {
    kapat() { clearInterval(tik); clearTimeout(yayT); for (const r of [...odalar.values()]) odaKapat(r); },
    stats: () => ({ cevrimici: baglar.size, odalar: odalar.size, oyunda: [...odalar.values()].reduce((a, r) => a + uyeler(r).filter(u => u.b).length, 0) }),
    attach(ws) {
      const b = { uye: null, r: null, yolla(veri) { if (ws.readyState === 1 && ws.bufferedAmount < 256 * 1024) ws.send(veri); } };
      baglar.add(b); lobiyeYay();
      let sayac = 0, pencere = Date.now();
      ws.on('message', veri => {
        // Taşkın koruması: saniyede 120 mesajdan fazlası düşer (30 Hz konum + ateş + savunma yeter).
        const t = Date.now(); if (t - pencere > 1000) { pencere = t; sayac = 0; } if (++sayac > 120) return;
        let m; try { m = JSON.parse(veri); } catch { return; }
        if (!m || typeof m !== 'object') return;
        if (b.uye) { odaMesaji(b, m); return; }
        if (m.t === 'lobi') yolla(b, ozet());
        else if (m.t === 'kur') gir(b, odaKur(m.zorluk), m);
        else if (m.t === 'kod') { const r = odalar.get(kodDuzelt(m.kod)); if (r) gir(b, r, m); else yolla(b, { t: 'hata', m: 'Böyle bir oda yok' }); }
        else if (m.t === 'don') don(b, m);
        else if (m.t === 'hizli') {
          const uygun = [...odalar.values()].filter(r => !r.ozel && uyeler(r).length < KISI)
            .sort((a, c) => (a.durum === 'lobi' ? 0 : 1) - (c.durum === 'lobi' ? 0 : 1) || uyeler(c).length - uyeler(a).length)[0];
          gir(b, uygun ?? odaKur(m.zorluk), m);
        }
      });
      ws.on('close', () => { koptu(b); baglar.delete(b); lobiyeYay(); });
      ws.on('error', () => {});
    },
  };
}
