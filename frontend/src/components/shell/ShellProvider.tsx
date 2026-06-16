"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · ShellProvider
   Context global del shell: tema, modo (operar/aprender/admin), rails,
   contexto activo de workspace y datos cargados (workspaces/historial).
   Persiste tema y modo en localStorage (app real).
   ════════════════════════════════════════════════════════════════════ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getWorkspaces,
  getConversations,
  ApiError,
} from "@/services/spaceService";
import { getMe, logout as apiLogout } from "@/services/authService";
import type {
  WorkspaceOut,
  ConversationOut,
  UserOut,
} from "@/services/types";

const LOGIN_PATH = "/es/login";

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = LOGIN_PATH;
  }
}

export type ThemeId =
  | "warm"
  | "slate"
  | "paper"
  | "mono"
  | "indigo"
  | "cloud"
  | "mist";

export type ShellMode = "operar" | "aprender" | "admin";

export interface ActiveContext {
  id: string;
  name: string;
  sub: string;
  type: string;
  /** token de color, p.ej. "var(--coral)" */
  color: string;
}

export type LoadStatus = "idle" | "loading" | "ready" | "error";

const GLOBAL_CONTEXT: ActiveContext = {
  id: "global",
  name: "Sin contexto",
  sub: "KB tenant · cross-workspace",
  type: "Global",
  color: "var(--text-muted)",
};

/** mapeo token semántico (DB) -> var() de color */
const COLOR_VAR: Record<string, string> = {
  coral: "var(--coral)",
  amber: "var(--amber)",
  sage: "var(--sage)",
  slate: "var(--slate)",
  vino: "var(--vino)",
};

/** mapeo kind (DB) -> etiqueta ctxtype del mock */
const KIND_LABEL: Record<string, string> = {
  client: "B2B",
  topic: "Tema",
  shared: "Shared",
};

export interface ShellContextValue {
  // sesión
  user: UserOut | null;
  authStatus: LoadStatus;
  logout: () => void;
  // tema
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  // modo
  mode: ShellMode;
  setMode: (m: ShellMode) => void;
  // rails
  railLeftHidden: boolean;
  railRightHidden: boolean;
  toggleRailLeft: () => void;
  toggleRailRight: () => void;
  // contexto activo
  activeContext: ActiveContext;
  setContextById: (id: string) => void;
  // datos
  workspaces: WorkspaceOut[];
  conversations: ConversationOut[];
  workspacesStatus: LoadStatus;
  conversationsStatus: LoadStatus;
  dataError: string | null;
  reloadData: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

const THEME_KEY = "faberloom_theme";
const MODE_KEY = "faberloom_mode";
const VALID_THEMES: ReadonlyArray<ThemeId> = [
  "warm",
  "slate",
  "paper",
  "mono",
  "indigo",
  "cloud",
  "mist",
];

function applyTheme(t: ThemeId): void {
  if (t === "warm") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", t);
  }
}

