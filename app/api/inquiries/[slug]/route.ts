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

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

/**
 * The visitor's address, for Reads-admin's per-IP rate limit (5 a minute).
 * Without it every visitor would share this container's address and one
 * person could lock the form for everybody. The edge Caddy sets
 * X-Forwarded-For to the real client and drops what the client sent, so its
 * last entry is the one to trust.
 */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();

  return last || null;
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const ip = clientIp(request);

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
  // field errors) and 429 itself.
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}
