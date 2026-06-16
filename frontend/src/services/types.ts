/* ════════════════════════════════════════════════════════════════════
   FaberLoom · tipos de servicio
   Coinciden EXACTO con los modelos *Out del CONTRACT.md (FastAPI · /api).
   Sin `any`. (R7)
   ════════════════════════════════════════════════════════════════════ */

export type WorkspaceKind = "client" | "topic" | "shared";
export type WorkspaceColorToken = "coral" | "amber" | "sage" | "slate" | "vino";
export type ModelTier = "eco" | "balanced" | "sport";
export type MessageRole = "user" | "assistant" | "system";

/** GET /api/space/workspaces -> WorkspaceOut[] */
export interface WorkspaceOut {
  id: string;
  name: string;
  kind: WorkspaceKind;
  color_token: WorkspaceColorToken;
  subtitle: string | null;
}

/** GET /api/space/conversations -> ConversationOut[] (updated_at desc) */
export interface ConversationOut {
  id: string;
  title: string;
  workspace_id: string | null;
  agent_handle: string;
  model_tier: ModelTier;
  updated_at: string;
}

/** GET /api/space/conversations/{id}/messages -> MessageOut[] */
export interface MessageOut {
  id: string;
  role: MessageRole;
  content: string;
  model_tier: ModelTier | null;
  is_grounded: boolean;
  created_at: string;
}

/** GET /api/health */
export interface HealthOut {
  status: string;
  db: boolean;
}

/** POST /api/space/conversations body */
export interface CreateConversationBody {
  title: string;
  workspace_id?: string;
  model_tier?: ModelTier;
}

/** POST /api/space/conversations/{id}/messages body */
export interface SendMessageBody {
  content: string;
  model_tier?: ModelTier;
}

/** POST /api/space/conversations/{id}/messages -> { user, assistant } */
export interface SendMessageResult {
  user: MessageOut;
  assistant: MessageOut;
}

export type UserRole =
  | "owner"
  | "admin"
  | "operator"
  | "supervisor"
  | "viewer";

/** GET /api/auth/me · POST /api/auth/login -> UserOut */
export interface UserOut {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string;
}

/** POST /api/auth/login body */
export interface LoginBody {
  email: string;
  password: string;
}

/** POST /api/auth/logout -> { ok: true } */
export interface LogoutResult {
  ok: true;
}
