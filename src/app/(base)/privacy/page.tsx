import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "../../../integrations/supabase/server";
import { PolicyContentRenderer } from "../../../components/PolicyContentRenderer";
import type { PolicyContentBlock } from "../../../types/policy";

export const metadata: Metadata = {
  title: "Privacy Policy | Scamly",
  alternates: {
    canonical: "https://scamly.io/privacy",
  },
};

async function getPrivacyPolicy() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("policies")
    .select("version, content")
    .eq("policy_type", "privacy")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    version: data.version as string,
    content: data.content as unknown as PolicyContentBlock[],
  };
}

export default async function PrivacyPage() {
  const privacy = await getPrivacyPolicy();

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
            Privacy Policy
          </h1>

          {privacy ? (
            <div className="prose prose-lg max-w-none space-y-8">
              {privacy.version && (
                <p className="text-muted-foreground">
                  Version: {privacy.version}
                </p>
              )}
              <PolicyContentRenderer content={privacy.content} />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Unable to load privacy policy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
