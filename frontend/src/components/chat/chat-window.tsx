"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Brain,
  Paperclip,
  Sparkles,
  User,
} from "lucide-react";

import { runAgentRequest } from "@/lib/agent/agent-client";
import { useAgentStore } from "@/stores";

export function ChatWindow() {
  const [message, setMessage] = useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const messages =
    useAgentStore(
      (state) => state.messages,
    );

  const isChatLoading =
    useAgentStore(
      (state) => state.isChatLoading,
    );

  const isPaused = useAgentStore((state) => state.isPaused);

  const agent =
    useAgentStore(
      (state) => state.agent,
    );

  /*
   * Automatically scroll to the
   * newest message.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /*
   * Focus the input when the
   * component is mounted.
   */
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  /*
   * Send message to AgentOS.
   */
  async function handleSubmit() {
    const trimmedMessage =
      message.trim();

    if (
      !trimmedMessage ||
      isPaused ||
      isChatLoading
    ) {
      return;
    }

    setMessage("");

    await runAgentRequest(
      trimmedMessage,
    );

    /*
     * Put the cursor back into
     * the input after execution.
     */
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  async function handleAttachment(file?: File): Promise<void> {
    if (!file) return;
    if (file.size > 300_000) {
      setMessage((current) => `${current}${current ? "\n\n" : ""}[${file.name} is over the 300 KB text-file limit]`);
      return;
    }
    const supportedText = file.type.startsWith("text/") || /\.(txt|md|csv|json|xml|html|css|js|ts|tsx|py|log)$/i.test(file.name);
    if (!supportedText) {
      setMessage((current) => `${current}${current ? "\n\n" : ""}[${file.name} is not a supported text file]`);
      return;
    }
    const content = await file.text();
    setMessage((current) => `${current}${current ? "\n\n" : ""}Attached file: ${file.name}\n\n${content}`);
  }

  /*
   * Keyboard handling.
   *
   * Enter       → Send
   * Shift+Enter → New line
   */
  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void handleSubmit();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ===================================================== */}
      {/* MESSAGE AREA                                         */}
      {/* ===================================================== */}

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {messages.length === 0 && (
            <EmptyState />
          )}

          {messages.map(
            (currentMessage) => {
              const isUser =
                currentMessage.role ===
                "user";

              return (
                <Message
                  key={currentMessage.id}
                  role={
                    currentMessage.role
                  }
                  content={
                    currentMessage.content
                  }
                  isUser={isUser}
                  metadata={currentMessage.metadata}
                />
              );
            },
          )}

          {/* ================================================ */}
          {/* THINKING INDICATOR                               */}
          {/* ================================================ */}

          {isChatLoading && (
            <ThinkingIndicator
              status={agent.status}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ===================================================== */}
      {/* COMPOSER                                             */}
      {/* ===================================================== */}

      <div className="border-t border-[#202733] p-5">
        <div className="mx-auto max-w-3xl">
          <div
            className={`relative rounded-2xl border bg-[#0e131a] shadow-2xl shadow-black/20 transition ${
              isChatLoading
                ? "border-[#302d55]"
                : "border-[#29313d] focus-within:border-[#484267]"
            }`}
          >
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value,
                )
              }
              onKeyDown={handleKeyDown}
              disabled={isChatLoading}
              placeholder={
                isChatLoading
                  ? "AgentOS is working..."
                  : "Ask AgentOS to do something..."
              }
              rows={3}
              className="min-h-[90px] w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm text-white outline-none placeholder:text-[#626d7d] disabled:cursor-not-allowed disabled:opacity-60"
            />

            {/* Bottom controls */}

            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="text/*,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.tsx,.py,.log"
                className="hidden"
                onChange={(event) => {
                  void handleAttachment(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isChatLoading}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#626d7d] transition hover:bg-[#171d27] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                title="Attach file"
              >
                <Paperclip size={15} />
              </button>

              <span className="text-[10px] text-[#626d7d]">
                {isPaused ? "Paused · resume to send" : "Local model and workspace tools"}
              </span>
            </div>

            {/* Send */}

            <button
              type="button"
              onClick={() =>
                void handleSubmit()
              }
              disabled={
                !message.trim() ||
                isPaused ||
                isChatLoading
              }
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#7c6cff] text-white transition hover:bg-[#8b7fff] disabled:cursor-not-allowed disabled:opacity-30"
              title={
                isChatLoading
                  ? "Agent is working"
                  : "Send message"
              }
            >
              <ArrowUp size={16} />
            </button>
          </div>

          {/* Footer */}

          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-[#4f5968]">
            <span>
              Enter to send · Shift + Enter
              for new line
            </span>

            <span>
              {agent.status ===
              "idle"
                ? "Ready"
                : formatAgentStatus(
                    agent.status,
                  )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* MESSAGE COMPONENT                                         */
/* ========================================================= */

function Message({
  role,
  content,
  isUser,
  metadata,
}: {
  role: string;
  content: string;
  isUser: boolean;
  metadata?: {
    model?: string;
    tool?: string;
  };
}) {
  /*
   * System/tool messages can be
   * handled differently later.
   */
  if (
    role !== "user" &&
    role !== "assistant"
  ) {
    return (
      <div className="rounded-xl border border-[#202733] bg-[#0e131a] p-4 text-xs text-[#8b95a5]">
        {content}
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-xl rounded-2xl rounded-br-md border border-[#272e3a] bg-[#11161f] px-4 py-3 text-sm leading-6 text-[#d8dde5]">
          {content}
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#202733] bg-[#10151d]">
          <User
            size={15}
            className="text-[#8b95a5]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#302d55] bg-[#17152a]">
        <Brain
          size={15}
          className="text-[#9185ff]"
        />
      </div>

      <div className="max-w-2xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold">
            AgentOS
          </span>

          <span className="text-[10px] text-[#626d7d]">
            Autonomous Agent
          </span>
        </div>

        <div className="whitespace-pre-wrap text-sm leading-7 text-[#b7bfcb]">
          {content}
        </div>

        {(metadata?.model || metadata?.tool) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#626d7d]">
            {metadata.model && <span>Model: {metadata.model}</span>}
            {metadata.tool && <span>Tools used: {metadata.tool}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================= */
/* THINKING INDICATOR                                        */
/* ========================================================= */

function ThinkingIndicator({
  status,
}: {
  status: string;
}) {
  const label =
    formatAgentStatus(status);

  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#302d55] bg-[#17152a]">
        <Sparkles
          size={15}
          className="animate-pulse text-[#9185ff]"
        />
      </div>

      <div className="rounded-xl border border-[#202733] bg-[#0e131a] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9185ff]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9185ff] [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9185ff] [animation-delay:300ms]" />
          </div>

          <span className="text-xs text-[#8b95a5]">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* EMPTY STATE                                               */
/* ========================================================= */

function EmptyState() {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#302d55] bg-[#17152a]">
        <Brain
          size={22}
          className="text-[#9185ff]"
        />
      </div>

      <h2 className="mt-4 text-sm font-semibold">
        AgentOS is ready
      </h2>

      <p className="mt-2 max-w-md text-xs leading-6 text-[#626d7d]">
        Give the agent a goal. It can reason
        about the task, create a plan, use
        connected tools, and execute actions.
      </p>
    </div>
  );
}

/* ========================================================= */
/* STATUS FORMATTER                                          */
/* ========================================================= */

function formatAgentStatus(
  status: string,
) {
  switch (status) {
    case "thinking":
      return "Thinking...";

    case "planning":
      return "Planning...";

    case "executing":
      return "Executing tools...";

    case "waiting":
      return "Waiting...";

    case "completed":
      return "Completed";

    case "error":
      return "Something went wrong";

    case "connecting":
      return "Connecting...";

    case "offline":
      return "Offline";

    default:
      return "Ready";
  }
}
