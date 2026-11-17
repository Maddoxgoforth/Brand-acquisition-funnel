"use server";

import { redirect } from "next/navigation";

import { createPartnerSession, destroyPartnerSession, getPartnerSession } from "@/lib/crm/partnerAuth";
import { checkPartnerLogin, createPartner } from "@/lib/crm/partners";
import { addPartnerAsset, changePartnerPassword, deletePartnerAsset, updatePartnerName } from "@/lib/crm/partnerAccount";
import { savePayoutDetails } from "@/lib/crm/payoutDetails";

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

// Payments tab: where the partner wants to be paid (bank details, encrypted).
export async function savePartnerPayoutDetails(formData: FormData) {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  const result = await savePayoutDetails(partner.id, {
    holderName: text(formData, "holderName"),
    bankName: text(formData, "bankName"),
    accountType: text(formData, "accountType"),
    routing: text(formData, "routing"),
    account: text(formData, "account"),
    accountConfirm: text(formData, "accountConfirm"),
  });
  redirect(result === "saved" ? "/partner/payments?saved=1" : `/partner/payments?error=${result}&edit=1`);
}

async function signedIn() {
  const partner = await getPartnerSession();
  if (!partner) redirect("/partner/login");
  return partner;
}

export async function addPartnerAssetAction(formData: FormData) {
  const partner = await signedIn();
  const result = await addPartnerAsset(partner.id, {
    kind: text(formData, "kind"),
    title: text(formData, "title"),
    url: text(formData, "url"),
    notes: text(formData, "notes"),
  });
  redirect(result === "added" ? "/partner/assets?added=1" : `/partner/assets?error=${result}&new=1`);
}

export async function deletePartnerAssetAction(formData: FormData) {
  const partner = await signedIn();
  await deletePartnerAsset(partner.id, text(formData, "id"));
  redirect("/partner/assets");
}

export async function savePartnerProfileAction(formData: FormData) {
  const partner = await signedIn();
  const result = await updatePartnerName(partner.id, text(formData, "name"));
  redirect(result === "saved" ? "/partner/settings?saved=profile" : `/partner/settings?error=${result}`);
}

export async function changePartnerPasswordAction(formData: FormData) {
  const partner = await signedIn();
  const result = await changePartnerPassword(partner.id, text(formData, "current"), text(formData, "next"), text(formData, "confirm"));
  if (result !== "changed") await pause();
  redirect(result === "changed" ? "/partner/settings?saved=password" : `/partner/settings?error=${result}`);
}
