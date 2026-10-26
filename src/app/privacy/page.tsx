import type { Metadata } from "next";

import LegalPage, { BUSINESS, CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy: Maddox" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        {
          heading: "Who we are",
          body: (
            <p>
              This site (brandacquisition.co) is run by {BUSINESS} (&quot;we&quot;, &quot;us&quot;). This policy
              explains what we collect when you use the site, why, and the choices you have.
            </p>
          ),
        },
        {
          heading: "What we collect",
          body: (
            <>
              <p>
                <strong>What you give us:</strong> your name, email and phone number when you sign up for the free
                course or apply, and your answers to any quiz on the site.
              </p>
              <p>
                <strong>Collected automatically:</strong> pages you visit, the ad or link that brought you here
                (for example UTM tags and Meta&apos;s click id), your IP address, browser type, and cookies or
                similar identifiers set by us and by the services listed below.
              </p>
            </>
          ),
        },
        {
          heading: "How we use it",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>To give you the free course and contact you about it by phone, text and email.</li>
              <li>To follow up about our paid coaching programs if they fit what you told us.</li>
              <li>To see which pages and ads work, and to improve the site and our advertising.</li>
              <li>To keep the site secure and comply with the law.</li>
            </ul>
          ),
        },
        {
          heading: "Advertising and the Meta Pixel",
          body: (
            <>
              <p>
                We use the Meta Pixel and Meta&apos;s Conversions API. They tell Meta (Facebook and Instagram)
                when you visit a page or sign up, so we can measure our ads and show them to people who are likely
                to be interested. Before anything is sent, your email and phone number are converted into an
                unreadable code (hashed). Meta may use this information as described in its own Data Policy.
              </p>
              <p>
                You can change how Meta uses your activity for ads in your Facebook or Instagram ad settings, and you
                can block cookies in your browser.
              </p>
            </>
          ),
        },
        {
          heading: "Texts and calls",
          body: (
            <p>
              If you sign up, you agree that we may call and text you about your sign-up and our programs, including
              with automated tools. Message and data rates may apply. Reply STOP to stop texts at any time, or HELP
              for help. Agreeing is not a condition of getting the free course.
            </p>
          ),
        },
        {
          heading: "Who we share it with",
          body: (
            <>
              <p>
                We don&apos;t sell your personal information. We share it only with the services that help us run
                the business: hosting and database (Vercel, Neon), calling (Twilio), team messaging (Discord, Slack),
                email (Kit), video (Wistia), payments (Whop), and advertising (Meta), each only for what they do for
                us. We may also share information if the law requires it.
              </p>
            </>
          ),
        },
        {
          heading: "How long we keep it",
          body: <p>We keep your information while it&apos;s useful for the reasons above, then delete it.</p>,
        },
        {
          heading: "Your choices and rights",
          body: (
            <p>
              You can ask us to see, correct or delete your information, or to stop contacting you, by emailing{" "}
              <a className="text-accent underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              . Depending on where you live (for example California or the EU), you may have more rights, and we
              will honor them.
            </p>
          ),
        },
        {
          heading: "Children",
          body: (
            <p>
              The site is not meant for children under 13, and we don&apos;t knowingly collect their information.
            </p>
          ),
        },
        {
          heading: "Changes",
          body: <p>If we change this policy, we&apos;ll update the date at the top of this page.</p>,
        },
      ]}
    />
  );
}
