export interface SessionState {
  authenticated: boolean;
  userId?: string;
  roleId?: string | null;
  active?: boolean;
}

export function sessionGuard(session: SessionState | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!session?.authenticated || !session.userId) {
    return { allowed: false, reason: "Oturum bulunamadı." };
  }
  if (session.active === false) {
    return { allowed: false, reason: "Kullanıcı pasif." };
  }
  return { allowed: true };
}

export function logoutState(): SessionState {
  return { authenticated: false };
}
