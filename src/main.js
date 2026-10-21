// Kara Nal istemcisi: ana ekran (arkada botlar koşar), botlu koşu (tarayıcıdaki Oda) ve çevrim içi oda.
// Kendi atını burada sürersin (anında tepki); konum, ateş ve savunma odaya gider; hasarı, kutuları ve tuzakları oda hesaplar.
// Kamera üçüncü şahıs: fare kamerayı ve binicinin nişanını çevirir, WASD atı kameraya göre sürer.
// Sol tık saldırı silahı (nişangâha), sağ tık savunma eşyası (arkaya ya da kendine); tekerlek silah, 1–5 savunma seçer.
import * as T from 'three';
import { AT, MAC, SALDIRI, SAVUNMA, ZORLUK, PUAN } from './ayar.js';
import { atDurumu, atAdim, atYerlestir, itis } from './at.js';
import { P, pistNoktasi, noktalar, sinir, BOLUM_AD } from './pist.js';
import { biniciyeIsin, engeleIsin, zemineIsin, tohumlu, saptir } from './fizik.js';
import { Gorunum } from './sahne.js';
import { biniciModeli } from './karakter.js';
import { MODELLER, adDuzelt } from './avatar-veri.js';
import { cal, calKonum, sesAcik, sesAyarla, sesBaslat } from './ses.js';
import { yerelBaglanti, sunucuBaglanti } from './ag.js';
import { Mac } from './mac.js';

const $ = id => document.getElementById(id);
const sakla = { al(k, v) { try { return localStorage.getItem('karanal.' + k) ?? v; } catch { return v; } }, yaz(k, v) { try { localStorage.setItem('karanal.' + k, v); } catch { /* yok */ } } };
const simdi = () => performance.now() / 1000;
const aci = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const PARAM = new URLSearchParams(location.search);
const GOZ = 2.25;
const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let gor;
try { gor = new Gorunum($('sahne')); } catch (e) { $('fatal').hidden = false; $('fatal-message').textContent = 'Tarayıcın WebGL açamadı: ' + (e?.message ?? e); throw e; }
const boyutla = () => gor.boyut(innerWidth, innerHeight); addEventListener('resize', boyutla); boyutla();

// ——— Seçimler ———
const secim = {
  model: MODELLER.some(m => m.id === sakla.al('model')) ? sakla.al('model') : MODELLER[Math.floor(Math.random() * MODELLER.length)].id,
  ad: adDuzelt(sakla.al('ad', '')) || 'Binici' + Math.floor(100 + Math.random() * 900),
  zorluk: ZORLUK[sakla.al('zorluk')] ? sakla.al('zorluk') : 'orta',
};
let hassas = Math.max(0.3, Math.min(3, +sakla.al('hassas', '1') || 1));
const avatarim = () => { const m = MODELLER.find(m => m.id === secim.model) ?? MODELLER[0]; return { model: m.id, ...m.avatar }; };

function portreler() {
  const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(152, 192); r.outputColorSpace = T.SRGBColorSpace;
  const s = new T.Scene(); s.add(new T.HemisphereLight('#fff1dc', '#6a5038', 2.4)); const dl = new T.DirectionalLight('#ffe2b8', 1.6); dl.position.set(-2, 4, -4); s.add(dl);
  const k = new T.PerspectiveCamera(30, 152 / 192, 0.1, 30); k.position.set(-2.6, 2.9, -4.4); k.lookAt(0, 2.15, 0);
  const l = {};
  MODELLER.forEach((m, i) => {
    const c = biniciModeli({ model: m.id, ...m.avatar }, [['#8a5a32', '#3a2618'], ['#d2ad72', '#f3e9d2'], ['#3a3330', '#141110']][i % 3]);
    c.silah(i % 3); c.guncelle(0.016, 0, -0.5, -0.1, 3); s.add(c.grup); r.render(s, k); l[m.id] = r.domElement.toDataURL(); s.remove(c.grup);
  });
  r.dispose(); return l;
}
function anaEkranKur() {
  let resim = {}; try { resim = portreler(); } catch { /* portre yoksa yalnız ad */ }
  const kutu = $('karakterler');
  for (const m of MODELLER) {
    const b = document.createElement('button'); b.className = 'kart'; b.setAttribute('role', 'radio'); b.dataset.v = m.id; b.title = m.ad;
    b.innerHTML = (resim[m.id] ? `<img alt="" src="${resim[m.id]}">` : '') + `<span>${m.ad}</span>`;
    b.onclick = () => { secim.model = m.id; sakla.yaz('model', m.id); kartlar(); };
    kutu.append(b);
  }
  const kartlar = () => { for (const b of kutu.children) b.setAttribute('aria-checked', b.dataset.v === secim.model ? 'true' : 'false'); };
  kartlar();
  $('ad').value = secim.ad;
  $('ad').oninput = () => { const a = adDuzelt($('ad').value); if (a) { secim.ad = a; sakla.yaz('ad', a); } };
  const z = $('zorluk'), yenile = () => { for (const b of z.children) b.classList.toggle('secili', b.dataset.v === secim.zorluk); };
  for (const b of z.children) b.onclick = () => { secim.zorluk = b.dataset.v; sakla.yaz('zorluk', b.dataset.v); yenile(); };
  yenile();
  if (matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches) $('dokunmatik-uyari').hidden = false;
}

// ——— Ses, yardım, menü düğmeleri ———
function sesYaz() { for (const id of ['sound', 'pause-sound']) { $(id).textContent = 'Ses: ' + (sesAcik() ? 'açık' : 'kapalı'); $(id).classList.toggle('muted', !sesAcik()); } }
for (const id of ['sound', 'pause-sound']) $(id).onclick = () => { sesAyarla(!sesAcik()); sesYaz(); };
sesYaz();
const yardimAc = () => { if (!$('help-dialog').open) $('help-dialog').showModal(); };
$('help').onclick = yardimAc; $('pause-help').onclick = yardimAc;
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => b.closest('dialog').close();
$('brand').onclick = e => e.preventDefault();
$('hassasiyet').value = hassas; $('hassasiyet-deger').textContent = hassas.toFixed(2).replace('.', ',');
$('hassasiyet').oninput = () => { hassas = +$('hassasiyet').value; sakla.yaz('hassas', hassas); $('hassasiyet-deger').textContent = hassas.toFixed(2).replace('.', ','); };

