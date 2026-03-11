import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <link rel="canonical" href="https://scamly.io/terms" />
      </Helmet>
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        
        <h1 className="font-display text-4xl font-bold mb-8">Terms & Conditions of Use</h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Effective from: 10 March 2026
          </p>

          <p className="text-muted-foreground text-sm">
            Scamly Pty Ltd (ACN 695941532) — 81-83 Campbell Street, Sydney NSW 2010
          </p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. About the Application</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) Welcome to Scamly (Application). The Application is AI-powered fraud detection and scam prevention services that analyse digital communications in real-time to help individuals identify and avoid online scams, phishing attempts, and fraudulent activities (Services).</p>
              <p>(b) The Application is operated by SCAMLY PTY LTD (ACN 695941532). Access to and use of the Application, or any of its associated Products or Services, is provided by SCAMLY PTY LTD. Please read these terms and conditions (Terms) carefully. By using, browsing and/or reading the Application, this signifies that you have read, understood and agree to be bound by the Terms. If you do not agree with the Terms, you must cease usage of the Application, or any of Services, immediately.</p>
              <p>(c) SCAMLY PTY LTD reserves the right to review and change any of the Terms by updating this page at its sole discretion. When SCAMLY PTY LTD updates the Terms, it will use reasonable endeavours to provide you with notice of updates to the Terms. Any changes to the Terms take immediate effect from the date of their publication. Before you continue, we recommend you keep a copy of the Terms for your records.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Acceptance of the Terms</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) You accept the Terms by remaining on the Application. You may also accept the Terms by clicking to accept or agree to the Terms where this option is made available to you by SCAMLY PTY LTD in the user interface.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Registration to Use the Services</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) In order to access the Services, you must first register for an account through the Application (Account).</p>
              <p>(b) As part of the registration process, or as part of your continued use of the Services, you may be required to provide personal information about yourself (such as identification or contact details), including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) Email address</li>
                <li>(ii) Preferred username</li>
                <li>(iii) Password</li>
                <li>(iv) Country of residence</li>
              </ul>
              <p>(c) You warrant that any information you give to SCAMLY PTY LTD in the course of completing the registration process will always be accurate, correct and up to date.</p>
              <p>(d) Once you have completed the registration process, you will be a registered member of the Application (Member) and agree to be bound by the Terms.</p>
              <p>(e) You may not use the Services and may not accept the Terms if:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) you are not of legal age to form a binding contract with SCAMLY PTY LTD; or</li>
                <li>(ii) you are a person barred from receiving the Services under the laws of Australia or other countries including the country in which you are resident or from which you use the Services.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Your Obligations as a Member</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) As a Member, you agree to comply with the following:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) you will use the Services only for purposes that are permitted by: (A) the Terms; and (B) any applicable law, regulation or generally accepted practices or guidelines in the relevant jurisdictions;</li>
                <li>(ii) you have the sole responsibility for protecting the confidentiality of your password and/or email address. Use of your password by any other person may result in the immediate cancellation of the Services;</li>
                <li>(iii) any use of your registration information by any other person, or third parties, is strictly prohibited. You agree to immediately notify SCAMLY PTY LTD of any unauthorised use of your password or email address or any breach of security of which you have become aware;</li>
                <li>(iv) access and use of the Application is limited, non-transferable and allows for the sole use of the Application by you for the purposes of SCAMLY PTY LTD providing the Services;</li>
                <li>(v) you will not use the Services or the Application in connection with any commercial endeavours except those that are specifically endorsed or approved by the management of SCAMLY PTY LTD;</li>
                <li>(vi) you will not use the Services or Application for any illegal and/or unauthorised use which includes collecting email addresses of Members by electronic or other means for the purpose of sending unsolicited email or unauthorised framing of or linking to the Application;</li>
                <li>(vii) you agree that commercial advertisements, affiliate links, and other forms of solicitation may be removed from the Application without notice and may result in termination of the Services. Appropriate legal action will be taken by SCAMLY PTY LTD for any illegal or unauthorised use of the Application;</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Payment</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) All payments made in the course of your use of the Services are made using Stripe. In using the Application, the Services or when making any payment in relation to your use of the Services, you warrant that you have read, understood and agree to be bound by the Stripe terms and conditions which are available on their website.</p>
              <p>(b) You acknowledge and agree that where a request for the payment of the Services Fee is returned or denied, for whatever reason, by your financial institution or is unpaid by you for any other reason, then you are liable for any costs, including banking fees and charges, associated with the Services Fee.</p>
              <p>(c) You agree and acknowledge that SCAMLY PTY LTD can vary the Services Fee at any time.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Refund Policy</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) SCAMLY PTY LTD will only provide you with a refund of the Services Fee in the event they are unable to continue to provide the Services or if the manager of SCAMLY PTY LTD makes a decision, at its absolute discretion, that it is reasonable to do so under the circumstances (Refund).</p>
              <p>(b) Any benefits set out in this Terms and Conditions may apply in addition to consumer's rights under the Australian Consumer Law.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Copyright and Intellectual Property</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) The Application, the Services and all of the related products of SCAMLY PTY LTD are subject to copyright. The material on the Application is protected by copyright under the laws of Australia and through international treaties. Unless otherwise indicated, all rights (including copyright) in the Services and compilation of the Application (including but not limited to text, graphics, logos, button icons, video images, audio clips, Application code, scripts, design elements and interactive features) or the Services are owned or controlled for these purposes, and are reserved by SCAMLY PTY LTD or its contributors.</p>
              <p>(b) All trademarks, service marks and trade names are owned, registered and/or licensed by SCAMLY PTY LTD, who grants to you a worldwide, non-exclusive, royalty-free, revocable license whilst you are a Member to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) use the Application pursuant to the Terms;</li>
                <li>(ii) copy and store the Application and the material contained in the Application in your device's cache memory; and</li>
                <li>(iii) print pages from the Application for your own personal and non-commercial use.</li>
              </ul>
              <p>SCAMLY PTY LTD does not grant you any other rights whatsoever in relation to the Application or the Services. All other rights are expressly reserved by SCAMLY PTY LTD.</p>
              <p>(c) SCAMLY PTY LTD retains all rights, title and interest in and to the Application and all related Services. Nothing you do on or in relation to the Application will transfer any:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) business name, trading name, domain name, trade mark, industrial design, patent, registered design or copyright, or</li>
                <li>(ii) a right to use or exploit a business name, trading name, domain name, trade mark or industrial design, or</li>
                <li>(iii) a thing, system or process that is the subject of a patent, registered design or copyright (or an adaptation or modification of such a thing, system or process),</li>
              </ul>
              <p>to you.</p>
              <p>(d) You may not, without the prior written permission of SCAMLY PTY LTD and the permission of any other relevant rights owners: broadcast, republish, upload to a third party, transmit, post, distribute, show or play in public, adapt or change in any way the Services or third party Services for any purpose, unless otherwise provided by these Terms. This prohibition does not extend to materials on the Application, which are freely available for re-use or are in the public domain.</p>
              <p>(e) <strong>User-Generated Data and Service Improvements:</strong> By submitting any content, communications, or data to the Application for analysis (including emails, messages, URLs, or other materials), you grant a perpetual, worldwide, royalty-free, non-exclusive license to use, reproduce, and analyse such submissions in anonymised and aggregated form to improve fraud detection algorithms, train machine learning models, and enhance the Services. All fraud detection patterns, analysis results, and derivative works generated by the Application remain the exclusive property of SCAMLY PTY LTD, and you acknowledge that SCAMLY PTY LTD may use such insights to improve the Services without further compensation to you.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Privacy</h2>
            <div className="text-muted-foreground space-y-4">
              <p>SCAMLY PTY LTD takes your privacy seriously and any information provided through your use of the Application and/or Services are subject to SCAMLY PTY LTD's <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. General Disclaimer</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) Nothing in the Terms limits or excludes any guarantees, warranties, representations or conditions implied or imposed by law, including the Australian Consumer Law (or any liability under them) which by law may not be limited or excluded.</p>
              <p>(b) Subject to this clause, and to the extent permitted by law:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) all terms, guarantees, warranties, representations or conditions which are not expressly stated in the Terms are excluded; and</li>
                <li>(ii) SCAMLY PTY LTD will not be liable for any special, indirect or consequential loss or damage (unless such loss or damage is reasonably foreseeable resulting from our failure to meet an applicable Consumer Guarantee), loss of profit or opportunity, or damage to goodwill arising out of or in connection with the Services or these Terms (including as a result of not being able to use the Services or the late supply of the Services), whether at common law, under contract, tort (including negligence), in equity, pursuant to statute or otherwise.</li>
              </ul>
              <p>(c) Use of the Application and the Services is at your own risk. Everything on the Application and the Services is provided to you "as is" and "as available" without warranty or condition of any kind. None of the affiliates, directors, officers, employees, agents, contributors and licensors of SCAMLY PTY LTD make any express or implied representation or warranty about the Services or any products or Services (including the products or Services of SCAMLY PTY LTD) referred to on the Application. This includes (but is not restricted to) loss or damage you might suffer as a result of any of the following:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) failure of performance, error, omission, interruption, deletion, defect, failure to correct defects, delay in operation or transmission, computer virus or other harmful component, loss of data, communication line failure, unlawful third party conduct, or theft, destruction, alteration or unauthorised access to records;</li>
                <li>(ii) the accuracy, suitability or currency of any information on the Application, the Services, or any of its Services related products (including third party material and advertisements on the Application);</li>
                <li>(iii) costs incurred as a result of you using the Application, the Services or any of the products of SCAMLY PTY LTD; and</li>
                <li>(iv) the Services or operation in respect to links which are provided for your convenience.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) SCAMLY PTY LTD's total liability arising out of or in connection with the Services or these Terms, however arising, including under contract, tort (including negligence), in equity, under statute or otherwise, will not exceed the resupply of the Services to you.</p>
              <p>(b) You expressly understand and agree that SCAMLY PTY LTD, its affiliates, employees, agents, contributors and licensors shall not be liable to you for any direct, indirect, incidental, special consequential or exemplary damages which may be incurred by you, however caused and under any theory of liability. This shall include, but is not limited to, any loss of profit (whether incurred directly or indirectly), any loss of goodwill or business reputation and any other intangible loss.</p>
              <p>(c) You acknowledge and agree that the Application utilises artificial intelligence and machine learning technologies to analyse digital communications and detect potential scams or fraudulent activity. Such technologies are inherently probabilistic and may produce inaccurate, incomplete or false results. SCAMLY PTY LTD does not warrant that the Application will detect all scams, phishing attempts or fraudulent activities, nor that its analysis will be free from error. To the maximum extent permitted by law, SCAMLY PTY LTD shall not be liable for any loss of funds, financial loss, or harm suffered by you as a result of:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) reliance on any analysis, alert, recommendation or output generated by the Application's AI systems;</li>
                <li>(ii) the failure of the Application to identify a scam, fraudulent communication or phishing attempt; or</li>
                <li>(iii) any inaccurate, incomplete or misleading output produced by the Application.</li>
              </ul>
              <p>You accept sole responsibility for any decisions made in reliance on the Application's outputs and are encouraged to exercise independent judgement before acting on any analysis provided.</p>
              <p>(d) Notwithstanding the foregoing, the limitations in this clause do not apply to liability for: (a) death or personal injury caused by negligence; (b) fraud, wilful misconduct or gross negligence; (c) breach of confidentiality obligations under clause 14.4; (d) infringement of third-party intellectual property rights; or (e) any liability that cannot be excluded or limited under the Australian Consumer Law or other applicable law.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Competitors</h2>
            <div className="text-muted-foreground space-y-4">
              <p>If you are in the business of providing similar Services for the purpose of providing them to users for a commercial gain, whether business users or domestic users, then you are a competitor of SCAMLY PTY LTD. Competitors are not permitted to use or access any information or content on our Application. If you breach this provision, SCAMLY PTY LTD will hold you fully responsible for any loss that we may sustain and hold you accountable for all profits that you might make from such a breach.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination of Contract</h2>
            <div className="text-muted-foreground space-y-4">
              <p>(a) The Terms will continue to apply until terminated by either you or by SCAMLY PTY LTD as set out below.</p>
              <p>(b) If you want to terminate the Terms, you may do so by:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(i) providing SCAMLY PTY LTD with notice of your intention to terminate; and</li>
                <li>(ii) closing your accounts for all of the services which you use, where SCAMLY PTY LTD has made this option available to you.</li>
              </ul>
              <p>Your notice should be sent, in writing, to SCAMLY PTY LTD via the 'Contact Us' link on our homepage.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Indemnity</h2>
            <div className="text-muted-foreground space-y-4">
              <p>You agree to indemnify SCAMLY PTY LTD, its affiliates, employees, agents, contributors, third party content providers and licensors from and against:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>(a) all actions, suits, claims, demands, liabilities, costs, expenses, loss and damage (including legal fees on a full indemnity basis) incurred, suffered or arising out of or in connection with your content;</li>
                <li>(b) any direct or indirect consequences of you accessing, using or transacting on the Application or attempts to do so; and/or</li>
                <li>(c) any breach of the Terms.</li>
                <li>(d) any claims arising from Scamly's breach of confidentiality obligations, unauthorized disclosure of user data, or infringement of applicable privacy laws including the Privacy Act 1988 (Cth).</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Dispute Resolution</h2>
            <div className="text-muted-foreground space-y-4">
              <p><strong>14.1. Compulsory:</strong> If a dispute arises out of or relates to the Terms, either party may not commence any Tribunal or Court proceedings in relation to the dispute, unless the following clauses have been complied with (except where urgent interlocutory relief is sought).</p>
              <p><strong>14.2. Notice:</strong> A party to the Terms claiming a dispute (Dispute) has arisen under the Terms, must give written notice to the other party detailing the nature of the dispute, the desired outcome and the action required to settle the Dispute.</p>
              <p><strong>14.3. Resolution:</strong> On receipt of that notice (Notice) by that other party, the parties to the Terms (Parties) must:</p>
              <ul className="list-decimal pl-6 space-y-2">
                <li>Within 28 days of the Notice endeavour in good faith to resolve the Dispute expeditiously by negotiation or such other means upon which they may mutually agree;</li>
                <li>If for any reason whatsoever, 28 days after the date of the Notice, the Dispute has not been resolved, the Parties must either agree upon selection of a mediator or request that an appropriate mediator be appointed by the Resolution Institute;</li>
                <li>The Parties are equally liable for the fees and reasonable expenses of a mediator and the cost of the venue of the mediation and without limiting the foregoing undertake to pay any amounts requested by the mediator as a precondition to the mediation commencing. The Parties must each pay their own costs associated with the mediation;</li>
                <li>The mediation will be held in Sydney, Australia.</li>
              </ul>
              <p><strong>14.4. Confidential:</strong> All communications concerning negotiations made by the Parties arising out of and in connection with this dispute resolution clause are confidential and to the extent possible, must be treated as "without prejudice" negotiations for the purpose of applicable laws of evidence.</p>
              <p><strong>14.5. Termination of Mediation:</strong> If 2 months have elapsed after the start of a mediation of the Dispute and the Dispute has not been resolved, either Party may ask the mediator to terminate the mediation and the mediator must do so.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Venue and Jurisdiction</h2>
            <div className="text-muted-foreground space-y-4">
              <p>The Services offered by SCAMLY PTY LTD are available to users worldwide. Notwithstanding the global availability of the Services, in the event of any dispute arising out of or in relation to the Application or these Terms, you agree that the exclusive venue for resolving any such dispute shall be in the courts of Western Australia, Australia, and you irrevocably submit to the jurisdiction of those courts.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Governing Law</h2>
            <div className="text-muted-foreground space-y-4">
              <p>The Terms are governed by the laws of New South Wales, Australia. Any dispute, controversy, proceeding or claim of whatever nature arising out of or in any way relating to the Terms and the rights created hereby shall be governed, interpreted and construed by, under and pursuant to the laws of New South Wales, Australia, without reference to conflict of law principles.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Severance</h2>
            <div className="text-muted-foreground space-y-4">
              <p>If any part of these Terms is found to be void or unenforceable by a Court of competent jurisdiction, that part shall be severed and the rest of the Terms shall remain in force.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">18. Data Protection Compliance</h2>
            <div className="text-muted-foreground space-y-4">
              <p>The collection, use, storage and disclosure of personal information through the Application complies with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles. Where the Application processes personal data of individuals located in the European Union, SCAMLY PTY LTD will comply with the General Data Protection Regulation (EU) 2016/679 (GDPR), including implementing appropriate technical and organisational measures to ensure data security, providing data breach notifications within 72 hours where required, and facilitating user rights including access, rectification, erasure, data portability and objection to processing.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
