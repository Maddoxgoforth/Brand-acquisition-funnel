"use server";

import { redirect } from "next/navigation";

import { createPartnerSession, destroyPartnerSession } from "@/lib/crm/partnerAuth";
import { checkPartnerLogin, createPartner } from "@/lib/crm/partners";

const pause = () => new Promise((resolve) => setTimeout(resolve, 800));
const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function partnerLogin(formData: FormData) {
  const result = await checkPartnerLogin(text(formData, "email"), text(formData, "password"));
  if (!result.ok) {
    await pause();
    redirect(`/partner/login?error=${result.reason}`);
  }
  await createPartnerSession(result.id);
  redirect("/partner");
}

export async function partnerSignup(formData: FormData) {
  const result = await createPartner(text(formData, "name"), text(formData, "email"), text(formData, "password"));
  if (result !== "created") await pause();
  redirect(result === "created" ? "/partner/login?notice=requested" : `/partner/signup?error=${result}`);
}

export async function partnerLogout() {
  await destroyPartnerSession();
  redirect("/partner/login");
}
