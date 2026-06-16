"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · Login
   Pantalla de acceso. Sin shell. Estilada solo con design tokens (R8) —
   cero hex hardcodeado; funciona en los 7 data-theme.
   En éxito fija la cookie de sesión (httpOnly) y entra a SpaceLoom.
   ════════════════════════════════════════════════════════════════════ */

import { useState, type CSSProperties, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { login } from "@/services/authService";
import { ApiError } from "@/services/spaceService";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams<{ lang: string }>();
  const lang =
    typeof params.lang === "string" && params.lang.length > 0
      ? params.lang
      : "es";

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
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

  const inputStyle: CSSProperties = {
    width: "100%",
    background: "var(--bg-sunken)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--r-sm)",
    padding: "11px 13px",
    color: "var(--text-primary)",
    fontSize: "14px",
    outline: "none",
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
        }}
      >
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
          placeholder="alvaro@mwt.local"
        />

        <label style={labelStyle} htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ ...inputStyle, marginBottom: "8px" }}
          placeholder="••••••••"
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
