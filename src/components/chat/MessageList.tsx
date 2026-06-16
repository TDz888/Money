"use client";

import { useEffect, useRef } from "react";
import MessageItem from "./MessageItem";
import type { MessageDTO } from "@/types";

type Props = {
  messages: MessageDTO[];
  isStreaming: boolean;
  onStop: () => void;
  onSuggestion: (text: string) => void;
};

const SUGGESTIONS = [
  "Explain quantum computing in 3 paragraphs.",
  "Write a Python function to debounce an async event stream.",
  "Compare Postgres, MongoDB, and Redis for a chat app.",
  "Draft a polite follow-up email after a job interview."
];

export default function MessageList({ messages, isStreaming, onStop, onSuggestion }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages, isStreaming]);

  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
      {messages.length === 0 ? (
        <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-pill bg-electric-purple/15 border border-electric-purple/30 mb-6">
            <span className="text-electric-purple text-3xl font-black">⌬</span>
          </div>
          <h1 className="text-h1 font-extrabold mb-2 text-text-primary">How can I help today?</h1>
          <p className="text-body-compact text-text-secondary max-w-md mb-10">
            Pick a suggestion or type your own message below.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="text-left px-5 py-4 rounded-generous border border-border-light bg-surface-glass hover:border-border-strong hover:bg-surface-glass-hover hover:shadow-level-1 transition-all"
              >
                <div className="text-body-small text-text-primary">{s}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))}
          {isStreaming && (
            <div className="flex justify-center">
              <button
                onClick={onStop}
                className="px-4 py-2 rounded-pill border border-border-light bg-surface-glass text-body-small text-text-secondary hover:text-text-primary hover:border-border-strong transition-all"
              >
                Stop generating
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
