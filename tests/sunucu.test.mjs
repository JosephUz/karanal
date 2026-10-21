import test from 'node:test';
import assert from 'node:assert/strict';
import { createRooms } from '../server/odalar.mjs';
import { kodUret, kodDuzelt, kodYeterli } from '../src/kod.js';

/** Sahte WebSocket: odalar.mjs'in kullandığı kadarı (on, send, readyState). */
function sahteWs() {
  const ws = { readyState: 1, bufferedAmount: 0, gelen: [], dinle: {}, on(o, f) { this.dinle[o] = f; }, send(v) { this.gelen.push(JSON.parse(v)); } };
  ws.yolla = m => ws.dinle.message(JSON.stringify(m));
  ws.son = t => [...ws.gelen].reverse().find(m => m.t === t);
  ws.kapat = () => { ws.readyState = 3; ws.dinle.close(); };
  return ws;
}
const bekle = ms => new Promise(r => setTimeout(r, ms));
const KOD = /^[ABCDEFGHJKLMNPRSTUVYZ]{4}-[2-9]$/;

test('kod: KPRT-4 biçimi, benzersiz, tiresiz yazılana tire eklenir', () => {
  for (let i = 0; i < 200; i++) assert.match(kodUret(), KOD);
  let n = 0; const k = kodUret(x => ++n < 3); assert.equal(n, 3); assert.match(k, KOD);
  assert.equal(kodDuzelt('kprt4'), 'KPRT-4'); assert.equal(kodDuzelt(' KPRT-4 '), 'KPRT-4'); assert.equal(kodDuzelt('kp rt 4x'), 'KPRT-4');
  assert.equal(kodDuzelt('ABCD'), 'ABCD'); assert.ok(kodYeterli('abcd')); assert.ok(!kodYeterli('ab')); assert.ok(!kodYeterli(''));
});

test('oda kur: kuran bekleme odasında, ayarlar yalnız kuranda, özel oda listede yok ama kodla girilir', async () => {
  const odalar = createRooms();
  try {
    const a = sahteWs(), b = sahteWs(), c = sahteWs();
    for (const w of [a, b, c]) odalar.attach(w);
    a.yolla({ t: 'kur', zorluk: 'zor', ad: 'Ayşe', avatar: { model: 'gezgin' } });
    const ka = a.son('katildi'); assert.match(ka.kod, KOD); assert.ok(ka.jeton);
    const da = a.son('oda'); assert.equal(da.durum, 'lobi'); assert.equal(da.zorluk, 'zor'); assert.equal(da.ozel, false);
    assert.equal(da.koltuk.length, 10); assert.equal(da.koltuk[0].ad, 'Ayşe'); assert.equal(da.kuran, da.ben);
    assert.ok(!a.son('hosgeldin'), 'oda kurulunca koşu başlamamalı');
    // Liste: odada olmayanlara kendiliğinden gelir (yoklama yok)
    await bekle(300);
    const l = b.son('lobi'); assert.equal(l.odalar.length, 1);
    assert.deepEqual(l.odalar[0], { kod: ka.kod, kuran: 'Ayşe', zorluk: 'zor', n: 1, max: 10, durum: 'lobi' });
    assert.equal(l.cevrimici, 3);
    // b kodla girer (küçük harf, tiresiz); kuran değildir, ayar değiştiremez
    b.yolla({ t: 'kod', kod: ka.kod.replace('-', '').toLowerCase(), ad: 'Bora' });
    const db = b.son('oda'); assert.equal(db.kod, ka.kod); assert.notEqual(db.kuran, db.ben); assert.equal(db.koltuk[1].ad, 'Bora');
    b.yolla({ t: 'ayar', zorluk: 'kolay' }); assert.equal(a.son('oda').zorluk, 'zor');
    // Kuran özel yapar: liste boşalır, kodla yine girilir
    a.yolla({ t: 'ayar', ozel: true, zorluk: 'kolay' });
    assert.equal(b.son('oda').ozel, true); assert.equal(b.son('oda').zorluk, 'kolay');
    c.yolla({ t: 'lobi' }); assert.equal(c.son('lobi').odalar.length, 0, 'özel oda listede görünmemeli');
    c.yolla({ t: 'hizli', ad: 'Cem' }); assert.notEqual(c.son('katildi').kod, ka.kod, 'hızlı katıl özel odaya girmemeli');
    assert.equal(odalar.stats().odalar, 2);
  } finally { odalar.kapat(); }
});

