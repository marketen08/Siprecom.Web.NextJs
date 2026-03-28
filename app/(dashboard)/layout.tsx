import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { FetchingBar } from "@/components/fetching-bar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <FetchingBar />
      <Navbar />
      <Sidebar />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
