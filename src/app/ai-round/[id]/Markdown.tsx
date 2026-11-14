"use client";

import ReactMarkdown from "react-markdown";

/** Small, styled markdown for phase briefs and AI replies. No raw HTML is rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed space-y-2 text-gray-200 break-words">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h3 className="font-semibold text-white">{children}</h3>,
          h2: ({ children }) => <h3 className="font-semibold text-white">{children}</h3>,
          h3: ({ children }) => <h4 className="font-semibold text-white">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 overflow-x-auto text-xs">{children}</pre>
          ),
          code: ({ children, className }) =>
            className ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="bg-gray-800 rounded px-1 py-0.5 text-[0.85em]">{children}</code>
            ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
