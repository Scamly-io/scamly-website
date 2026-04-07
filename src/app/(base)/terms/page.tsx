import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "../../../integrations/supabase/server";
import { PolicyContentRenderer } from "../../../components/PolicyContentRenderer";
import type { PolicyContentBlock } from "../../../types/policy";

export const metadata: Metadata = {
  title: "Terms & Conditions | Scamly",
  alternates: {
    canonical: "https://scamly.io/terms",
  },
};

async function getTerms() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("policies")
    .select("version, content")
    .eq("policy_type", "terms")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    version: data.version as string,
    content: data.content as unknown as PolicyContentBlock[],
  };
}

export default async function TermsPage() {
  const terms = await getTerms();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative flex-1 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <h1 className="font-display text-4xl font-bold mb-8">
            Terms &amp; Conditions of Use
          </h1>

          {terms ? (
            <div className="prose prose-lg max-w-none space-y-8">
              {terms.version && (
                <p className="text-muted-foreground">
                  Version: {terms.version}
                </p>
              )}
              <PolicyContentRenderer content={terms.content} />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Unable to load terms and conditions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
