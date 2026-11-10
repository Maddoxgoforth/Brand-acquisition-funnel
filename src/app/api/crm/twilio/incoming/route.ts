import { FULL_ACCESS, SOURCES, canAccess, toE164, type Lead } from "@/lib/crm/constants";
import {
  findLeadByPhone,
  getInboundCall,
  getLead,
  lastCallerOf,
  markInboundMissed,
  saveVoicemail,
  startInboundCall,
} from "@/lib/crm/leads";
import { missedCallText, notifyTeam } from "@/lib/crm/notify";
import { dialerIdentity, escapeXml, missingTwilioEnv, readTwilioRequest } from "@/lib/crm/twilio";
import { getActiveMember, listTeam } from "@/lib/crm/users";

// Calls TO the Twilio number (leads calling back). Set as the number's
// "A call comes in" webhook in the Twilio Console. The call goes:
//   1. ring whoever last called this lead (in their open CRM tab), 20 s
//   2. ring everyone who can see the lead and has the CRM open, 20 s
//   3. voicemail. The lead's card shows the missed call, and Slack/Discord
//      get an alert (and a second one if they leave a voicemail).
// Each step is its own request: Twilio comes back to `?step=...` when a
// <Dial> ends.

const RING_SECONDS = 20;

function twiml(body: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function baseUrl(request: Request) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}${url.pathname}`;
}

function stepUrl(request: Request, step: string, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ step, ...extra });
  return escapeXml(`${baseUrl(request)}?${q}`);
}

const OWNER = dialerIdentity(FULL_ACCESS, "owner");

async function identityOf(actorId: string | null, lead: Lead | null) {
  if (!actorId) return null;
  if (actorId === "owner") return OWNER;
  const member = await getActiveMember(actorId);
  if (!member) return null;
  if (lead && !canAccess(member.access, lead.source)) return null;
  return dialerIdentity(member.access, member.id);
}

// Everyone allowed to see the lead (everyone, for unknown numbers): the owner
// first, then team members who logged in most recently. Twilio rings at most
// 10 at once; anyone without the CRM open simply doesn't ring.
async function everyone(lead: Lead | null, skip: string | null) {
  const team = (await listTeam())
    .filter((m) => m.status === "active" && (!lead || canAccess(m.access, lead.source)))
    .sort((a, b) => (b.lastLoginAt ?? "").localeCompare(a.lastLoginAt ?? ""));
  const ids = [OWNER, ...team.map((m) => dialerIdentity(m.access, m.id))];
  return [...new Set(ids)].filter((id) => id !== skip).slice(0, 10);
}

function dial(request: Request, identities: string[], next: string, extra: Record<string, string>, who: { leadId: string; name: string; phone: string; callSid: string }) {
  const params = Object.entries({ leadId: who.leadId, leadName: who.name, phone: who.phone, inboundSid: who.callSid })
    .map(([k, v]) => `<Parameter name="${k}" value="${escapeXml(v)}"/>`)
    .join("");
  const clients = identities
    .map((id) => `<Client><Identity>${escapeXml(id)}</Identity>${params}</Client>`)
    .join("");
  return twiml(
    `<Dial timeout="${RING_SECONDS}" answerOnBridge="true" action="${stepUrl(request, next, extra)}">${clients}</Dial>`
  );
}

// Marks the call missed and alerts the team, once per call.
async function missed(callSid: string) {
  const call = await getInboundCall(callSid);
  if (!call || !(await markInboundMissed(callSid))) return;
  const lead = call.leadId ? await getLead(call.leadId) : null;
  const list = lead ? SOURCES.find((s) => s.id === lead.source)?.label ?? null : null;
  await notifyTeam(missedCallText(lead?.name || null, lead?.phone || call.from, list));
}

async function voicemail(request: Request, callSid: string) {
  await missed(callSid);
  return twiml(
    `<Say>Sorry we missed your call. Leave your name and a quick message after the beep, and we'll call you right back.</Say>` +
      `<Record maxLength="120" timeout="5" playBeep="true" trim="trim-silence" action="${stepUrl(request, "end")}" ` +
      `recordingStatusCallback="${stepUrl(request, "recording")}" recordingStatusCallbackMethod="POST"/>`
  );
}

export async function POST(request: Request) {
  if (missingTwilioEnv().length > 0) return new Response("Twilio is not configured", { status: 503 });
  const params = await readTwilioRequest(request);
  if (!params) return new Response("Invalid signature", { status: 403 });

  const url = new URL(request.url);
  const step = url.searchParams.get("step") ?? "start";
  const callSid = params.CallSid ?? "";
  const answered = params.DialCallStatus === "completed";
  const callerGone = params.CallStatus === "completed" || params.CallStatus === "canceled";

  try {
    if (step === "recording") {
      const seconds = Number(params.RecordingDuration ?? 0);
      if (params.RecordingStatus === "completed" && params.RecordingSid && seconds >= 2) {
        const leadId = await saveVoicemail(callSid, params.RecordingSid, seconds);
        const call = await getInboundCall(callSid);
        const lead = leadId ? await getLead(leadId) : null;
        const who = lead?.name ? `"${lead.name}"` : "an unknown number";
        await notifyTeam(
          `🎙️ ${who} (${lead?.phone || call?.from || "unknown"}) left a ${seconds}s voicemail. Listen in their lead card in the CRM.`
        );
      }
      return new Response(null, { status: 204 });
    }

    if (step === "end") return twiml(`<Say>Thanks, talk soon.</Say><Hangup/>`);

    if (step === "start") {
      const from = params.From ?? "";
      const lead = await findLeadByPhone(toE164(from) ?? from);
      await startInboundCall(callSid, lead?.id ?? null, from);
      const who = { leadId: lead?.id ?? "", name: lead?.name ?? "", phone: lead?.phone || from, callSid };
      const first = lead ? await identityOf(await lastCallerOf(lead.id), lead) : null;
      if (first) return dial(request, [first], "everyone", { tried: first }, who);
      const all = await everyone(lead, null);
      return dial(request, all, "voicemail", {}, who);
    }

    // After a <Dial>: picked up and finished → hang up; the caller left →
    // count it as missed; nobody picked up → next step.
    if (answered) return twiml(`<Hangup/>`);
    if (callerGone) {
      await missed(callSid);
      return twiml(`<Hangup/>`);
    }

    if (step === "everyone") {
      const call = await getInboundCall(callSid);
      const lead = call?.leadId ? await getLead(call.leadId) : null;
      const rest = await everyone(lead, url.searchParams.get("tried"));
      if (rest.length === 0) return voicemail(request, callSid);
      const who = { leadId: lead?.id ?? "", name: lead?.name ?? "", phone: lead?.phone || call?.from || "", callSid };
      return dial(request, rest, "voicemail", {}, who);
    }

    return voicemail(request, callSid);
  } catch (error) {
    console.error("CRM incoming call webhook failed:", error);
    return twiml(`<Say>Sorry, we can't take your call right now. Please try again in a few minutes.</Say>`);
  }
}
