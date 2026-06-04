import { Navbar } from "@/components/navbar"
import { SidebarProvider } from "@/components/sidebar-context"
import { FetchingBar } from "@/components/fetching-bar"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { TooltipProvider } from "@/components/ui/tooltip"

/**
 * Layout para páginas que aprovechan todo el ancho del viewport — visor 3D
 * principalmente. Misma navbar superior que el dashboard, pero SIN sidebar
 * de navegación. El `SidebarProvider` se monta igual porque la Navbar lo
 * consume (para el toggle mobile); como no hay <Sidebar /> renderizado,
 * el toggle no hace nada visible y no rompe.
 */
export default function FullscreenLayout({
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
            <main className="pt-16 min-h-screen">
              {children}
            </main>
          </div>
        </BreadcrumbProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
