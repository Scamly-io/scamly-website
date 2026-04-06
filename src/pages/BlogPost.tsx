import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string | null;
  slug: string | null;
  content: string | null;
  created_at: string;
}

function renderMarkdown(md: string): string {
  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-8 mb-3 text-foreground">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-10 mb-4 text-foreground">$1</h2>')
    .replace(/^# (.+)$/gm, '<h2 class="text-3xl font-bold mt-10 mb-4 text-foreground">$1</h2>')
    // Bold & italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-[#5022f6] underline hover:opacity-80" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Paragraphs
    .replace(/\n{2,}/g, '</p><p class="text-muted-foreground leading-relaxed mb-4">')
    .replace(/\n/g, '<br />');

  html = '<p class="text-muted-foreground leading-relaxed mb-4">' + html + '</p>';
  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li[^>]*>.*?<\/li>(?:\s*<br\s*\/?>)?)+/g,
    (match) => '<ul class="my-4 space-y-1">' + match.replace(/<br\s*\/?>/g, '') + '</ul>'
  );
  return html;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return;
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, content, created_at")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data);
      }
      setIsLoading(false);
    }
    fetchPost();
  }, [slug]);

  const getDescription = (content: string | null) => {
    if (!content) return "";
    const plain = content.replace(/[#*_\[\]()>`~-]/g, "").replace(/\n+/g, " ").trim();
    return plain.length > 155 ? plain.slice(0, 155) + "…" : plain;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center items-center pt-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

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
            <div
              className="prose prose-zinc max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content || "") }}
            />
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
