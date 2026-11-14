/* Stok — modal orkestrasyonu (ince kabuk).
   Her modal kendi dosyasında ve kendi state'ini kendisi taşıyor:
     MukerrerUyariModal · StokGirisiModal · RafTasimaModal · StokDuzeltmeModal
     StokHareketModal · TedarikciKarsilastirmaModal · AlisGecmisiModal
     FiyatGecmisiModal · KodYonetimiModal · BarkodYonetimiModal · UyumluAraclarModal
   Bu dosya yalnızca hangi modalın açık olduğunu bilir (id state'leri StokSayfasi'nda)
   ve ürünü ilgili modala geçirir. */
import React from "react";
import * as R from "../core/akcan-runtime";
import { MukerrerUyariModal } from "./MukerrerUyariModal";
import { StokGirisiModal } from "./StokGirisiModal";
import { RafTasimaModal } from "./RafTasimaModal";
import { StokDuzeltmeModal } from "./StokDuzeltmeModal";
import { StokHareketModal } from "./StokHareketModal";
import { TedarikciKarsilastirmaModal } from "./TedarikciKarsilastirmaModal";
import { AlisGecmisiModal } from "./AlisGecmisiModal";
import { FiyatGecmisiModal } from "./FiyatGecmisiModal";
import { KodYonetimiModal } from "./KodYonetimiModal";
import { BarkodYonetimiModal } from "./BarkodYonetimiModal";
import { UyumluAraclarModal } from "./UyumluAraclarModal";

export function StokModallari({
  db,
  updateDb,
  aktifKullanici,
  // --- açık modal kimlikleri (StokSayfasi'nda yaşıyor) ---
  uyariModal,
  setUyariModal,
  girisModalId,
  setGirisModalId,
  rafModalId,
  setRafModalId,
  duzeltmeModalId,
  setDuzeltmeModalId,
  hareketlerAcikId,
  setHareketlerAcikId,
  tedarikciKarsilastirmaAcikId,
  setTedarikciKarsilastirmaAcikId,
  gecmisAcikId,
  setGecmisAcikId,
  fiyatGecmisAcikId,
  setFiyatGecmisAcikId,
  kodModalId,
  setKodModalId,
  barkodModalId,
  setBarkodModalId,
  aracModalId,
  setAracModalId,
  // --- kaydetme akışına geri dönen çağrı ---
  formuAc,
  kaydet,
}) {
  const parcaBul = (id) => (id ? db.parcalar.find((p) => p.id === id) : null);

  return (
    <>
      {uyariModal && (
        <MukerrerUyariModal uyariModal={uyariModal} setUyariModal={setUyariModal} formuAc={formuAc} kaydet={kaydet} />
      )}

      {parcaBul(girisModalId) && (
        <StokGirisiModal db={db} updateDb={updateDb} parca={parcaBul(girisModalId)} onKapat={() => setGirisModalId(null)} />
      )}

      {parcaBul(rafModalId) && (
        <RafTasimaModal db={db} updateDb={updateDb} parca={parcaBul(rafModalId)} onKapat={() => setRafModalId(null)} />
      )}

      {parcaBul(duzeltmeModalId) && (
        <StokDuzeltmeModal
          db={db}
          updateDb={updateDb}
          aktifKullanici={aktifKullanici}
          parca={parcaBul(duzeltmeModalId)}
          onKapat={() => setDuzeltmeModalId(null)}
        />
      )}

      {parcaBul(hareketlerAcikId) && <StokHareketModal db={db} parca={parcaBul(hareketlerAcikId)} onKapat={() => setHareketlerAcikId(null)} />}

      {parcaBul(tedarikciKarsilastirmaAcikId) && (
        <TedarikciKarsilastirmaModal parca={parcaBul(tedarikciKarsilastirmaAcikId)} onKapat={() => setTedarikciKarsilastirmaAcikId(null)} />
      )}

      {parcaBul(gecmisAcikId) && <AlisGecmisiModal parca={parcaBul(gecmisAcikId)} onKapat={() => setGecmisAcikId(null)} />}

      {parcaBul(fiyatGecmisAcikId) && <FiyatGecmisiModal parca={parcaBul(fiyatGecmisAcikId)} onKapat={() => setFiyatGecmisAcikId(null)} />}

      {parcaBul(kodModalId) && (
        <KodYonetimiModal db={db} updateDb={updateDb} parca={parcaBul(kodModalId)} onKapat={() => setKodModalId(null)} />
      )}

      {parcaBul(barkodModalId) && (
        <BarkodYonetimiModal db={db} updateDb={updateDb} parca={parcaBul(barkodModalId)} onKapat={() => setBarkodModalId(null)} />
      )}

      {parcaBul(aracModalId) && (
        <UyumluAraclarModal db={db} updateDb={updateDb} parca={parcaBul(aracModalId)} onKapat={() => setAracModalId(null)} />
      )}
    </>
  );
}
