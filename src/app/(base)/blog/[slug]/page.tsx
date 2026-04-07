import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { format } from "date-fns";
import { blogPosts } from "../../../../constants/blog/posts";
import { BlogPostContent } from "./content";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

function getPost(slug: string) {
  return blogPosts.articles.find((p) => p.slug === slug) ?? null;
}

function getDescription(content: string | null) {
  if (!content) return "";
  const plain = content
    .replace(/[#*_\[\]()>`~-]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return plain.length > 155 ? plain.slice(0, 155) + "…" : plain;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post Not Found – Scamly Blog" };

  return {
    title: post.title ? `${post.title} – Scamly Blog` : "Scamly Blog",
    description: getDescription(post.content),
    alternates: { canonical: `https://scamly.io/blog/${post.slug}` },
  };
}

export function generateStaticParams() {
  return blogPosts.articles.map((post) => ({ slug: post.slug! }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  return (
    <div className="pt-28 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link href="/blog" className="gap-2">
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
            <BlogPostContent content={post.content || ""} />
          </div>
        </article>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              datePublished: post.created_at,
              author: { "@type": "Organization", name: "Scamly" },
              publisher: { "@type": "Organization", name: "Scamly" },
              url: `https://scamly.io/blog/${post.slug}`,
              description: getDescription(post.content),
            }),
          }}
        />
      </div>
    </div>
  );
}
