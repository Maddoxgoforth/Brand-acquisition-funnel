import "server-only";

import { authorize, type Session } from "./auth";
import { CrmDbNotConfiguredError } from "./db";

// Wraps a signed-in CRM route handler: checks the session (and, with
// `ownerOnly`, that it's the owner), then turns thrown errors into JSON the
// UI can show.
export async function crmRoute(
  request: Request,
  handler: (session: Session) => Promise<Response>,
  options: { ownerOnly?: boolean } = {}
) {
  return runSafely(async () => {
    const session = await authorize(request, options);
    if (session instanceof Response) return session;
    return handler(session);
  });
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
