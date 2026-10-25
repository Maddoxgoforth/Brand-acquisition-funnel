// Played to the lead right after they pick up, before the call connects.
// Many US states require everyone on a call to know it's being recorded.
export async function POST() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say>This call may be recorded.</Say></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
