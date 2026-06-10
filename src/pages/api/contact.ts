import type { APIRoute } from "astro";

// On-demand (server) route — must not be prerendered.
export const prerender = false;

const TO = "vmrbaez@gmail.com";
// Resend requires the `from` address to be on a domain verified in your
// Resend account. `onboarding@resend.dev` works out of the box but only
// delivers to your own account email — switch CONTACT_FROM to a verified
// domain (e.g. "Victor Romero <contact@vicctor-romero.com>") for production.
const FROM = process.env.CONTACT_FROM || "Victor Romero Portfolio <onboarding@resend.dev>";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const name = String(data.name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const message = String(data.message ?? "").trim();

  if (!name || !email || !message) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set");
    return json({ ok: false, error: "not_configured" }, 500);
  }

  const html = `
    <h2>New portfolio message</h2>
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;
  const text = `New portfolio message\nFrom: ${name} <${email}>\n\n${message}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: `Portfolio inquiry — ${name}`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      console.error("[contact] Resend error", res.status, await res.text());
      return json({ ok: false, error: "send_failed" }, 502);
    }
    return json({ ok: true });
  } catch (err) {
    console.error("[contact] unexpected error", err);
    return json({ ok: false, error: "server_error" }, 500);
  }
};