test('kodla katıl: bilinmeyen ve eski 4 harflik kod "Böyle bir oda yok", bozuk mesaj yok sayılır, dolu oda', () => {
  const odalar = createRooms();
  try {
    const a = sahteWs(); odalar.attach(a);
    a.dinle.message('{bozuk'); a.yolla({ t: 'kod', kod: 'ZZZZ' });
    assert.equal(a.son('hata').m, 'Böyle bir oda yok');
    a.yolla({ t: 'kod', kod: 'ZZZZ-9' }); assert.equal(a.son('hata').m, 'Böyle bir oda yok');
    const k = sahteWs(); odalar.attach(k); k.yolla({ t: 'kur', ad: 'Kuran' }); const kod = k.son('katildi').kod;
    for (let i = 0; i < 9; i++) { const w = sahteWs(); odalar.attach(w); w.yolla({ t: 'kod', kod, ad: 'O' + i }); assert.ok(w.son('katildi')); }
    a.yolla({ t: 'kod', kod, ad: 'Fazla' }); assert.equal(a.son('hata').m, 'Oda dolu');
  } finally { odalar.kapat(); }
});

test('hızlı katıl: önce lobideki açık odaya, yoksa yeni açık oda kurar ve kuran olur', () => {
  const odalar = createRooms();
  try {
    const a = sahteWs(), b = sahteWs(), c = sahteWs();
    for (const w of [a, b, c]) odalar.attach(w);
    a.yolla({ t: 'hizli', ad: 'Ayşe', zorluk: 'kolay' });
    const da = a.son('oda'); assert.equal(da.kuran, da.ben); assert.equal(da.zorluk, 'kolay'); assert.equal(da.ozel, false);
    b.yolla({ t: 'hizli', ad: 'Bora' }); assert.equal(b.son('katildi').kod, a.son('katildi').kod);
    a.yolla({ t: 'cik' }); b.yolla({ t: 'cik' });
    assert.equal(odalar.stats().odalar, 0, 'insan kalmayınca oda kapanır');
    c.yolla({ t: 'hizli', ad: 'Cem' }); assert.equal(c.son('oda').kuran, c.son('oda').ben);
  } finally { odalar.kapat(); }
});

test('koltuklar: boş koltuğa geç, kuran taşır ve yer değiştirir, kuranlık sıradakine geçer', () => {
  const odalar = createRooms();
  try {
    const a = sahteWs(), b = sahteWs(), c = sahteWs();
    for (const w of [a, b, c]) odalar.attach(w);
    a.yolla({ t: 'kur', ad: 'Ayşe' }); const kod = a.son('katildi').kod;
    b.yolla({ t: 'kod', kod, ad: 'Bora' }); c.yolla({ t: 'kod', kod, ad: 'Cem' });
    const ad = (w, i) => w.son('oda').koltuk[i]?.ad;
    b.yolla({ t: 'otur', i: 7 }); assert.equal(ad(a, 7), 'Bora'); assert.equal(ad(a, 1), undefined);
    b.yolla({ t: 'otur', i: 0 }); assert.equal(ad(a, 0), 'Ayşe', 'dolu koltuğa kendi geçilmez');
    const uB = a.son('oda').koltuk[7].u, uC = a.son('oda').koltuk[2].u;
    c.yolla({ t: 'tasi', u: uB, i: 3 }); assert.equal(ad(a, 7), 'Bora', 'kuran olmayan taşıyamaz');
    a.yolla({ t: 'tasi', u: uB, i: 4 }); assert.equal(ad(a, 4), 'Bora'); assert.equal(ad(a, 7), undefined);
    a.yolla({ t: 'tasi', u: uC, i: 4 }); assert.equal(ad(a, 4), 'Cem'); assert.equal(ad(a, 2), 'Bora', 'dolu koltuğa bırakınca yer değiştirir');
    // Kuran çıkar: kuranlık koltuk sırasındaki ilk insana (Bora, koltuk 2)
    a.yolla({ t: 'cik' });
    const db = b.son('oda'); assert.equal(db.kuran, db.ben); assert.equal(db.koltuk[0], null);
    assert.equal(c.son('oda').kuran, db.ben);
  } finally { odalar.kapat(); }
});

