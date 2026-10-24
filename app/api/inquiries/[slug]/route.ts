import { clientIp } from "@/lib/clientIp";

/**
 * The inquiry form posts here, on the site's own origin, and this hands the
 * submission to Reads-admin over the internal network (API_URL).
 *
 * The browser used to post straight to the admin's public address, which
 * had to be baked into the client bundle at build time — so an image built
 * for production would send a staging visitor's inquiry to production.
 * With the address read here at runtime, nothing environment-specific is
 * inside the image: the one tested on staging is the one promoted.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.API_URL ?? "http://localhost:8000/api";

// A real inquiry is a few KB of text; anything far bigger is not one.
const MAX_BODY_BYTES = 32 * 1024;

// Reads-admin's slugs are Str::slug output. Anything else — "..", a slash —
// could walk the forwarded path somewhere other than this one endpoint.
const SLUG = /^[\p{L}\p{N}_-]{1,200}$/u;

const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare's tokens are at most 2048 characters.
const MAX_TOKEN_LENGTH = 2048;

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

/**
 * Asks Cloudflare whether the form's Turnstile token is a person's. Each
 * token is good for one answer, so the form asks for a new one after every
 * send. "unavailable" is Cloudflare not answering, not the visitor failing.
 */
async function checkTurnstile(
  secret: string,
  token: string | null,
  ip: string | null
): Promise<"passed" | "failed" | "unavailable"> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return "failed";

  const form = new URLSearchParams({ secret, response: token });

  if (ip) form.set("remoteip", ip);

  try {
    const response = await fetch(TURNSTILE_VERIFY, {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return "unavailable";

    const result = (await response.json()) as { success?: boolean };

    return result.success === true ? "passed" : "failed";
  } catch {
    return "unavailable";
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Staging has no admin of its own to write to yet; it must never file a
  // test inquiry with the real translators.
  if (process.env.INQUIRIES_DISABLED === "true") {
    return json({ message: "Inquiries are disabled here." }, 503);
  }

  const { slug } = await params;

  if (!SLUG.test(slug)) {
    return json({ message: "Not found." }, 404);
  }

  const body = await request.text();

  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return json({ message: "Too large." }, 413);
  }

  const ip = clientIp(request);

  // Checked here, before Reads-admin sees anything, so a script that skips
  // the check never reaches the admin's rate limit or the translator's
  // inbox. Unset (local, staging) means no check, and the form shows none.
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

  if (turnstileSecret) {
    const check = await checkTurnstile(turnstileSecret, request.headers.get("x-turnstile-token"), ip);

    if (check === "failed") {
      return json({ message: "The anti-spam check failed." }, 403);
    }

    if (check === "unavailable") {
      return json({ message: "The anti-spam check is unreachable." }, 503);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (ip) headers["X-Forwarded-For"] = ip;

  let upstream: Response;

  try {
    upstream = await fetch(`${API_URL}/translators/${encodeURIComponent(slug)}/inquiries`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return json({ message: "The inquiry service is unreachable." }, 502);
  }

  // Pass the admin's answer through as-is: the form reads 201, 422 (with
  // field errors) and 429 itself, and 403 from the check above.
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}
