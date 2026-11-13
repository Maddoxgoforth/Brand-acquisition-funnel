import { crmRoute, readJson } from "@/lib/crm/api";
import { isPayPlan } from "@/lib/crm/constants";
import {
  addPayEntry,
  createRule,
  deletePayEntry,
  deleteRule,
  payReport,
  setRate,
  setRuleEnded,
} from "@/lib/crm/pay";
import { readRange } from "./range";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (error: string) => Response.json({ error }, { status: 400 });
const whole = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

// Owner only: commissions, activity and bonus rules for a time frame.
export async function GET(request: Request) {
  return crmRoute(
    request,
    async () => {
      const range = readRange(request.url);
      if (!range) return bad("Invalid dates");
      return Response.json(await payReport(range.from, range.to));
    },
    { ownerOnly: true }
  );
}

// Owner only. Actions:
// { action: "rate", userId, monthly, yearly, builderYearly, applyToPast }
// { action: "rule", name, plan, everyN, amount } | { action: "rule-end" | "rule-reopen" | "rule-delete", id }
// { action: "entry", userId, kind: "adjustment" | "payout", amount, note, at } | { action: "entry-delete", id }
export async function POST(request: Request) {
  return crmRoute(
    request,
    async () => {
      const b = (await readJson(request)) as Record<string, unknown> | null;
      if (!b) return bad("Invalid request");
      const id = typeof b.id === "string" && UUID.test(b.id) ? b.id : null;
      const userId = typeof b.userId === "string" && UUID.test(b.userId) ? b.userId : null;
      let ok = true;
      switch (b.action) {
        case "rate":
          if (!userId) return bad("Invalid request");
          {
            const builderYearly = b.builderYearly === undefined ? 100 : b.builderYearly;
            if (!whole(b.monthly, 0, 100000) || !whole(b.yearly, 0, 100000) || !whole(builderYearly, 0, 100000)) {
              return bad("Enter commissions in whole dollars.");
            }
            await setRate(
              userId,
              { monthly: b.monthly as number, yearly: b.yearly as number, builderYearly: builderYearly as number },
              b.applyToPast === true
            );
          }
          break;
        case "rule": {
          const name = typeof b.name === "string" ? b.name.trim().slice(0, 120) : "";
          if (!name) return bad("Give the bonus a name.");
          if (!isPayPlan(b.plan)) return bad("Pick which closes count.");
          if (!whole(b.everyN, 1, 1000)) return bad("Every how many closes? Use a whole number.");
          if (!whole(b.amount, 1, 100000)) return bad("Enter the bonus in whole dollars.");
          await createRule({ name, plan: b.plan, everyN: b.everyN as number, amount: b.amount as number });
          break;
        }
        case "rule-end":
        case "rule-reopen":
          if (!id) return bad("Invalid request");
          ok = await setRuleEnded(id, b.action === "rule-end");
          break;
        case "rule-delete":
          if (!id) return bad("Invalid request");
          ok = await deleteRule(id);
          break;
        case "entry": {
          if (!userId || (b.kind !== "adjustment" && b.kind !== "payout")) return bad("Invalid request");
          const min = b.kind === "payout" ? 1 : -100000;
          if (!whole(b.amount, min, 100000) || b.amount === 0) return bad("Enter an amount in whole dollars.");
          let at: string | null = null;
          if (typeof b.at === "string" && b.at) {
            const d = new Date(b.at);
            if (Number.isNaN(d.getTime())) return bad("Invalid date");
            at = d.toISOString();
          }
          await addPayEntry({
            userId,
            kind: b.kind,
            amount: b.amount as number,
            note: typeof b.note === "string" ? b.note.trim().slice(0, 300) : "",
            at,
          });
          break;
        }
        case "entry-delete":
          if (!id) return bad("Invalid request");
          ok = await deletePayEntry(id);
          break;
        default:
          return bad("Invalid request");
      }
      if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ ok: true });
    },
    { ownerOnly: true }
  );
}