export function ShellProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("warm");
  const [mode, setModeState] = useState<ShellMode>("operar");
  const [railLeftHidden, setRailLeftHidden] = useState<boolean>(false);
  const [railRightHidden, setRailRightHidden] = useState<boolean>(true);
  const [activeContext, setActiveContext] =
    useState<ActiveContext>(GLOBAL_CONTEXT);

  const [user, setUser] = useState<UserOut | null>(null);
  const [authStatus, setAuthStatus] = useState<LoadStatus>("loading");

  const [workspaces, setWorkspaces] = useState<WorkspaceOut[]>([]);
  const [conversations, setConversations] = useState<ConversationOut[]>([]);
  const [workspacesStatus, setWorkspacesStatus] =
    useState<LoadStatus>("idle");
  const [conversationsStatus, setConversationsStatus] =
    useState<LoadStatus>("idle");
  const [dataError, setDataError] = useState<string | null>(null);

  // Rehidratar tema/modo de localStorage al montar.
  useEffect(() => {
    let storedTheme: ThemeId = "warm";
    try {
      const raw = localStorage.getItem(THEME_KEY);
      if (raw && VALID_THEMES.includes(raw as ThemeId)) {
        storedTheme = raw as ThemeId;
      }
    } catch {
      // ignore
    }
    let storedMode: ShellMode = "operar";
    try {
      const raw = localStorage.getItem(MODE_KEY);
      if (raw === "operar" || raw === "aprender" || raw === "admin") {
        storedMode = raw;
      }
    } catch {
      // ignore
    }
    setThemeState(storedTheme);
    applyTheme(storedTheme);
    setModeState(storedMode);
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  const setMode = useCallback((m: ShellMode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // ignore
    }
  }, []);

  const toggleRailLeft = useCallback(
    () => setRailLeftHidden((v) => !v),
    [],
  );
  const toggleRailRight = useCallback(
    () => setRailRightHidden((v) => !v),
    [],
  );

  // Verificar sesión al montar: si no hay, ir a login (guard del shell).
  useEffect(() => {
    let alive = true;
    setAuthStatus("loading");
    void getMe()
      .then((u) => {
        if (!alive) return;
        setUser(u);
        setAuthStatus("ready");
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) {
          redirectToLogin();
          return;
        }
        setAuthStatus("error");
      });
    return () => {
      alive = false;
    };
  }, []);

  const logout = useCallback(() => {
    void apiLogout()
      .catch(() => {
        // aun si falla, forzamos el flujo de salida
      })
      .finally(() => {
        setUser(null);
        redirectToLogin();
      });
  }, []);

  const reloadData = useCallback(() => {
    setDataError(null);
    setWorkspacesStatus("loading");
    setConversationsStatus("loading");

    void getWorkspaces()
      .then((ws) => {
        setWorkspaces(ws);
        setWorkspacesStatus("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          redirectToLogin();
          return;
        }
        setWorkspacesStatus("error");
        const msg =
          err instanceof ApiError
            ? err.message
            : "Error al cargar workspaces";
        setDataError(msg);
      });

    void getConversations()
      .then((cs) => {
        setConversations(cs);
        setConversationsStatus("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          redirectToLogin();
          return;
        }
        setConversationsStatus("error");
        const msg =
          err instanceof ApiError
            ? err.message
            : "Error al cargar conversaciones";
        setDataError((prev) => prev ?? msg);
      });
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const setContextById = useCallback(
    (id: string) => {
      if (id === "global") {
        setActiveContext(GLOBAL_CONTEXT);
        return;
      }
      const ws = workspaces.find((w) => w.id === id);
      if (!ws) {
        setActiveContext(GLOBAL_CONTEXT);
        return;
      }
      setActiveContext({
        id: ws.id,
        name: ws.name,
        sub: ws.subtitle ?? "Workspace",
        type: KIND_LABEL[ws.kind] ?? ws.kind,
        color: COLOR_VAR[ws.color_token] ?? "var(--text-muted)",
      });
    },
    [workspaces],
  );

  const value = useMemo<ShellContextValue>(
    () => ({
      user,
      authStatus,
      logout,
      theme,
      setTheme,
      mode,
      setMode,
      railLeftHidden,
      railRightHidden,
      toggleRailLeft,
      toggleRailRight,
      activeContext,
      setContextById,
      workspaces,
      conversations,
      workspacesStatus,
      conversationsStatus,
      dataError,
      reloadData,
    }),
    [
      user,
      authStatus,
      logout,
      theme,
      setTheme,
      mode,
      setMode,
      railLeftHidden,
      railRightHidden,
      toggleRailLeft,
      toggleRailRight,
      activeContext,
      setContextById,
      workspaces,
      conversations,
      workspacesStatus,
      conversationsStatus,
      dataError,
      reloadData,
    ],
  );

  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShell debe usarse dentro de <ShellProvider>");
  }
  return ctx;
}

export { COLOR_VAR };
