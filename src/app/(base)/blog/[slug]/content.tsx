'use client'

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function dedent(str: string) {
  const lines = str.replace(/^\n/, "").replace(/\n\s*$/, "").split("\n");
  const indent = lines
    .filter((l) => l.trim().length > 0)
    .reduce(
      (min, l) => Math.min(min, l.match(/^(\s*)/)?.[1].length ?? 0),
      Infinity
    );
  return lines.map((l) => l.slice(indent)).join("\n");
}

export function BlogPostContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-semibold mt-8 mb-3 text-foreground">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold mt-6 mb-2 text-foreground">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold mt-5 mb-2 text-foreground">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-base font-semibold mt-4 mb-1 text-foreground">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-sm font-semibold mt-4 mb-1 text-muted-foreground uppercase tracking-wide">
            {children}
          </h6>
        ),
        p: ({ children }) => (
          <p className="text-muted-foreground leading-relaxed mb-4">
            {children}
          </p>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="list-disc ml-6 mb-4 text-muted-foreground space-y-1">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal ml-6 mb-4 text-muted-foreground space-y-1">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-border pl-4 my-4 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className={`${className} block`}>{children}</code>
          ) : (
            <code className="bg-muted text-foreground rounded px-1.5 py-0.5 text-sm font-mono">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-4 text-sm font-mono leading-relaxed">
            {children}
          </pre>
        ),
        hr: () => <hr className="border-border my-8" />,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt}
            className="rounded-lg max-w-full my-4 border border-border/50"
          />
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-border">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-muted/40 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-muted-foreground">{children}</td>
        ),
      }}
    >
      {dedent(content)}
    </ReactMarkdown>
  );
}