test('maçı başlat: yalnız kuran, koltuk sırası çıkış dizilişi, koşu sürerken katılan bir botun yerine girer', async () => {
  const odalar = createRooms();
  try {
    const a = sahteWs(), b = sahteWs(), c = sahteWs();
    for (const w of [a, b, c]) odalar.attach(w);
    a.yolla({ t: 'kur', ad: 'Ayşe' }); const kod = a.son('katildi').kod;
    b.yolla({ t: 'kod', kod, ad: 'Bora' }); b.yolla({ t: 'otur', i: 6 });
    b.yolla({ t: 'basla' }); assert.ok(!a.son('hosgeldin'), 'kuran olmayan başlatamaz');
    a.yolla({ t: 'basla' });
    assert.ok(a.son('hosgeldin')); assert.ok(b.son('hosgeldin')); assert.equal(a.son('oda').durum, 'mac');
    // Koltuk 0 ilk sıra, koltuk 6 ikinci sıra (5'li sıralar)
    assert.equal(a.son('dogus').u, 4); assert.equal(b.son('dogus').u, 9);
    await bekle(300); const l = c.son('lobi'); assert.equal(l.odalar[0].durum, 'mac');
    c.yolla({ t: 'kod', kod, ad: 'Cem' });
    const hc = c.son('hosgeldin'); assert.ok(hc, 'koşu sürerken gelen doğrudan koşuya girer'); assert.equal(c.son('oda').durum, 'mac');
    await bekle(120);
    const s = c.son('s'); assert.equal(s.o.length, 10, 'koltuk sayısı sabit, bir bot çıktı');
    assert.equal(c.son('liste').o.filter(o => !o[3]).length, 3);
    // Koşu içi mesaj odaya gider: eli boşken atış isabet etmez
    const benA = s.o.find(o => o[0] === a.son('hosgeldin').id), benB = s.o.find(o => o[0] === b.son('hosgeldin').id);
    a.yolla({ t: 'ates', s: 0, b: [benA[1], benA[2] + 2.25, benA[3]], d: [benB[1] - benA[1], 0, benB[3] - benA[3]], r: 1 });
    await bekle(60); assert.ok(!a.gelen.some(m => m.t === 'isabet'));
    // Koşudayken koltuk ve ayar değişmez
    a.yolla({ t: 'ayar', zorluk: 'zor' }); assert.notEqual(a.son('oda').zorluk, 'zor');
  } finally { odalar.kapat(); }
});

test('koşu bitince oda bekleme odasına döner, kuran yeniden başlatır', async () => {
  const odalar = createRooms({ sure: 0.3 });
  try {
    const a = sahteWs(); odalar.attach(a);
    a.yolla({ t: 'kur', ad: 'Ayşe' }); a.yolla({ t: 'basla' });
    assert.equal(a.son('oda').durum, 'mac');
    await bekle(700);
    assert.ok(a.son('son'), 'sonuç gelmeli'); assert.equal(a.son('oda').durum, 'lobi');
    const n = a.gelen.length; await bekle(300);
    assert.ok(!a.gelen.slice(n).some(m => m.t === 'basla' || m.t === 's'), 'kendiliğinden yeni koşu yok');
    a.gelen.length = 0; a.yolla({ t: 'basla' }); assert.ok(a.son('hosgeldin')); assert.equal(a.son('oda').durum, 'mac');
  } finally { odalar.kapat(); }
});

test('kopma: koltuk "koptu" olarak tutulur, jetonla geri alınır, süre dolunca boşalır', async () => {
  const odalar = createRooms({ kopmaSure: 200 });
  try {
    const a = sahteWs(), b = sahteWs();
    odalar.attach(a); odalar.attach(b);
    a.yolla({ t: 'kur', ad: 'Ayşe' }); const { kod, jeton } = a.son('katildi');
    b.yolla({ t: 'kod', kod, ad: 'Bora' }); b.yolla({ t: 'otur', i: 3 });
    a.yolla({ t: 'basla' });
    a.kapat();
    let d = b.son('oda'); assert.equal(d.koltuk[0].koptu, true); assert.equal(d.kuran, d.ben, 'kuranlık bağlı insana geçer');
    await bekle(80); assert.equal(b.son('s').o.length, 10);
    // Yeni bağlantı jetonla döner: aynı koltuk, doğrudan koşuya
    const a2 = sahteWs(); odalar.attach(a2); a2.yolla({ t: 'don', kod, jeton, ad: 'Ayşe' });
    assert.ok(a2.son('katildi').don); d = a2.son('oda'); assert.equal(d.koltuk[0].ad, 'Ayşe'); assert.equal(d.koltuk[0].koptu, false); assert.equal(d.ben, d.koltuk[0].u);
    assert.ok(a2.son('hosgeldin'));
    // Bir daha kopar ve dönmez: süre dolunca koltuk boşalır
    a2.kapat(); await bekle(300);
    assert.equal(b.son('oda').koltuk[0], null);
    // Yanlış jeton sıradan katılım olur
    const a3 = sahteWs(); odalar.attach(a3); a3.yolla({ t: 'don', kod, jeton: 'yanlis', ad: 'Ayla' }); assert.ok(!a3.son('katildi').don);
  } finally { odalar.kapat(); }
});
