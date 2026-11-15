import { callerNumber } from "@/lib/callerNumber";

// A contact card for the number the team calls from. Opening it on a phone
// shows "Create New Contact"; once saved, iPhones with "Silence Unknown
// Callers" on still ring, and the call shows as "Maddox's Team".
export function GET() {
  const number = callerNumber();
  if (!number) return new Response("Not found", { status: 404 });
  const card = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Team;Maddox's;;;",
    "FN:Maddox's Team",
    "ORG:Maddox - Free Course",
    `TEL;TYPE=CELL,VOICE:${number.tel}`,
    "NOTE:My team calls you from this number about your free course.",
    "END:VCARD",
    "",
  ].join("\r\n");
  return new Response(card, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'inline; filename="Maddoxs-Team.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
