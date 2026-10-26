import type { Metadata } from "next";

import LegalPage, { BUSINESS, CONTACT_EMAIL } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms: Maddox" };

export default function Terms() {
  return (
    <LegalPage
      title="Terms And Conditions"
      sections={[
        {
          heading: "Using this site",
          body: (
            <p>
              By using brandacquisition.co you agree to these terms. The site and its courses are run by {BUSINESS}.
            </p>
          ),
        },
        {
          heading: "Education, not a promise of income",
          body: (
            <>
              <p>
                Our free course and paid programs teach skills: building a personal brand, making content and
                selling digital products. They are not a business opportunity, and nothing on this site is a promise
                or guarantee that you will make any money.
              </p>
              <p>
                Any earnings or results we show are examples, not typical results. Your results depend on your own
                effort, skills, time and circumstances, and many people who take courses like ours make little or
                no money. Nothing here is financial, legal or tax advice.
              </p>
            </>
          ),
        },
        {
          heading: "Affiliate and partner disclosure",
          body: (
            <p>
              We are paid by some of the tools we recommend (for example Base44) when you sign up through our links.
              That is how the free course stays free. We only recommend tools we use.
            </p>
          ),
        },
        {
          heading: "Your account and content",
          body: (
            <p>
              Course materials are for your own personal use. Don&apos;t copy, resell or share them without written
              permission.
            </p>
          ),
        },
        {
          heading: "Payments and refunds",
          body: (
            <p>
              Paid programs are sold through our checkout partner (Whop) at the price shown at checkout. Refund terms
              are the ones stated on the checkout page for that program.
            </p>
          ),
        },
        {
          heading: "Limits of liability",
          body: (
            <p>
              The site and courses are provided &quot;as is&quot;. To the extent the law allows, {BUSINESS} is not
              liable for indirect or consequential losses from using them.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              Questions? Email{" "}
              <a className="text-accent underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
