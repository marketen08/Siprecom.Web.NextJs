"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { esRutaNavegable, navBreadcrumbMap, segmentLabels } from "@/lib/nav-menu"
import { useBreadcrumbOverride } from "./breadcrumb-context"

function esId(segment: string): boolean {
  return /^[0-9a-f-]{32,}$/i.test(segment)
}

function labelForSegment(segment: string): string {
  // UUID / ID — no mostramos el valor crudo
  if (esId(segment)) return "Detalle"
  return segmentLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
}

export function Breadcrumb() {
  const pathname = usePathname()
  const override = useBreadcrumbOverride()

  let items: { label: string; href?: string }[]

  if (override && override.length > 0) {
    // La página declaró su propio trail (drilldown con query params, etc.)
    items = override
  } else {
    // Intentar match exacto en el mapa del menú
    const fromMenu = navBreadcrumbMap.get(pathname)
    if (fromMenu) {
      items = fromMenu
    } else {
      // Construir desde los segmentos del path.
      //
      // El href solo se pone si el prefijo es una ruta a la que se puede navegar.
      // Antes se ponía siempre, y eso generaba links a rutas inexistentes (ej.
      // /alcance/proyectos, que no es una página: solo existe /alcance/proyectos/[id]).
      // Next los prefetchea, así que además del link roto quedaba un 404 por cada
      // miga en la consola.
      const segments = pathname.split("/").filter(Boolean)
      items = segments
        .map((seg, i) => {
          const href = "/" + segments.slice(0, i + 1).join("/")
          return {
            label: labelForSegment(seg),
            href: esRutaNavegable(href) ? href : undefined,
            esId: esId(seg),
            esUltimo: i === segments.length - 1,
          }
        })
        // Rutas con varios ids encadenados (ej. /qr/testgroup/:a/:b/:c) producían
        // "Detalle › Detalle › Detalle", que no dice nada. Dejamos solo el último.
        .filter((it) => !it.esId || it.esUltimo)
        .map(({ label, href }) => ({ label, href }))
    }
  }

  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-gray-700 transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, i) => {
        const isLast = i === items.length - 1
        const isClickable = !isLast && !!item.href
        return (
          <span key={`${item.href}-${i}`} className="flex items-center gap-1 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {isClickable ? (
              <Link
                href={item.href!}
                className="hover:text-gray-700 transition-colors truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-gray-800 truncate" : "text-gray-500 truncate"}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
