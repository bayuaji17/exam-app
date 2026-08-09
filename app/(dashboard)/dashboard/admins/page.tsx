import { AdminRoster } from "@/components/admin-roster"
import { listAdminRoster, listPromotableUsers } from "@/lib/users/queries"

export default async function AdminsPage() {
  const [roster, promotable] = await Promise.all([
    listAdminRoster(),
    listPromotableUsers(),
  ])

  return <AdminRoster promotable={promotable} roster={roster} />
}
