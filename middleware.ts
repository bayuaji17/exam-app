import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Server components cannot read the current pathname, so the route guard in
 * `app/(dashboard)/layout.tsx` has no way to know which route it is rendering.
 * Forward it as a header the layout can read.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