// ——— Ana ekran arka planı: botlar koşar ve çatışır, kamera sırayla birinin peşine takılır ———
let demo = null, demoBirikim = 0, demoTakip = 1, demoT = 0;
const demoKam = new T.Vector3(), demoBak = new T.Vector3(), demoHedef = new T.Vector3(), demoHedef2 = new T.Vector3();
const demoOnce = new Map(), demoAra = new Map();
const BOS_DUNYA = { k: [], g: [], m: [], c: [], d: [], n: [] };
function demoBaslat() {
  demo = new Mac({}); demo.botlariDuzenle(); demo.olaylar.length = 0;
  for (const o of demo.oyuncular.values()) gor.oyuncuKur('d' + o.id, o.avatar, o.atRenk);
  for (let i = 0; i < 25 * MAC.tik; i++) demo.adim(1 / MAC.tik);
  demo.olaylar.length = 0; demoT = 0; demoOnce.clear(); demoAra.clear(); demoKam.set(0, 0, 0);
}
function demoDurdur() { if (!demo) return; for (const o of demo.oyuncular.values()) gor.oyuncuSil('d' + o.id); gor.dunyaGuncelle(BOS_DUNYA, 0); demo = null; }
function demoAdim(dt, z) {
  // Benzetim 30 Hz, çizim ekran hızında: önceki ve son adım arasında ara konumda çiz (yoksa atlar ve kamera kesik kesik ilerler)
  demoBirikim = Math.min(demoBirikim + dt, 0.2);
  while (demoBirikim >= 1 / MAC.tik) {
    demoBirikim -= 1 / MAC.tik;
    for (const o of demo.oyuncular.values()) demoOnce.set(o.id, [o.x, o.y, o.z, o.yaw]);
    demo.adim(1 / MAC.tik);
  }
  const ar = demoBirikim * MAC.tik, sn = demo.ozet();
  for (const a of sn.o) {
    const p = demoOnce.get(a[0]);
    if (p && Math.hypot(a[1] - p[0], a[3] - p[2]) < 4) {
      a[1] = p[0] + (a[1] - p[0]) * ar; a[2] = p[1] + (a[2] - p[1]) * ar; a[3] = p[2] + (a[3] - p[2]) * ar;
      a[4] = p[3] + Math.atan2(Math.sin(a[4] - p[3]), Math.cos(a[4] - p[3])) * ar;
    }
    demoAra.set(a[0], a);
    gor.oyuncuGuncelle('d' + a[0], [a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[10]], dt);
  }
  gor.dunyaGuncelle(sn, z);
  for (const { m } of demo.olaylar) {
    if (m.t === 'ates') atesGorseli(m, 'd');
    else if (m.t === 'patla') gor.patlama(new T.Vector3(m.x, m.y, m.z), m.a);
    else if (m.t === 'kement') kementGorseli(m, 'd');
  }
  demo.olaylar.length = 0;
  if ((demoT -= dt) <= 0) { demoT = 9; const l = [...demo.oyuncular.values()].filter(o => o.canli); demoTakip = l[Math.floor(Math.random() * l.length)]?.id ?? 1; demoKam.set(0, 0, 0); }
  const d = demoAra.get(demoTakip); if (!d) return;
  const [, ox, oy, oz, oyaw] = d, ilk = demoKam.lengthSq() === 0;
  const a = oyaw + Math.PI * 0.82 + Math.sin(z * 0.15) * 0.5;
  demoHedef.set(ox + Math.sin(a) * 9.5, oy + 3.8, oz + Math.cos(a) * 9.5);
  const bak = demoHedef2.set(ox - Math.sin(oyaw) * 4, oy + 1.6, oz - Math.cos(oyaw) * 4);
  // Kamera ve bakış noktası yumuşak izler: botun ani dönüşleri ekranı sarsmasın
  if (ilk) { demoKam.copy(demoHedef); demoBak.copy(bak); }
  else { demoKam.lerp(demoHedef, 1 - Math.exp(-dt * 2.5)); demoBak.lerp(bak, 1 - Math.exp(-dt * 6)); }
  gor.kamera.position.copy(demoKam); gor.kamera.lookAt(demoBak); gor.fov = 60;
}

// ——— Oyun durumu ———
let bag = null, oyun = null;
const ben = { ...atDurumu(), bakis: 0, pitch: -0.12, canli: false, can: MAC.can, zirh: 0, sal: SALDIRI.map(() => 0), sav: SAVUNMA.map(() => 0), salSec: -1, savSec: -1,
  sonAtis: SALDIRI.map(() => -99), sonSavun: -99, sonGonder: 0, nalT: 0, sallanma: 0, fovEk: 0, tepme: 0, sars: 0, bagId: null };
const tus = new Set(), fare = { sol: false, sag: false };
let ziplaIstek = false, kilitli = false, menuAcik = false, skorGoster = false;

function oyunBaslat(baglanti) {
  demoDurdur();
  bag = baglanti;
  oyun = { benId: null, roster: new Map(), kalan: MAC.sure, kalanZ: simdi(), durum: 'oyun', snaps: [], fark: null, sk: [], sonBitis: 0, birikim: 0, olumZ: 0, olen: null, aranan: null, kod: null };
  document.body.classList.add('oyunda');
  $('ana').hidden = true; $('oyun-ui').hidden = false; $('son').hidden = true; $('olum').hidden = true; $('lesler').innerHTML = '';
  $('menu-ust').textContent = bag.yerel ? 'BOTLU KOŞU DURAKLATILDI' : 'ÇEVRİM İÇİ · KOŞU SÜRÜYOR';
  $('back-home').textContent = bag.yerel ? 'Ana menü' : 'Odadan çık';
  $('oda-satir').hidden = true;
  sesBaslat(); cal('basla', 0.7);
  kilitle();
}
function oyunBitir() {
  if (!oyun) return;
  if (bag && !bag.yerel) bag.gonder({ t: 'cik' }); else bag?.kapat();
  for (const id of [...gor.oyuncular.keys()]) gor.oyuncuSil(id);
  gor.dunyaGuncelle(BOS_DUNYA, 0);
  bag = null; oyun = null; ben.canli = false;
  document.body.classList.remove('oyunda', 'kilitli', 'sahlan', 'yarali');
  $('oyun-ui').hidden = true; $('ana').hidden = false; $('etiketler').innerHTML = ''; etiketDiv.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  if (location.search.includes('oda=')) history.replaceState(null, '', location.pathname);
  menuKapat(); demoBaslat(); lobiYenile();
}
$('oyna').onclick = () => oyunBaslat(yerelBaglanti({ ad: secim.ad, avatar: avatarim(), zorluk: secim.zorluk }));

