import { tl, tarihGoster } from "./format";
import { bildirimGoster } from "./bildirim";

// Satış belgesi yazdırma — Belge türü, mağaza bilgileri, OEM kodları,
// ürün/marka/kod detayları ve (iptal edildiyse) iptal damgasıyla birlikte
// eksiksiz bir belge üretir. Hem Satış ekranından hem Belgeler sayfasından
// aynı fonksiyon çağrılır.
export const belgeYazdir = (db, satis) => {
  const pencere = window.open("", "_blank", "width=420,height=680");
  if (!pencere) {
    bildirimGoster("Yazdırma penceresi açılamadı — pop-up engelleyiciyi kontrol edin.", "hata");
    return;
  }
  const magaza = db.magazaBilgileri || {};
  const belgeNo = satis.belgeNo || satis.id.slice(-6).toUpperCase();
  const kalemlerHtml = satis.kalemler
    .map((k) => {
      const oemler = db.kodlar.filter((kd) => kd.parcaId === k.parcaId && kd.tip === "OEM").map((kd) => kd.kod);
      return `
        <tr>
          <td>
            <div>${k.ad}</div>
            <div class="alt">${k.marka || ""} · ${k.stokKodu || ""}${oemler.length ? ` · OEM: ${oemler.join(", ")}` : ""}</div>
          </td>
          <td style="text-align:center">×${k.adet}</td>
          <td style="text-align:right">${tl(k.birimFiyat)}</td>
          <td style="text-align:right">${tl(k.adet * k.birimFiyat - (k.iskontoTutari || 0) - (k.genelIskontoPayi || 0))}</td>
        </tr>`;
    })
    .join("");
  const odemelerHtml = satis.odemeler.map((o) => `<div class="satir"><span>${o.yontem}</span><span>${tl(o.tutar)}</span></div>`).join("");
  const iptalHtml =
    satis.durum === "İptal Edildi"
      ? `<div class="iptal-damga">
           ❌ İPTAL EDİLDİ<br/>
           İptal eden: ${satis.iptalEden || "—"}<br/>
           Tarih: ${satis.iptalTarihi ? tarihGoster(satis.iptalTarihi) : "—"}<br/>
           Sebep: ${satis.iptalNedeni || "—"}
         </div>`
      : "";
  pencere.document.write(`
    <html>
      <head>
        <title>${satis.belgeTuru || "Satış Fişi"} — ${belgeNo}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 16px; font-size: 12px; color: #14171A; }
          h2 { margin: 0 0 2px 0; font-size: 15px; }
          .alt { color: #5B6470; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td { padding: 4px 0; vertical-align: top; }
          .cizgi { border-top: 1px dashed #999; margin-top: 8px; padding-top: 8px; }
          .satir { display:flex; justify-content:space-between; }
          .toplam { font-weight: bold; font-size: 14px; }
          .baslik-turu { display:inline-block; padding: 2px 8px; border: 1px solid #14171A; border-radius: 3px; font-size: 10px; font-weight: bold; margin-bottom: 4px; }
          .iptal-damga { margin-top: 12px; padding: 8px; border: 2px solid #C0392B; color: #C0392B; font-weight: bold; text-align: center; font-size: 11px; }
        </style>
      </head>
      <body>
        ${magaza.logo ? `<img src="${magaza.logo}" style="max-height:40px;margin-bottom:6px;" />` : ""}
        <h2>${magaza.ad || "AKCAN GROUP OTOMOTİV"}</h2>
        <div class="alt">
          ${[magaza.adres, magaza.telefon, magaza.eposta].filter(Boolean).join(" · ")}
          ${magaza.vergiDairesi || magaza.vergiNo ? `<br/>${magaza.vergiDairesi || ""} V.D. ${magaza.vergiNo || ""}` : ""}
        </div>
        <div class="cizgi">
          <span class="baslik-turu">${satis.belgeTuru || "Satış Fişi"}</span>
          <div class="satir"><span>Belge No</span><span>${belgeNo}</span></div>
          <div class="satir"><span>Tarih/Saat</span><span>${new Date(satis.tarih).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
          <div class="satir"><span>Müşteri</span><span>${satis.musteriAdi}</span></div>
          <div class="satir"><span>Satışı Yapan</span><span>${satis.satisiYapan || "—"}</span></div>
        </div>
        <table>
          <thead><tr><td class="alt">Ürün</td><td class="alt" style="text-align:center">Adet</td><td class="alt" style="text-align:right">B.Fiyat</td><td class="alt" style="text-align:right">Tutar</td></tr></thead>
          <tbody>${kalemlerHtml}</tbody>
        </table>
        <div class="cizgi">
          <div class="satir"><span>Ara Toplam</span><span>${tl(satis.araToplam)}</span></div>
          ${satis.iskontoToplam > 0 ? `<div class="satir"><span>İskonto</span><span>−${tl(satis.iskontoToplam)}</span></div>` : ""}
          <div class="satir"><span>KDV (dahil)</span><span>${tl(satis.kdvToplam)}</span></div>
          <div class="satir toplam"><span>GENEL TOPLAM</span><span>${tl(satis.genelToplam)}</span></div>
        </div>
        <div class="cizgi">${odemelerHtml}</div>
        ${satis.not ? `<div class="cizgi alt">Not: ${satis.not}</div>` : ""}
        ${iptalHtml}
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `);
  pencere.document.close();
};
