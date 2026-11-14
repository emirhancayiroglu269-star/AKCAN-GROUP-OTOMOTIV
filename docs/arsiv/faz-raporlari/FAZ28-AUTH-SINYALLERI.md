## src/App.tsx
- L244: // kullanıcının yetkisine ve kişisel bildirim ayarlarına göre süzülür.
- L247: const gorunurBildirimler = R.bildirimleriYetkiyeGoreSuz(db, aktifKullanici, R.bildirimleriTopla(db), aktifKullanici?.bildirimAyarlari);
- L284: // Otomatik ekran kilidi — kasada başıboş bırakılan bir oturumun yetkisiz
- L428: const kontrolEt = () => {
- L437: kontrolEt();
- L438: const zamanlayici = setInterval(kontrolEt, 5 * 60 * 1000);
- L448: const kontrolEt = () => {
- L458: kontrolEt();
- L459: const zamanlayici = setInterval(kontrolEt, 30 * 60 * 1000);
- L698: { id: "yoneticipaneli", ad: "Yönetici Kontrol Paneli", ikon: R.BarChart3, yetki: "raporlariGorebilir" },
- L699: { id: "satis", ad: "Satış / Kasa", ikon: R.ShoppingCart, yetki: "satisYapabilir" },
- L700: { id: "alis", ad: "Mal Alış", ikon: R.Truck, yetki: "malAlisGirebilir" },
- L701: { id: "tedarikci", ad: "Tedarikçiler", ikon: R.Building2, yetki: "cariHesapGorebilir" },
- L702: { id: "musteri", ad: "Müşteriler", ikon: R.Users, yetki: "cariHesapGorebilir" },
- L703: { id: "vadetakip", ad: "Vade Takip", ikon: R.Calendar, yetki: "cariHesapGorebilir" },
- L704: { id: "gunsonu", ad: "Gün Sonu", ikon: R.Lock, yetki: "kasaGorebilir" },
- L705: { id: "teklifler", ad: "Teklifler", ikon: R.FileText, yetki: "satisYapabilir" },
- L706: { id: "kargo", ad: "Kargo / Teslimat", ikon: R.Truck, yetki: "satisYapabilir" },
- L707: { id: "kasa", ad: "Tahsilat / Ödeme", ikon: R.Wallet, yetki: "tahsilatGirebilir" },
- L708: { id: "kasayonetimi", ad: "Kasa Yönetimi", ikon: R.Landmark, yetki: "kasaGorebilir" },
- L709: { id: "iade", ad: "İadeler", ikon: R.RotateCcw, yetki: "iadeAlabilir" },
- L715: { id: "topluFiyat", ad: "Toplu Fiyat Güncelle", ikon: R.Percent, yetki: "fiyatDegistirebilir" },
- L716: { id: "sayim", ad: "Stok Sayımı", ikon: R.ClipboardList, yetki: "stokDuzeltebilir" },
- L717: { id: "raporlar", ad: "Raporlar", ikon: R.BarChart3, yetki: "raporlariGorebilir" },
- L723: { id: "rezervler", ad: "Rezervler", ikon: R.ClipboardList, yetki: "satisYapabilir" },
- L724: { id: "musterisiparisi", ad: "Müşteri Siparişi", ikon: R.PackageSearch, yetki: "satisYapabilir" },
- L725: { id: "fiyatkurallari", ad: "İskonto / Özel Fiyat", ikon: R.Percent, yetki: "fiyatDegistirebilir" },
- L727: { id: "giderler", ad: "Gider Yönetimi", ikon: R.Wallet, yetki: "kasaCikisiYapabilir" },
- L728: { id: "iceDisaAktar", ad: "İçe / Dışa Aktar", ikon: R.FileDown, yetki: "urunSilebilir" },
- L729: { id: "bankapos", ad: "Banka / POS", ikon: R.CreditCard, yetki: "kasaGorebilir" },
- L730: { id: "satinalma", ad: "Satın Alma Siparişi", ikon: R.ClipboardList, yetki: "malAlisGirebilir" },
- L731: { id: "tedarikcikarsilastirma", ad: "Tedarikçi Karşılaştırma", ikon: R.Truck, yetki: "malAlisGirebilir" },
- L732: { id: "transferler", ad: "Depolar / Transfer", ikon: R.Truck, yetki: "stokDuzeltebilir" },
- L733: { id: "kullanicilar", ad: "Kullanıcılar", ikon: R.ShieldCheck, yetki: "kullaniciYonetebilir" },
- L738: { id: "ayarlar", ad: "Ayarlar", ikon: R.Settings, yetki: "kullaniciYonetebilir" },
- L740: .filter((m) => !m.yetki || R.yetkiVarMi(db, aktifKullanici, m.yetki))
- L853: ? "Kullanıcılar / Yetkilendirme"
- L1114: if (e.target.checked && "Notification" in window && Notification.permission === "default") Notification.requestPermission();

## src/core/tedarikci-cari.ts
- L30: yetkiliKisi: "",

## src/core/stok-analiz.ts
- L179: /* KULLANICI / PERSONEL VE YETKİLENDİRME SİSTEMİ                       */
- L183: export const bosRolForm = { ad: "", yetkiler: hepsi(false), maksimumIskontoYuzdesi: "" };

## src/core/akcan-runtime.tsx
- L98: YETKI_TANIMLARI,
- L107: yetkiVarMi,
- L114: import { auditKaydiEkle, auditZincirKontrolu, kritikYetkiVarMi, AUDIT_KATEGORILERI } from "../lib/audit-log";
- L177: import { yetkiDenetimKontrolu, yetkiDenetimOzeti } from "../lib/yetki-denetim";
- L194: // kullanıcı adı + şifre doğrulamasıdır: "kullaniciYonetebilir" yetkisine
- L303: export { React, useState, useEffect, useRef, loginBrandImage, Package, Plus, Search, X, Check, Pencil, Trash2, AlertTriangle, Loader2, Car, ImageIcon, History, TrendingUp, EyeOff, Eye, GitCompare, ShoppingCart, Zap, Printer, RotateCcw, Tag,
- L415: .filter((n) => typeof n === "object" && (!HASSAS_NOT_TURLERI.includes(n.tur) || yetkiVarMi(db, aktifKullanici, "cariHesapGorebilir")))
- L1529: // hedefSekme, yetki (görebilmek için gereken yetki, boşsa herkese açık) }.
- L1533: const ekle = (oncelik, kategori, mesaj, sayi, hedefSekme, yetki = null) => {
- L1535: liste.push({ id: `${kategori}`, oncelik, kategori, mesaj, sayi, hedefSekme, yetki });
- L1638: // bildirimi görmemeli" gereksinimi burada karşılanır (yetki=null olanlar
- L1640: export const bildirimleriYetkiyeGoreSuz = (db, aktifKullanici, bildirimler, ayarlar) =>
- L1642: if (b.yetki && !yetkiVarMi(db, aktifKullanici, b.yetki)) return false;
- L1704: export { auditKaydiEkle, auditZincirKontrolu, kritikYetkiVarMi, AUDIT_KATEGORILERI };

## src/lib/yetki-denetim.ts
- L2: * V17 — Yetki / İşlem Kilidi Denetim Motoru
- L7: export type YetkiBulgu = {
- L15: const KRITIK_YETKILER = [
- L30: "rol-yonetici": [...KRITIK_YETKILER],
- L36: export const yetkiDenetimKontrolu = (db: any): YetkiBulgu[] => {
- L37: const b: YetkiBulgu[] = [];
- L41: // Her kritik yetki rol şemasında mevcut olmalı.
- L43: for (const anahtar of KRITIK_YETKILER) {
- L44: if (!Object.prototype.hasOwnProperty.call(rol?.yetkiler || {}, anahtar)) {
- L47: tip: "eksik-yetki",
- L49: mesaj: `${rol.ad || rol.id} rolünde ${anahtar} yetkisi tanımlı değil.`,
- L61: if (rol.yetkiler?.[anahtar] !== true) {
- L66: mesaj: `${rol.ad || rolId} rolünün ${anahtar} yetkisi kapatılmış/değişmiş.`,
- L73: // Aktif kullanıcı geçersiz role bağlıysa kritik durum.
- L78: tip: "yetkisiz-rol",
- L80: mesaj: `${k.adSoyad || k.kullaniciAdi || k.id} geçerli olmayan bir role bağlı.`,
- L86: // Aktif kullanıcılar için yönetici rolü yoksa kullanıcı/yetki yönetimi erişimi verilmemeli.
- L88: if (yonetici && yonetici.yetkiler?.kullaniciYonetebilir !== true) {
- L91: tip: "yonetici-yetkisi",
- L93: mesaj: "Yönetici rolünde kullanıcı/yetki yönetimi kapalı.",
- L101: export const yetkiDenetimOzeti = (db: any) => {
- L102: const bulgular = yetkiDenetimKontrolu(db);

## src/lib/cari-kasa.ts
- L35: yetkiliKisi: "",

## src/lib/donem-kapanis.ts
- L12: import { yetkiDenetimOzeti } from "./yetki-denetim";
- L41: const yetki = yetkiDenetimOzeti(db);
- L42: const sistemBulgular: any[] = [...(mutabakat.bulgular || []), ...(finans.bulgular || []), ...(cift.bulgular || []), ...(ters.bulgular || []), ...(yetki.bulgular || [])];

## src/lib/constants.ts
- L25: // Yetkilendirme sistemindeki tüm tekil yetkiler — hem rol matrisinde hem
- L26: // tek tek kontrol noktalarında (yetkiVarMi) bu anahtarlar kullanılır.
- L27: export const YETKI_TANIMLARI = [
- L46: { anahtar: "kullaniciYonetebilir", etiket: "Kullanıcı/yetki yönetebilir" },
- L49: export const hepsi = (deger) => Object.fromEntries(YETKI_TANIMLARI.map((y) => [y.anahtar, deger]));
- L51: // Hazır roller — yönetici bunları sonradan tek tek düzenleyebilir (yetkiler
- L54: { id: "rol-yonetici", ad: "Yönetici", sabit: true, yetkiler: hepsi(true), maksimumIskontoYuzdesi: null },
- L59: yetkiler: { ...hepsi(false), satisYapabilir: true, iskontoYapabilir: true, cariHesapGorebilir: true, iadeAlabilir: true },
- L66: yetkiler: { ...hepsi(false), satisYapabilir: true, tahsilatGirebilir: true, kasaGorebilir: true, kasaCikisiYapabilir: true, cariHesapGorebilir: true },
- L73: yetkiler: { ...hepsi(false), stokDuzeltebilir: true, malAlisGirebilir: true },
- L159: // Bir kullanıcının belirli bir yetkiye sahip olup olmadığını, bağlı olduğu
- L163: export const yetkiVarMi = (db, aktifKullanici, anahtar) => {
- L166: return !!(rol && rol.yetkiler[anahtar]);

## src/lib/guvenlik-politikasi.ts
- L11: | "kullanici_yetki"
- L14: export interface YetkiBaglami {
- L17: yetkiler?: string[];
- L21: const ROL_YETKILERI: Record<string, GuvenlikIslemi[]> = {
- L32: "kullanici_yetki",
- L48: export function yetkiliMi(islem: GuvenlikIslemi, baglam: YetkiBaglami): boolean {
- L51: if (baglam.yetkiler?.includes(islem)) return true;
- L54: ROL_YETKILERI[rol.toLowerCase()]?.includes(islem)
- L66: "kullanici_yetki",
- L75: * yetki kanıtı olarak kullanılmamalıdır.
- L79: baglam: YetkiBaglami
- L81: if (!yetkiliMi(islem, baglam)) {
- L82: return { ok: false, yoneticiOnayi: false, mesaj: "Bu işlem için yetkiniz yok." };

## src/lib/yonetici-onay.ts
- L1: import { yetkiVarMi } from "./constants";
- L4: // kullanıcı adı + şifre doğrulamasıdır: "kullaniciYonetebilir" yetkisine
- L10: const yoneticiler = (db.kullanicilar || []).filter((k) => k.aktif !== false && yetkiVarMi(db, k, "kullaniciYonetebilir"));

## src/lib/gun-sonu-kapanis.ts
- L13: import { yetkiDenetimOzeti } from "./yetki-denetim";
- L76: const yetki = yetkiDenetimOzeti(db);
- L78: const sistemBulgular: any[] = [...(mutabakat.bulgular || []), ...(finans.bulgular || []), ...(cift.bulgular || []), ...(ters.bulgular || []), ...(yetki.bulgular || [])];

## src/lib/audit-log.ts
- L6: "Kullanıcı", "Yetki", "Ayar", "Silme", "Diğer",
- L46: if (t.includes("yetki") || t.includes("rol")) return "Yetki";
- L120: export const kritikYetkiVarMi = (db: any, aktifKullanici: any, anahtar: string) => {
- L125: return !!rol?.yetkiler?.[anahtar];

## src/lib/veri-dogrulama.ts
- L28: // UNIQUE olmalıdır). OEM kasıtlı olarak bu kontrole DAHİL EDİLMEZ, çünkü

## src/lib/database.ts
- L257: // Roller — { id, ad, sabit (silinemez varsayılan rol mü), yetkiler: { <YETKI_TANIMLARI anahtarları>: bool } }
- L260: // aktif, sonGiris }. Yetkiler doğrudan kullanıcıda değil, bağlı olduğu
- L261: // rolde tutulur (rol değişince kullanıcının yetkisi de otomatik değişir).
- L483: yetkiliKisi: "",

## src/modules/Yonetim.tsx
- L10: const yetki = R.yetkiDenetimOzeti(db);
- L56: id: "yetki",
- L57: ad: "Yetki / İşlem Kilidi",
- L59: bulgular: yetki.bulgular,
- L60: aciklama: "Rol matrisi ve kritik işlem yetkileri",
- L78: const toplamBulgu = mutabakat.bulguSayisi + finans.toplamBulgu + ciftKayit.bulguSayisi + tersIslem.bulguSayisi + yetki.bulguSayisi;
- L79: const kritik = mutabakat.kritik + finans.toplamBulgu + ciftKayit.kritik + tersIslem.kritik + yetki.kritik;
- L92: if (tip === "eksik-yetki" || tip === "rol-matrisi" || tip === "yetkisiz-rol" || tip === "yonetici-yetkisi") return "kullanicilar";
- L310: <div>✓ Yetki / işlem kilidi</div>
- L393: setRolForm({ ad: r.ad, yetkiler: { ...r.yetkiler }, maksimumIskontoYuzdesi: r.maksimumIskontoYuzdesi === null ? "" : String(r.maksimumIskontoYuzdesi) });
- L417: roller: [...prev.roller, { id: R.yeniId("rol"), ad: rolForm.ad.trim(), sabit: false, yetkiler: rolForm.yetkiler, maksimumIskontoYuzdesi: maksimumIskonto }],
- L422: const degisenYetkiler = R.YETKI_TANIMLARI.filter((y) => eskiRol.yetkiler[y.anahtar] !== rolForm.yetkiler[y.anahtar]);
- L427: r.id === duzenlenenRolId ? { ...r, ad: rolForm.ad.trim(), yetkiler: rolForm.yetkiler, maksimumIskontoYuzdesi: maksimumIskonto } : r
- L430: if (degisenYetkiler.length > 0 || eskiRol.maksimumIskontoYuzdesi !== maksimumIskonto) {
- L431: const yetkiSatirlari = degisenYetkiler.map((y) => `${y.etiket}: ${eskiRol.yetkiler[y.anahtar] ? "Açık" : "Kapalı"} → ${rolForm.yetkiler[y.anahtar] ? "Açık" : "Kapalı"}`);
- L434: islemTuru: "Rol yetkileri değiştirildi",
- L437: yeniDeger: `Maks. İskonto: ${maksimumIskonto ?? "Sınırsız"}${yetkiSatirlari.length ? "; " + yetkiSatirlari.join(", ") : ""}`,
- L471: { id: "roller", ad: "Roller / Yetkiler" },
- L561: const acikSayisi = R.YETKI_TANIMLARI.filter((y) => r.yetkiler[y.anahtar]).length;
- L580: {acikSayisi} / {R.YETKI_TANIMLARI.length} yetki açık · {db.kullanicilar.filter((k) => k.rolId === r.id).length} kullanıcı · Maks. İskonto:{" "}
- L678: {/* Rol formu — yetki matrisi */}
- L700: {R.YETKI_TANIMLARI.map((y) => (
- L704: checked={!!rolForm.yetkiler[y.anahtar]}
- L705: onChange={(e) => setRolForm({ ...rolForm, yetkiler: { ...rolForm.yetkiler, [y.anahtar]: e.target.checked } })}
- L858: <R.ShieldCheck size={14} /> Rol Bazlı İskonto/Yetki Limitlerine Git
- L886: Sayım ayarları ve stok düzeltme yetkisi, <strong>Stok Sayımı</strong> ve <strong>Kullanıcılar → Roller</strong>{" "}
- L1083: Kullanıcı ve Yetkilendirme
- L1086: Kullanıcı hesapları, roller, yetkiler ve iskonto limitleri Kullanıcılar ekranından yönetilir.

## src/modules/Giris.tsx
- L37: Programı kullanmaya başlamak için önce bir Yönetici hesabı oluşturun. Bu hesap tam yetkiye sahip olacak.

## src/modules/Stok.tsx
- L194: if (fiyatDegisiyor && !R.yetkiVarMi(db, aktifKullanici, "fiyatDegistirebilir")) {
- L195: R.bildirimGoster("Satış fiyatını değiştirme yetkiniz yok.", "hata");
- L322: if (!R.yetkiVarMi(db, aktifKullanici, "urunSilebilir")) {
- L323: R.bildirimGoster("Ürün silme yetkiniz yok.", "hata");
- L671: if (!R.yetkiVarMi(db, aktifKullanici, "stokDuzeltebilir")) {
- L672: R.bildirimGoster("Stok düzeltme yetkiniz yok.", "hata");
- L1062: {R.yetkiVarMi(db, aktifKullanici, "maliyetiGorebilir") && (
- L1074: {R.yetkiVarMi(db, aktifKullanici, "karOraniniGorebilir") && (
- L3925: const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
- L3974: if ((ozet.eksik > 0 || ozet.fazla > 0) && !R.yetkiVarMi(db, aktifKullanici, "stokDuzeltebilir")) {

## src/pages/BelgelerSayfasi.tsx
- L6: import { islemKaydet, yetkiVarMi, BELGE_TURLERI } from "../lib/constants";
- L48: if (!yetkiVarMi(db, aktifKullanici, "satisIptalEdebilir")) {
- L49: const onay = yoneticiOnayiAl(db, "Satış iptal etme yetkiniz yok. Yönetici onayı gerekiyor.");
- L439: {seciliBelge.durum !== "İptal Edildi" && yetkiVarMi(db, aktifKullanici, "iadeAlabilir") && (

## src/modules/finans/HesapSayfasi.tsx
- L214: <h3 className="font-bold text-sm" style={{ color: R.T.ink900 }}>Merkezi Güvenlik ve Yetki</h3>
- L216: <p className="text-[11px] mt-1" style={{ color: R.T.ink500 }}>Personel yetkileri ve kritik işlem kayıtları merkezi sistemde korunuyor.</p>
- L335: {R.yetkiVarMi(db, aktifKullanici, "kasaCikisiYapabilir")

## src/modules/finans/TahsilatOdemeSayfasi.tsx
- L86: const gerekliYetki = yon === "tahsilat" ? "tahsilatGirebilir" : "kasaCikisiYapabilir";
- L87: if (!R.yetkiVarMi(db, aktifKullanici, gerekliYetki)) {
- L88: R.bildirimGoster("Bu işlem için yetkiniz yok.", "hata");

## src/modules/finans/IadeSayfasi.tsx
- L66: if (!R.yetkiVarMi(db, aktifKullanici, "iadeAlabilir")) {
- L67: R.bildirimGoster("Satış iadesi alma yetkiniz yok.", "hata");
- L309: if (!R.yetkiVarMi(db, aktifKullanici, "malAlisGirebilir")) {
- L310: R.bildirimGoster("Alış iadesi işlemi için yetkiniz yok.", "hata");

## src/modules/finans/GiderYonetimSayfasi.tsx
- L53: if (!R.yetkiVarMi(db, aktifKullanici, "kasaCikisiYapabilir")) {
- L54: R.bildirimGoster("Gider kaydetme yetkiniz yok.", "hata");

## src/modules/satis/SatisSayfasi.tsx
- L32: const [oturumFiyatYetkisi, setOturumFiyatYetkisi] = R.useState(false);
- L228: // Manuel satış fiyatı değişikliği — yetkiye bağlı. Kullanıcının kendi
- L229: // yetkisi varsa doğrudan izin verilir; yoksa (oturumda henüz onay
- L261: const kendiYetkisiVar = R.yetkiVarMi(db, aktifKullanici, "satisFiyatiDegistirebilir");
- L262: if (!kendiYetkisiVar && !oturumFiyatYetkisi) {
- L273: setOturumFiyatYetkisi(true);
- L319: if (!R.yetkiVarMi(db, aktifKullanici, "satisYapabilir")) {
- L320: R.bildirimGoster("Satış yapma yetkiniz yok.", "hata");
- L365: const kendiYetkisiVar = altMinimumSatirVar && !maliyetAltiSatirVar && R.yetkiVarMi(db, aktifKullanici, "minimumAltiSatisYapabilir");
- L366: if (!kendiYetkisiVar) {
- L377: // İskonto yetkisi kontrolü — personelin rolüne tanımlı maksimum iskonto
- L384: `⚠️ Yetkiniz %${aktifRolIskontoLimiti} iskonto ile sınırlıdır. Bu satıştaki toplam iskonto oranı %${efektifIskontoYuzdesi.toFixed(1)}.\n\nYönetici onayı gerekli.`
- L664: // İptal iki adımlı: önce bu fonksiyon yetkiyi kontrol edip modalı açar,
- L667: if (!R.yetkiVarMi(db, aktifKullanici, "satisIptalEdebilir")) {
- L668: const onay = R.yoneticiOnayiAl(db, "Satış iptal etme yetkiniz yok. Yönetici onayı gerekiyor.");
- L942: {R.yetkiVarMi(db, aktifKullanici, "kullaniciYonetebilir") && (
- L1575: return <p className="text-xs px-1" style={{ color: R.T.red }}>⚠️ Bu kasa için yetkiniz bulunmuyor — vardiyanız "{acikVardiyaBenim.hesapAdi}" kasasında açık.</p>;

## src/modules/alis/AlisSayfasi.tsx
- L98: if (!R.yetkiVarMi(db, aktifKullanici, "malAlisGirebilir")) {
- L99: R.bildirimGoster("Mal alış kaydetme yetkiniz yok.", "hata");

## src/modules/alis/TedarikciDetay.tsx
- L28: {[tedarikci.yetkiliKisi, tedarikci.telefon, tedarikci.eposta].filter(Boolean).join(" · ") || "İletişim bilgisi girilmemiş"}

## src/modules/alis/TedarikciSayfasi.tsx
- L29: yetkiliKisi: t.yetkiliKisi || "",
- L70: yetkiliKisi: form.yetkiliKisi.trim(),
- L351: <R.Girdi label="Yetkili Kişi" value={form.yetkiliKisi} onChange={(e) => setForm({ ...form, yetkiliKisi: e.target.value })} />

