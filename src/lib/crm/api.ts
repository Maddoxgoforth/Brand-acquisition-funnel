import "server-only";

import { rejectUnlessAuthed } from "./auth";
import { CrmDbNotConfiguredError } from "./db";

// Wraps a signed-in CRM route handler: checks the session, then turns thrown
// errors into JSON the UI can show.
export async function crmRoute(
  request: Request,
  handler: () => Promise<Response>
) {
  const rejected = await rejectUnlessAuthed(request);
  if (rejected) return rejected;
  return runSafely(handler);
}

export async function runSafely(handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof CrmDbNotConfiguredError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("CRM request failed:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
