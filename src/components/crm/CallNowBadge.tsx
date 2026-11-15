import { CALL_QUESTION, type Lead } from "@/lib/crm/constants";

// What an ad lead answered to "Can we call you in the next 5 minutes?".
export default function CallNowBadge({ lead, className = "" }: { lead: Lead; className?: string }) {
  const answer = lead.extra?.[CALL_QUESTION];
  if (answer !== "Yes" && answer !== "No") return null;
  return answer === "Yes" ? (
    <span className={`inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-800 ${className}`}>
      ✅ Call now: YES
    </span>
  ) : (
    <span className={`inline-block rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] font-extrabold text-slate-700 ${className}`}>
      ⏳ Call now: not right now
    </span>
  );
}

// Organic opt-ins that came through an affiliate's link.
export function AffiliateBadge({ lead, className = "" }: { lead: Lead; className?: string }) {
  if (!lead.affiliateName) return null;
  return (
    <span className={`inline-block rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-extrabold text-violet-800 ${className}`}>
      🤝 {lead.affiliateName}
    </span>
  );
}
