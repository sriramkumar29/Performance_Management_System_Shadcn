import * as React from "react"
import { cn } from "../../utils/cn"

interface HeadingProps {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  size?: "page" | "section" | "sub"
  gradient?: boolean
  className?: string
}

const titleSizeMap: Record<NonNullable<HeadingProps["size"]>, string> = {
  page: "text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight",
  section: "text-xl sm:text-2xl md:text-3xl font-semibold",
  sub: "text-base sm:text-lg font-semibold",
}

export function Heading({
  title,
  description,
  actions,
  size = "page",
  gradient = false,
  className,
}: HeadingProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className={cn(
              "m-0 leading-tight text-foreground transition-colors",
              titleSizeMap[size],
              gradient &&
                "bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent"
            )}
          >
            {title}
          </h1>
          {description ? (
            <p className={cn("mt-1 text-sm sm:text-base text-muted-foreground max-w-prose")}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 sm:mt-0">{actions}</div> : null}
      </div>
    </div>
  )
}
