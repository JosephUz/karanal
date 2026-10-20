import { Oda } from '../src/oda.js';
import { MAC, ZORLUK } from '../src/ayar.js';

/**
 * Çevrim içi odalar: lobi (açık oda listesi, hızlı katıl, oda kur, kodla katıl) ve her oda için 30 Hz benzetim.
 * Oda 10 koltukludur; boş koltuklarda botlar koşar, insan gelince bir botun yerine geçer. Koşu sürerken de katılınır.
 * Özel oda listede görünmez; yalnız 4 harflik kodla ya da linkle (?oda=KOD) girilir. İçinde insan kalmayan oda kapanır.
 */
export function createRooms({ log = () => {} } = {}) {
  const odalar = new Map(), baglar = new Set();
  let odaNo = 1, simdi = performance.now();
  const ADLAR = ['Kara Nal', 'Maden Köprüsü', 'Şelale Geçidi', 'Fener Tüneli', 'Tribün Düzlüğü', 'Mağara Yolu', 'Demir Nal', 'Toz Bulutu'];
  const HARF = 'ABCDEFGHJKLMNPRSTUVYZ';
  const kodUret = () => { let k; do { k = Array.from({ length: 4 }, () => HARF[Math.floor(Math.random() * HARF.length)]).join(''); } while ([...odalar.values()].some(o => o.kod === k)); return k; };

  const ozet = () => ({ t: 'lobi', cevrimici: baglar.size, oyunda: [...odalar.values()].reduce((a, o) => a + o.insanSayisi, 0), odalar: [...odalar.values()].filter(o => !o.ozel).map(o => ({ id: o.id, ad: o.ad, insan: o.insanSayisi, kisi: o.mac.kisi, zorluk: o.mac.zorluk })) });
  const lobiyeYay = () => { const m = JSON.stringify(ozet()); for (const b of baglar) if (!b.oda) b.yolla(m); };

  function odaKur(zorluk, ozel) {
    const kullanilan = new Set([...odalar.values()].map(o => o.ad));
    const ad = ADLAR.find(a => !kullanilan.has(a)) ?? 'Kara Nal ' + odaNo;
    const oda = new Oda({ id: odaNo++, ad, zorluk: ZORLUK[zorluk] ? zorluk : 'orta', ozel: !!ozel, kod: kodUret() });
    odalar.set(oda.id, oda); log('oda açıldı', oda.id, oda.ad, oda.kod, oda.ozel ? 'özel' : 'açık');
    return oda;
  }
  function gir(b, oda, m) {
    if (oda.insanSayisi >= oda.mac.kisi) { b.yolla(JSON.stringify({ t: 'hata', m: 'Oda dolu.' })); return; }
    cik(b);
    b.oda = oda; b.id = oda.katil(mesaj => b.yolla(JSON.stringify(mesaj)), m.ad, m.avatar);
    log('katıldı', oda.ad, b.id, String(m.ad ?? '').slice(0, 16));
    lobiyeYay();
  }
  function cik(b) {
    if (!b.oda) return;
    const oda = b.oda; oda.ayril(b.id); b.oda = null; b.id = null;
    if (!oda.insanSayisi) { odalar.delete(oda.id); log('oda kapandı', oda.id, oda.ad); }
    lobiyeYay();
  }

  const tik = setInterval(() => {
    const t = performance.now(), dt = Math.min(0.1, (t - simdi) / 1000); simdi = t;
    for (const oda of odalar.values()) oda.adim(dt);
  }, 1000 / MAC.tik);
  const yay = setInterval(lobiyeYay, 5000);

  return {
    kapat() { clearInterval(tik); clearInterval(yay); },
    stats: () => ({ cevrimici: baglar.size, odalar: odalar.size, oyunda: [...odalar.values()].reduce((a, o) => a + o.insanSayisi, 0) }),
    attach(ws) {
      const b = { oda: null, id: null, yolla(veri) { if (ws.readyState === 1 && ws.bufferedAmount < 256 * 1024) ws.send(veri); } };
      baglar.add(b); lobiyeYay();
      let sayac = 0, pencere = Date.now();
      ws.on('message', veri => {
        // Taşkın koruması: saniyede 120 mesajdan fazlası düşer (30 Hz konum + ateş + savunma yeter).
        const t = Date.now(); if (t - pencere > 1000) { pencere = t; sayac = 0; } if (++sayac > 120) return;
        let m; try { m = JSON.parse(veri); } catch { return; }
        if (!m || typeof m !== 'object') return;
        if (b.oda) { if (m.t === 'cik') cik(b); else b.oda.mesaj(b.id, m); return; }
        if (m.t === 'lobi') b.yolla(JSON.stringify(ozet()));
        else if (m.t === 'kur') gir(b, odaKur(m.zorluk, m.ozel), m);
        else if (m.t === 'katil') { const oda = odalar.get(m.oda); if (oda && !oda.ozel) gir(b, oda, m); else b.yolla(JSON.stringify({ t: 'hata', m: 'Oda kapanmış.' })); }
        else if (m.t === 'kod') { const kod = String(m.kod ?? '').toUpperCase().slice(0, 6), oda = [...odalar.values()].find(o => o.kod === kod); if (oda) gir(b, oda, m); else b.yolla(JSON.stringify({ t: 'hata', m: 'Bu kodla açık oda yok.' })); }
        else if (m.t === 'hizli') {
          const uygun = [...odalar.values()].filter(o => !o.ozel && o.insanSayisi < o.mac.kisi).sort((a, c) => c.insanSayisi - a.insanSayisi)[0];
          gir(b, uygun ?? odaKur(m.zorluk, false), m);
        }
      });
      ws.on('close', () => { cik(b); baglar.delete(b); lobiyeYay(); });
      ws.on('error', () => {});
    },
  };
}
