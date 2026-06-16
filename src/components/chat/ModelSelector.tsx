"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "openai" as const },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" as const },
  { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "openai" as const },
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", provider: "anthropic" as const },
  { id: "claude-3-haiku-20240307", label: "Claude 3 Haiku", provider: "anthropic" as const },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", provider: "google" as const },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", provider: "google" as const },
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)", provider: "groq" as const },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B (Groq)", provider: "groq" as const }
];

type Props = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
};

export default function ModelSelector({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const current = MODELS.find((m) => m.id === value) || MODELS[0];
  return (
    <div className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-[42px] px-4 rounded-standard border border-border-light bg-surface-glass",
          "text-body-small text-text-primary font-semibold",
          "hover:border-border-strong hover:bg-surface-glass-hover",
          "transition-all flex items-center gap-2"
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-electric-purple" />
        {current.label}
        <svg width="10" height="10" viewBox="0 0 10 10" className="ml-1 opacity-60">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-2 w-[260px] rounded-generous border border-border-light bg-surface-elevated shadow-level-4 overflow-hidden">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-body-small",
                  "hover:bg-surface-glass-hover transition-colors",
                  "flex items-center justify-between",
                  m.id === value && "bg-surface-glass text-electric-purple"
                )}
              >
                <span>{m.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary">{m.provider}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
