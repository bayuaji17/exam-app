import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export default async function page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) {
    return <div>Not authenticated</div>
  }
  console.log(session)
  return (
    <div>
      <h1>example dashboard</h1>
    </div>
  )
}
