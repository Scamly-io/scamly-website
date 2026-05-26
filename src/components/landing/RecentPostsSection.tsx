import Link from "next/link";
import { Calendar } from "lucide-react";
import { format } from "date-fns";
import { blogPosts } from "../../constants/blog/posts";

function getRecentPosts(limit: number) {
  return [...blogPosts.articles]
    .filter((p) => Boolean(p.slug))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export function RecentPostsSection() {
  const posts = getRecentPosts(3);

  if (posts.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">
          Read our most recent blog posts
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group block bg-background rounded-2xl border border-border/50 p-6 shadow-sm hover:shadow-md transition-all hover:border-border"
            >
              <article>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.created_at}>
                    {format(new Date(post.created_at), "MMMM d, yyyy")}
                  </time>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground group-hover:text-[#5022f6] transition-colors">
                  {post.title}
                </h3>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

