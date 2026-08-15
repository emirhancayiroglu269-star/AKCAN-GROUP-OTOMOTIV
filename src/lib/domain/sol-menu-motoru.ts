export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route?: string;
  permission?: string;
  children?: MenuItem[];
}

export interface MenuGroup {
  id: string;
  title: string;
  icon: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}

export const SOL_MENU: MenuGroup[] = [
  {
    id: "ana-sayfa",
    title: "Ana Sayfa",
    icon: "home",
    defaultOpen: true,
    items: [
      { id: "dashboard", title: "Dashboard", icon: "layout-dashboard", route: "/dashboard", permission: "DASHBOARD_GOR" },
      { id: "bildirimler", title: "Bildirimler", icon: "bell", route: "/bildirimler", permission: "BILDIRIM_GOR" },
      { id: "favoriler", title: "Favoriler", icon: "star", route: "/favoriler", permission: "MENU_GOR" }
    ]
  },
  {
    id: "satis",
    title: "Satış",
    icon: "shopping-cart",
    items: [
      { id: "yeni-satis", title: "Yeni Satış", icon: "plus", route: "/satis/yeni", permission: "SATIS_OLUSTUR" },
      { id: "satislar", title: "Satışlar", icon: "receipt", route: "/satis", permission: "SATIS_GOR" },
      { id: "teklifler", title: "Teklifler", icon: "file-text", route: "/satis/teklifler", permission: "TEKLIF_GOR" },
      { id: "siparisler", title: "Siparişler", icon: "clipboard-list", route: "/satis/siparisler", permission: "SIPARIS_GOR" },
      { id: "satis-iadeleri", title: "İadeler", icon: "undo-2", route: "/satis/iadeler", permission: "SATIS_IADE_GOR" },
      { id: "musteriler", title: "Müşteriler", icon: "users", route: "/cari/musteriler", permission: "CARI_GOR" }
    ]
  },
  {
    id: "stok",
    title: "Stok",
    icon: "package",
    items: [
      { id: "urunler", title: "Ürünler", icon: "boxes", route: "/stok/urunler", permission: "URUN_GOR" },
      { id: "stok-hareketleri", title: "Stok Hareketleri", icon: "arrow-left-right", route: "/stok/hareketleri", permission: "STOK_HAREKET_GOR" },
      { id: "kritik-stoklar", title: "Kritik Stoklar", icon: "triangle-alert", route: "/stok/kritik", permission: "STOK_GOR" },
      { id: "sayim", title: "Sayım", icon: "scan-line", route: "/stok/sayim", permission: "STOK_SAYIM" },
      { id: "depolar", title: "Depolar", icon: "warehouse", route: "/depolar", permission: "DEPO_GOR" },
      { id: "raf-yonetimi", title: "Raf Yönetimi", icon: "grid-3x3", route: "/stok/raflar", permission: "RAF_GOR" }
    ]
  },
  {
    id: "alis",
    title: "Alış",
    icon: "truck",
    items: [
      { id: "yeni-alis", title: "Yeni Alış", icon: "plus", route: "/alis/yeni", permission: "ALIS_OLUSTUR" },
      { id: "alislar", title: "Alışlar", icon: "receipt", route: "/alis", permission: "ALIS_GOR" },
      { id: "tedarikciler", title: "Tedarikçiler", icon: "building-2", route: "/cari/tedarikciler", permission: "CARI_GOR" },
      { id: "alis-siparisleri", title: "Alış Siparişleri", icon: "clipboard-list", route: "/alis/siparisler", permission: "SIPARIS_GOR" },
      { id: "alis-iadeleri", title: "İadeler", icon: "undo-2", route: "/alis/iadeler", permission: "ALIS_IADE_GOR" }
    ]
  },
  {
    id: "cari",
    title: "Cari",
    icon: "wallet-cards",
    items: [
      { id: "cari-musteriler", title: "Müşteriler", icon: "user", route: "/cari/musteriler", permission: "CARI_GOR" },
      { id: "cari-tedarikciler", title: "Tedarikçiler", icon: "building-2", route: "/cari/tedarikciler", permission: "CARI_GOR" },
      { id: "cari-hareketleri", title: "Cari Hareketler", icon: "arrow-left-right", route: "/cari/hareketleri", permission: "CARI_HAREKET_GOR" },
      { id: "tahsilatlar", title: "Tahsilatlar", icon: "hand-coins", route: "/cari/tahsilatlar", permission: "TAHSILAT_GOR" },
      { id: "odemeler", title: "Ödemeler", icon: "credit-card", route: "/cari/odemeler", permission: "ODEME_GOR" },
      { id: "vade-takibi", title: "Vade Takibi", icon: "calendar-clock", route: "/cari/vadeler", permission: "CARI_GOR" }
    ]
  },
  {
    id: "finans",
    title: "Finans",
    icon: "landmark",
    items: [
      { id: "kasa", title: "Kasa", icon: "banknote", route: "/finans/kasa", permission: "KASA_GOR" },
      { id: "bankalar", title: "Bankalar", icon: "building-columns", route: "/finans/bankalar", permission: "BANKA_GOR" },
      { id: "pos", title: "POS", icon: "credit-card", route: "/finans/pos", permission: "POS_GOR" },
      { id: "cek-senet", title: "Çek / Senet", icon: "file-check", route: "/finans/cek-senet", permission: "CEK_SENET_GOR" },
      { id: "gelir-gider", title: "Gelir / Gider", icon: "chart-no-axes-combined", route: "/finans/gelir-gider", permission: "GELIR_GIDER_GOR" }
    ]
  },
  {
    id: "belgeler",
    title: "Fatura & Belge",
    icon: "files",
    items: [
      { id: "satis-faturalari", title: "Satış Faturaları", icon: "file-output", route: "/belgeler/satis-faturalari", permission: "FATURA_GOR" },
      { id: "alis-faturalari", title: "Alış Faturaları", icon: "file-input", route: "/belgeler/alis-faturalari", permission: "FATURA_GOR" },
      { id: "irsaliyeler", title: "İrsaliyeler", icon: "truck", route: "/belgeler/irsaliyeler", permission: "IRSALIYE_GOR" },
      { id: "e-fatura", title: "E-Fatura", icon: "file-text", route: "/belgeler/e-fatura", permission: "E_FATURA_GOR" },
      { id: "e-arsiv", title: "E-Arşiv", icon: "archive", route: "/belgeler/e-arsiv", permission: "E_ARSIV_GOR" }
    ]
  },
  {
    id: "raporlar",
    title: "Raporlar",
    icon: "chart-no-axes-combined",
    items: [
      { id: "satis-raporlari", title: "Satış Raporları", icon: "chart-column", route: "/raporlar/satis", permission: "RAPOR_GOR" },
      { id: "kar-analizi", title: "Kâr Analizi", icon: "trending-up", route: "/raporlar/kar", permission: "RAPOR_GOR" },
      { id: "stok-raporlari", title: "Stok Raporları", icon: "boxes", route: "/raporlar/stok", permission: "RAPOR_GOR" },
      { id: "cari-raporlari", title: "Cari Raporlar", icon: "wallet-cards", route: "/raporlar/cari", permission: "RAPOR_GOR" },
      { id: "finans-raporlari", title: "Finans Raporları", icon: "landmark", route: "/raporlar/finans", permission: "RAPOR_GOR" },
      { id: "personel-performans", title: "Personel Performansı", icon: "users", route: "/raporlar/personel", permission: "RAPOR_GOR" }
    ]
  },
  {
    id: "personel",
    title: "Personel",
    icon: "users-round",
    items: [
      { id: "kullanicilar", title: "Kullanıcılar", icon: "user-round-cog", route: "/personel/kullanicilar", permission: "KULLANICI_GOR" },
      { id: "roller", title: "Roller", icon: "shield", route: "/personel/roller", permission: "ROL_GOR" },
      { id: "yetkiler", title: "Yetkiler", icon: "key-round", route: "/personel/yetkiler", permission: "YETKI_GOR" },
      { id: "primler", title: "Primler", icon: "badge-percent", route: "/personel/primler", permission: "PRIM_GOR" }
    ]
  },
  {
    id: "yonetim",
    title: "Yönetim",
    icon: "settings-2",
    items: [
      { id: "sirket-ayarlari", title: "Şirket Ayarları", icon: "building", route: "/ayarlar/sirket", permission: "AYAR_GOR" },
      { id: "subeler", title: "Şubeler", icon: "store", route: "/ayarlar/subeler", permission: "SUBE_GOR" },
      { id: "yonetim-depolar", title: "Depolar", icon: "warehouse", route: "/ayarlar/depolar", permission: "DEPO_GOR" },
      { id: "kullanici-ayarlari", title: "Kullanıcı Ayarları", icon: "user-cog", route: "/ayarlar/kullanici", permission: "AYAR_GOR" },
      { id: "cihazlar", title: "Cihazlar", icon: "monitor-smartphone", route: "/ayarlar/cihazlar", permission: "CIHAZ_GOR" },
      { id: "bildirim-ayarlari", title: "Bildirim Ayarları", icon: "bell-cog", route: "/ayarlar/bildirimler", permission: "AYAR_GOR" },
      { id: "sistem-sagligi", title: "Sistem Sağlığı", icon: "heart-pulse", route: "/ayarlar/sistem-sagligi", permission: "SISTEM_SAGLIK_GOR" },
      { id: "audit-log", title: "Audit Log", icon: "history", route: "/ayarlar/audit-log", permission: "AUDIT_GOR" }
    ]
  }
];

export function menuYetkiyeGoreFiltrele(
  groups: MenuGroup[],
  izinler: string[]
): MenuGroup[] {
  const allowed = new Set(izinler);
  const filterItems = (items: MenuItem[]): MenuItem[] =>
    items
      .filter(item => !item.permission || allowed.has(item.permission))
      .map(item => ({
        ...item,
        children: item.children ? filterItems(item.children) : undefined
      }))
      .filter(item => !item.children || item.children.length > 0);

  return groups
    .map(group => ({ ...group, items: filterItems(group.items) }))
    .filter(group => group.items.length > 0);
}

export function menuAra(groups: MenuGroup[], sorgu: string): MenuItem[] {
  const q = sorgu.trim().toLocaleLowerCase("tr-TR");
  if (!q) return [];
  const result: MenuItem[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      if (
        item.title.toLocaleLowerCase("tr-TR").includes(q) ||
        group.title.toLocaleLowerCase("tr-TR").includes(q)
      ) result.push(item);
      for (const child of item.children ?? []) {
        if (child.title.toLocaleLowerCase("tr-TR").includes(q)) result.push(child);
      }
    }
  }
  return result;
}
