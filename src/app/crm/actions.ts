"use server";

import { redirect } from "next/navigation";

import { checkPassword, createSession, destroySession } from "@/lib/crm/auth";

export async function login(formData: FormData) {
  const password = formData.get("password");
  if (typeof password !== "string" || !checkPassword(password)) {
    // Slow down password guessing a little.
    await new Promise((resolve) => setTimeout(resolve, 800));
    redirect("/crm/login?error=1");
  }
  await createSession();
  redirect("/crm");
}

export async function logout() {
  await destroySession();
  redirect("/crm/login");
}
