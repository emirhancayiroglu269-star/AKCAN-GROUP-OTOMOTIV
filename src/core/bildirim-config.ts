export const entegrasyonDurumGorseli = {
  Bağlı: { emoji: "🟢", ton: "green" },
  "Sorun Var": { emoji: "🟠", ton: "yellow" },
  Pasif: { emoji: "⚫", ton: "steel" },
};

// Bir API anahtarını ekranda maskeli gösterir — son 4 haneyi bırakır.
// NOT: Bu, GERÇEK bir şifreleme DEĞİLDİR (tarayıcıda saklanan bir sırrın
// tarayıcı tarafından "şifrelenmesi" güvenlik sağlamaz — anahtar sunucu
// tarafında, ortam değişkeni olarak saklanmalıdır). Bu sadece EKRANDA
// yanlışlıkla omuz sörfü/ekran paylaşımıyla görünmesini engeller.
export const anahtarMaskele = (deger) => {
  if (!deger) return "—";
  if (deger.length <= 4) return "••••";
  return `••••${deger.slice(-4)}`;
};

/* ------------------------------------------------------------------ */
/* DIŞ BİLDİRİM SİSTEMİ — E-POSTA / SMS / WHATSAPP (62. adım)          */
/* ------------------------------------------------------------------ */
// ÖNEMLİ: Bu sistem GERÇEK e-posta/SMS/WhatsApp GÖNDERMEZ — sunucusuz,
// tarayıcı-içi bir uygulamada bu teknik olarak mümkün değildir. Burada
// kurulan şablon + tercih + geçmiş + izin altyapısı, ileride gerçek bir
// gönderim servisine (backend üzerinden) bağlanmaya hazır durumdadır.
export const BILDIRIM_OLAY_TURLERI = [
  { kategori: "Stok", olaylar: ["Kritik Stok", "Stok Bitti", "Siparişe İhtiyaç Var"] },
  { kategori: "Satış", olaylar: ["Büyük Tutarlı Satış", "İade", "Maliyet Altı Satış"] },
  { kategori: "Cari", olaylar: ["Vadesi Gelen Alacak", "Vadesi Geçen Alacak", "Vadesi Gelen Tedarikçi Ödemesi"] },
  { kategori: "Sipariş (Müşteriye)", olaylar: ["Sipariş Hazır", "Kargo Gönderildi", "Kargo Takip No", "Sipariş İptal", "İade Durumu"] },
  { kategori: "Sipariş (İç)", olaylar: ["Müşteri Siparişi Geldi", "Tedarikçi Siparişi Geldi", "Sipariş Gecikti"] },
  { kategori: "Sistem", olaylar: ["Yedekleme Başarısız", "Entegrasyon Hatası", "API Bağlantısı Kesildi"] },
];

export const BILDIRIM_KANALLARI = ["Uygulama İçi", "E-posta", "SMS", "WhatsApp", "Push"];

export const bosSablonForm = { olayTuru: "Kritik Stok", kategori: "Stok", kanal: "E-posta", baslik: "", govde: "", tur: "operasyonel" };
