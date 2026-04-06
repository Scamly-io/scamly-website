import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Calendar, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroGradientBackground } from "@/components/HeroGradientBackground";
import { format } from "date-fns";

interface BlogPost {
  id: string;
  title: string | null;
  slug: string | null;
  content: string | null;
  created_at: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, content, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
      setIsLoading(false);
    }
    fetchPosts();
  }, []);

  const getExcerpt = (content: string | null, maxLength = 160) => {
    if (!content) return "";
    const plain = content
      .replace(/[#*_\[\]()>`~-]/g, "")
      .replace(/\n+/g, " ")
      .trim();
    return plain.length > maxLength ? plain.slice(0, maxLength) + "…" : plain;
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Helmet>
        <title>Scamly Blog – Stay Safe from Scams</title>
        <meta name="description" content="Read about the current scam landscape and how to stay safe in our blog." />
        <link rel="canonical" href="https://scamly.io/blog" />
      </Helmet>
      <Navbar />

      <main className="pt-28 pb-16">
        <div className="relative">
          <HeroGradientBackground />
          <div className="relative container mx-auto px-4 text-center mb-16" style={{ zIndex: 1 }}>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">Scamly Blog</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Read about the current scam landscape and how to stay safe in our blog
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-4xl">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No blog posts yet. Check back soon!</p>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group block bg-background rounded-2xl border border-border/50 p-6 md:p-8 shadow-sm hover:shadow-md transition-all hover:border-border"
                >
                  <article>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Calendar className="h-4 w-4" />
                      <time dateTime={post.created_at}>{format(new Date(post.created_at), "MMMM d, yyyy")}</time>
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground group-hover:text-[#5022f6] transition-colors mb-2">
                      {post.title}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{getExcerpt(post.content)}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-[#5022f6]">
                      Read more <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
