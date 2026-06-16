"use client";

/* ════════════════════════════════════════════════════════════════════
   FaberLoom · SpaceLoom (surface)
   ctxstrip + thread/empty-state + composer.
   - Sin conversación seleccionada: muestra empty-state del mock.
   - Al enviar el primer mensaje, crea una conversación (createConversation)
     anclada al workspace activo, luego sendMessage y re-fetch (getMessages).
   - Estados loading/error obligatorios. Si la API no está arriba, muestra
     un error elegante y no crashea.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { useShell, type LoadStatus } from "@/components/shell/ShellProvider";
import {
  createConversation,
  getMessages,
  sendMessage,
  ApiError,
} from "@/services/spaceService";
import type {
  ConversationOut,
  MessageOut,
  ModelTier,
} from "@/services/types";
import ContextStrip from "@/components/space/ContextStrip";
import EmptyState from "@/components/space/EmptyState";
import Thread from "@/components/space/Thread";
import Composer from "@/components/space/Composer";

const AGENT_HANDLE = "@cotizador";

export default function SpaceLoom() {
  const { activeContext, reloadData } = useShell();

  const [conversation, setConversation] = useState<ConversationOut | null>(
    null,
  );
  const [messages, setMessages] = useState<MessageOut[]>([]);
  const [threadStatus, setThreadStatus] = useState<LoadStatus>("idle");
  const [threadError, setThreadError] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [tier, setTier] = useState<ModelTier>("balanced");
  const [modelLabel, setModelLabel] = useState<string>("Balanceado · sonnet");

  const threadRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const refetchMessages = useCallback(
    async (convId: string) => {
      setThreadStatus("loading");
      setThreadError(null);
      try {
        const msgs = await getMessages(convId);
        setMessages(msgs);
        setThreadStatus("ready");
      } catch (err: unknown) {
        setThreadStatus("error");
        setThreadError(
          err instanceof ApiError
            ? err.message
            : "Error al cargar los mensajes",
        );
      }
    },
    [],
  );

  useEffect(() => {
    scrollToEnd();
  }, [messages, sending, scrollToEnd]);

  const handleTierChange = useCallback(
    (t: ModelTier, label: string) => {
      setTier(t);
      setModelLabel(label);
    },
    [],
  );

  const handleSend = useCallback(
    async (text: string) => {
      setSending(true);
      setThreadError(null);
      try {
        // Asegura una conversación (la crea si no existe), anclada al ctx.
        let conv = conversation;
        if (!conv) {
          const workspaceId =
            activeContext.id !== "global" ? activeContext.id : undefined;
          conv = await createConversation({
            title: text.slice(0, 60),
            workspace_id: workspaceId,
            model_tier: tier,
          });
          setConversation(conv);
        }

        await sendMessage(conv.id, { content: text, model_tier: tier });
        // Invalidación: re-fetch del hilo completo tras el POST.
        await refetchMessages(conv.id);
      } catch (err: unknown) {
        setThreadStatus("error");
        setThreadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo enviar el mensaje",
        );
      } finally {
        setSending(false);
      }
    },
    [conversation, activeContext.id, tier, refetchMessages],
  );

  const agentLabel = `${AGENT_HANDLE} · ${activeContext.name}`;
  const hasThread = conversation !== null;

  return (
    <section className="view on" id="v-space">
      <ContextStrip agentHandle={AGENT_HANDLE} modelLabel={modelLabel} />

      <div className="spaceClean">
        <div className="spaceThread" id="spaceThread" ref={threadRef}>
          {hasThread ? (
            <Thread
              messages={messages}
              status={threadStatus}
              pending={sending}
              agentLabel={agentLabel}
              errorMsg={threadError}
              onRetry={() => {
                if (conversation) void refetchMessages(conversation.id);
                else reloadData();
              }}
            />
          ) : (
            <EmptyState />
          )}
        </div>

        <Composer
          tier={tier}
          onTierChange={handleTierChange}
          onSend={(text) => {
            void handleSend(text);
          }}
          sending={sending}
        />
      </div>
    </section>
  );
}