// ——— Odadan gelenler ———
const adi = id => id == null ? '' : (oyun?.roster.get(id)?.ad ?? '?');
function isle(m) {
  switch (m.t) {
    case 'hosgeldin':
      oyun.benId = m.id; oyun.kod = m.kod;
      if (m.kod) { $('oda-satir').hidden = false; $('oda-kod').textContent = m.kod; history.replaceState(null, '', '?oda=' + m.kod); }
      break;
    case 'liste': {
      const yeni = new Map(m.o.map(([id, ad, avatar, bot, atRenk]) => [id, { ad, avatar, bot, atRenk }]));
      for (const id of oyun.roster.keys()) if (!yeni.has(id)) gor.oyuncuSil(id);
      for (const [id, r] of yeni) if (!oyun.roster.has(id)) gor.oyuncuKur(id, r.avatar, r.atRenk);
      oyun.roster = yeni; break;
    }
    case 's': {
      const hedef = m.z - simdi();
      oyun.fark = oyun.fark == null || hedef > oyun.fark ? hedef : oyun.fark + (hedef - oyun.fark) * 0.03;
      oyun.snaps.push({ z: m.z, o: new Map(m.o.map(a => [a[0], a])), sn: m }); if (oyun.snaps.length > 40) oyun.snaps.shift();
      oyun.kalan = m.kalan; oyun.kalanZ = simdi(); oyun.sk = m.sk;
      const b = m.o.find(a => a[0] === oyun.benId);
      if (b && !(b[7] & 1) && ben.canli) olunce();
      break;
    }
    case 'env': ben.sal = m.sal; ben.sav = m.sav; ben.salSec = m.ss; ben.savSec = m.vs; ben.can = m.can; ben.zirh = m.zirh; break;
    case 'dogus':
      Object.assign(ben, atDurumu(), { x: m.x, y: m.y, z: m.z, yaw: m.yaw, bakis: m.yaw, pitch: -0.12, s: m.s, u: m.u, enIleri: m.u, canli: true, can: MAC.can, bagId: null });
      $('olum').hidden = true; oyun.olen = null; document.body.classList.remove('yarali');
      if (m.nokta > 0) mesaj(`${m.nokta % MAC.noktaSayisi}. KAPIDAN ÇIKTIN`, 'Silah kutularına koş');
      break;
    case 'duzelt': ben.x = m.x; ben.y = m.y; ben.z = m.z; ben.hiz = 0; break;
    case 'etki':
      if (m.tur === 'topal') { ben.topalT = m.sure; mesaj('ÇİVİ!', 'Atın topallıyor'); cal('civi', 0.7); }
      else if (m.tur === 'mahmuz') { ben.mahmuzT = m.sure; ben.bagT = 0; ben.dayanim = AT.dayanim; }
      else if (m.tur === 'bag') { ben.bagT = m.sure; ben.bagId = m.cek; mesaj('KEMENTLENDİN', `${adi(m.cek)} seni çekiyor · mahmuz çözer`); }
      break;
    case 'nokta': cal('nokta', 0.6); mesaj(m.n === 0 ? 'KARA NAL KAPISI' : `${m.n}. KAPI`, 'Yeni doğuş yerin'); break;
    case 'sahlan': { const v = gor.oyuncular.get(m.id); if (v) calKonum('sahlan', v.x, v.y, v.z, dinleyici(), 50); break; }
    case 'isabet': {
      const i = $('isabet'); i.className = ''; void i.offsetWidth; i.className = 'vur' + (m.k ? ' kafa' : '') + (m.o ? ' olu' : '');
      cal(m.k ? 'kafa' : 'isabet', 0.9); gor.oyuncular.get(m.h)?.k.vuruldu(); break;
    }
    case 'yara': {
      cal(ben.zirh > 0 ? 'zirh' : 'yara', 0.8); ben.can = m.can;
      document.body.classList.add('yarali'); clearTimeout(oyun.yaraT); oyun.yaraT = setTimeout(() => document.body.classList.remove('yarali'), 220);
      gor.oyuncular.get(oyun.benId)?.k.vuruldu();
      if (m.x != null) { const a = Math.atan2(-(m.x - ben.x), -(m.z - ben.z)), y = $('yara-yon'); y.style.transform = `rotate(${(-aci(a - ben.bakis)) * 180 / Math.PI}deg)`; y.classList.remove('var'); void y.offsetWidth; y.classList.add('var'); }
      break;
    }
    case 'les': lesYaz(m); break;
    case 'ates': atesGorseli(m); break;
    case 'kement': kementGorseli(m); { const v = gor.oyuncular.get(m.a); if (v && m.a !== oyun.benId) calKonum('kement', v.x, v.y, v.z, dinleyici(), 50); } break;
    case 'savun': { const v = gor.oyuncular.get(m.id), S = SAVUNMA[m.s]; if (v && S && m.id !== oyun.benId) calKonum(S.id, v.x, v.y, v.z, dinleyici(), 45); break; }
    case 'patla': { gor.patlama(new T.Vector3(m.x, m.y, m.z), m.a); calKonum('patla', m.x, m.y, m.z, dinleyici(), 110); const u = Math.hypot(m.x - ben.x, m.z - ben.z); if (u < 14) ben.sars = Math.max(ben.sars, 1 - u / 14); break; }
    case 'al': {
      cal('al', 0.7); const S = m.tur === 'sal' ? SALDIRI[m.i] : SAVUNMA[m.i];
      mesaj('+ ' + S.ad.toLocaleUpperCase('tr'), m.tur === 'sal' ? `${m.c} ${m.i === 3 ? 'kement' : m.i === 4 ? 'dinamit' : 'mermi'} · sol tık` : `${m.c} adet · ${m.i + 1} ile seç, sağ tık`);
      break;
    }
    case 'kutu': calKonum('al', m.x, m.y, m.z, dinleyici(), 25); break;
    case 'ganimet': cal('ganimet', 0.8); mesaj('GANİMET', 'Düşenin eşyaları senin'); break;
    case 'aranan': oyun.aranan = m.id; cal('aranan', 0.6); if (m.id === oyun.benId) mesaj('ARANAN SENSİN', `Seni düşürene +${PUAN.aranan} ödül`); else mesaj(`${adi(m.id).toLocaleUpperCase('tr')} ARANIYOR`, `Düşürene +${PUAN.aranan} ödül`); break;
    case 'son': sonGoster(m); break;
    case 'basla': $('son').hidden = true; oyun.durum = 'oyun'; oyun.aranan = null; cal('basla', 0.7); mesaj('YENİ KOŞU', 'Herkes başlangıçta, eller boş'); break;
    case 'lobi': lobiIsle(m); break;
    case 'hata': toast(m.m); if (bag && !bag.yerel && oyun && !oyun.benId) oyunBitir(); break;
  }
}
const dinleyici = () => ({ x: ben.x, y: ben.y, z: ben.z, yaw: ben.bakis });

/** Mermi görünüşleri (hız blok/sn). */
const MERMI = { tabanca: { renk: '#ffd27a', hiz: 160, kalin: 0.06, uzun: 1.4 }, cifte: { renk: '#ffc061', hiz: 120, kalin: 0.05, uzun: 0.8 }, tufek: { renk: '#ffe7b0', hiz: 280, kalin: 0.08, uzun: 2.6, iz: 0.4 }, kement: { renk: '#c9a66b', hiz: 60, kalin: 0.05, uzun: 1.5, iz: 0 } };
function atesGorseli(m, onEk = '') {
  if (!onEk && m.id === oyun?.benId) return; // kendi atışımı zaten çizdim
  const v = gor.oyuncular.get(onEk + m.id); if (!v) return;
  const S = SALDIRI[m.s]; if (!S) return;
  v.k.ates();
  if (!onEk) calKonum(S.id, v.x, v.y + 2, v.z, dinleyici(), S.id === 'tufek' ? 150 : 90);
  if (!m.u?.length) return;
  v.k.grup.updateMatrixWorld(true);
  const a = v.k.namlu(new T.Vector3());
  for (const u of m.u) { const b = new T.Vector3(u[0], u[1], u[2]); gor.mermiUcur(a, b, { ...MERMI[S.id], vardi: () => gor.kivilcim(b, '#d8cfbc', 3) }); }
}
function kementGorseli(m, onEk = '') {
  const a = gor.oyuncular.get(onEk + m.a), h = gor.oyuncular.get(onEk + m.h); if (!a || !h) return;
  gor.ip(v => { if (!a.canli) return false; v.set(a.x, a.y + 2, a.z); return true; }, v => { if (!h.canli) return false; v.set(h.x, h.y + 1.9, h.z); return true; }, m.sure);
}

