/* Giris module — extracted from the V16 monolith. */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as R from "../core/akcan-runtime";

export function IlkKurulumEkrani({ onOlustur }) {
  const [adSoyad, setAdSoyad] = R.useState("");
  const [kullaniciAdi, setKullaniciAdi] = R.useState("");
  const [sifre, setSifre] = R.useState("");
  const [hata, setHata] = R.useState("");

  const gonder = () => {
    if (!adSoyad.trim() || !kullaniciAdi.trim() || !sifre.trim()) {
      setHata("Tüm alanları doldurun.");
      return;
    }
    if (!R.sifreGucluMu(sifre)) {
      setHata("Şifre en az 8 karakter olmalı ve en az 1 harf + 1 rakam içermeli.");
      return;
    }
    onOlustur(adSoyad.trim(), kullaniciAdi.trim(), sifre);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: R.T.steel100, fontFamily: "'Inter', sans-serif" }}>
      <style>{R.fontImport}</style>
      <div className="w-full max-w-sm rounded-lg p-6" style={{ background: "#fff" }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded flex items-center justify-center shrink-0" style={{ background: R.T.orange }}>
            <R.Car size={18} color="#fff" />
          </div>
          <div style={{ ...R.DISPLAY, fontSize: 15, color: R.T.ink900 }}>AKCAN GROUP OTOMOTİV</div>
        </div>
        <h1 className="text-lg font-semibold mt-4 mb-1" style={{ ...R.DISPLAY, color: R.T.ink900 }}>
          İlk Kurulum
        </h1>
        <p className="text-sm mb-4" style={{ color: R.T.ink500 }}>
          Programı kullanmaya başlamak için önce bir Yönetici hesabı oluşturun. Bu hesap tam yetkiye sahip olacak.
        </p>
        <div className="flex flex-col gap-3">
          <R.Girdi label="Ad Soyad" value={adSoyad} onChange={(e) => setAdSoyad(e.target.value)} placeholder="ör. Emirhan Akcan" autoFocus />
          <R.Girdi label="Kullanıcı Adı" value={kullaniciAdi} onChange={(e) => setKullaniciAdi(e.target.value)} placeholder="ör. emirhan" />
          <R.Girdi label="Şifre" type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} placeholder="En az 8 karakter + rakam" />
          {hata && (
            <p className="text-xs" style={{ color: R.T.red }}>
              {hata}
            </p>
          )}
          <R.Buton onClick={gonder}>
            <R.Check size={15} /> Yönetici Hesabını Oluştur ve Başla
          </R.Buton>
        </div>
      </div>
    </div>
  );
}

