/**
 * Every website string's default, in both languages, for the Website
 * Content page. The storefront owns them (its messages/{ar,en}.json), so
 * this asks it over the internal network rather than keeping a copy that
 * would drift. Public text, so no auth here -- the page's data is gated by
 * the API's content.view, and saving by content.manage.
 */
export async function GET() {
  const base = process.env.STOREFRONT_URL ?? "http://localhost:3100"
  try {
    const response = await fetch(`${base}/api/site-texts/defaults`, { cache: "no-store" })
    if (!response.ok) throw new Error(`storefront answered ${response.status}`)
    return Response.json(await response.json())
  } catch {
    return Response.json(
      {
        code: "STOREFRONT_UNAVAILABLE",
        message: "Could not load the website's texts. Is the website running?",
        details: null,
      },
      { status: 502 }
    )
  }
}
