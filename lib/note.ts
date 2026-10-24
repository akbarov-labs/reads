/**
 * What the browser tells the site for its statistics (app/api/note): a book
 * page opened, a suggestion picked from the search box. Client-side, no
 * server imports. Neutrally named, so content blockers that drop anything
 * called "track" or "analytics" leave it alone; it carries nothing about
 * the reader beyond what any request does.
 */

export type Note =
  | { type: "view"; bookId: string; locale: string }
  | { type: "search"; query: string; picked: string; locale: string };

export const NOTE_PATH = "/api/note";

/**
 * Sends a note without holding anything up: sendBeacon survives the page
 * being left straight after (a picked suggestion navigates away at once).
 * A plain string body goes as text/plain, which sendBeacon sends without a
 * CORS preflight.
 */
export function sendNote(note: Note): void {
  const body = JSON.stringify(note);

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.(NOTE_PATH, body)) return;

    void fetch(NOTE_PATH, { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    // Statistics are never worth an error in the reader's console.
  }
}
