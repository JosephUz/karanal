// Bütün ayar sayıları tek yerde. Birim: 1 = bir blok (≈1 m), hız blok/sn, süre saniye.

export const AT = {
  tiris: 9.5, dortnala: 15, mahmuz: 20, // hız: W ile tırıs, Shift basılıyken dörtnala, mahmuzlanınca
  ivme: 9, fren: 13, // hızlanma / yavaşlama (blok/sn²)
  donus: 4.2, donusHizli: 2.6, // dönüş hızı (rad/sn): yavaşken / dörtnalada
  dayanim: 100, harca: 22, toplan: 14, yorgunEsik: 30, // Shift dayanım harcar; sıfırlanınca bu eşiğe dek dörtnala yok
  yaricap: 0.9, // binicilerin itişme yarıçapı (at gövdesi)
  ziplama: 7.8, yercekimi: 22,
  kenarPay: 0.95, // çitten içerideki pay (at yarı eni)
  topal: 0.5, // çiviye basan atın hız çarpanı
};

/** Geri gidilemez: en ileri noktanın bu kadar gerisine düşen at şaha kalkar ve geri itilir. */
export const GERI = { pay: 7, sahlan: 0.7 };

export const MAC = {
  tik: 30, sure: 480, kisi: 10, sonBekle: 12, noktaSayisi: 10,
  can: 100, dogusBekle: 3, dogusKoruma: 2, // düşen 3 sn sonra son kapısında doğar, 2 sn dokunulmaz
  kutuDogus: 12, kutuAl: 1.7, ganimetSure: 25, ganimetAl: 1.9,
};

/** Puan: düşürme, seri, aranan (o an tek başına en çok leşi olan; en az arananEsik leş). */
export const PUAN = { les: 100, seri3: 50, seri5: 100, aranan: 100, arananEsik: 2 };

/**
 * Saldırı silahları (sol tık, nişana). cephane: kutudan gelen; hasar tek mermi (çiftede saçma başına).
 * kement: isabet eden hedef bagSure boyunca yavaşlar ve atana çekilir. dinamit: fırlatılır, fitili yanınca patlar.
 */
export const SALDIRI = [
  { id: 'tabanca', ad: 'Tabanca', cephane: 6, hasar: 24, kafa: 1.5, aralik: 0.42, menzil: 70, sacilma: 0.018, agirlik: 30 },
  { id: 'cifte', ad: 'Çifte', cephane: 6, hasar: 11, kafa: 1.2, sacma: 9, aralik: 0.85, menzil: 26, sacilma: 0.075, dusus: [8, 24, 0.3], agirlik: 22 },
  { id: 'tufek', ad: 'Tüfek', cephane: 5, hasar: 58, kafa: 1.6, aralik: 1.15, menzil: 160, sacilma: 0.004, agirlik: 18 },
  { id: 'kement', ad: 'Kement', cephane: 3, hasar: 6, kafa: 1, aralik: 1.2, menzil: 20, sacilma: 0.03, bagSure: 2.6, bagHiz: 0.45, cekme: 6, agirlik: 15 },
  { id: 'dinamit', ad: 'Dinamit', cephane: 3, hasar: 85, aralik: 1.0, menzil: 0, firlat: 19, fitil: 1.5, alan: 5.5, kendi: 0.5, agirlik: 15 },
];
/** Savunma eşyaları (sağ tık, arkaya ya da kendine). adet: kutudan gelen. */
export const SAVUNMA = [
  { id: 'mayin', ad: 'Mayın', adet: 2, hasar: 80, alan: 3.2, tetik: 1.7, kurulma: 0.8, omur: 60, agirlik: 22 },
  { id: 'duman', ad: 'Duman', adet: 2, alan: 6.5, sure: 8, sapma: 0.3, agirlik: 20 },
  { id: 'civi', ad: 'Çivi', adet: 2, en: 7, boy: 2.6, hasar: 10, topal: 3, omur: 25, agirlik: 20 },
  { id: 'yelek', ad: 'Çelik Yelek', adet: 1, zirh: 60, agirlik: 18 },
  { id: 'mahmuz', ad: 'Mahmuz', adet: 2, sure: 2.6, agirlik: 20 },
];
export const SALDIRI_NO = Object.fromEntries(SALDIRI.map((s, i) => [s.id, i]));
export const SAVUNMA_NO = Object.fromEntries(SAVUNMA.map((s, i) => [s.id, i]));

/**
 * Bot zorlukları: tepki (hedefi seçince ateşe kadar), nişan sapması (rad), ateş aralığı katı, görüş menzili.
 */
export const ZORLUK = {
  kolay: { ad: 'Kolay', tepki: 0.9, sapma: 0.075, ates: 2.2, gorus: 45, savunma: 0.4 },
  orta: { ad: 'Orta', tepki: 0.55, sapma: 0.045, ates: 1.6, gorus: 60, savunma: 0.7 },
  zor: { ad: 'Zor', tepki: 0.3, sapma: 0.025, ates: 1.2, gorus: 75, savunma: 1 },
};

/**
 * Bot huyları: avcı peşine düşer, kaçak önde kalıp arkasına tuzak bırakır, pusucu yavaşlayıp bekler.
 * dortnala: dörtnala isteği; serit: şerit kayması; saldir: hedef kovalama isteği; tuzak: savunma eşyası kullanma isteği.
 */
export const BOT_HUY = [
  { id: 'avci', ad: 'Avcı', dortnala: 0.8, serit: 0.5, saldir: 1, tuzak: 0.4, hiz: 1 },
  { id: 'kacak', ad: 'Kaçak', dortnala: 0.95, serit: 0.8, saldir: 0.35, tuzak: 1, hiz: 1 },
  { id: 'pusucu', ad: 'Pusucu', dortnala: 0.35, serit: 0.3, saldir: 0.7, tuzak: 0.8, hiz: 0.75 },
];

/** At renkleri: doru, kula, kır, yağız, al, demirkırı. [gövde, yele] */
export const AT_RENK = [['#8a5a32', '#3a2618'], ['#d2ad72', '#f3e9d2'], ['#e3ded3', '#b9b2a6'], ['#3a3330', '#141110'], ['#9c4a2a', '#4a1f10'], ['#8d8f94', '#3b3c40']];
