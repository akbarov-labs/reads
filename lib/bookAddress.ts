/**
 * The address a book page should send the reader to instead, or null to
 * render it. A book merged into another in the admin (one work that had
 * been entered twice) keeps its old id, which the API answers with the
 * kept book: that book's own id is then the page's address, the way a
 * merged author's old slug lands on the kept author.
 */
export function keptBookPath(requestedId: string, book: { id: string | number }): string | null {
  const keptId = String(book.id);

  return keptId === requestedId ? null : `/book/${encodeURIComponent(keptId)}`;
}
