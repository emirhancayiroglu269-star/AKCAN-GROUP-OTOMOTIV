import React from "react";
import { T, MONO } from "../lib/theme";
import { ean13Modulleri } from "../lib/barkod";

type RozetTone = "steel" | "yellow" | "orange" | "green" | "red" | "graphite";

interface RozetProps {
  children?: React.ReactNode;
  tone?: RozetTone;
}

export function Rozet({ children, tone = "steel" }: RozetProps) {
  const tones = {
    steel: { bg: T.steel200, fg: T.ink500 },
    yellow: { bg: "#FDF1D6", fg: "#8A6110" },
    orange: { bg: "#FBE1D5", fg: T.orangeDark },
    green: { bg: "#DEF0DF", fg: T.green },
    red: { bg: "#F9DEDE", fg: T.red },
    graphite: { bg: T.graphite800, fg: "#fff" },
  };
  const s = tones[tone] || tones.steel;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase"
      style={{ background: s.bg, color: s.fg }}
    >
      {children}
    </span>
  );
}

interface KartProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Kart({ children, className = "", style = {} }: KartProps) {
  return (
    <div className={`rounded-xl border shadow-sm ${className}`} style={{ background: "#fff", borderColor: T.steel200, ...style }}>
      {children}
    </div>
  );
}

type ButonVariant = "primary" | "dark" | "ghost" | "danger";

interface ButonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButonVariant;
  className?: string;
}

export function Buton({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
  ...props
}: ButonProps) {
  const base =
    "inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: { background: T.orange, color: "#fff" },
    dark: { background: T.graphite900, color: "#fff" },
    ghost: { background: "transparent", color: T.ink900, border: `1px solid ${T.steel300}` },
    danger: { background: "#fff", color: T.red, border: `1px solid ${T.red}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${className}`}
      style={variants[variant]}
      onMouseOver={(e) => {
        if (variant === "primary") e.currentTarget.style.background = T.orangeDark;
      }}
      onMouseOut={(e) => {
        if (variant === "primary") e.currentTarget.style.background = T.orange;
      }}
      {...props}
    >
      {children}
    </button>
  );
}

interface GirdiProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
}

export function Girdi({ label, hint = "", ...props }: GirdiProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && (
        <span className="font-medium" style={{ color: T.ink500 }}>
          {label}
        </span>
      )}
      <input
        {...props}
        className="px-3 py-2 rounded-md border text-sm outline-none focus:ring-2"
        style={{ borderColor: T.steel300, color: T.ink900 }}
      />
      {hint && (
        <span className="text-xs" style={{ color: T.ink500 }}>
          {hint}
        </span>
      )}
    </label>
  );
}

interface SecimProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  children?: React.ReactNode;
}

export function Secim({ label, children, ...props }: SecimProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && (
        <span className="font-medium" style={{ color: T.ink500 }}>
          {label}
        </span>
      )}
      <select
        {...props}
        className="px-3 py-2 rounded-md border text-sm outline-none bg-white"
        style={{ borderColor: T.steel300, color: T.ink900 }}
      >
        {children}
      </select>
    </label>
  );
}

interface BosProps {
  ikon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  baslik: React.ReactNode;
  aciklama: React.ReactNode;
}

export function Bos({ ikon: Ikon, baslik, aciklama }: BosProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: T.steel200 }}>
        <Ikon size={22} style={{ color: T.ink500 }} />
      </div>
      <p className="font-semibold" style={{ color: T.ink900 }}>
        {baslik}
      </p>
      <p className="text-sm mt-1 max-w-xs" style={{ color: T.ink500 }}>
        {aciklama}
      </p>
    </div>
  );
}

interface TehlikeSeridiProps {
  h?: number;
}

export function TehlikeSeridi({ h = 4 }: TehlikeSeridiProps) {
  return (
    <div
      style={{
        height: h,
        backgroundImage: `repeating-linear-gradient(135deg, ${T.orange} 0 10px, ${T.graphite900} 10px 20px)`,
      }}
    />
  );
}

// Gerçekten okunabilir (scannable) bir EAN-13 barkodu çizer — süsleme değil,
// modüller ean13Modulleri() ile doğru şekilde hesaplanır.
interface EanBarkodProps {
  kod: string;
  genislik?: number;
  yukseklik?: number;
  altYaziGoster?: boolean;
}

export function EanBarkod({
  kod,
  genislik = 180,
  yukseklik = 60,
  altYaziGoster = true,
}: EanBarkodProps) {
  const { modul, kod: tamKod } = ean13Modulleri(kod);
  const moduGenisligi = genislik / modul.length;
  let x = 0;
  const cubuklar = [];
  for (let i = 0; i < modul.length; i++) {
    if (modul[i] === "1") {
      cubuklar.push(<rect key={i} x={x} y={0} width={moduGenisligi} height={yukseklik} fill="#000" />);
    }
    x += moduGenisligi;
  }
  return (
    <div className="inline-flex flex-col items-center">
      <svg width={genislik} height={yukseklik} viewBox={`0 0 ${genislik} ${yukseklik}`}>
        {cubuklar}
      </svg>
      {altYaziGoster && (
        <span style={{ ...MONO, fontSize: 11, letterSpacing: 2 }}>{tamKod}</span>
      )}
    </div>
  );
}
