import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PolicyContentBlock } from "@/types/policy";
import { PolicyContentRenderer } from "@/components/PolicyContentRenderer";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function Privacy() {
  const [content, setContent] = useState<PolicyContentBlock[] | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPrivacy() {
      const { data, error } = await supabase
        .from("policies")
        .select("version, content")
        .eq("policy_type", "privacy")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setContent(data.content as unknown as PolicyContentBlock[]);
        setVersion(data.version);
      }
      setIsLoading(false);
    }
    fetchPrivacy();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Helmet>
        <title>Privacy Policy | Scamly</title>
        <link rel="canonical" href="https://scamly.io/privacy" />
      </Helmet>
      <main className="relative flex-1 pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          <Link to="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : content ? (
            <div className="prose prose-lg max-w-none space-y-8">
              {version && (
                <p className="text-muted-foreground">Version: {version}</p>
              )}
              <PolicyContentRenderer content={content} />
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load privacy policy.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
