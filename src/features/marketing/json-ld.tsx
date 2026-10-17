type JsonLdProps = { data: Record<string, unknown> | Record<string, unknown>[] }

/** Renders structured data. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  // biome-ignore lint/security/noDangerouslySetInnerHtml: serialised JSON-LD, escaped above
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
