# 01 — Fix profile menu hydration mismatch

**What to build:** Eliminate the React hydration mismatch in the dashboard header's profile menu.

The menu is a client component that reads the session with `authClient.useSession()`: the server renders a loading skeleton (pending), while the client hydrates with the cookie-cached session and immediately renders the full dropdown. The server and client HTML disagree, React regenerates the tree client-side, and under parallel test load that regeneration races E2E interactions — the source of the intermittent 30s timeouts in `user-edit` and `admin-roster` specs.

The fix follows the established server-passing pattern (the sidebar already receives its role from the layout): the dashboard layout already fetches the session, so pass the user down as a prop and render the same HTML on server and client.

**Status:** done

- [x] `DashboardProfileMenu` accepts a typed `ProfileUser` prop and renders the dropdown directly — no `useSession`, no pending skeleton, no Login fallback (unreachable in the dashboard shell, which redirects).
- [x] The component no longer needs client-only state: it becomes a server component; interactivity stays in the Radix primitives and `SignOutButton` (which remains client).
- [x] The dashboard layout maps the already-fetched session user onto the prop.
- [x] A hidden `HydrationMarker` (client) flips `data-hydrated="true"` after mount, mounted in the dashboard layout.
- [x] The E2E `waitForHydration` helper waits for `[data-hydrated="true"]` instead of the profile button name, which is no longer a post-hydration signal.
- [x] Full E2E runs clean twice, and the run output contains no `Hydration failed` errors.
- [x] No behavior change: the menu shows the same name, contact, role, avatar initials, profile/settings links, and logout for every role.

## Comments

Root cause: `authClient.useSession()` returns `isPending` during SSR, so the
server rendered the Skeleton while the client hydrates with the cookie-cached
session and renders the dropdown — mismatched HTML.

The deeper fix went further. Two defects were found and corrected:

1. **The Slot-cloned trigger mismatched under load.** `DropdownMenuTrigger
   asChild` wrapping the client `Button` (itself rendering a button) produced
   an extra `<button>` on the client in some streamed responses. The trigger
   is now a native Radix trigger styled with `buttonVariants`, removing the
   Slot clone chain from the header entirely.

2. **The E2E hydration helper could never pass.** `waitForHydration` asserted
   `toBeVisible()` on the marker, but the marker is intentionally
   `display:none` — an invisible element never passes. It now asserts the
   attribute via `toHaveCount`.

`HydrationMarker` uses `useSyncExternalStore` (server snapshot `false`,
client snapshot `true`) rather than setState-in-effect, which the lint rule
`react-hooks/set-state-in-effect` rejects.

The separate `Tooltip must be used within TooltipProvider` warning no longer
appears in dev logs; no follow-up ticket is needed. The `Encountered a script
tag` dev warning is pre-existing Next.js noise and out of scope.
