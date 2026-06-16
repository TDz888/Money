"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { MessageDTO } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  message: MessageDTO;
};

export default function MessageItem({ message }: Props) {
  const isUser = message.role === "USER";
  return (
    <div className={cn("flex animate-fade-in", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-generous px-5 py-3.5 markdown-body",
          isUser
            ? "bg-electric-purple/15 border border-electric-purple/30 text-text-primary"
            : "bg-surface-elevated border border-border-light text-text-primary"
        )}
      >
        {!isUser && (
          <div className="text-h4 font-bold text-electric-purple mb-1.5">Lux Cipher</div>
        )}
        <div className="text-body-compact leading-relaxed break-words">
          {message.content ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const isBlock = Boolean(match) || String(children).includes("\n");
                  if (!isBlock) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <SyntaxHighlighter
                      style={vscDarkPlus as any}
                      language={match?.[1] || "text"}
                      PreTag="div"
                      customStyle={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: "16px 20px",
                        fontSize: 13,
                        lineHeight: 1.8
                      }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          ) : (
            <span className="inline-flex items-center">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          )}
        </div>
        {isUser && message.creditsCharged > 0 && (
          <div className="mt-2 text-[11px] text-text-tertiary">−{message.creditsCharged} credits</div>
        )}
      </div>
    </div>
  );
}
