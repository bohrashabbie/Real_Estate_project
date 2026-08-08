"use client"

import { Building2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

/**
 * kwt25 brand mark: a gold building glyph + the localized wordmark
 * (عقار الكويت / Kwt25). Pure text+icon, no artwork, so it works
 * in both locales and both themes. The collapsed sidebar rail shows only the
 * glyph.
 */
export function BrandLogo({
  collapsed = false,
  size = "default",
  className,
}: {
  collapsed?: boolean
  size?: "default" | "lg"
  className?: string
}) {
  const app = useTranslations("app")

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-gold text-gold-foreground",
          size === "lg" ? "size-10" : "size-7"
        )}
      >
        <Building2 className={size === "lg" ? "size-5" : "size-4"} aria-hidden />
      </span>
      {collapsed ? (
        <span className="sr-only">{app("name")}</span>
      ) : (
        <span
          className={cn(
            "truncate font-semibold text-foreground",
            size === "lg" ? "text-lg" : "text-sm"
          )}
        >
          {app("name")}
        </span>
      )}
    </div>
  )
}
