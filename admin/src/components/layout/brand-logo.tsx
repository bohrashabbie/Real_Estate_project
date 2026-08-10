"use client"

import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

/**
 * kwt25 brand mark: the office's artwork + the Kwt25 wordmark. The mark is
 * gold-on-black, so it keeps its own dark tile rather than sitting bare on the
 * sidebar — that way it reads the same in light and dark themes instead of
 * dissolving into one of them. The collapsed rail shows only the tile.
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt=""
        width={40}
        height={40}
        className={cn(
          "shrink-0 rounded-lg object-cover ring-1 ring-border",
          size === "lg" ? "size-10" : "size-7"
        )}
      />
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
