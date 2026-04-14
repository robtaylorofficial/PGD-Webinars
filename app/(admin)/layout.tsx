import { auth } from '../../auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '../../components/admin/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role

  if (!session || role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-pgd-purple">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
