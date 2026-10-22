// Avatar tarifi: bütün josephuz oyunlarının okuyabileceği küçük, düz bir nesne.
// Herkes altı hazır karakterden (model) biriyle başlar; modelini istediği an bedava değiştirir.
// Modelinden farklı her görünüm (ten, saç, renk, şapka, üst, aksesuar) jetonla bir kez alınır, sonra hep kullanılır.
// Sunucu da bu dosyayla gelen tarifi düzeltir: geçersiz ya da alınmamış değer modelin değerine döner.

export const SECENEK = {
  ten: ['#f3d0ad', '#e2b083', '#c98f5f', '#9c6641', '#6c4429'],
  sac: ['kisa', 'dik', 'uzun', 'atkuyrugu', 'kel'],
  sacRenk: ['#2b1d14', '#5b3a21', '#a86a2f', '#e2c26c', '#d9d5cc', '#b8432c'],
  sapka: ['yok', 'kep', 'bere', 'kask', 'fotr', 'silindir', 'tac'],
  ust: ['tisort', 'ceket', 'zirh', 'cubbe'],
  aksesuar: ['yok', 'atki', 'gozluk', 'pelerin'],
  renk: ['#2f3b4c', '#c7442f', '#e8c547', '#3d8bd6', '#3f9a55', '#7d4fb0', '#ece6d6', '#1f1f22', '#d9772c', '#e46aa2'],
};
// Hazır karakterler: kasabanın işlerinden (adları sözlükte: model.<id>). İlki yeni gelenin varsayılanı.
// Kara Nal kopyasında Juland dükkânının görünüm kataloğu (adlar, fiyatlar) yok; oyunda kullanılmıyor.
export const MODELLER = [
  { id: 'gezgin', avatar: { ten: '#e2b083', sac: 'kisa', sacRenk: '#5b3a21', sapka: 'yok', sapkaRenk: '#c7442f', ust: 'tisort', ustRenk: '#3d8bd6', altRenk: '#2f3b4c', aksesuar: 'yok' } },
  { id: 'ciftci', avatar: { ten: '#c98f5f', sac: 'dik', sacRenk: '#2b1d14', sapka: 'kep', sapkaRenk: '#e8c547', ust: 'tisort', ustRenk: '#3f9a55', altRenk: '#2f3b4c', aksesuar: 'yok' } },
  { id: 'madenci', avatar: { ten: '#9c6641', sac: 'kisa', sacRenk: '#2b1d14', sapka: 'kask', sapkaRenk: '#d9772c', ust: 'ceket', ustRenk: '#1f1f22', altRenk: '#2f3b4c', aksesuar: 'yok' } },
  { id: 'balikci', avatar: { ten: '#f3d0ad', sac: 'uzun', sacRenk: '#e2c26c', sapka: 'bere', sapkaRenk: '#3d8bd6', ust: 'tisort', ustRenk: '#ece6d6', altRenk: '#3d8bd6', aksesuar: 'yok' } },
  { id: 'tuccar', avatar: { ten: '#e2b083', sac: 'atkuyrugu', sacRenk: '#a86a2f', sapka: 'fotr', sapkaRenk: '#7d4fb0', ust: 'ceket', ustRenk: '#7d4fb0', altRenk: '#1f1f22', aksesuar: 'yok' } },
  { id: 'muhafiz', avatar: { ten: '#6c4429', sac: 'kel', sacRenk: '#2b1d14', sapka: 'yok', sapkaRenk: '#c7442f', ust: 'zirh', ustRenk: '#c7442f', altRenk: '#2f3b4c', aksesuar: 'yok' } },
];
export const ALANLAR = ['ten', 'sac', 'sacRenk', 'sapka', 'sapkaRenk', 'ust', 'ustRenk', 'altRenk', 'aksesuar'];
const LISTE = { ten: 'ten', sac: 'sac', sacRenk: 'sacRenk', sapka: 'sapka', sapkaRenk: 'renk', ust: 'ust', ustRenk: 'renk', altRenk: 'renk', aksesuar: 'aksesuar' };
export const VARSAYILAN = { model: MODELLER[0].id, ...MODELLER[0].avatar };
export const modelBul = id => MODELLER.find(m => m.id === id) ?? MODELLER[0];

// Görünüm eşyası: renkler bütün renkli yerlerde (şapka, üst, alt) bir kez alınır; ten ve saç rengi ayrı.
export function gorunumEsyasi(alan, deger) {
  if (deger === 'yok') return null; // çıkarmak bedava
  const l = LISTE[alan];
  return l === 'renk' ? `renk:${deger}` : `${l}:${deger}`;
}

// Bu değer bu oyuncuya açık mı: modelin kendi değeri, "yok" ya da alınmış eşya. sahip verilmezse hepsi açık sayılır.
export const acikMi = (model, alan, deger, sahip) => modelBul(model).avatar[alan] === deger || !gorunumEsyasi(alan, deger) || !sahip || sahip.has(gorunumEsyasi(alan, deger));

// sahip: Set (eşya id'leri) verilirse alınmamış değer modelinkine döner; verilmezse yalnız geçerlilik denetlenir.
export function avatarDuzelt(a, sahip) {
  const m = modelBul(a?.model), o = { model: m.id, ...m.avatar };
  if (!a || typeof a !== 'object') return o;
  for (const k of ALANLAR) if (SECENEK[LISTE[k]].includes(a[k]) && acikMi(m.id, k, a[k], sahip)) o[k] = a[k];
  return o;
}
// Yeni gelen: rastgele bir hazır karakter.
export const rastgeleModel = (r = Math.random) => { const m = MODELLER[Math.floor(r() * MODELLER.length)]; return { model: m.id, ...m.avatar }; };
// Kasabalılar için: bütün seçeneklerden karışık görünüş (yalnız görünüm; oyunculara verilmez).
export function rastgeleGorunus(r = Math.random) {
  const sec = l => l[Math.floor(r() * l.length)];
  return { ten: sec(SECENEK.ten), sac: sec(SECENEK.sac), sacRenk: sec(SECENEK.sacRenk), sapka: sec(SECENEK.sapka.slice(0, 5)), sapkaRenk: sec(SECENEK.renk), ust: sec(SECENEK.ust), ustRenk: sec(SECENEK.renk), altRenk: sec(SECENEK.renk), aksesuar: 'yok' };
}
// Ad: 2–16 karakter; harf, rakam, boşluk, - ve _.
export function adDuzelt(ad) {
  const s = String(ad ?? '').normalize('NFC').replace(/[^\p{L}\p{N} _-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return s.length >= 2 ? s : '';
}
