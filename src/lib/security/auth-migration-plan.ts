/**
 * V34 — Supabase Auth migration contract.
 *
 * IMPORTANT:
 * - Do not copy plaintext passwords.
 * - Do not create Auth users automatically from app_state passwords.
 * - Existing application role IDs are preserved as a mapping target.
 */
export interface AuthMigrationUser {
  legacyUserId: string;
  username: string;
  displayName: string;
  roleId: string;
  active: boolean;
}

export interface AuthProvisioningResult {
  legacyUserId: string;
  authUserId?: string;
  status: "pending" | "provisioned" | "disabled" | "error";
  error?: string;
}

export const AUTH_MIGRATION_RULES = {
  plaintextPasswordImport: false,
  preserveLegacyUserId: true,
  preserveRoleId: true,
  requirePasswordReset: true,
  requireAuthenticatedSession: true,
  productionPasswordWrite: false,
} as const;
