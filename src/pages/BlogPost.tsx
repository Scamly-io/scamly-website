import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Calendar } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { blogPosts } from "@/constants/blog/posts";

interface BlogPost {
  id: string;
  title: string | null;
  slug: string | null;
  content: string | null;
  created_at: string;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post: BlogPost | null = blogPosts.articles.find((p) => p.slug === slug) ?? null;
  const notFound = !post;

  const dedent = (str: string) => {
    const lines = str.replace(/^\n/, "").replace(/\n\s*$/, "").split("\n");
    const indent = lines
      .filter((l) => l.trim().length > 0)
      .reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1].length ?? 0), Infinity);
    return lines.map((l) => l.slice(indent)).join("\n");
  };

  const getDescription = (content: string | null) => {
    if (!content) return "";
    const plain = content.replace(/[#*_\[\]()>`~-]/g, "").replace(/\n+/g, " ").trim();
    return plain.length > 155 ? plain.slice(0, 155) + "…" : plain;
  };

  if (notFound || !post) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center pt-40 gap-4">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <Button asChild variant="outline">
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{post.title ? `${post.title} – Scamly Blog` : "Scamly Blog"}</title>
        <meta name="description" content={getDescription(post.content)} />
        <link rel="canonical" href={`https://scamly.io/blog/${post.slug}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            datePublished: post.created_at,
            author: { "@type": "Organization", name: "Scamly" },
            publisher: { "@type": "Organization", name: "Scamly" },
            url: `https://scamly.io/blog/${post.slug}`,
            description: getDescription(post.content),
          })}
        </script>
      </Helmet>
      <Navbar />

      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link to="/blog" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </Button>

          <article className="bg-background rounded-2xl border border-border/50 p-6 md:p-10 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.created_at}>
                {format(new Date(post.created_at), "MMMM d, yyyy")}
              </time>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              {post.title}
            </h1>
            <div className="prose prose-zinc max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4 text-foreground">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-8 mb-3 text-foreground">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-2 text-foreground">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold mt-5 mb-2 text-foreground">{children}</h4>
                  ),
                  h5: ({ children }) => (
                    <h5 className="text-base font-semibold mt-4 mb-1 text-foreground">{children}</h5>
                  ),
                  h6: ({ children }) => (
                    <h6 className="text-sm font-semibold mt-4 mb-1 text-muted-foreground uppercase tracking-wide">{children}</h6>
                  ),
                  p: ({ children }) => (
                    <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">{children}</a>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc ml-6 mb-4 text-muted-foreground space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-6 mb-4 text-muted-foreground space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-border pl-4 my-4 italic text-muted-foreground">{children}</blockquote>
                  ),
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    return isBlock ? (
                      <code className={`${className} block`}>{children}</code>
                    ) : (
                      <code className="bg-muted text-foreground rounded px-1.5 py-0.5 text-sm font-mono">{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-4 text-sm font-mono leading-relaxed">{children}</pre>
                  ),
                  hr: () => (
                    <hr className="border-border my-8" />
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                  img: ({ src, alt }) => (
                    <img src={src} alt={alt} className="rounded-lg max-w-full my-4 border border-border/50" />
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
                    <th className="px-4 py-2 text-left font-semibold text-foreground">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 text-muted-foreground">{children}</td>
                  ),
                }}
              >
                {dedent(post.content || "")}
              </ReactMarkdown>
            </div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
