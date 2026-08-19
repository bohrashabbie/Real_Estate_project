import { getTranslations } from "next-intl/server";
import { House, Search } from "lucide-react";

import { Link } from "@/i18n/navigation";

/**
 * The 404 inside the locale segment, so it renders with the header, footer and
 * contact rails rather than as a bare page with no way back.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <>
      <section className="page-hero small-page-hero">
        <div className="container">
          <span className="section-kicker">404</span>
          <h1>{t("title")}</h1>
          <p>{t("body")}</p>
        </div>
      </section>

      <section className="section">
        <div className="container not-found">
          <div className="hero-actions">
            <Link className="button button-dark button-large" href="/properties">
              <Search size={16} />
              {t("cta")}
            </Link>
            <Link className="button button-outline button-large" href="/">
              <House size={16} />
              {t("backHome")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
