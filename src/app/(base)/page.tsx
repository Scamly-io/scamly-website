import { AnnouncementBanner, type AnnouncementBannerData } from "../../components/AnnouncementBanner";
import { HeroSection } from "../../components/landing/HeroSection";
import { FeatureShowcaseSection } from "../../components/landing/FeatureShowcase";
import { GlobalCoverageSection } from "../../components/landing/GlobalCoverageSection";
import { AboutSection } from "../../components/landing/AboutSection";
import { CTASection } from "../../components/landing/CTASection";
import { createServerSupabaseClient } from "../../integrations/supabase/server";

export const revalidate = 60;

async function getActiveAnnouncement(): Promise<AnnouncementBannerData | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("announcement_banner")
    .select("style, content, is_active")
    .eq("is_active", true)
    .limit(1);

  if (error || !data?.[0]) return null;

  const row = data[0];
  const content = row.content?.trim();
  if (!content) return null;

  const raw = row.style?.toLowerCase().trim();
  const style: AnnouncementBannerData["style"] =
    raw === "warning" || raw === "error" || raw === "info" ? raw : "info";

  return { style, content };
}

export default async function HomePage() {
  const announcement = await getActiveAnnouncement();

  return (
    <div className="pt-[calc(1rem+3.5rem+0.75rem)]">
      {announcement ? (
        <div className="px-4">
          <div className="mx-auto max-w-[1280px]">
            <AnnouncementBanner data={announcement} />
          </div>
        </div>
      ) : null}
      <HeroSection tightTop={!!announcement} />
      <FeatureShowcaseSection />
      <GlobalCoverageSection />
      <AboutSection />
      <CTASection />
    </div>
  );
}
