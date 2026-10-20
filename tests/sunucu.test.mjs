import test from 'node:test';
import assert from 'node:assert/strict';
import { createRooms } from '../server/odalar.mjs';

/** Sahte WebSocket: odalar.mjs'in kullandığı kadarı (on, send, readyState). */
function sahteWs() {
  const ws = { readyState: 1, bufferedAmount: 0, gelen: [], dinle: {}, on(o, f) { this.dinle[o] = f; }, send(v) { this.gelen.push(JSON.parse(v)); } };
  ws.yolla = m => ws.dinle.message(JSON.stringify(m));
  ws.son = t => [...ws.gelen].reverse().find(m => m.t === t);
  return ws;
}
const bekle = ms => new Promise(r => setTimeout(r, ms));

test('lobi: hızlı katıl oda kurar, ikinci oyuncu aynı odaya, özel oda listede yok ama kodla girilir', async () => {
  const odalar = createRooms();
  try {
    const a = sahteWs(), b = sahteWs(), c = sahteWs(), d = sahteWs();
    for (const w of [a, b, c, d]) odalar.attach(w);
    a.yolla({ t: 'hizli', ad: 'Ayşe', avatar: { model: 'gezgin' } });
    const ha = a.son('hosgeldin'); assert.ok(ha, 'hoşgeldin yok'); assert.match(ha.kod, /^[A-Z]{4}$/);
    b.yolla({ t: 'lobi' }); const lobi = b.son('lobi'); assert.equal(lobi.odalar.length, 1); assert.equal(lobi.odalar[0].insan, 1);
    b.yolla({ t: 'hizli', ad: 'Bora' }); assert.equal(b.son('hosgeldin').kod, ha.kod);
    c.yolla({ t: 'kur', ozel: true, ad: 'Cem' }); const hc = c.son('hosgeldin'); assert.ok(hc.ozel);
    d.yolla({ t: 'lobi' }); assert.equal(d.son('lobi').odalar.length, 1, 'özel oda listede görünmemeli');
    d.yolla({ t: 'kod', kod: hc.kod.toLowerCase(), ad: 'Deniz' }); assert.equal(d.son('hosgeldin').kod, hc.kod);
    assert.deepEqual(odalar.stats(), { cevrimici: 4, odalar: 2, oyunda: 4 });
    // Oda adım atar: anlık görüntü ve eşya listesi gelir, 10 koltuk dolu (botlar)
    await bekle(120);
    const s = a.son('s'); assert.ok(s); assert.equal(s.o.length, 10); assert.ok(a.son('env'));
    // Atış: a, b'ye nişan alır (eli boşsa sayılmaz)
    const benA = s.o.find(o => o[0] === ha.id), benB = s.o.find(o => o[0] === b.son('hosgeldin').id);
    a.yolla({ t: 'ates', s: 0, b: [benA[1], benA[2] + 2.25, benA[3]], d: [benB[1] - benA[1], 0, benB[3] - benA[3]], r: 1 });
    await bekle(60);
    assert.ok(!a.gelen.some(m => m.t === 'isabet'), 'eli boşken isabet olmamalı');
    // Çıkış: oda kalır (b içeride), özel oda c+d çıkınca kapanır
    a.yolla({ t: 'cik' }); c.dinle.close(); d.dinle.close();
    assert.equal(odalar.stats().odalar, 1);
  } finally { odalar.kapat(); }
});

test('lobi: bilinmeyen kod hata verir, bozuk mesaj yok sayılır', () => {
  const odalar = createRooms();
  try {
    const a = sahteWs(); odalar.attach(a);
    a.dinle.message('{bozuk'); a.yolla({ t: 'kod', kod: 'ZZZZ' });
    assert.equal(a.son('hata').m, 'Bu kodla açık oda yok.');
  } finally { odalar.kapat(); }
});