const SILAH_AD = { carp: 'ÇARPIŞMA', mayin: 'MAYIN', civi: 'ÇİVİ', ...Object.fromEntries(SALDIRI.map(s => [s.id, s.ad.toLocaleUpperCase('tr')])) };
function lesYaz(m) {
  const d = document.createElement('div'); d.className = 'les' + (m.o === oyun.benId || m.h === oyun.benId ? ' benim' : '');
  d.innerHTML = m.o == null ? '<span></span><span class="s"></span>' : `<span></span><span class="s"></span><span></span>${m.k ? '<span class="kafa">◎</span>' : ''}${m.ar ? '<span class="ar">★</span>' : ''}`;
  const sp = d.querySelectorAll('span');
  if (m.o == null) { sp[0].textContent = adi(m.h); sp[1].textContent = (SILAH_AD[m.s] ? SILAH_AD[m.s] + ' · ' : '') + 'DÜŞTÜ'; } else { sp[0].textContent = adi(m.o); sp[1].textContent = SILAH_AD[m.s] ?? ''; sp[2].textContent = adi(m.h); }
  $('lesler').prepend(d); while ($('lesler').children.length > 6) $('lesler').lastChild.remove(); setTimeout(() => d.remove(), 5000);
  if (m.o === oyun.benId && m.h !== oyun.benId) {
    cal('les');
    const SERI = { 3: 'ÜÇLEME', 5: 'KARA NAL EFSANESİ' };
    if (m.ar) mesaj('ARANANI DÜŞÜRDÜN', `+${m.puan} puan`);
    else if (SERI[m.seri]) { cal('seri'); mesaj(SERI[m.seri], `${m.seri} üst üste · +${m.puan} puan`); }
    else mesaj(m.k ? 'KAFADAN!' : 'DÜŞÜRDÜN', `${adi(m.h)} · +${m.puan} puan`);
  }
  if (m.h === oyun.benId) { oyun.olen = m.o; $('olum-baslik').textContent = m.o == null ? (m.s === 'carp' ? 'Engele çarptın.' : 'Kendi tuzağına düştün.') : `${adi(m.o)} seni ${SILAH_AD[m.s]?.toLocaleLowerCase('tr') ?? ''} ile düşürdü.`; }
}
function olunce() {
  ben.canli = false; oyun.olumZ = simdi(); cal('olum', 0.8);
  $('olum').hidden = false; fare.sol = fare.sag = false;
  if (!oyun.olen) $('olum-baslik').textContent = 'Attan düştün.';
  $('olum-kapi').textContent = `Son kapın: ${Math.floor(ben.enIleri / (P.L / MAC.noktaSayisi)) % MAC.noktaSayisi}. Önde mi arkada mı çıkacaksın, bilemezsin. Eşyaların yerde kaldı.`;
}
function sonGoster(m) {
  oyun.durum = 'son'; oyun.sonBitis = simdi() + m.bekle;
  $('son-baslik').textContent = m.kazanan === oyun.benId ? 'Kara Nal senin!' : `${adi(m.kazanan)} kazandı.`;
  $('son-satir').innerHTML = m.l.map(([id, puan, les, olum], i) => satir(i + 1, id, puan, les, olum)).join('');
  $('son').hidden = false;
}
const satir = (no, id, puan, les, olum) => { const r = oyun.roster.get(id); return `<tr class="${id === oyun.benId ? 'ben' : ''}"><td>${no}</td><td>${kacis(r?.ad ?? '?')}${r?.bot ? '<span class="bot">BOT</span>' : ''}${oyun.aranan === id ? '<span class="arn">ARANAN</span>' : ''}</td><td>${puan}</td><td>${les}</td><td>${olum}</td></tr>`; };
let mesajT = 0;
function mesaj(baslik, alt = '') { const e = $('mesaj'); e.innerHTML = ''; e.append(baslik); if (alt) { const s = document.createElement('small'); s.textContent = alt; e.append(s); } e.className = ''; void e.offsetWidth; e.className = 'goster'; clearTimeout(mesajT); mesajT = setTimeout(() => { e.className = ''; }, 1900); }
let toastT = 0;
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 3200); }

