import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { FetchingBar } from "@/components/fetching-bar"
import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { ProyectoActivoHeader } from "@/components/proyecto-activo-header"
import { RouteGuard } from "@/components/route-guard"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <BreadcrumbProvider>
          <div className="min-h-screen bg-gray-50">
            <FetchingBar />
            <Navbar />
            <Sidebar />
            <main className="pt-16 min-h-screen lg:ml-64">
              <div className="p-4 md:p-6">
                <Breadcrumb />
                <ProyectoActivoHeader />
                <RouteGuard>{children}</RouteGuard>
              </div>
            </main>
          </div>
        </BreadcrumbProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
