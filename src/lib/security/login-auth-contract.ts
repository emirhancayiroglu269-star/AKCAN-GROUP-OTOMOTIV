export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSessionUser {
  id: string;
  email?: string;
  roleId?: string | null;
  displayName?: string | null;
  active: boolean;
}

export interface LoginResult {
  ok: boolean;
  user?: AuthSessionUser;
  error?: string;
}

/**
 * Login katmanı için güvenli sözleşme.
 * Gerçek Supabase çağrısı UI bileşeninden değil, merkezi auth servisinden yapılmalıdır.
 */
export function loginInputValidate(input: LoginInput): { ok: boolean; error?: string } {
  if (!input.email?.trim()) return { ok: false, error: "E-posta zorunlu." };
  if (!input.password) return { ok: false, error: "Parola zorunlu." };
  return { ok: true };
}

export function sessionUserValidate(user: AuthSessionUser | null): {
  ok: boolean;
  error?: string;
} {
  if (!user?.id) return { ok: false, error: "Geçerli oturum bulunamadı." };
  if (!user.active) return { ok: false, error: "Kullanıcı pasif." };
  return { ok: true };
}
