import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <link rel="canonical" href="https://scamly.io/privacy" />
      </Helmet>
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        
        <h1 className="font-display text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Last updated: January 31, 2025
          </p>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              Scamly ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our website and services. We comply with the General Data Protection Regulation (GDPR) and other applicable data protection laws.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data Controller</h2>
            <p className="text-muted-foreground">
              Scamly is the data controller responsible for your personal data. If you have any questions about this Privacy Policy or our data practices, please contact us at <a href="mailto:support@scamly.io" className="text-primary hover:underline">support@scamly.io</a>.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect the following personal information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Email address:</strong> Collected when you register your interest in our services via our website.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Legal Basis for Processing</h2>
            <p className="text-muted-foreground">
              Under the GDPR, we process your personal data based on the following legal grounds:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Consent:</strong> By submitting your email address through our registration form, you consent to us collecting and processing your data to send you updates about our services.</li>
              <li><strong>Legitimate interests:</strong> We may process your data where it is in our legitimate business interests to communicate with individuals who have expressed interest in our services.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use your email address to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>Send you updates and information about Scamly and our services</li>
              <li>Notify you when our product launches or when new features become available</li>
              <li>Respond to your inquiries or requests</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Third-Party Service Providers</h2>
            <p className="text-muted-foreground">
              We share your email address with the following third-party service providers solely for the purpose of sending you emails:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Resend:</strong> Email delivery service used to send transactional and marketing emails</li>
              <li><strong>Mailchimp:</strong> Email marketing platform used to manage our mailing list and send newsletters</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              These providers are contractually obligated to protect your data and only use it for the purposes we specify. We do not sell, trade, or otherwise share your personal information with any other third parties.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your email address for as long as you remain subscribed to our mailing list or until you request its deletion. If you unsubscribe or request deletion, we will remove your data within 30 days, except where we are required by law to retain it for longer.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Rights Under GDPR</h2>
            <p className="text-muted-foreground">
              Under the GDPR, you have the following rights regarding your personal data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li><strong>Right of access:</strong> You can request a copy of the personal data we hold about you.</li>
              <li><strong>Right to rectification:</strong> You can request that we correct any inaccurate or incomplete data.</li>
              <li><strong>Right to erasure:</strong> You can request that we delete your personal data.</li>
              <li><strong>Right to restrict processing:</strong> You can request that we limit how we use your data.</li>
              <li><strong>Right to data portability:</strong> You can request a copy of your data in a machine-readable format.</li>
              <li><strong>Right to withdraw consent:</strong> You can withdraw your consent at any time by unsubscribing from our emails or contacting us.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. How to Exercise Your Rights</h2>
            <p className="text-muted-foreground">
              To exercise any of your rights, including requesting the deletion of your personal information, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> <a href="mailto:support@scamly.io" className="text-primary hover:underline">support@scamly.io</a>
            </p>
            <p className="text-muted-foreground mt-4">
              We will respond to your request within 30 days. You also have the right to lodge a complaint with a supervisory authority if you believe your data protection rights have been violated.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. We encourage you to review this policy periodically.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy or wish to exercise your data protection rights, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Email:</strong> <a href="mailto:support@scamly.io" className="text-primary hover:underline">support@scamly.io</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