// ——— Silahlar ———
const nisanV = new T.Vector3(), kamYon = new T.Vector3();
/** Nişangâhın gösterdiği nokta: kameradan ışın; binici, engel ya da zemine çarptığı yer (yoksa 200 blok ötesi). */
function nisanNoktasi() {
  const k = gor.kamera, o = [k.position.x, k.position.y, k.position.z]; k.getWorldDirection(kamYon); const d = [kamYon.x, kamYon.y, kamYon.z];
  let en = Math.min(engeleIsin(o, d, 200), zemineIsin(o, d, ben.s, 200));
  for (const [id, v] of gor.oyuncular) { if (id === oyun.benId || !v.canli) continue; const h = biniciyeIsin(o, d, v.x, v.y, v.z, v.yaw, en); if (h) en = h.t; }
  return nisanV.set(o[0] + d[0] * en, o[1] + d[1] * en, o[2] + d[2] * en);
}
function silahSec(i) {
  if (!SALDIRI[i] || ben.sal[i] <= 0 || i === ben.salSec) return;
  ben.salSec = i; bag.gonder({ t: 'sec', s: i }); cal('bos', 0.4);
}
function savunmaSec(i) {
  if (!SAVUNMA[i] || ben.sav[i] <= 0) { if (SAVUNMA[i]) toast(`${SAVUNMA[i].ad} yok: mavi kutulardan çıkar.`); return; }
  ben.savSec = i; bag.gonder({ t: 'vsec', s: i }); cal('bos', 0.4);
}
function atesDene(zaman) {
  if (!fare.sol || !ben.canli || menuAcik || !kilitli || oyun.durum !== 'oyun') return;
  const i = ben.salSec, S = SALDIRI[i];
  if (!S || ben.sal[i] <= 0) { if (ben.tetikHazir !== false) { cal('bos', 0.6); toast('Elin boş: kırmızı kutulardan silah topla.'); } ben.tetikHazir = false; return; }
  if (zaman - ben.sonAtis[i] < S.aralik) return;
  ben.sonAtis[i] = zaman; ben.sal[i]--; ben.tetikHazir = false;
  const b = [ben.x, ben.y + GOZ, ben.z], h = nisanNoktasi(), dd = [h.x - b[0], h.y - b[1], h.z - b[2]], l = Math.hypot(...dd) || 1, d = dd.map(v => v / l), tohum = (Math.random() * 2 ** 31) | 0;
  bag.gonder({ t: 'ates', s: i, b, d, r: tohum, zt: cizimZamani() });
  gor.oyuncular.get(oyun.benId)?.k.ates(); cal(S.id, 0.8); ben.tepme = S.id === 'tufek' ? 1 : S.id === 'cifte' ? 0.8 : 0.4;
  // Kendi mermilerimi hemen çiz (oda aynı tohumla hesaplar)
  if (S.menzil) {
    const r = tohumlu(tohum), v = gor.oyuncular.get(oyun.benId); v?.k.grup.updateMatrixWorld(true);
    const bas = v ? v.k.namlu(new T.Vector3()) : new T.Vector3(...b);
    for (let k = 0; k < (S.sacma || 1); k++) {
      const y = saptir(d, S.sacilma, r); let en = Math.min(engeleIsin(b, y, S.menzil), zemineIsin(b, y, ben.s, S.menzil)), vurdu = false;
      for (const [id, w] of gor.oyuncular) { if (id === oyun.benId || !w.canli) continue; const t = biniciyeIsin(b, y, w.x, w.y, w.z, w.yaw, en); if (t) { en = t.t; vurdu = true; } }
      const uc = new T.Vector3(b[0] + y[0] * en, b[1] + y[1] * en, b[2] + y[2] * en);
      gor.mermiUcur(bas, uc, { ...MERMI[S.id], vardi: en < S.menzil - 0.01 ? () => (vurdu ? gor.kan(uc) : gor.kivilcim(uc, '#d8cfbc', 4)) : null });
    }
  }
  if (ben.sal[i] <= 0) { const n = ben.sal.findIndex(c => c > 0); if (n >= 0) silahSec(n); }
}
function savunDene(zaman) {
  if (!fare.sag) return;
  fare.sag = false;
  if (!ben.canli || menuAcik || !kilitli || oyun.durum !== 'oyun') return;
  const i = ben.savSec;
  if (i < 0 || ben.sav[i] <= 0) { cal('bos', 0.6); toast('Savunma eşyan yok: mavi kutulardan topla.'); return; }
  if (zaman - ben.sonSavun < 0.45) return;
  ben.sonSavun = zaman; ben.sav[i]--;
  bag.gonder({ t: 'savun', s: i }); cal(SAVUNMA[i].id, 0.8);
  if (SAVUNMA[i].id === 'yelek') mesaj('ÇELİK YELEK', `${SAVUNMA[i].zirh} zırh`);
  if (ben.sav[i] <= 0) { const n = ben.sav.findIndex(c => c > 0); if (n >= 0) savunmaSec(n); }
}
const cizimZamani = () => oyun?.fark == null ? 0 : simdi() + oyun.fark - (bag?.yerel ? 1 / MAC.tik : 0.1);

// ——— Giriş ———
const tuval = $('sahne');
function kilitle() { if (!oyun) return; try { const p = tuval.requestPointerLock(); p?.catch?.(() => { try { tuval.requestPointerLock(); } catch { /* yok */ } }); } catch { try { tuval.requestPointerLock(); } catch { /* yok */ } } }
document.addEventListener('pointerlockchange', () => {
  kilitli = document.pointerLockElement === tuval;
  document.body.classList.toggle('kilitli', kilitli);
  if (kilitli) { menuKapat(); $('kilit').hidden = true; }
  else if (oyun) { tus.clear(); fare.sol = fare.sag = false; if (!$('help-dialog').open) menuAc(); }
});
document.addEventListener('pointerlockerror', () => { if (oyun) $('kilit').hidden = false; });
$('kilit').onclick = () => kilitle();
tuval.addEventListener('click', () => { if (oyun && !kilitli && !menuAcik) kilitle(); });
function menuAc() { if (!oyun || menuAcik) return; menuAcik = true; if (!$('menu-dialog').open) $('menu-dialog').showModal(); }
function menuKapat() { menuAcik = false; if ($('menu-dialog').open) $('menu-dialog').close(); }
$('menu-dialog').addEventListener('cancel', e => { e.preventDefault(); devam(); });
function devam() { menuKapat(); $('kilit').hidden = true; kilitle(); setTimeout(() => { if (oyun && !kilitli && !menuAcik) $('kilit').hidden = false; }, 400); }
$('resume').onclick = devam;
$('back-home').onclick = () => oyunBitir();
$('help-dialog').addEventListener('close', () => { if (oyun && !kilitli && !menuAcik) menuAc(); });
$('oda-link').onclick = () => { const u = location.origin + location.pathname + '?oda=' + oyun?.kod; navigator.clipboard?.writeText(u).then(() => toast('Oda linki kopyalandı.'), () => toast(u)); };

addEventListener('keydown', e => {
  if (e.code === 'F1') { e.preventDefault(); yardimAc(); return; }
  if (!oyun || e.target.tagName === 'INPUT') return;
  if (e.code === 'Tab') { e.preventDefault(); skorGoster = true; return; }
  if (!kilitli) return;
  tus.add(e.code);
  if (e.code === 'Space') { if (!e.repeat) ziplaIstek = true; e.preventDefault(); }
  const d = /^Digit([1-5])$/.exec(e.code); if (d) savunmaSec(+d[1] - 1);
});
addEventListener('keyup', e => { tus.delete(e.code); if (e.code === 'Tab') skorGoster = false; });
addEventListener('blur', () => { tus.clear(); fare.sol = fare.sag = false; skorGoster = false; });
addEventListener('mousedown', e => { if (!kilitli || !oyun) return; if (e.button === 0) fare.sol = true; if (e.button === 2) fare.sag = true; });
addEventListener('mouseup', e => { if (e.button === 0) { fare.sol = false; ben.tetikHazir = true; } });
addEventListener('contextmenu', e => { if (oyun) e.preventDefault(); });
addEventListener('mousemove', e => {
  if (!kilitli) return;
  const k = 0.0022 * hassas * (gor.kamera.fov / 70);
  ben.bakis = aci(ben.bakis - e.movementX * k); ben.pitch = Math.max(-1.1, Math.min(0.9, ben.pitch - e.movementY * k));
});
addEventListener('wheel', e => {
  if (!kilitli || !oyun) return;
  const l = SALDIRI.map((_, i) => i).filter(i => ben.sal[i] > 0); if (!l.length) return;
  const i = l.indexOf(ben.salSec); silahSec(l[(i + (e.deltaY > 0 ? 1 : -1) + l.length) % l.length]);
}, { passive: true });

