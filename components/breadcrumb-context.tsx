"use client"

import * as React from "react"

export interface BreadcrumbItem {
  label: string
  /** Si es undefined o "", se renderiza como texto plano (no link). */
  href?: string
}

interface BreadcrumbContextValue {
  override: BreadcrumbItem[] | null
  setOverride: React.Dispatch<React.SetStateAction<BreadcrumbItem[] | null>>
}

const BreadcrumbContext = React.createContext<BreadcrumbContextValue>({
  override: null,
  setOverride: () => {},
})

/**
 * Provider para permitir que una página override el breadcrumb default.
 * Debe envolver al componente <Breadcrumb /> y a las páginas (children).
 */
export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = React.useState<BreadcrumbItem[] | null>(null)
  return (
    <BreadcrumbContext.Provider value={{ override, setOverride }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

/** Lectura del override actual — uso interno del componente <Breadcrumb />. */
export function useBreadcrumbOverride() {
  return React.useContext(BreadcrumbContext).override
}

/**
 * Permite a una página declarar sus propios items de breadcrumb cuando la URL
 * (path) no es suficiente — ej. drilldowns con query params como
 * `/ejecucion/subsistemas?sistemaId=X`.
 *
 * Pasá `null` para volver al breadcrumb auto-derivado del menú.
 * Se limpia automáticamente al desmontar la página.
 *
 * Internamente serializa los items para evitar loops cuando el caller no
 * estabiliza el array con useMemo (acepta arrays nuevos en cada render).
 */
export function useBreadcrumb(items: BreadcrumbItem[] | null | undefined) {
  const { setOverride } = React.useContext(BreadcrumbContext)
  const key = JSON.stringify(items ?? null)
  React.useEffect(() => {
    setOverride(items ?? null)
    return () => setOverride(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
