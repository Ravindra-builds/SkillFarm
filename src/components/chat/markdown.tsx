"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/60 bg-[#0c1017] shadow-md dark:border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-zinc-400 font-mono">
        <span className="font-semibold text-zinc-300 uppercase text-[11px] tracking-wide">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-sans text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs font-mono text-zinc-100 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function FormattedMessage({ content }: { content: string }) {
  // Strip internal handoff tokens before rendering
  const cleanContent = content.replace(/\[\[HANDOFF:[^\]]+\]\]/g, "").trim();

  if (!cleanContent) return null;

  return (
    <div className="markdown-content text-sm leading-relaxed text-foreground/95 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-heading text-lg sm:text-xl font-bold mt-5 mb-2.5 text-foreground tracking-tight border-b border-border/40 pb-1.5 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-heading text-base sm:text-lg font-semibold mt-4 mb-2 text-foreground tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-heading text-sm sm:text-base font-semibold mt-3.5 mb-1.5 text-foreground first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-heading text-xs sm:text-sm font-semibold mt-3 mb-1 text-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="my-2 leading-relaxed text-foreground/90 first:mt-0 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/90">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2.5 ml-5 list-disc space-y-1 text-foreground/90 [&>li]:pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2.5 ml-5 list-decimal space-y-1 text-foreground/90 [&>li]:pl-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-violet-500/60 bg-violet-500/5 px-3.5 py-2 rounded-r-lg text-muted-foreground italic text-xs sm:text-sm">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border/50" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-xs text-left divide-y divide-border/60">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60 font-medium text-foreground">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2 text-xs font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-xs text-muted-foreground border-t border-border/30">
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-violet-500 dark:text-violet-400 underline underline-offset-2 hover:text-violet-600 transition-colors font-medium"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isMultiline = String(children).includes("\n");

            if (match || isMultiline) {
              return <CodeBlock language={match ? match[1] : ""} code={codeString} />;
            }

            return (
              <code
                className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[12px] font-medium text-violet-600 dark:text-violet-300 border border-border/50"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
