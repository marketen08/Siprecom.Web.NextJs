import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { FetchingBar } from "@/components/fetching-bar"
import { BreadcrumbProvider } from "@/components/breadcrumb-context"
import { TooltipProvider } from "@/components/ui/tooltip"

/**
 * Layout para páginas que aprovechan todo el ancho del viewport — visor 3D
 * principalmente. Misma navbar superior que el dashboard. El sidebar se monta
 * en modo `drawer`: overlay oculto por defecto que el usuario abre con un botón
 * (o el hamburger de la navbar en mobile) para navegar a otra página, sin
 * robarle ancho permanente al viewer.
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
            <Sidebar drawer />
            <main className="pt-16 min-h-screen">
              {children}
            </main>
          </div>
        </BreadcrumbProvider>
      </TooltipProvider>
    </SidebarProvider>
  )
}
