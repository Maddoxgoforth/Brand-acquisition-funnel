import { redirect } from "next/navigation";

import CrmApp from "@/components/crm/CrmApp";
import { getSession } from "@/lib/crm/auth";

export default async function CrmPage() {
  const session = await getSession();
  if (!session) redirect("/crm/login");
  return (
    <CrmApp
      user={{
        role: session.role,
        id: session.role === "owner" ? "owner" : session.userId,
        name: session.name,
        access: session.access,
      }}
    />
  );
}
