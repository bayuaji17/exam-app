"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function TableDescriptionTooltip({
  description,
}: {
  description: string | null | undefined
}) {
  if (!description) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-block max-w-full cursor-help truncate"
            title={description}
          >
            {description}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-xs break-words" side="top">
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
