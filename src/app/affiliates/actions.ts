"use server";

import { redirect } from "next/navigation";

import { createAffiliateSession, destroyAffiliateSession } from "@/lib/crm/affiliateAuth";
import { checkAffiliateLogin, createAffiliate } from "@/lib/crm/affiliates";

const pause = () => new Promise((resolve) => setTimeout(resolve, 800));
const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function affiliateLogin(formData: FormData) {
  const result = await checkAffiliateLogin(text(formData, "email"), text(formData, "password"));
  if (!result.ok) {
    await pause();
    redirect(`/affiliates/login?error=${result.reason}`);
  }
  await createAffiliateSession(result.id);
  redirect("/affiliates");
}

export async function affiliateSignup(formData: FormData) {
  const result = await createAffiliate(text(formData, "name"), text(formData, "email"), text(formData, "password"));
  if (result !== "created") await pause();
  redirect(result === "created" ? "/affiliates/login?notice=requested" : `/affiliates/signup?error=${result}`);
}

export async function affiliateLogout() {
  await destroyAffiliateSession();
  redirect("/affiliates/login");
}
