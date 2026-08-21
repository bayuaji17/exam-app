"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import React from "react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getBreadcrumbSegments } from "@/lib/dashboard/breadcrumb"
import { cn } from "@/lib/utils"

export function DashboardBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname()
  const segments = getBreadcrumbSegments(pathname || "/dashboard")

  return (
    <Breadcrumb className={cn("min-w-0 flex-1", className)}>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isFirst = index === 0
          const isLast = segment.isCurrentPage || index === segments.length - 1
          const isDeepIntermediate = !isFirst && !isLast

          return (
            <React.Fragment key={`${segment.href}-${segment.label}-${index}`}>
              {index > 0 && (
                <BreadcrumbSeparator
                  className={cn(isDeepIntermediate && "hidden sm:inline-flex")}
                />
              )}
              <BreadcrumbItem
                className={cn(isDeepIntermediate && "hidden sm:inline-flex")}
              >
                {isLast ? (
                  <BreadcrumbPage className="max-w-[200px] truncate sm:max-w-none">
                    {segment.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={segment.href}>{segment.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
