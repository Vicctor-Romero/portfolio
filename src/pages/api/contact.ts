import type { APIRoute } from "astro";

// On-demand (server) route — must not be prerendered.
export const prerender = false;

// All configuration comes from env vars (.env locally, Netlify env in prod):
//   RESEND_API_KEY — Resend API key (required; the form returns "not_configured" without it)
//   CONTACT_FROM   — sender address; must be on a domain verified in Resend
//                    (use onboarding@resend.dev until your domain is verified)
//   CONTACT_TO     — where contact messages are delivered

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

// Block only clear cross-origin POSTs: the Origin/Referer host must match the
// host the request was actually sent to (domain-agnostic, works on any domain).
// If neither header is present we can't tell, so we let it through — the
// honeypot + time-trap still cover scripted posts.
const isCrossOrigin = (request: Request) => {
  const src = request.headers.get("origin") || request.headers.get("referer");
  const host = request.headers.get("host");
  if (!src || !host) return false;
  try {
    return new URL(src).host !== host;
  } catch {
    return true;
  }
};

const countLinks = (s: string) => (s.match(/https?:\/\/|www\./gi) || []).length;

export const POST: APIRoute = async ({ request }) => {
  if (isCrossOrigin(request)) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

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

  // Silent anti-spam: return ok:true (without sending) so bots think they
  // succeeded and don't adapt or retry.
  //   honeypot filled · submitted too fast · link-stuffed message/name
  const honeypot = String(data.company ?? "").trim();
  const elapsed = Number(data.elapsed);
  if (
    honeypot !== "" ||
    !Number.isFinite(elapsed) ||
    elapsed < 3000 ||
    countLinks(message) >= 4 ||
    /https?:\/\//i.test(name)
  ) {
    console.warn("[contact] dropped suspected spam");
    return json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
  const FROM =
    process.env.CONTACT_FROM ??
    import.meta.env.CONTACT_FROM ??
    "Victor Romero Portfolio <onboarding@resend.dev>";
  const TO =
    process.env.CONTACT_TO ?? import.meta.env.CONTACT_TO ?? "vmrbaez@gmail.com";
  if (!apiKey) {
    console.error("[contact] RESEND_API_KEY is not set");
    return json({ ok: false, error: "not_configured" }, 500);
  }

  const n = escapeHtml(name);
  const e = escapeHtml(email);
  const m = escapeHtml(message);
  const mono =
    "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
  const line = "1px solid rgba(255,255,255,.08)";
  const label = `color:#3bff88;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px;`;

  const html = `<div style="background:#08090a;padding:32px 16px;font-family:${mono};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#0b0d0e;border:1px solid rgba(255,255,255,.14);">
        <tr><td style="padding:13px 16px;border-bottom:${line};">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#3bff88;"></span>
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#41464a;margin-left:6px;"></span>
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#41464a;margin-left:6px;"></span>
          <span style="color:#6b716e;font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-left:12px;">~ / new_message</span>
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <div style="color:#3bff88;font-size:11px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:22px;">// incoming transmission</div>
          <div style="margin-bottom:20px;">
            <p style="${label}">--name</p>
            <div style="color:#ededea;font-size:16px;">${n}</div>
          </div>
          <div style="margin-bottom:20px;padding-top:16px;border-top:${line};">
            <p style="${label}">--email</p>
            <a href="mailto:${e}" style="color:#ededea;font-size:16px;text-decoration:none;">${e}</a>
          </div>
          <div style="padding-top:16px;border-top:${line};">
            <p style="${label}">--message</p>
            <div style="color:#b9bdba;font-size:15px;line-height:1.65;white-space:pre-wrap;">${m}</div>
          </div>
        </td></tr>
        <tr><td style="padding:12px 16px;border-top:${line};color:#41464a;font-size:10px;letter-spacing:.1em;text-transform:uppercase;">
          sent from victorromero.dev · contact form
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
  const text = `// new_message\n\n--name\n${name}\n\n--email\n${email}\n\n--message\n${message}\n\n— sent from victorromero.dev`;

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
