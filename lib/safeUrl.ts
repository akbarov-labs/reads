/**
 * Returns the URL only if it is a plain http(s) link, otherwise null.
 *
 * Social links are entered in the admin panel and rendered straight into
 * `href`. React does not block `javascript:` in an href — it only warns in
 * development — so a link like `javascript:fetch('//evil')` entered by
 * anyone with panel access would execute in every visitor's browser. The
 * admin panel validates the scheme on the way in; this refuses it on the way
 * out, which is the check that still holds for rows written before that
 * validation existed, or by any future code path.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());

    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null;
  } catch {
    // Not an absolute URL at all — a relative path or plain text.
    return null;
  }
}
