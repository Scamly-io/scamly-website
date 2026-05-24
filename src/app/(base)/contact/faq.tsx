'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";

const faqs = [
  {
    question: "What do I do if I've forgotten my password?",
    answer:
      "You can reset your password through the Scamly website on the sign in page. This will send a password reset link to your email. If you created your account using Apple or Google, you will need to reset your password through their system.",
  },
  {
    question:
      "How do I change my email address associated with my Scamly account?",
    answer:
      "You can change your email address by logging into the Scamly account portal and selecting the security tab. You will need to have access to both the old and new email address you wish to change to.",
  },
  {
    question: "Is scamly paid?",
    answer:
      "Yes, Scamly is a paid service. You can sign up for a 7 day free trial by creating an account in the Scamly app.",
  },
  {
    question:
      "How do I cancel my Scamly Premium subscription or update my billing information?",
    answer:
      "You can manage your billing, and cancel your subscription through Apple Subscriptions, or within the Scamly app under Settings > Billing",
  },
  {
    question: "How do I get a refund?",
    answer:
      "Unfortunately, we do not offer refunds for Scamly Premium subscriptions except in extenuating circumstances. Please contact support@scamly.io for enquiries.",
  },
];

export function ContactFAQ() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="text-left">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
