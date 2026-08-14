import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
        "border-transparent bg-primary/10 text-primary [&>svg]:size-3 [&>svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
