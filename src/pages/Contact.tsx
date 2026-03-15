import { Helmet } from 'react-helmet-async';
import { Mail, MapPin, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MainDomainNavbar } from '@/components/MainDomainNavbar';
import { MainDomainFooter } from '@/components/MainDomainFooter';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  {
    question: "What do I do if I've forgotten my password?",
    answer: "You can reset your password through the Scamly website on the sign in page. This will send a password reset link to your email. If you created your account using Apple or Google, you will need to reset your password through their system.",
  },
  {
    question: "How do I change my email address associated with my Scamly account?",
    answer: "You can change your email address by logging into the Scamly account portal and selecting the security tab. You will need to have access to both the old and new email address you wish to change to.",
  },
  {
    question: "How do I sign up to Scamly Premium?",
    answer: "You can sign up to Scamly Premium by logging into the Scamly account portal and selecting the subscription tab.",
  },
  {
    question: "How do I cancel my Scamly Premium subscription or update my billing information?",
    answer: "You can manage your subscription by logging into the Scamly account portal and selecting the subscription tab and selecting either the Manage Billing or Cancel Subscription buttons.",
  },
  {
    question: "How do I get a refund?",
    answer: "Unfortunately, we do not offer refunds for Scamly Premium subscriptions unless in extenuating circumstances. Please contact support@scamly.io for enquiries.",
  },
];

export default function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact & Support | Scamly</title>
        <meta name="description" content="Get in touch with the Scamly support team. Find answers to frequently asked questions or reach us via email." />
        <link rel="canonical" href="https://scamly.io/contact" />
      </Helmet>

      <MainDomainNavbar />

      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-display font-bold mb-2">Contact & Support</h1>
          <p className="text-muted-foreground mb-12">Need help? Reach out to us or check our FAQs below.</p>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
            <a
              href="mailto:support@scamly.io"
              className="flex items-start gap-4 p-6 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
            >
              <Mail className="w-6 h-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">support@scamly.io</p>
              </div>
            </a>

            <div className="flex items-start gap-4 p-6 rounded-xl border border-border bg-card">
              <MapPin className="w-6 h-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Mailing Address</h3>
                <p className="text-sm text-muted-foreground">
                  81-83 Campbell Street<br />
                  Surry Hills, 2010<br />
                  NSW, Australia
                </p>
              </div>
            </div>
          </div>

          {/* Account Deletion */}
          <div className="mb-16 rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <UserX className="w-6 h-6 text-primary mt-0.5 shrink-0" />
              <div className="space-y-3">
                <h2 className="text-xl font-display font-semibold">Account Deletion</h2>
                <p className="text-sm text-muted-foreground">
                  You have the right to request your Scamly account be deleted and all personal information removed from our systems, in accordance with our{' '}
                  <Link to="/privacy" className="text-primary underline hover:text-primary/80 transition-colors">Privacy Policy</Link>.
                </p>
                <p className="text-sm text-muted-foreground">
                  To request account deletion, send an email to{' '}
                  <a href="mailto:support@scamly.io" className="text-primary underline hover:text-primary/80 transition-colors">support@scamly.io</a>{' '}
                  requesting the deletion of your account.
                </p>
                <p className="text-sm text-muted-foreground">
                  We may ask you to verify your ownership of your Scamly account before processing any deletion requests.
                </p>
                <p className="text-sm text-muted-foreground">
                  Please note that information Scamly Pty Ltd is required to retain to meet legal obligations will not be deleted from the Scamly system.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <h2 className="text-2xl font-display font-semibold mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>

      <MainDomainFooter />
    </>
  );
}