// ——— Her kare ———
function kendiAdim(dt, zaman) {
  if (!ben.canli) { ziplaIstek = false; return; }
  const aktif = kilitli && !menuAcik && oyun.durum === 'oyun';
  const ileri = aktif ? (tus.has('KeyW') ? 1 : 0) - (tus.has('KeyS') ? 1 : 0) : 0, sag = aktif ? (tus.has('KeyD') ? 1 : 0) - (tus.has('KeyA') ? 1 : 0) : 0;
  // WASD kameraya göre: ileri = bakış yönü, sağ = bakışın sağı
  const fx = -Math.sin(ben.bakis), fz = -Math.cos(ben.bakis), sx = Math.cos(ben.bakis), sz = -Math.sin(ben.bakis);
  let yx = fx * ileri + sx * sag, yz = fz * ileri + sz * sag; const u = Math.hypot(yx, yz); if (u > 0) { yx /= u; yz /= u; }
  const g = { yx, yz, dortnala: aktif && (tus.has('ShiftLeft') || tus.has('ShiftRight')), zipla: aktif && ziplaIstek };
  ziplaIstek = false;
  // Kement: çeken binicinin şimdiki yeri
  if (ben.bagT > 0) { const v = gor.oyuncular.get(ben.bagId); if (v?.canli) { ben.cekX = v.x; ben.cekZ = v.z; } else ben.bagT = 0; }
  let kalan = dt;
  while (kalan > 1e-5) {
    const h = Math.min(kalan, 1 / 60); kalan -= h;
    for (const o of atAdim(ben, g, h)) {
      if (o === 'geri') { cal('sahlan', 0.8); mesaj('GERİ DÖNÜŞ YOK', 'At şaha kalktı'); document.body.classList.add('sahlan'); setTimeout(() => document.body.classList.remove('sahlan'), 500); }
      else if (o === 'zipla') cal('zipla', 0.6); else if (o === 'kon') cal('kon', 0.7);
      else if (o === 'carp') { cal('kon', 1); ben.sars = 0.7; }
    }
    g.zipla = false;
  }
  for (const [id, v] of gor.oyuncular) if (id !== oyun.benId && v.canli && Math.abs(v.y - ben.y) < 1.5) itis(ben, v.x, v.z);
  if (ben.yerde && ben.hiz > 1 && (ben.nalT -= dt) <= 0) { ben.nalT = ben.dortnala ? 0.11 : 0.19; cal('nal', Math.min(0.55, 0.15 + ben.hiz * 0.025)); }
  atesDene(zaman); savunDene(zaman);
  if (zaman - ben.sonGonder >= 1 / MAC.tik) {
    ben.sonGonder = zaman;
    bag.gonder({ t: 'k', x: +ben.x.toFixed(3), y: +ben.y.toFixed(3), z: +ben.z.toFixed(3), yaw: +ben.yaw.toFixed(3), bakis: +ben.bakis.toFixed(3), pitch: +ben.pitch.toFixed(3), hiz: +ben.hiz.toFixed(2), b: benBit() });
  }
}
const benBit = () => (ben.yerde ? 2 : 0) | (ben.dortnala ? 4 : 0) | (ben.sahlanT > 0 ? 8 : 0);

function digerleriniCiz(dt, zaman) {
  const s = oyun.snaps;
  if (s.length) {
    const z = cizimZamani();
    let a = s[0], b = s[s.length - 1];
    for (let i = s.length - 1; i > 0; i--) if (s[i - 1].z <= z) { a = s[i - 1]; b = s[i]; break; }
    const t = b.z > a.z ? Math.max(0, Math.min(1.2, (z - a.z) / (b.z - a.z))) : 1;
    for (const id of gor.oyuncular.keys()) {
      if (id === oyun.benId) continue;
      const p = b.o.get(id), q = a.o.get(id) ?? p; if (!p) continue;
      const k = Math.hypot(p[1] - q[1], p[3] - q[3]) > 6 ? 1 : t;
      gor.oyuncuGuncelle(id, [q[1] + (p[1] - q[1]) * k, q[2] + (p[2] - q[2]) * k, q[3] + (p[3] - q[3]) * k, q[4] + aci(p[4] - q[4]) * k, q[5] + aci(p[5] - q[5]) * k, q[6] + (p[6] - q[6]) * k, p[7], p[8], p[10]], dt);
    }
    gor.dunyaGuncelle(s[s.length - 1].sn, zaman);
  }
  const sn = s[s.length - 1]?.o.get(oyun.benId);
  if (gor.oyuncular.has(oyun.benId)) gor.oyuncuGuncelle(oyun.benId, [ben.x, ben.y, ben.z, ben.yaw, ben.bakis, ben.pitch, (ben.canli ? 1 : 0) | benBit() | ((sn?.[7] ?? 0) & (16 | 256 | 512)) | (ben.mahmuzT > 0 ? 128 : 0), ben.hiz, ben.salSec], dt);
}

/** Üçüncü şahıs kamera: binicinin omzunun üstünden, bakış yönünde; dörtnalada görüş açılır. Düşünce yukarıdan bakar. */
const kamHedef = new T.Vector3(), kamIzle = { ilk: false, x: 0, y: 0, z: 0 };
function kamera(dt) {
  const k = gor.kamera;
  ben.sars = Math.max(0, ben.sars - dt * 2.5); ben.tepme = Math.max(0, ben.tepme - dt * 6);
  if (!ben.canli) {
    const ge = Math.min(1, (simdi() - oyun.olumZ) / 1.2), katil = oyun.olen != null ? gor.oyuncular.get(oyun.olen) : null;
    k.position.set(ben.x + Math.sin(ben.bakis) * (3 + ge * 4), ben.y + 2 + ge * 5, ben.z + Math.cos(ben.bakis) * (3 + ge * 4));
    if (katil) k.lookAt(katil.x, katil.y + 1.5, katil.z); else k.lookAt(ben.x, ben.y + 0.8, ben.z);
    gor.fov = 65; return;
  }
  const p0 = ben.pitch + ben.tepme * 0.03, cp = Math.cos(p0), yon = new T.Vector3(-Math.sin(ben.bakis) * cp, Math.sin(p0), -Math.cos(ben.bakis) * cp);
  ben.sallanma += dt * (3 + ben.hiz * 0.75);
  const salla = ben.yerde ? Math.min(1, ben.hiz / AT.dortnala) : 0, sars = ben.sars * 0.25;
  const hx = ben.x + Math.cos(ben.bakis) * 1.15, hy = ben.y + 3.25 + Math.abs(Math.sin(ben.sallanma)) * 0.035 * salla, hz = ben.z - Math.sin(ben.bakis) * 1.15;
  if (!kamIzle.ilk || Math.hypot(hx - kamIzle.x, hz - kamIzle.z) > 6) Object.assign(kamIzle, { ilk: true, x: hx, y: hy, z: hz });
  const kz = 1 - Math.exp(-dt * 28); kamIzle.x += (hx - kamIzle.x) * kz; kamIzle.y += (hy - kamIzle.y) * (1 - Math.exp(-dt * 14)); kamIzle.z += (hz - kamIzle.z) * kz;
  kamHedef.set(kamIzle.x + (Math.random() - 0.5) * sars, kamIzle.y + (Math.random() - 0.5) * sars, kamIzle.z);
  const uzak = 6.2 + salla * 0.6;
  k.position.copy(kamHedef).addScaledVector(yon, -uzak);
  const p = pistNoktasi(ben.s); k.position.y = Math.max(p.y + 0.6, Math.min(k.position.y, p.y + (p.bolum === 'tunel' ? 6.4 : 22)));
  k.lookAt(kamHedef.clone().addScaledVector(yon, 10));
  const hizOran = Math.max(0, Math.min(1.4, (ben.hiz - AT.tiris) / (AT.dortnala - AT.tiris)));
  ben.fovEk += (hizOran * 11 - ben.fovEk) * Math.min(1, dt * 5);
  gor.fov = 68 + ben.fovEk;
  const ruzgar = Math.round(Math.min(1, hizOran) * 20) / 20;
  if (hudOnce.ruzgar !== ruzgar) { hudOnce.ruzgar = ruzgar; $('ruzgar').style.opacity = ruzgar; $('ruzgar').classList.toggle('mahmuz', ben.mahmuzT > 0); }
}

