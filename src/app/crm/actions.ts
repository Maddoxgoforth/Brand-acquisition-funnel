"use server";

import { redirect } from "next/navigation";

import {
  checkOwnerPassword,
  createSession,
  destroySession,
} from "@/lib/crm/auth";
import { checkLogin, createAccount } from "@/lib/crm/users";

// Slow down password guessing a little.
const pause = () => new Promise((resolve) => setTimeout(resolve, 800));

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

// Team members: email + their own password.
export async function login(formData: FormData) {
  const result = await checkLogin(
    text(formData, "email"),
    text(formData, "password")
  );
  if (!result.ok) {
    await pause();
    redirect(`/crm/login?error=${result.reason}`);
  }
  await createSession(result.id);
  redirect("/crm");
}

// The owner: the CRM_PASSWORD from the site's environment variables.
export async function ownerLogin(formData: FormData) {
  if (!checkOwnerPassword(text(formData, "password"))) {
    await pause();
    redirect("/crm/login?owner=1&error=wrong");
  }
  await createSession("owner");
  redirect("/crm");
}

export async function signup(formData: FormData) {
  const result = await createAccount(
    text(formData, "name"),
    text(formData, "email"),
    text(formData, "password")
  );
  if (result !== "created") await pause();
  redirect(
    result === "created" ? "/crm/login?notice=requested" : `/crm/signup?error=${result}`
  );
}

export async function logout() {
  await destroySession();
  redirect("/crm/login");
}
