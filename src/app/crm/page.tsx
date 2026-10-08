import { redirect } from "next/navigation";

import CrmApp from "@/components/crm/CrmApp";
import { hasSession } from "@/lib/crm/auth";

export default async function CrmPage() {
  if (!(await hasSession())) redirect("/crm/login");
  return <CrmApp />;
}