// ——— Göstergeler ———
const hudOnce = {};
const yaz = (id, v) => { if (hudOnce[id] !== v) { hudOnce[id] = v; $(id).textContent = v; } };
const html = (id, v) => { if (hudOnce[id] !== v) { hudOnce[id] = v; $(id).innerHTML = v; } };
const cubuk = (id, v) => { v = Math.round(v); if (hudOnce[id] !== v) { hudOnce[id] = v; $(id).style.width = v + '%'; } };
function gostergeler() {
  yaz('can', String(Math.max(0, Math.ceil(ben.can))));
  cubuk('can-bar', Math.max(0, ben.can)); cubuk('zirh-bar', Math.min(100, ben.zirh / 60 * 100));
  $('can-kutu').classList.toggle('dusuk', ben.can < 35);
  yaz('hiz', String(Math.round(ben.hiz)));
  cubuk('dayanim-bar', ben.dayanim / AT.dayanim * 100);
  $('can-kutu').classList.toggle('yorgun', ben.yorgun);
  html('etkiler', [ben.dortnala ? '<span class="acik">⇧ DÖRTNALA</span>' : ben.yorgun ? '<span class="bekle">⇧ YORGUN</span>' : '<span>⇧ DÖRTNALA</span>', ben.mahmuzT > 0 ? '<span class="acik">MAHMUZ</span>' : '', ben.topalT > 0 ? '<span class="kotu">TOPAL</span>' : '', ben.bagT > 0 ? '<span class="kotu">KEMENTLİ</span>' : '', ben.zirh > 0 ? `<span class="acik">YELEK ${Math.round(ben.zirh)}</span>` : ''].join(''));
  // Eşyalar: üstte saldırı (tekerlek), altta savunma (1–5)
  html('saldiri', SALDIRI.map((s, i) => `<span class="${i === ben.salSec ? 'secili' : ''}${ben.sal[i] > 0 ? '' : ' yok'}">${s.ad}<b>${ben.sal[i]}</b></span>`).join(''));
  html('savunma', SAVUNMA.map((s, i) => `<span class="${i === ben.savSec ? 'secili' : ''}${ben.sav[i] > 0 ? '' : ' yok'}"><kbd>${i + 1}</kbd>${s.ad}<b>${ben.sav[i]}</b></span>`).join(''));
  const S = SALDIRI[ben.salSec];
  yaz('silah-ad', S ? S.ad.toLocaleUpperCase('tr') : 'ELLERİN BOŞ');
  yaz('cephane', S ? String(ben.sal[ben.salSec]) : '—');
  const kalan = Math.max(0, oyun.kalan - (oyun.durum === 'oyun' ? simdi() - oyun.kalanZ : 0));
  yaz('sure', `${Math.floor(kalan / 60)}:${String(Math.floor(kalan % 60)).padStart(2, '0')}`);
  const p = pistNoktasi(ben.s), kapi = Math.floor(ben.enIleri / (P.L / MAC.noktaSayisi)) % MAC.noktaSayisi;
  yaz('bolum', (BOLUM_AD[p.bolum] ?? '').toLocaleUpperCase('tr')); yaz('kapi', `KAPI ${kapi}`);
  const sira = oyun.sk.findIndex(r => r[0] === oyun.benId), benim = oyun.sk[sira], lider = oyun.sk.find(r => r[0] !== oyun.benId);
  html('skorlar', `<span class="ben">Sen ${benim?.[1] ?? 0}</span><span>${sira + 1}. / ${oyun.sk.length || MAC.kisi}</span>${lider ? `<span>${kacis(adi(lider[0]))} ${lider[1]}</span>` : ''}`);
  if (!ben.canli && oyun.durum === 'oyun') yaz('olum-sayac', `Yeniden doğuş ${Math.max(0, Math.ceil(MAC.dogusBekle - (simdi() - oyun.olumZ)))}`);
  if (oyun.durum === 'son') yaz('son-sayac', `Yeni koşu ${Math.max(0, Math.ceil(oyun.sonBitis - simdi()))} saniye sonra`);
  $('skor-tablo').hidden = !skorGoster || oyun.durum === 'son';
  if (skorGoster) html('skor-satir', oyun.sk.map(([id, puan, les, olum], i) => satir(i + 1, id, puan, les, olum)).join(''));
  $('nisangah').classList.toggle('gizli', !ben.canli);
  haritaCiz();
  etiketler();
}

// İsim etiketleri: nişangâhtaki binici ve aranan (her zaman, uzaktan da)
const etiketDiv = new Map(), v3 = new T.Vector3();
function etiketler() {
  let hedef = null;
  if (ben.canli) { const k = gor.kamera, o = [k.position.x, k.position.y, k.position.z]; k.getWorldDirection(kamYon); const d = [kamYon.x, kamYon.y, kamYon.z]; let en = 160; for (const [id, v] of gor.oyuncular) { if (id === oyun.benId || !v.canli) continue; const h = biniciyeIsin(o, d, v.x, v.y, v.z, v.yaw, en); if (h) { en = h.t; hedef = id; } } }
  const son = oyun.snaps[oyun.snaps.length - 1], gorunen = new Set();
  for (const [id, v] of gor.oyuncular) {
    if (id === oyun.benId || !v.canli) continue;
    const ar = !!(v.bit & 256); if (id !== hedef && !ar) continue;
    v3.set(v.x, v.y + 3.1, v.z).project(gor.kamera); if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) continue;
    gorunen.add(id);
    let e = etiketDiv.get(id); if (!e) { e = document.createElement('div'); e.innerHTML = '<em></em><span></span><i><b></b></i>'; $('etiketler').append(e); etiketDiv.set(id, e); }
    e.className = 'etiket' + (ar ? ' aranan' : ''); e.querySelector('em').textContent = ar ? '★ ARANAN' : ''; e.querySelector('span').textContent = adi(id);
    e.querySelector('b').style.width = (son?.o.get(id)?.[9] ?? 100) + '%'; e.querySelector('i').hidden = id !== hedef;
    e.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; e.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
  }
  for (const [id, e] of etiketDiv) if (!gorunen.has(id)) { e.remove(); etiketDiv.delete(id); }
}

