import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { FetchingBar } from "@/components/fetching-bar"
import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { ProyectoActivoHeader } from "@/components/proyecto-activo-header"
import { RouteGuard } from "@/components/route-guard"
import { HidratarSesion } from "@/components/hidratar-sesion"
import { TooltipProvider } from "@/components/ui/tooltip"

/**
 * Hallazgo #2 del pentest: estas rutas se prerenderizaban en build y quedaban
 * como HTML estatico cacheable. Puesto en el layout, el segment config alcanza
 * a todas las paginas del grupo — 94 rutas — sin tocar cada archivo.
 */
export const dynamic = "force-dynamic"

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
            <HidratarSesion />
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
