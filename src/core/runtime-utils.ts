/* Runtime utility functions for AKCAN GROUP OTOMOTIV. */
import { isoGun } from "../lib/format";
import { ean13Modulleri } from "../lib/barkod";

// Basit bir diziyi Excel'de açılabilir CSV dosyası olarak indirir.
export const csvIndir = (dosyaAdi, basliklar, satirlar) => {
  const kacis = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const icerik = [basliklar.map(kacis).join(","), ...satirlar.map((s) => s.map(kacis).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF" + icerik], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Tırnak içindeki virgül/satır sonu gibi durumları doğru işleyen gerçek bir
// CSV ayrıştırıcı (Excel'in "CSV UTF-8" olarak kaydettiği dosyalarla uyumlu).
// Virgül, noktalı virgül ve TAB ile ayrılmış dosyaları otomatik algılar.
export const csvAyristir = (metin) => {
  const temiz = metin.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const ilkSatir = temiz.slice(0, temiz.indexOf("\n") > -1 ? temiz.indexOf("\n") : temiz.length);
  const ayirici = (ilkSatir.match(/;/g) || []).length > (ilkSatir.match(/,/g) || []).length ? ";" : ilkSatir.includes("\t") && !ilkSatir.includes(",") ? "\t" : ",";
  const satirlar = [];
  let satir = [];
  let alan = "";
  let tirnakIci = false;
  for (let i = 0; i < temiz.length; i++) {
    const c = temiz[i];
    if (tirnakIci) {
      if (c === '"') {
        if (temiz[i + 1] === '"') {
          alan += '"';
          i++;
        } else tirnakIci = false;
      } else alan += c;
    } else if (c === '"') {
      tirnakIci = true;
    } else if (c === ayirici) {
      satir.push(alan);
      alan = "";
    } else if (c === "\n") {
      satir.push(alan);
      satirlar.push(satir);
      satir = [];
      alan = "";
    } else {
      alan += c;
    }
  }
  if (alan.length > 0 || satir.length > 0) {
    satir.push(alan);
    satirlar.push(satir);
  }
  const satirlarBos = satirlar.filter((s) => !(s.length === 1 && s[0].trim() === ""));
  if (satirlarBos.length === 0) return { basliklar: [], satirlar: [] };
  const [basliklar, ...veri] = satirlarBos;
  return { basliklar: basliklar.map((b) => b.trim()), satirlar: veri };
};

// Bir görsel dosyasını canvas üzerinden yeniden boyutlandırıp JPEG olarak
// yeniden sıkıştırır — "otomatik sıkıştırma" gereksinimi burada karşılanır;
// büyük fotoğraflar depolamayı şişirmeden saklanabilir.
export const fotografSikistir = (dosya, maksimumKenar = 1000, kalite = 0.78) =>
  new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maksimumKenar || height > maksimumKenar) {
          if (width > height) {
            height = Math.round((height * maksimumKenar) / width);
            width = maksimumKenar;
          } else {
            width = Math.round((width * maksimumKenar) / height);
            height = maksimumKenar;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", kalite));
      };
      img.onerror = reject;
      img.src = typeof ev.target.result === "string" ? ev.target.result : "";
    };
    okuyucu.onerror = reject;
    okuyucu.readAsDataURL(dosya);
  });

export const vadeGrubuBul = (vadeTarihi) => {
  if (!vadeTarihi) return "60+ gün";
  const bugunIso = isoGun(new Date());
  const gunFarki = Math.round((new Date(vadeTarihi).getTime() - new Date(bugunIso).getTime()) / 86400000);
  if (gunFarki < 0) return "Vadesi Geçmiş";
  if (gunFarki === 0) return "Bugün";
  if (gunFarki <= 7) return "1–7 gün";
  if (gunFarki <= 30) return "8–30 gün";
  if (gunFarki <= 60) return "31–60 gün";
  return "60+ gün";
};

export const ean13SvgHtml = (kodHam, genislik = 140, yukseklik = 45) => {
  const { modul, kod } = ean13Modulleri(kodHam);
  const moduGenisligi = genislik / modul.length;
  let x = 0;
  let cubuklar = "";
  for (let i = 0; i < modul.length; i++) {
    if (modul[i] === "1") cubuklar += `<rect x="${x.toFixed(2)}" y="0" width="${moduGenisligi.toFixed(2)}" height="${yukseklik}" fill="#000"/>`;
    x += moduGenisligi;
  }
  return `<svg width="${genislik}" height="${yukseklik}" viewBox="0 0 ${genislik} ${yukseklik}">${cubuklar}</svg><div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-align:center;">${kod}</div>`;
};
