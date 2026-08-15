export interface EdgeTestMeta {
  testRunId: string;
  dryRun: boolean;
}

export function edgeDryRunKontrol(meta: EdgeTestMeta): {
  ok: boolean;
  hata?: string;
} {
  if (!meta.testRunId) return { ok: false, hata: "testRunId zorunlu." };
  if (meta.dryRun !== true) {
    return { ok: false, hata: "Güvenli test için dryRun=true zorunlu." };
  }
  return { ok: true };
}

export function edgeCommitYasakla(meta: EdgeTestMeta): void {
  if (meta.dryRun) {
    throw new Error("DRY_RUN: gerçek database commit işlemi yapılamaz.");
  }
}
