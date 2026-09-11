/**
 * Renders a JSON-LD block.
 *
 * The `<` escape is not cosmetic: any string in the graph comes from the
 * admin database, and a bio containing `</script>` would otherwise close
 * this tag early and turn the rest of the profile into live markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
