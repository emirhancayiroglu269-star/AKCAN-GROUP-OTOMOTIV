export interface GuvenlikAuditOlayi {
  islem: string;
  kullaniciId?: string | null;
  basarili: boolean;
  neden?: string;
  referansId?: string | null;
  zaman?: string;
}

/** Gizli veri/PIN/parola kaydetmeden güvenlik olayını normalize eder. */
export function auditOlayiOlustur(input: GuvenlikAuditOlayi): GuvenlikAuditOlayi {
  return {
    ...input,
    zaman: input.zaman || new Date().toISOString(),
  };
}
