import { redirect } from "next/navigation"
import { getDashboardSession } from "@/lib/auth/session"
import { DashboardProfileMenu } from "./dashboard-profile-menu"

export async function DashboardProfileMenuSlot() {
  const { session } = await getDashboardSession()

  if (!session) {
    redirect("/login")
    return null
  }

  return (
    <DashboardProfileMenu
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        username: session.user.username,
        displayUsername: session.user.displayUsername,
        role: session.user.role,
      }}
    />
  )
}