export function GirisEkrani({ onGiris }) {
  const [kullaniciAdi, setKullaniciAdi] = R.useState("");
  const [sifre, setSifre] = R.useState("");
  const [hata, setHata] = R.useState("");
  const [yukleniyor, setYukleniyor] = R.useState(false);
  const [sifreGoster, setSifreGoster] = R.useState(false);

  const gonder = async () => {
    if (!kullaniciAdi.trim() || !sifre.trim()) {
      setHata("Kullanıcı adı ve şifre girin.");
      return;
    }
    setHata("");
    setYukleniyor(true);
    try {
      const basarili = await onGiris(kullaniciAdi, sifre);
      if (!basarili) {
        setHata("Kullanıcı adı veya şifre hatalı.");
        setSifre("");
      }
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="akcan-login" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{R.fontImport}</style>

      <div className="akcan-login-grid">
        {/* Referans tasarımın sol kurumsal alanı */}
        <section
          className="akcan-login-brand"
          style={{ backgroundImage: `url(${R.loginBrandImage})` }}
          aria-label="AKCAN GROUP Otomotiv ERP"
        >
          <div className="akcan-login-brand-shade" />
          <div className="akcan-login-brand-content">
            <div className="akcan-login-brand-bottom">
              <div className="akcan-login-brand-caption">
                <span className="akcan-login-brand-dot" />
                <span>AKCAN GROUP OTOMOTİV ERP</span>
              </div>
              <div className="akcan-login-brand-line">
                Merkezi yönetim • Stok • Satış • Servis • Finans
              </div>
            </div>
          </div>
        </section>

        {/* Gerçek, etkileşimli giriş formu */}
        <section className="akcan-login-panel">
          <div className="akcan-login-panel-inner">
            <div className="akcan-login-mobile-brand">
              <div className="akcan-login-mobile-mark">
                <R.Car size={23} strokeWidth={2.2} />
              </div>
              <div>
                <div className="akcan-login-mobile-name">AKCAN<span> GROUP</span></div>
                <div className="akcan-login-mobile-sub">OTOMOTİV ERP</div>
              </div>
            </div>

            <div className="akcan-login-card">
              <div className="akcan-login-lock">
                <R.Lock size={27} strokeWidth={1.8} />
              </div>

              <div className="akcan-login-form-head">
                <div className="akcan-login-form-kicker">PERSONEL GİRİŞİ</div>
                <h1 className="akcan-login-heading">Hoş Geldiniz</h1>
                <p className="akcan-login-muted">
                  Hesabınıza giriş yaparak sisteme devam edin.
                </p>
                <div className="akcan-login-divider"><span /></div>
              </div>

              <div className="akcan-login-fields">
                <div>
                  <label className="akcan-login-label" htmlFor="akcan-kullanici">
                    KULLANICI ADI
                  </label>
                  <div className="akcan-login-input-wrap">
                    <R.Users size={19} />
                    <input
                      id="akcan-kullanici"
                      className="akcan-login-input"
                      value={kullaniciAdi}
                      onChange={(e) => { setKullaniciAdi(e.target.value); setHata(""); }}
                      autoFocus
                      autoComplete="username"
                      placeholder="Kullanıcı adınızı girin"
                      onKeyDown={(e) => e.key === "Enter" && gonder()}
                    />
                  </div>
                </div>

                <div>
                  <label className="akcan-login-label" htmlFor="akcan-sifre">
                    ŞİFRE
                  </label>
                  <div className="akcan-login-input-wrap">
                    <R.Lock size={19} />
                    <input
                      id="akcan-sifre"
                      className="akcan-login-input"
                      type={sifreGoster ? "text" : "password"}
                      value={sifre}
                      onChange={(e) => { setSifre(e.target.value); setHata(""); }}
                      autoComplete="current-password"
                      placeholder="Şifrenizi girin"
                      onKeyDown={(e) => e.key === "Enter" && gonder()}
                    />
                    <button
                      type="button"
                      className="akcan-login-eye"
                      onClick={() => setSifreGoster((v) => !v)}
                      aria-label={sifreGoster ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {sifreGoster ? <R.EyeOff size={19} /> : <R.Eye size={19} />}
                    </button>
                  </div>
                </div>

                {hata && (
                  <div className="akcan-login-error">
                    <R.AlertTriangle size={16} />
                    <span>{hata}</span>
                  </div>
                )}

                <div className="akcan-login-options">
                  <label className="akcan-login-check">
                    <span className="akcan-login-check-box"><R.Check size={12} /></span>
                    <span>Beni hatırla</span>
                  </label>
                  <span className="akcan-login-help">Şifrenizi unuttuysanız yöneticinizle iletişime geçin.</span>
                </div>

                <button
                  type="button"
                  className="akcan-login-submit"
                  onClick={gonder}
                  disabled={yukleniyor}
                >
                  {yukleniyor ? <R.Loader2 size={19} className="animate-spin" /> : <R.LogIn size={19} />}
                  <span>{yukleniyor ? "Giriş yapılıyor..." : "GİRİŞ YAP"}</span>
                  {!yukleniyor && <R.ChevronRight size={18} className="akcan-login-submit-arrow" />}
                </button>
              </div>

              <div className="akcan-login-security">
                <R.ShieldCheck size={18} />
                <div>
                  <strong>Güvenli Oturum</strong>
                  <span>15 dakika işlem yapılmadığında ekran otomatik olarak kilitlenir.</span>
                </div>
              </div>
            </div>

            <div className="akcan-login-footer">
              © {new Date().getFullYear()} <span>AKCAN GROUP</span> OTOMOTİV ERP
              <i>•</i>
              Tüm hakları saklıdır.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
