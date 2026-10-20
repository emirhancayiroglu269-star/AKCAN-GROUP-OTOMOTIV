import type { DB, Kullanici, Rol } from './types';
import type { AnaSayfa } from '../App';

/** Kullanıcının rolü. Kullanıcı listesi boşsa herkes yöneticidir (ilk kurulum). Listede yoksa/pasifse 'yok'. */
export function rolBul(db: DB, eposta: string | null): { rol: Rol | 'yok'; kayit?: Kullanici } {
  if (!db.kullanicilar.length || !eposta) return { rol: db.kullanicilar.length ? 'yok' : 'yonetici' };
  const k = db.kullanicilar.find((x) => x.eposta.toLowerCase() === eposta.toLowerCase());
  return k && k.aktif ? { rol: k.rol, kayit: k } : { rol: 'yok', kayit: k };
}

const SAYFALAR: Record<Rol, AnaSayfa[]> = {
  yonetici: ['panel', 'arama', 'oneriler', 'hareketler', 'satisanaliz', 'musteri', 'sepet', 'kayip', 'karzarar', 'tahsilat', 'nakit', 'cariler', 'analiz', 'fiyat', 'usta', 'eritme', 'depolar', 'tedarikci', 'urunler', 'ayarlar'],
  // personel: stok tarafı, maliyet görmeden (Depolar'da karşılaştırma sekmesi gizli)
  kasiyer: ['arama', 'urunler', 'depolar'],
  teknisyen: ['arama', 'urunler', 'depolar'],
};
export const sayfaIzni = (rol: Rol | 'yok', s: AnaSayfa) => rol !== 'yok' && SAYFALAR[rol].includes(s);

export type Yetki = 'urun' | 'maliyet';
/** urun: ürün kartında kritik stok / raf / OEM düzenleme · maliyet: alış fiyatı ve kâr görme */
export const yetkili = (rol: Rol | 'yok', _y: Yetki) => rol === 'yonetici';
