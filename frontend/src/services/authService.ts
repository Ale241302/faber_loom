/* ════════════════════════════════════════════════════════════════════
   FaberLoom · authService
   Login / logout / sesión actual. Tipado estricto (sin `any`).
   Reusa el wrapper `request` de spaceService (cookie httpOnly, credentials).
   ════════════════════════════════════════════════════════════════════ */

import { request } from "@/services/spaceService";
import type { LoginBody, LogoutResult, UserOut } from "@/services/types";

/** POST /api/auth/login → fija la cookie de sesión y devuelve el usuario. */
export function login(body: LoginBody): Promise<UserOut> {
  return request<UserOut>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/auth/logout → borra la cookie de sesión. */
export function logout(): Promise<LogoutResult> {
  return request<LogoutResult>("/auth/logout", { method: "POST" });
}

/** GET /api/auth/me → usuario autenticado (lanza ApiError 401 si no hay). */
export function getMe(): Promise<UserOut> {
  return request<UserOut>("/auth/me");
}

/** POST /api/auth/recovery/request → solicita email de recuperación. */
export function requestRecovery(email: string, lang: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/auth/recovery/request", {
    method: "POST",
    body: JSON.stringify({ email, lang }),
  });
}
