"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · Login & Recovery
   Pantalla de acceso y recuperación de contraseña. Estilada con
   design tokens (R8).
   ════════════════════════════════════════════════════════════════════ */

import { useState, type CSSProperties, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { login, requestRecovery } from "@/services/authService";
import { ApiError } from "@/services/spaceService";

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

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const lang =
    typeof params.lang === "string" && params.lang.length > 0
      ? params.lang
      : "es";

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [recoverySent, setRecoverySent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      router.replace(`/${lang}/space`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Credenciales inválidas.");
      } else if (err instanceof ApiError && err.status === 0) {
        setError("No se pudo conectar con la API.");
      } else {
        setError("No se pudo iniciar sesión. Intentá de nuevo.");
      }
      setBusy(false);
    }
  }

  async function onForgotSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestRecovery(email.trim(), lang);
      setRecoverySent(true);
      setBusy(false);
    } catch (err: unknown) {
      setError("No se pudo enviar el email de recuperación. Intentá de nuevo.");
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
        onSubmit={mode === "login" ? onSubmit : onForgotSubmit}
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

        {mode === "login" ? (
          <>
            <h1
              style={{
                fontFamily: "var(--font-title)",
                fontSize: "18px",
                fontWeight: 400,
                color: "var(--text-primary)",
                marginBottom: "18px",
              }}
            >
              Iniciar sesión
            </h1>

            <label style={labelStyle} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, marginBottom: "14px" }}
              placeholder="alejandro@muitowork.com"
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label style={labelStyle} htmlFor="password">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setRecoverySent(false);
                }}
                style={{
                  fontSize: "11px",
                  color: "var(--coral)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  letterSpacing: ".1px",
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "40px" }}
                placeholder="••••••••"
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
                  margin: "10px 0 4px",
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy || email.length === 0 || password.length === 0}
              style={{
                width: "100%",
                marginTop: "16px",
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
              {busy ? "Entrando…" : "Entrar"}
            </button>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: "var(--font-title)",
                fontSize: "18px",
                fontWeight: 400,
                color: "var(--text-primary)",
                marginBottom: "10px",
              }}
            >
              Recuperar contraseña
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "18px",
                lineHeight: 1.4,
              }}
            >
              Ingresá tu email y te enviaremos un enlace seguro para restablecer
              tu contraseña.
            </p>

            {recoverySent ? (
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-sm)",
                  padding: "16px",
                  marginBottom: "16px",
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
                  ¡Enlace enviado!
                </div>
                Si el email está registrado, recibirás las instrucciones en unos
                minutos.
              </div>
            ) : (
              <>
                <label style={labelStyle} htmlFor="recovery-email">
                  Email
                </label>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ ...inputStyle, marginBottom: "14px" }}
                  placeholder="alejandro@muitowork.com"
                />

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
                  disabled={busy || email.length === 0}
                  style={{
                    width: "100%",
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
                  {busy ? "Enviando…" : "Enviar enlace"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setRecoverySent(false);
              }}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "11px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--border-default)",
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Volver a Iniciar Sesión
            </button>
          </>
        )}

        <div
          style={{
            marginTop: "16px",
            fontSize: "11px",
            color: "var(--text-faint)",
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Acceso provisionado por tu administrador · sesión segura httpOnly
        </div>
      </form>
    </div>
  );
}
