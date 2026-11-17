import Link from "next/link";
import { redirect } from "next/navigation";

import { getPartnerSession } from "@/lib/crm/partnerAuth";
import { HOLD_DAYS, PERIOD_DAYS } from "@/lib/crm/partnerBatches";
import { PLAN_KEYS, PLAN_LABEL } from "@/lib/crm/partners";
import Shell from "../Shell";
import { money } from "../ui";

export const dynamic = "force-dynamic";

type Article = { slug: string; group: string; title: string; summary: string; body: React.ReactNode };

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{children}</p>;
const H = ({ children }: { children: React.ReactNode }) => <h3 className="mt-7 text-[17px] font-semibold text-slate-950">{children}</h3>;
const Steps = ({ items }: { items: React.ReactNode[] }) => (
  <ol className="mt-3 space-y-2">
    {items.map((it, i) => (
      <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">{i + 1}</span>
        <span>{it}</span>
      </li>
    ))}
  </ol>
);
const Callout = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-[15px] leading-relaxed text-slate-800">{children}</div>
);

function articles(rates: Record<string, number>): Article[] {
  const paid = PLAN_KEYS.filter((k) => rates[k] > 0);
  return [
    {
      slug: "how-you-earn",
      group: "Getting started",
      title: "How you earn",
      summary: "What you're paid for and when sales show up.",
      body: (
        <>
          <P>
            You earn a commission every time someone buys a Base44 plan through one of your links. Your links are on the{" "}
            <Link href="/partner/links" className="font-medium text-indigo-600 hover:underline">Your links</Link> page.
          </P>
          {paid.length ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[13px] uppercase tracking-wide text-slate-600">
                  <tr><th className="px-3 py-2 font-medium">Plan</th><th className="px-3 py-2 text-right font-medium">You earn per sale</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {paid.map((k) => (
                    <tr key={k}><td className="px-3 py-2.5">{PLAN_LABEL[k].join(" ")}</td><td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(rates[k])}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <H>When sales show up</H>
          <P>Sign-ups and purchases appear on your dashboard about 2 to 3 hours after they happen. Times are shown in Eastern time.</P>
          <H>Refunds and reversals</H>
          <P>
            If a customer cancels or is refunded, the sale is reversed. The commission comes off your dashboard and off your next
            payout automatically.
          </P>
        </>
      ),
    },
    {
      slug: "get-credit",
      group: "Getting started",
      title: "Getting credit for every sale",
      summary: "The clean sign-up flow that makes sure sales count for you.",
      body: (
        <>
          <P>
            Base44 credits a sale to the first referral link the customer clicked. If they&apos;ve visited Base44 before from
            somewhere else, or sign up in a way the link can&apos;t follow, the sale may not count for you.
          </P>
          <Callout>
            <strong>The clean flow:</strong> VPN off → private browser window → your link → new email → new account.
          </Callout>
          <H>What to tell every customer</H>
          <Steps
            items={[
              "Turn off any VPN.",
              "Open a private / incognito window (on iPhone: Safari → tabs → Private).",
              "Open your link in that window. Don't go to base44.com directly or search for it.",
              "Sign up with an email that has never been used on Base44.",
              "Pick the plan and check out in that same window.",
            ]}
          />
          <H>If you&apos;re on a call with them</H>
          <P>Walk them through it live and stay on until they&apos;ve checked out. That&apos;s the most reliable way to make sure the sale is credited to you.</P>
          <H>Common reasons a sale doesn&apos;t show up</H>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-slate-700">
            <li>They used an email that already had a Base44 account.</li>
            <li>They clicked someone else&apos;s link (or an ad) before yours.</li>
            <li>They signed up on another device than the one they opened your link on.</li>
            <li>It&apos;s been less than 3 hours. Check again later.</li>
          </ul>
        </>
      ),
    },
    {
      slug: "which-link",
      group: "Getting started",
      title: "Which link to use",
      summary: "Base44 vs. Base44 Pricing.",
      body: (
        <>
          <H>Base44</H>
          <P>Opens Base44&apos;s home page. Best for people who haven&apos;t seen it yet and want to look around first.</P>
          <H>Base44 Pricing</H>
          <P>Opens the pricing page. Best for people who are ready to pick a plan, like at the end of a call.</P>
          <Callout>Always copy your links from the Your links page and use them exactly as they are. Don&apos;t shorten or edit them, or sales may not be tracked.</Callout>
        </>
      ),
    },
    {
      slug: "payouts",
      group: "Payments",
      title: "How payouts work",
      summary: `${PERIOD_DAYS}-day periods, a ${HOLD_DAYS}-day review, then paid.`,
      body: (
        <>
          <Steps
            items={[
              <>Your sales are grouped into <strong>{PERIOD_DAYS}-day periods</strong> (for example Nov 1–5, Nov 6–10).</>,
              <>Each period is held for <strong>{HOLD_DAYS} days</strong> after it ends, so refunds and reversals can come off first.</>,
              <>After that it&apos;s reviewed and approved. It shows as <strong>Pending</strong> on your Payments page.</>,
              <>Once it&apos;s sent to your bank, it shows as <strong>Paid out</strong>.</>,
            ]}
          />
          <H>Before your first payout</H>
          <P>
            Add your bank details on the{" "}
            <Link href="/partner/payments" className="font-medium text-indigo-600 hover:underline">Payments</Link> page. They&apos;re
            encrypted, and only the last 4 digits are ever shown.
          </P>
          <H>If a period has a reversal</H>
          <P>The reversed commission comes out of that period if it hasn&apos;t been paid yet, otherwise out of your next one.</P>
        </>
      ),
    },
    {
      slug: "faq",
      group: "Payments",
      title: "FAQ",
      summary: "Quick answers to common questions.",
      body: (
        <>
          <H>I made a sale but don&apos;t see it.</H>
          <P>Give it 3 hours. If it still isn&apos;t there, go through Getting credit for every sale and check each step with the customer.</P>
          <H>Can I change my bank account?</H>
          <P>Yes. On the Payments page, click Edit next to your payout method and enter the new details.</P>
          <H>Can I change my name or password?</H>
          <P>
            Yes, on the <Link href="/partner/settings" className="font-medium text-indigo-600 hover:underline">Settings</Link> page.
          </P>
          <H>Why is a payout smaller than the sales I made?</H>
          <P>A sale in that period (or an earlier one that was already paid) was refunded or reversed, so its commission came off.</P>
        </>
      ),
    },
  ];
}

export default async function PartnerKnowledgebasePage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const list = articles(partner.rates);
  const { a } = await searchParams;
  const current = list.find((x) => x.slug === a) ?? list[0];
  const groups = [...new Set(list.map((x) => x.group))];

  return (
    <Shell partner={partner} active="/partner/knowledgebase">
      <div className="border-b border-slate-200/80 pb-4">
        <h1 className="text-xl font-semibold text-slate-950">Knowledgebase</h1>
        <p className="mt-0.5 text-sm text-slate-600">Everything you need to sell, get credited and get paid.</p>
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <nav className="space-y-5">
          {groups.map((g) => (
            <div key={g}>
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{g}</p>
              <div className="mt-1.5 space-y-0.5">
                {list
                  .filter((x) => x.group === g)
                  .map((x) => (
                    <Link
                      key={x.slug}
                      href={`/partner/knowledgebase?a=${x.slug}`}
                      className={`block rounded-md px-2 py-1.5 text-sm ${x.slug === current.slug ? "bg-slate-200/80 font-semibold text-slate-950" : "font-medium text-slate-700 hover:bg-slate-100"}`}
                    >
                      {x.title}
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </nav>
        <article className="max-w-[680px]">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{current.group}</p>
          <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-slate-950">{current.title}</h2>
          <p className="mt-1 text-[15px] text-slate-600">{current.summary}</p>
          <div className="mt-2">{current.body}</div>
        </article>
      </div>
    </Shell>
  );
}
