import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, UserX } from "lucide-react";
import { ContactFAQ } from "./faq";

export const metadata: Metadata = {
  title: "Contact & Support | Scamly",
  description:
    "Get in touch with the Scamly support team. Find answers to frequently asked questions or reach us via email.",
  alternates: {
    canonical: "https://scamly.io/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="relative min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-display font-bold mb-2">
          Contact &amp; Support
        </h1>
        <p className="text-muted-foreground mb-12">
          Need help? Reach out to us or check our FAQs below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
          <a
            href="mailto:support@scamly.io"
            className="flex items-start gap-4 p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
          >
            <Mail className="w-6 h-6 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Email</h3>
              <p className="text-sm text-muted-foreground">
                support@scamly.io
              </p>
            </div>
          </a>

          <div className="flex items-start gap-4 p-6 rounded-xl border border-border bg-card">
            <MapPin className="w-6 h-6 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Mailing Address</h3>
              <p className="text-sm text-muted-foreground">
                81-83 Campbell Street
                <br />
                Surry Hills, 2010
                <br />
                NSW, Australia
              </p>
            </div>
          </div>
        </div>

        <div className="mb-16 rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <UserX className="w-6 h-6 text-primary mt-0.5 shrink-0" />
            <div className="space-y-3">
              <h2 className="text-xl font-display font-semibold">
                Account Deletion
              </h2>
              <p className="text-sm text-muted-foreground">
                You have the right to request your Scamly account be deleted and
                all personal information removed from our systems, in accordance
                with our{" "}
                <Link
                  href="/privacy"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <p className="text-sm text-muted-foreground">
                You can delete your account directly through the Scamly app by
                navigating to the{" "}
                <strong className="text-foreground">Profile</strong> tab in your
                account portal and selecting{" "}
                <strong className="text-foreground">Delete Account</strong>.
                This will immediately and permanently delete your account,
                cancel any active subscriptions, and remove your personal data.
              </p>
              <p className="text-sm text-muted-foreground">
                If you have been locked out of your account and would like to
                delete it, you can email{" "}
                <a
                  href="mailto:support@scamly.io"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  support@scamly.io
                </a>{" "}
                to request deletion. Please note that additional verification
                checks will be required in order to process the deletion.
              </p>
              <p className="text-sm text-muted-foreground">
                Please note that information Scamly Pty Ltd is required to
                retain to meet legal obligations will not be deleted from the
                Scamly system.
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-display font-semibold mb-6">
          Frequently Asked Questions
        </h2>
        <ContactFAQ />
      </div>
    </div>
  );
}
