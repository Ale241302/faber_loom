"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { login, ApiError } from "@/services/spaceService";

export default function LoginPage() {
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "es";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      // Redirigir a la aplicación principal tras login exitoso
      router.push(`/${lang}/space`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message === "La API respondió 401" ? "Credenciales inválidas" : err.message);
      } else {
        setError("Error de conexión al servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <style jsx global>{`
        body {
          background-color: #1A1815 !important;
          color: #F4F1ED !important;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
      `}</style>
      <style jsx>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: #1A1815;
          padding: 20px;
        }
        .login-card {
          background-color: #23201C;
          border: 1px solid #48423A;
          border-radius: 12px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .logo-area {
          margin-bottom: 30px;
        }
        .logo-mark {
          display: inline-block;
          width: 44px;
          height: 44px;
          line-height: 44px;
          background-color: #E8896A;
          color: #1A1815;
          border-radius: 8px;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .logo-title {
          font-family: Georgia, serif;
          font-size: 24px;
          color: #F4F1ED;
          margin: 0 0 5px 0;
        }
        .logo-subtitle {
          font-size: 13px;
          color: #9A9488;
          margin: 0;
        }
        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }
        .form-label {
          display: block;
          font-size: 12px;
          color: #9A9488;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .form-input {
          width: 100%;
          background-color: #151310;
          border: 1px solid #48423A;
          border-radius: 8px;
          padding: 12px 14px;
          color: #F4F1ED;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }
        .form-input:focus {
          border-color: #E8896A;
        }
        .error-message {
          background-color: rgba(224, 120, 106, 0.1);
          border: 1px solid #E0786A;
          color: #E0786A;
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: left;
        }
        .submit-btn {
          width: 100%;
          background-color: #E8896A;
          color: #1A1815;
          border: none;
          border-radius: 8px;
          padding: 14px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease, opacity 0.2s ease;
        }
        .submit-btn:hover {
          background-color: #ef9c81;
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <div className="login-card">
        <div className="logo-area">
          <div className="logo-mark">F</div>
          <h1 className="logo-title">FaberLoom</h1>
          <p className="logo-subtitle">Copiloto de Backoffice Comercial B2B</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Usuario (Email)</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@muitowork.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar a la Plataforma"}
          </button>
        </form>
      </div>
    </div>
  );
}
