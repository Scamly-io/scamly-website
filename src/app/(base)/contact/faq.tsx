'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion";

// Other FAQs archived in ./faq.archived.ts

const faqs = [
  {
    question:
      "How do I cancel my Scamly Premium subscription or update my billing information?",
    answer:
      "You can manage your billing, and cancel your subscription through Apple Subscriptions, or within the Scamly app under Settings > Billing",
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
