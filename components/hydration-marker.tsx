"use client"

import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

/**
 * The explicit hydration signal for E2E tests.
 *
 * Rendered in the dashboard shell. `useSyncExternalStore` with a server
 * snapshot of `false` and a client snapshot of `true` flips the attribute to
 * "true" only after the client has hydrated. Test helpers wait for
 * `[data-hydrated="true"]` rather than inferring hydration from UI content
 * that now renders server-side.
 */
export function HydrationMarker() {
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  return (
    <div
      aria-hidden="true"
      className="hidden"
      data-hydrated={hydrated ? "true" : "false"}
    />
  )
}
