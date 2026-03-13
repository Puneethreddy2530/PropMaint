"use server";

import { auth } from "@/lib/auth";
import { resend } from "@/lib/resend";

export async function sendTestEmail() {
  const session = await auth();
  const email = session?.user?.email;
  const role = session?.user?.role;

  if (!email) {
    return { error: true, message: "You must be signed in to send a test email." };
  }

  if (role !== "MANAGER") {
    return { error: true, message: "Only managers can send test emails." };
  }

  if (!resend) {
    return { error: true, message: "RESEND_API_KEY is not configured." };
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    return { error: true, message: "RESEND_FROM_EMAIL is not configured." };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: email,
      subject: "PropMaint test email",
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>PropMaint test email</h2>
          <p>This confirms Resend is wired correctly for your PropMaint deployment.</p>
          <p>Recipient: ${email}</p>
        </div>
      `,
    });

    return { success: true, id: result.id };
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : "Failed to send test email.",
    };
  }
}
