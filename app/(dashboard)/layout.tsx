import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { FetchingBar } from "@/components/fetching-bar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <FetchingBar />
          <Navbar />
          <Sidebar />
          <main className="pt-16 min-h-screen md:ml-64">
            <div className="p-4 md:p-6">{children}</div>
          </main>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  )
}
