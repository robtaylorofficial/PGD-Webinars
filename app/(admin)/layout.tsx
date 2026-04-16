import AdminSidebar from '../../components/admin/sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // AUTH TEMPORARILY DISABLED FOR PREVIEW — re-enable before going live

  return (
    <div className="flex min-h-screen bg-pgd-purple">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
