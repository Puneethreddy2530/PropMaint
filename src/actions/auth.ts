"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function quickLoginAction(role: "tenant" | "manager" | "staff") {
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
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Demo login failed. Please seed the database first." };
    }
    throw error;
  }
}
