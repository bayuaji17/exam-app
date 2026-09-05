import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface ReportStatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  badge?: ReactNode
  className?: string
}

export function ReportStatCard({
  title,
  value,
  description,
  icon,
  badge,
  className,
}: ReportStatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {badge}
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
