import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { blogPosts } from "../../../constants/blog/posts";

export const metadata: Metadata = {
  title: "Scamly Blog – Stay Safe from Scams",
  description:
    "Read about the current scam landscape and how to stay safe in our blog.",
  alternates: {
    canonical: "https://scamly.io/blog",
  },
};

export default function BlogPage() {
  const posts = [...blogPosts.articles].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const getExcerpt = (content: string | null, maxLength = 160) => {
    if (!content) return "";
    const plain = content
      .replace(/[#*_\[\]()>`~-]/g, "")
      .replace(/\n+/g, " ")
      .trim();
    return plain.length > maxLength ? plain.slice(0, maxLength) + "…" : plain;
  };

  return (
    <div className="pt-28 pb-16">
      <div className="container mx-auto px-4 py-6 text-center md:py-10 mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          Scamly Blog
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Read about the current scam landscape and how to stay safe in our blog
        </p>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            No blog posts yet. Check back soon!
          </p>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block bg-background rounded-2xl border border-border/50 p-6 md:p-8 shadow-sm hover:shadow-md transition-all hover:border-border"
              >
                <article>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.created_at}>
                      {format(new Date(post.created_at), "MMMM d, yyyy")}
                    </time>
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold text-foreground group-hover:text-[#5022f6] transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {getExcerpt(post.content)}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-[#5022f6]">
                    Read more{" "}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
