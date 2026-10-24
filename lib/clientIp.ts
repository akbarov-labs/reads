/**
 * The visitor's address, for Reads-admin's per-IP rate limits (the inquiry
 * form's 5 a minute, search's 120). Without it every visitor would share
 * this container's address and one person could lock a form or the search
 * box for everybody. The edge Caddy sets X-Forwarded-For to the real client
 * and drops what the client sent, so its last entry is the one to trust.
 */
export function clientIp(request: { headers: { get(name: string): string | null } }): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();

  return last || null;
}
