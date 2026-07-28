import Link from "next/link";
import { Button } from "../../components/ui/button";

// Original landing page archived in ./landing.archived.tsx

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pt-[calc(1rem+3.5rem+0.75rem)] pb-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Notice
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Scamly is being shut down
        </h1>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          <p>
            Scamly will remain operational until{" "}
            <span className="font-medium text-foreground">15 May 2027</span>,
            when it will be shut down completely and all account information
            will be deleted.
          </p>
          <p>
            All subscriptions have been cancelled and will no longer renew.
            Premium users will retain access until the end of their current
            billing period.
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            asChild
            className="bg-[#5022f6] text-primary-foreground hover:bg-[#5022f6]/90"
          >
            <Link href="/auth">Sign In</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
