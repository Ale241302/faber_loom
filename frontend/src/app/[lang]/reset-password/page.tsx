"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · Reset Password
   Pantalla para establecer la nueva contraseña a partir del token.
   Estilada con design tokens (R8).
   ════════════════════════════════════════════════════════════════════ */

import { Suspense, useState, type CSSProperties, type FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const params = useParams<{ lang: string }>();
  const lang =
    typeof params.lang === "string" && params.lang.length > 0
      ? params.lang
      : "es";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Token de recuperación ausente en la URL.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const response = await fetch(`${apiUrl}/api/auth/recovery/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Token inválido o expirado.");
      }

      setSuccess(true);
      // Automatically logged in by session cookie, redirect to SpaceLoom
      setTimeout(() => {
        router.replace(`/${lang}/space`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña. Intentá de nuevo.");
      setBusy(false);
    }
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    background: "var(--bg-sunken)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--r-sm)",
    padding: "11px 13px",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: CSSProperties = {
    fontSize: "11px",
    color: "var(--text-muted)",
    marginBottom: "6px",
    display: "block",
    letterSpacing: ".3px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background:
          "linear-gradient(var(--elev-top),transparent),var(--bg-canvas)",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "380px",
          background:
            "linear-gradient(var(--elev-top),transparent),var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow)",
          padding: "28px 26px",
          boxSizing: "border-box",
        }}
      >
        {/* Logo block */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "11px",
              background:
                "linear-gradient(150deg,var(--coral),var(--coral-deep))",
              display: "grid",
              placeItems: "center",
              color: "var(--bg-canvas)",
              fontFamily: "var(--font-title)",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-title)",
                fontSize: "19px",
                color: "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              Faber<span style={{ color: "var(--coral)" }}>*</span>loom
            </div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
              Copiloto B2B · tenant MWT
            </div>
          </div>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-title)",
            fontSize: "18px",
            fontWeight: 400,
            color: "var(--text-primary)",
            marginBottom: "10px",
          }}
        >
          Nueva contraseña
        </h1>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginBottom: "18px",
            lineHeight: 1.4,
          }}
        >
          Establecé tu nueva contraseña para ingresar al sistema.
        </p>

        {success ? (
          <div
            style={{
              fontSize: "13px",
              color: "var(--text-primary)",
              background: "var(--bg-sunken)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-sm)",
              padding: "16px",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                color: "var(--coral)",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              ¡Contraseña restablecida!
            </div>
            Ingresando al sistema…
          </div>
        ) : (
          <>
            <label style={labelStyle} htmlFor="password">
              Nueva contraseña
            </label>
            <div style={{ position: "relative", marginBottom: "14px" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "40px" }}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <label style={labelStyle} htmlFor="confirm-password">
              Repetir contraseña
            </label>
            <div style={{ position: "relative", marginBottom: "14px" }}>
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                disabled={busy}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "40px" }}
                placeholder="Repetir contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error ? (
              <div
                role="alert"
                style={{
                  fontSize: "12px",
                  color: "var(--vino)",
                  background: "var(--vino-soft)",
                  border: "1px solid var(--vino-deep)",
                  borderRadius: "var(--r-sm)",
                  padding: "8px 11px",
                  margin: "10px 0 14px",
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                busy || password.length < 8 || password !== confirmPassword
              }
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "11px",
                borderRadius: "var(--r-sm)",
                border: "none",
                fontSize: "13.5px",
                fontWeight: 600,
                cursor: busy ? "default" : "pointer",
                background: busy ? "var(--bg-raised)" : "var(--coral)",
                color: busy ? "var(--text-faint)" : "var(--bg-canvas)",
              }}
            >
              {busy ? "Guardando…" : "Establecer y entrar"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "var(--bg-canvas)",
            color: "var(--text-muted)",
            fontSize: "14px",
          }}
        >
          Cargando…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
