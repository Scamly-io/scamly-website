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
          <p className="text-muted-foreground">Effective from: 10 March 2026</p>

          <p className="text-muted-foreground text-sm">Scamly Pty Ltd — 81-83 Campbell Street, Sydney NSW 2010</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. We Respect Your Privacy</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Scamly Pty Ltd respects your right to privacy and is committed to safeguarding the privacy of our
                customers and website visitors. This policy sets out how we collect and treat your personal information.
              </p>
              <p>
                (b) We adhere to the Australian Privacy Principles contained in the Privacy Act 1988 (Cth) and to the
                extent applicable, the EU General Data Protection Regulation (GDPR).
              </p>
              <p>
                (c) "Personal information" is information we hold which is identifiable as being about you. This
                includes information such as your name, email address, identification number, or any other type of
                information that can reasonably identify an individual, either directly or indirectly.
              </p>
              <p>
                (d) You may contact us in writing at 81-83 Campbell St, Sydney, New South Wales, 2010 for further
                information about this Privacy Policy.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. What Personal Information Is Collected</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Scamly Pty Ltd will, from time to time, receive and store personal information you submit to our
                website or application, provided to us directly or given to us in other forms. The personal information
                we collect is limited to your name, email address, date of birth, and country of residence, as well as
                certain technical information about the device you use to access our services, such as device type,
                operating system, and browser type.
              </p>
              <p>
                (b) You may provide basic information such as your name, email address, date of birth, and country of
                residence to enable us to send you information, provide updates and process your product or service
                order.
              </p>
              <p>
                (c) We may collect additional information at other times, including but not limited to, when you provide
                feedback, when you provide information about your personal or business affairs, change your email
                preference, respond to surveys and/or promotions, or communicate with our customer support.
              </p>
              <p>
                (d) Additionally, we may also collect any other information you provide while interacting with us. Where
                you interact with our AI-powered features, including the AI scan tool, AI chat tool, or contact search
                tool, data submitted through these features — including photographs, conversation content, and company
                search queries — may be transmitted to and processed by third-party AI service providers, including
                OpenAI and Perplexity, for the purpose of delivering those services. By using these features, you
                consent to your data being processed by these third-party providers in accordance with their respective
                privacy policies.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Collect Your Personal Information</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Scamly Pty Ltd collects personal information from you in a variety of ways, including when you
                interact with us electronically, when you access our website and when we provide our services to you.
              </p>
              <p>
                (b) By providing us with personal information, you consent to the supply of that information subject to
                the terms of this Privacy Policy
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Personal Information</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Scamly Pty Ltd may use personal information collected from you to provide you with information about
                our products or services. We may also make you aware of new and additional products, services and
                opportunities available to you.
              </p>
              <p>
                (b) Scamly Pty Ltd will use personal information only for the purposes that you consent to. This may
                include to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) provide you with products and services during the usual course of our business activities;</li>
                <li>(ii) administer our business activities;</li>
                <li>(iii) manage, research and develop our products and services;</li>
                <li>(iv) provide you with information about our products and services;</li>
                <li>
                  (v) communicate with you by a variety of measures including, but not limited to, by telephone, email,
                  SMS or mail; and
                </li>
                <li>(vi) investigate any complaints.</li>
                <li>
                  (vii) comply with data retention schedules and implement automated deletion procedures in accordance
                  with applicable data protection laws.
                </li>
              </ul>
              <p>
                If you withhold your personal information, it may not be possible for us to provide you with our
                products and services or for you to fully access our website.
              </p>
              <p>
                (c) We may disclose your personal information to comply with a legal requirement, such as a law,
                regulation, court order, subpoena, warrant, legal proceedings or in response to a law enforcement agency
                request.
              </p>
              <p>
                (d) If there is a change of control in our business or a sale or transfer of business assets, we reserve
                the right to transfer to the extent permissible at law our user databases, together with any personal
                information and non-personal information contained in those databases.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Disclosure of Your Personal Information</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Scamly Pty Ltd may disclose your personal information to any of our employees, officers, insurers,
                professional advisers, agents, suppliers or subcontractors insofar as reasonably necessary for the
                purposes set out in this privacy policy.
              </p>
              <p>
                (b) If we do disclose your personal information to a third party, we will protect it in accordance with
                this privacy policy.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. General Data Protection Regulation (GDPR) — Data Protection Compliance
            </h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Scamly Pty Ltd will comply with the principles of data protection set out in the GDPR for the
                purpose of fairness, transparency and lawful data collection and use.
              </p>
              <p>
                (b) We process your personal information as a Processor and/or to the extent that we are a Controller as
                defined in the GDPR.
              </p>
              <p>
                (c) We must establish a lawful basis for processing your personal information. The legal basis for which
                we collect your personal information depends on the data that we collect and how we use it.
              </p>
              <p>
                (d) We will only collect your personal information with your express consent for a specific purpose and
                any data collected will be to the extent necessary and not excessive for its purpose. We will keep your
                data safe and secure.
              </p>
              <p>
                (e) We will also process your personal information if it is necessary for our legitimate interests, or
                to fulfil a contractual or legal obligation.
              </p>
              <p>
                (f) We maintain documented lawful bases for each processing activity under Article 6(1) GDPR, including
                legitimate interest assessments for fraud detection and cybersecurity services, and explicit consent
                mechanisms for marketing communications, with Data Processing Agreements available to customers upon
                request.
              </p>
              <p>
                (g) We process your personal information if it is necessary to protect your life or in a medical
                situation, it is necessary to carry out a public function, a task of public interest or if the function
                has a clear basis in law.
              </p>
              <p>
                (h) We do not collect or process any personal information from you that is considered "Sensitive
                Personal Information" under the GDPR, such as personal information relating to your sexual orientation
                or ethnic origin unless we have obtained your explicit consent, or if it is being collected subject to
                and in accordance with the GDPR.
              </p>
              <p>
                (i) You must not provide us with your personal information if you are under the age of 16 without the
                consent of your parent or someone who has parental authority for you. We do not knowingly collect or
                process the personal information of children.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights Under the GDPR</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) If you are an individual residing in the EU, you have certain rights as to how your personal
                information is obtained and used. Scamly Pty Ltd complies with your rights under the GDPR as to how your
                personal information is used and controlled if you are an individual residing in the EU.
              </p>
              <p>(b) Except as otherwise provided in the GDPR, you have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) to be informed how your personal information is being used;</li>
                <li>(ii) access your personal information (we will provide you with a free copy of it);</li>
                <li>(iii) to correct your personal information if it is inaccurate or incomplete;</li>
                <li>(iv) to delete your personal information (also known as "the right to be forgotten");</li>
                <li>(v) to restrict processing of your personal information;</li>
                <li>(vi) to retain and reuse your personal information for your own purposes;</li>
                <li>(vii) to object to your personal information being used; and</li>
                <li>(viii) to object against automated decision making and profiling.</li>
              </ul>
              <p>
                (c) Please contact us at any time to exercise your rights under the GDPR at the contact details in this
                Privacy Policy.
              </p>
              <p>(d) We may ask you to verify your identity before acting on any of your requests.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Hosting and International Data Transfers</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Information that we collect may from time to time be stored, processed in or transferred between
                parties or sites located in countries outside of Australia. Our primary data storage facilities are
                located in Australia and Singapore. However, data may be processed globally to optimise application
                performance and reduce latency for users accessing our software from different regions. These countries
                may include, but are not limited to, Australia, Singapore, Sweden, and other jurisdictions where our
                infrastructure providers operate.
              </p>
              <p>
                (b) We are headquartered in Australia, however we access servers globally and maintain our primary data
                storage facilities in Singapore. Transfers to each of these countries will be protected by appropriate
                safeguards, these include one or more of the following: the use of standard data protection clauses
                adopted or approved by the European Commission which you can obtain from the European Commission
                Website; the use of binding corporate rules, a copy of which you can obtain from Scamly Pty Ltd's Data
                Protection Officer.
              </p>
              <p>
                (c) The hosting facilities for our website are situated in the United States of America and Sweden.
                Transfers to each of these countries will be protected by appropriate safeguards, these include one or
                more of the following: the use of standard data protection clauses adopted or approved by the European
                Commission which you can obtain from the European Commission Website; the use of binding corporate
                rules, a copy of which you can obtain from Scamly Pty Ltd's Data Protection Officer.
              </p>
              <p>
                (d) Our third-party service providers, including those providing analytics, data processing, and user
                information management tools, are situated in Australia, European Union member states, Singapore, and
                United States of America. Transfers to each of these countries will be protected by appropriate
                safeguards, these include one or more of the following: the use of standard data protection clauses
                adopted or approved by the European Commission which you can obtain from the European Commission
                Website; the use of binding corporate rules, a copy of which you can obtain from Scamly Pty Ltd's Data
                Protection Officer.
              </p>
              <p>
                (e) You acknowledge that personal data that you submit for publication through our website or services
                may be available, via the internet, around the world. We cannot prevent the use (or misuse) of such
                personal information by others.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Security of Your Personal Information</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Scamly Pty Ltd is committed to ensuring that the information you provide to us is secure. In order
                to prevent unauthorised access or disclosure, we have put in place suitable physical, electronic and
                managerial procedures to safeguard and secure information and protect it from misuse, interference, loss
                and unauthorised access, modification and disclosure.
              </p>
              <p>
                (b) Where we employ data processors to process personal information on our behalf, we only do so on the
                basis that such data processors comply with the requirements under the GDPR and that have adequate
                technical measures in place to protect personal information against unauthorised use, loss and theft.
              </p>
              <p>
                (c) The transmission and exchange of information is carried out at your own risk. Whilst we cannot
                guarantee the security of any information that you transmit to us or receive from us, we will take all
                reasonable and appropriate technical and organisational measures to protect your personal information in
                accordance with our obligations under the Privacy Act 1988 (Cth) and the GDPR. We cannot assure you that
                personal information that we collect will not be disclosed in a manner that is inconsistent with this
                Privacy Policy.
              </p>
              <p>
                (d) In the event of a personal data breach, we will notify the relevant supervisory authority within 72
                hours of becoming aware of the breach, and will notify affected individuals without undue delay where
                the breach is likely to result in a high risk to their rights and freedoms. Our notification will
                include the nature of the breach, the categories and approximate number of data subjects affected, the
                likely consequences, and the measures taken or proposed to address the breach and mitigate its possible
                adverse effects.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Access to Your Personal Information</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) You may request details of personal information that we hold about you in accordance with the
                provisions of the Privacy Act 1988 (Cth), and to the extent applicable the EU GDPR. If you would like a
                copy of the information which we hold about you or believe that any information we hold on you is
                inaccurate, out of date, incomplete, irrelevant or misleading, please email us at{" "}
                <a href="mailto:support@scamly.io" className="text-primary hover:underline">
                  support@scamly.io
                </a>
                .
              </p>
              <p>
                (b) We reserve the right to refuse to provide you with information that we hold about you, in certain
                circumstances set out in the Privacy Act or any other applicable law.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Complaints About Privacy</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) If you have any complaints about our privacy practices, please feel free to send in details of your
                complaints to{" "}
                <a href="mailto:support@scamly.io" className="text-primary hover:underline">
                  support@scamly.io
                </a>
                . We take complaints very seriously and will respond shortly after receiving written notice of your
                complaint.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to Privacy Policy</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) Please be aware that we may change this Privacy Policy in the future. We may modify this Policy at
                any time, in our sole discretion and all modifications will be effective immediately upon our posting of
                the modifications on our website or notice board. Please check back from time to time to review our
                Privacy Policy.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Website</h2>
            <div className="text-muted-foreground space-y-4">
              <p>
                (a) <strong>When you visit our website:</strong> When you come to our website (www.scamly.io), we may
                collect certain information such as browser type, operating system, website visited immediately before
                coming to our site, etc. This information is used in an aggregated manner to analyse how people use our
                site, such that we can improve our service.
              </p>
              <p>
                (b) <strong>Cookies:</strong> We may from time to time use cookies on our website. Cookies are very
                small files which a website uses to identify you when you come back to the site and to store details
                about your use of the site. Cookies are not malicious programs that access or damage your computer. Most
                web browsers automatically accept cookies but you can choose to reject cookies by changing your browser
                settings. However, this may prevent you from taking full advantage of our website. Our website uses the
                following categories of cookies: necessary cookies that are essential for the website to function;
                functional cookies that remember your preferences and settings; analytics cookies that help us
                understand how visitors interact with our website and improve our service; and cookies that share data
                with Google for analytics and performance purposes.
              </p>
              <p>
                (c) <strong>Third party sites:</strong> Our site may from time to time have links to other websites not
                owned or controlled by us. These links are meant for your convenience only. Links to third party
                websites do not constitute sponsorship or endorsement or approval of these websites. Please be aware
                that Scamly Pty Ltd is not responsible for the privacy practises of other such websites. We encourage
                our users to be aware, when they leave our website, to read the privacy statements of each and every
                website that collects personal identifiable information.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
