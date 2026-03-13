"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import type { ActionResult } from "@/types/action";

function isNextRedirectError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as { digest?: string; message?: string };
  return (
    (typeof err.message === "string" && err.message === "NEXT_REDIRECT") ||
    (typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT"))
  );
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });

    return { success: true };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "UNAUTHORIZED", message: "Invalid email or password" };
        default:
          return { error: "INTERNAL", message: "Something went wrong. Please try again." };
      }
    }
    console.error("Login failed:", error);
    return { error: "INTERNAL", message: "Something went wrong. Please try again." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function quickLoginAction(role: "tenant" | "manager" | "staff"): Promise<ActionResult> {
  const emails: Record<string, string> = {
    tenant: "sarah.johnson@demo.com",
    manager: "michael.chen@demo.com",
    staff: "james.rodriguez@demo.com",
  };

  try {
    await signIn("credentials", {
      email: emails[role],
      password: "demo123",
      redirectTo: "/dashboard",
    });

    return { success: true };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "UNAUTHORIZED", message: "Demo login failed. Please seed the database first." };
    }
    console.error("Quick login failed:", error);
    return { error: "INTERNAL", message: "Something went wrong. Please try again." };
  }
}
