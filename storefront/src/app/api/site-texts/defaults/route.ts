import ar from "../../../../../messages/ar.json";
import en from "../../../../../messages/en.json";

/**
 * Every website string's default, in both languages, for the admin's
 * Website Content page (it fetches this server-side, over the internal
 * network). The text is all public already -- it is what the site shows.
 */
export function GET() {
  return Response.json({ ar, en });
}
