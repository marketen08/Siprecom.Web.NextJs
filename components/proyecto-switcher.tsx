"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, FolderOpen, Check, ChevronDown, BarChart3, Settings2, Search } from "lucide-react"
import { useIsFetching } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { useCambiarProyectoActivo } from "@/features/auth/api/use-cambiar-proyecto-activo"
import { useMeetsRole } from "@/lib/use-roles"
import { cn } from "@/lib/utils"

/**
 * A partir de cuántos proyectos aparece el buscador. Con tres o cuatro la lista entra
 * entera en el panel y un input arriba es puro ruido; con más, encontrar el proyecto
 * propio en una lista de 149 (el caso Pluspetrol) a mano es inviable.
 */
const MINIMO_PARA_BUSCADOR = 6

export function ProyectoSwitcher() {
  const router = useRouter()
  const { data: proyectos, isLoading: loadingProyectos } = useGetMisProyectos()
  const mutation = useCambiarProyectoActivo()
  const isFetching = useIsFetching()
  // "Configuración de todos los proyectos" solo tiene sentido para Admin+ (gestión).
  const isAdmin = useMeetsRole("Admin")

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isUpdating = mutation.isPending || (mutation.isSuccess && isFetching > 0)
  const proyectoActivo = proyectos?.find((p) => p.esActivo)

  // Alfabético. El backend los devuelve en el orden en que se asignaron, que para el
  // usuario es ninguno: con varios proyectos hay que leer la lista entera para
  // encontrar el suyo.
  //
  // Copia antes de ordenar: el array es el de la caché de React Query y ordenarlo en
  // el lugar le cambiaría el orden a cualquier otra pantalla que lo use.
  //
  // localeCompare con numeric: "C-9" antes que "C-10" (alfabético puro los invierte,
  // porque compara "1" con "9"), y los acentos ordenan como su letra base en vez de
  // irse al final.
  const ordenados = useMemo(
    () =>
      [...(proyectos ?? [])].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { numeric: true, sensitivity: "base" }),
      ),
    [proyectos],
  )

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ordenados
    return ordenados.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [ordenados, search])

  // Mantener a la vista la opción resaltada al navegar con flechas.
  useEffect(() => {
    if (!open) return
    const node = listRef.current?.children[highlighted] as HTMLElement | undefined
    node?.scrollIntoView({ block: "nearest" })
  }, [highlighted, open])

  // El reset del buscador se hace al cerrar, y no en un efecto sobre el estado de
  // apertura: setState dentro de un effect dispara un render en cascada (y lo marca
  // el lint del repo).
  function cambiarApertura(v: boolean) {
    setOpen(v)
    if (!v) {
      setSearch("")
      setHighlighted(0)
    }
  }

  function buscar(texto: string) {
    setSearch(texto)
    // Lo resaltado se corresponde con la lista filtrada: al cambiar el filtro, el
    // índice viejo apuntaría a otro proyecto.
    setHighlighted(0)
  }

  function elegir(id: string, esActivo: boolean) {
    cambiarApertura(false)
    if (esActivo) return
    // Tras cambiar el proyecto activo, redirigimos a la pantalla de avance
    // por sistemas para que el usuario vea inmediatamente datos del nuevo
    // proyecto en lugar de quedarse en una pantalla con datos del anterior.
    mutation.mutate(id, { onSuccess: () => router.push("/ejecucion/sistemas") })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      cambiarApertura(false)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((i) => Math.min(i + 1, filtrados.length - 1))
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      const elegido = filtrados[highlighted] ?? filtrados[0]
      if (elegido) elegir(elegido.id, elegido.esActivo)
    }
  }

  if (loadingProyectos) {
    return (
      <div className="flex items-center gap-2 px-3 h-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (!proyectos || proyectos.length === 0) return null

  // Si solo tiene un proyecto, mostrar estático sin dropdown. El `title` es por los
  // nombres largos: la barra tiene un ancho fijo, así que el texto se recorta y la
  // única forma de leerlo completo es el tooltip del navegador.
  if (proyectos.length === 1) {
    return (
      <div
        className="flex items-center gap-2 px-3 h-8 rounded-md border border-gray-200 text-sm text-gray-700"
        title={proyectos[0].nombre}
      >
        <FolderOpen className="h-4 w-4 text-blue-900 shrink-0" />
        <span className="max-w-32 sm:max-w-48 lg:max-w-72 truncate hidden sm:block">
          {proyectos[0].nombre}
        </span>
      </div>
    )
  }

  const conBuscador = ordenados.length >= MINIMO_PARA_BUSCADOR

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={cambiarApertura}>
      <PopoverPrimitive.Trigger asChild disabled={isUpdating}>
        <button
          type="button"
          disabled={isUpdating}
          // El nombre completo en el tooltip: en la barra siempre va recortado, y el
          // recorte se come justo el final, que es donde los nombres de proyecto se
          // diferencian entre sí.
          title={proyectoActivo?.nombre ?? "Sin proyecto"}
          className="flex items-center gap-2 px-3 h-8 rounded-md border border-gray-200 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none cursor-pointer"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-900" />
          ) : (
            <FolderOpen className="h-4 w-4 text-blue-900 shrink-0" />
          )}
          {/* Se ensancha con el viewport: en un monitor hay lugar para el nombre
              entero, y era una lástima recortarlo a 11rem por el ancho del celular. */}
          <span className="max-w-32 sm:max-w-48 lg:max-w-72 truncate hidden sm:block">
            {proyectoActivo?.nombre ?? "Sin proyecto"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        {/* Panel propio en vez del DropdownMenu de antes: el menú de Base UI se queda
            con el teclado para su typeahead, así que un input de búsqueda adentro no
            recibe lo que se tipea. Mismo armado que el Combobox de los formularios,
            con un ancho fijo —no el del trigger— para que los nombres largos entren. */}
        <PopoverPrimitive.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(e) => {
            if (!conBuscador) return
            e.preventDefault()
            inputRef.current?.focus()
          }}
          className={cn(
            "z-50 w-80 max-w-[calc(100vw-1rem)] max-h-[70vh] flex flex-col overflow-hidden",
            "rounded-md bg-popover shadow-md ring-1 ring-foreground/10",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
          )}
        >
          {conBuscador && (
            <div className="p-1.5 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => buscar(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar proyecto..."
                  className="w-full rounded-sm border border-input pl-7 pr-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  // Mismo blindaje contra el autofill que el Combobox: sin esto el
                  // navegador le mete el nombre o el mail del usuario.
                  name="proyecto-switcher-search"
                  autoComplete="new-password"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded
                  aria-controls="proyecto-switcher-lista"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
              </div>
            </div>
          )}

          <div id="proyecto-switcher-lista" ref={listRef} className="overflow-y-auto p-1 flex flex-col">
            {filtrados.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                Ningún proyecto coincide
              </p>
            ) : (
              filtrados.map((proyecto, i) => (
                <button
                  key={proyecto.id}
                  type="button"
                  disabled={proyecto.esActivo}
                  onClick={() => elegir(proyecto.id, proyecto.esActivo)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={cn(
                    // Acá sí wrappea: el panel es ancho y el nombre entero es lo que
                    // permite distinguir dos proyectos del mismo cliente.
                    "flex w-full min-w-0 items-start justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm whitespace-normal wrap-break-word cursor-pointer disabled:cursor-default",
                    i === highlighted && "bg-accent text-accent-foreground",
                    proyecto.esActivo && "font-medium",
                  )}
                >
                  <span className="min-w-0">{proyecto.nombre}</span>
                  {proyecto.esActivo && <Check className="h-4 w-4 shrink-0 text-blue-900 mt-0.5" />}
                </button>
              ))
            )}
          </div>

          <div className="border-t p-1 flex flex-col">
            <button
              type="button"
              onClick={() => {
                cambiarApertura(false)
                router.push("/ejecucion/proyectos")
              }}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <BarChart3 className="h-4 w-4 shrink-0 text-blue-900" />
              <span className="truncate">Avance de todos los proyectos</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  cambiarApertura(false)
                  router.push("/configuracion/proyectos")
                }}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <Settings2 className="h-4 w-4 shrink-0 text-blue-900" />
                <span className="truncate">Configuración de todos los proyectos</span>
              </button>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
