type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

// Portable by design: no vendor SDK dependency, just a plain fetch() to Resend's REST API when
// RESEND_API_KEY is configured. With no key set (the default in dev/test), it degrades to a
// structured console log - the same simulation behavior the hardship grant route already had
// inline, now centralized so every caller gets it for free.
//
// Always awaited by callers, but never throws - matching logAuditEvent's established pattern.
// A transactional email is a background notification, not a step in the primary transaction: a
// delivery failure must never fail the request that triggered it. It's still awaited (not
// fire-and-forget) because an un-awaited promise risks being killed mid-flight when a serverless
// function returns its response before the promise settles.
export async function sendTransactionalEmail({ to, subject, body }: SendEmailInput): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.log(`[EMAIL SIMULATION] To: ${to} | Subject: ${subject}\n${body}`);
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.TRANSACTIONAL_EMAIL_FROM ?? "BalootBooks <notifications@balootbooks.com>",
        to,
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      console.error(`[EMAIL FAILURE] ${response.status} sending to ${to}: ${await response.text()}`);
    }
  } catch (error) {
    console.error("[EMAIL FAILURE]", error instanceof Error ? error.message : error);
  }
}
