import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BackgroundBeams } from "@/components/ui/beams";
import { trackSignupStarted } from "@/lib/analytics";

export function CTASection() {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-[hsl(220,40%,13%)] px-8 py-16 sm:px-12 sm:py-20 md:px-16 md:py-24">
          <BackgroundBeams />

          <div className="relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-white mb-8">
              Ready to stay scam free?
            </h2>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                size="xl"
                asChild
                onClick={() => trackSignupStarted("cta")}
                className="bg-white text-foreground hover:bg-white/90 rounded-full font-semibold"
              >
                <Link to="/auth?mode=signup">Create free account</Link>
              </Button>
              <Button
                size="xl"
                variant="outline"
                asChild
                className="border-white bg-[hsl(220,40%,13%)] text-white hover:bg-white/10 rounded-full"
              >
                <a href="#pricing">View Pricing</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