// Mini harita: pist şeridi, kapılar, biniciler (sen altın, aranan kırmızı, öbürleri krem)
const hc = $('harita').getContext('2d'), [hx0, hz0, hx1, hz1] = sinir();
const hOlcek = Math.min(200 / (hx1 - hx0 + 24), 150 / (hz1 - hz0 + 24)), hm = (x, z) => [110 + (x - (hx0 + hx1) / 2) * hOlcek, 85 + (z - (hz0 + hz1) / 2) * hOlcek];
const pistResmi = (() => {
  const c = document.createElement('canvas'); c.width = 220; c.height = 170; const g = c.getContext('2d');
  g.lineJoin = 'round'; g.strokeStyle = '#6f5034'; g.lineWidth = 16 * hOlcek; g.beginPath();
  for (let i = 0; i <= P.N; i += 2) { const [x, y] = hm(P.x[i % P.N], P.z[i % P.N]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
  noktalar(MAC.noktaSayisi).forEach((s, n) => { const p = pistNoktasi(s), [x, y] = hm(p.x, p.z); g.fillStyle = n === 0 ? '#e0a54a' : '#c2b39c'; g.fillRect(x - 2, y - 2, 4, 4); });
  return c;
})();
function haritaCiz() {
  hc.clearRect(0, 0, 220, 170); hc.drawImage(pistResmi, 0, 0);
  for (const [id, v] of gor.oyuncular) { if (id === oyun.benId || !v.canli) continue; const [x, y] = hm(v.x, v.z); hc.fillStyle = v.bit & 256 ? '#ff5a3c' : '#efe2c2'; hc.beginPath(); hc.arc(x, y, v.bit & 256 ? 3.6 : 2.6, 0, 7); hc.fill(); }
  const [x, y] = hm(ben.x, ben.z); hc.save(); hc.translate(x, y); hc.rotate(-ben.yaw); hc.fillStyle = '#ffcf5a'; hc.beginPath(); hc.moveTo(0, -6); hc.lineTo(4, 4); hc.lineTo(-4, 4); hc.closePath(); hc.fill(); hc.restore();
}

// ——— Çevrim içi: lobi ———
let lobiBag = null, lobiAcik = false, lobiDeneme = 0, lobiListe = { odalar: [], cevrimici: 0 };
function lobiBaglan() {
  if (lobiBag || PARAM.has('cevrimdisi')) return;
  lobiBag = sunucuBaglanti(d => {
    if (d === 'acik') { lobiAcik = true; lobiBag.gonder({ t: 'lobi' }); lobiYaz(); const kod = PARAM.get('oda'); if (kod && !oyun) odayaGir({ t: 'kod', kod }); }
    else { const oyundaydi = oyun && bag === lobiBag; lobiAcik = false; lobiBag = null; lobiYaz(); if (oyundaydi) { oyunBitir(); toast('Sunucu bağlantısı koptu.'); } setTimeout(lobiBaglan, Math.min(30000, 5000 * ++lobiDeneme)); }
  });
}
function lobiYenile() { if (lobiAcik) lobiBag.gonder({ t: 'lobi' }); }
function lobiIsle(m) { lobiDeneme = 0; lobiListe = m; lobiYaz(); }
function lobiYaz() {
  const b = $('cevrimici'); b.disabled = !lobiAcik;
  $('cevrimici-durum').textContent = !lobiAcik ? 'Yakında' : lobiListe.oyunda > 0 ? `${lobiListe.oyunda} oyunda` : 'Aç';
  const k = $('odalar'); k.innerHTML = '';
  if (!lobiListe.odalar?.length) { k.innerHTML = '<div class="bos">Şu an açık oda yok. Hızlı katıl yeni bir oda kurar.</div>'; return; }
  for (const o of lobiListe.odalar) {
    const e = document.createElement('button'); e.className = 'oda'; e.disabled = o.insan >= o.kisi;
    e.innerHTML = `<span><b></b><br><small>${o.insan}/${o.kisi} binici · ${ZORLUK[o.zorluk]?.ad ?? ''} botlar · koşu sürüyor, bir botun yerine geçersin</small></span><em>${o.insan >= o.kisi ? 'DOLU' : 'KATIL →'}</em>`;
    e.querySelector('b').textContent = o.ad;
    e.onclick = () => odayaGir({ t: 'katil', oda: o.id });
    k.append(e);
  }
}
function odayaGir(m) {
  if (!lobiAcik) return;
  lobiBag.gonder({ ...m, ad: secim.ad, avatar: avatarim(), zorluk: secim.zorluk });
  if ($('lobi-dialog').open) $('lobi-dialog').close();
  oyunBaslat(lobiBag);
}
$('cevrimici').onclick = () => { lobiYenile(); $('lobi-dialog').showModal(); };
$('hizli').onclick = () => odayaGir({ t: 'hizli' });
$('oda-kur').onclick = () => odayaGir({ t: 'kur', ozel: $('ozel').checked });
$('kod-katil').onclick = () => { const kod = $('kod').value.trim().toUpperCase(); if (kod.length >= 4) odayaGir({ t: 'kod', kod }); else toast('Oda kodu 4 harf.'); };
setInterval(() => { if (!oyun && $('lobi-dialog').open) lobiYenile(); }, 3000);

// ——— Döngü ———
let onceki = simdi();
function dongu() {
  requestAnimationFrame(dongu);
  const zaman = simdi(), dt = Math.min(0.05, zaman - onceki); onceki = zaman;
  if (lobiBag && bag !== lobiBag) for (const m of lobiBag.al()) if (m.t === 'lobi') lobiIsle(m);
  if (!oyun) { if (demo) demoAdim(dt, zaman); const d = demo && demoAra.get(demoTakip); gor.cizim(dt, zaman, d ? { x: d[1], y: d[2], z: d[3] } : null); return; }
  const durdu = bag.yerel && (menuAcik || $('help-dialog').open);
  if (bag.yerel && !durdu) {
    oyun.birikim = Math.min(oyun.birikim + dt, 0.2);
    while (oyun.birikim >= 1 / MAC.tik) { oyun.birikim -= 1 / MAC.tik; bag.adim(1 / MAC.tik); }
  }
  for (const m of bag.al()) isle(m);
  if (!oyun) return;
  if (!durdu) kendiAdim(dt, zaman);
  digerleriniCiz(dt, zaman);
  kamera(dt);
  gostergeler();
  gor.cizim(dt, zaman, ben);
}

anaEkranKur();
demoBaslat();
lobiBaglan();
lobiYaz();
requestAnimationFrame(dongu);
// Test ve otomatik oynatma için: ?otomatik=1 botlu koşuyu hemen başlatır.
if (PARAM.has('otomatik')) oyunBaslat(yerelBaglanti({ ad: secim.ad, avatar: avatarim(), zorluk: secim.zorluk }));
window.__karanal = { ben, get oyun() { return oyun; }, get bag() { return bag; }, gor, tus, fare, isinla: u => { atYerlestir(ben, u, 0); ben.bakis = ben.yaw; } };
