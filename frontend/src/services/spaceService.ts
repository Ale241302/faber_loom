/* ════════════════════════════════════════════════════════════════════
   FaberLoom · spaceService
   Fetch tipado contra NEXT_PUBLIC_API_URL (FastAPI · prefijo /api).
   Sin `any`. Lanza ApiError en fallos; los componentes manejan loading/error.
   ════════════════════════════════════════════════════════════════════ */

import type {
  WorkspaceOut,
  ConversationOut,
  MessageOut,
  HealthOut,
  CreateConversationBody,
  SendMessageBody,
  SendMessageResult,
} from "@/services/types";

const API_BASE: string =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  public readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("No se pudo conectar con la API", 0);
  }

  if (!res.ok) {
    throw new ApiError(
      `La API respondió ${res.status}`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

export function getHealth(): Promise<HealthOut> {
  return request<HealthOut>("/health");
}

export function getWorkspaces(): Promise<WorkspaceOut[]> {
  return request<WorkspaceOut[]>("/space/workspaces");
}

export function getConversations(): Promise<ConversationOut[]> {
  return request<ConversationOut[]>("/space/conversations");
}

export function createConversation(
  body: CreateConversationBody,
): Promise<ConversationOut> {
  return request<ConversationOut>("/space/conversations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getMessages(
  conversationId: string,
): Promise<MessageOut[]> {
  return request<MessageOut[]>(
    `/space/conversations/${conversationId}/messages`,
  );
}

export function sendMessage(
  conversationId: string,
  body: SendMessageBody,
): Promise<SendMessageResult> {
  return request<SendMessageResult>(
    `/space/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}
