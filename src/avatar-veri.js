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
export const AD = {
  sac: { kisa: 'Kısa', dik: 'Dik', uzun: 'Uzun', atkuyrugu: 'At kuyruğu', kel: 'Kel' },
  sapka: { yok: 'Yok', kep: 'Kep', bere: 'Bere', kask: 'Kask', fotr: 'Fötr', silindir: 'Silindir', tac: 'Taç' },
  ust: { tisort: 'Tişört', ceket: 'Ceket', zirh: 'Zırh', cubbe: 'Cübbe' },
  aksesuar: { yok: 'Yok', atki: 'Atkı', gozluk: 'Gözlük', pelerin: 'Pelerin' },
};
// Hazır karakterler: kasabanın işlerinden. İlki yeni gelenin varsayılanı.
export const MODELLER = [
  { id: 'gezgin', ad: 'Gezgin', avatar: { ten: '#e2b083', sac: 'kisa', sacRenk: '#5b3a21', sapka: 'yok', sapkaRenk: '#c7442f', ust: 'tisort', ustRenk: '#3d8bd6', altRenk: '#2f3b4c', aksesuar: 'yok' } },
  { id: 'ciftci', ad: 'Çiftçi', avatar: { ten: '#c98f5f', sac: 'dik', sacRenk: '#2b1d14', sapka: 'kep', sapkaRenk: '#e8c547', ust: 'tisort', ustRenk: '#3f9a55', altRenk: '#2f3b4c', aksesuar: 'yok' } },
  { id: 'madenci', ad: 'Madenci', avatar: { ten: '#9c6641', sac: 'kisa', sacRenk: '#2b1d14', sapka: 'kask', sapkaRenk: '#d9772c', ust: 'ceket', ustRenk: '#1f1f22', altRenk: '#2f3b4c', aksesuar: 'yok' } },
  { id: 'balikci', ad: 'Balıkçı', avatar: { ten: '#f3d0ad', sac: 'uzun', sacRenk: '#e2c26c', sapka: 'bere', sapkaRenk: '#3d8bd6', ust: 'tisort', ustRenk: '#ece6d6', altRenk: '#3d8bd6', aksesuar: 'yok' } },
  { id: 'tuccar', ad: 'Tüccar', avatar: { ten: '#e2b083', sac: 'atkuyrugu', sacRenk: '#a86a2f', sapka: 'fotr', sapkaRenk: '#7d4fb0', ust: 'ceket', ustRenk: '#7d4fb0', altRenk: '#1f1f22', aksesuar: 'yok' } },
  { id: 'muhafiz', ad: 'Muhafız', avatar: { ten: '#6c4429', sac: 'kel', sacRenk: '#2b1d14', sapka: 'yok', sapkaRenk: '#c7442f', ust: 'zirh', ustRenk: '#c7442f', altRenk: '#2f3b4c', aksesuar: 'yok' } },
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
const FIYAT = {
  ten: 25, sacRenk: 15, renk: 10, sac: 20,
  sapka: { kep: 25, bere: 25, kask: 40, fotr: 40, silindir: 90, tac: 150 },
  ust: { tisort: 20, ceket: 30, zirh: 60, cubbe: 50 },
  aksesuar: { atki: 40, gozluk: 50, pelerin: 120 },
};
const RENK_AD = { '#2f3b4c': 'Lacivert', '#c7442f': 'Kırmızı', '#e8c547': 'Sarı', '#3d8bd6': 'Mavi', '#3f9a55': 'Yeşil', '#7d4fb0': 'Mor', '#ece6d6': 'Krem', '#1f1f22': 'Siyah', '#d9772c': 'Turuncu', '#e46aa2': 'Pembe' };
// Bütün görünüm eşyaları (dükkân kataloğuna eklenir). alan: dükkândan alınınca giyilecek yer (renk ve tenlerde yok).
export const GORUNUM_ESYALARI = ['ten', 'sac', 'sacRenk', 'renk', 'sapka', 'ust', 'aksesuar'].flatMap(l =>
  SECENEK[l].filter(v => v !== 'yok').map((v, i) => ({
    id: `${l}:${v}`, tur: 'gorunum', alan: AD[l] ? l : null, deger: v,
    ad: AD[l] ? AD[l][v] : l === 'renk' ? `${RENK_AD[v]} renk` : `${l === 'ten' ? 'Ten' : 'Saç rengi'} ${i + 1}`,
    fiyat: typeof FIYAT[l] === 'number' ? FIYAT[l] : FIYAT[l][v],
  })));

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
