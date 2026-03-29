"use client"

import { use, useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, FolderOpen, Check, X, Search, Plus } from "lucide-react"

import { useGetUsuario } from "@/features/usuarios/api/use-get-usuario"
import { useGetUsuarioProyectos } from "@/features/usuarios/api/use-get-usuario-proyectos"
import { useAddProyectoUsuario } from "@/features/usuarios/api/use-add-proyecto-usuario"
import { useRemoveProyectoUsuario } from "@/features/usuarios/api/use-remove-proyecto-usuario"
import { useGetProyectos } from "@/features/proyectos/api/use-get-proyectos"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ─── Combobox de búsqueda ─────────────────────────────────────────────────────

interface ProyectoComboboxProps {
  asignadosIds: Set<string>
  onAdd: (proyectoId: string) => void
  isPending: boolean
}

function ProyectoCombobox({ asignadosIds, onAdd, isPending }: ProyectoComboboxProps) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useGetProyectos({
    nombre: search || undefined,
    pageSize: 10,
    page: 1,
  })

  const resultados = (data as any)?.data ?? []

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSelect = (proyectoId: string) => {
    onAdd(proyectoId)
    setSearch("")
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proyecto para agregar..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="pl-9"
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
          {isFetching && resultados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? "Sin resultados." : "Escribí para buscar proyectos."}
            </p>
          ) : (
            <ul className="divide-y max-h-64 overflow-y-auto">
              {resultados.map((p: any) => {
                const yaAsignado = asignadosIds.has(p.id)
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.nombre}</p>
                        {p.observaciones && (
                          <p className="text-xs text-muted-foreground truncate">{p.observaciones}</p>
                        )}
                      </div>
                    </div>
                    {yaAsignado ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded shrink-0">
                        <Check className="h-3 w-3" />
                        Asignado
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs shrink-0"
                        disabled={isPending}
                        onClick={() => handleSelect(p.id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default function UsuarioProyectosPage({ params }: PageProps) {
  const { id } = use(params)

  const { data: usuarioResult, isLoading: loadingUsuario } = useGetUsuario(id)
  const { data: asignados, isLoading: loadingAsignados } = useGetUsuarioProyectos(id)
  const addMutation = useAddProyectoUsuario(id)
  const removeMutation = useRemoveProyectoUsuario(id)

  const usuario = (usuarioResult as any)?.data?.[0] ?? null
  const asignadosList = Array.isArray(asignados) ? asignados : []
  const asignadosIds = new Set(asignadosList.map((p) => p.proyectoId))

  const fullName = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href="/configuracion/usuarios">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loadingUsuario ? "Cargando..." : fullName || usuario?.email || "Usuario"}
          </h1>
          {usuario?.email && (
            <p className="text-sm text-muted-foreground mt-0.5">{usuario.email}</p>
          )}
        </div>
      </div>

      {/* Layout dos paneles */}
      <div className="flex gap-4 h-[calc(100vh-200px)]">

        {/* Izquierda: proyectos asignados */}
        <div className="w-80 shrink-0 border rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700">Proyectos asignados</h3>
            <p className="text-xs text-muted-foreground">
              {asignadosList.length} proyecto{asignadosList.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {loadingAsignados ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            ) : asignadosList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                <FolderOpen className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Sin proyectos asignados.</p>
                <p className="text-xs mt-1 max-w-45">
                  Usá el buscador de la derecha para agregar proyectos.
                </p>
              </div>
            ) : (
              asignadosList.map((p) => (
                <div
                  key={p.proyectoId}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="h-4 w-4 text-blue-900 shrink-0" />
                    <span className="truncate">{p.proyectoNombre}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.esActivo && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                        <Check className="h-3 w-3" />
                        Activo
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(p.proyectoId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Derecha: buscador con autocompletar */}
        <div className="flex-1 border rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Agregar proyecto</h3>
            <ProyectoCombobox
              asignadosIds={asignadosIds}
              onAdd={(proyectoId) => addMutation.mutate(proyectoId)}
              isPending={addMutation.isPending}
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-8">
            <Search className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Buscá y agregá proyectos</p>
            <p className="text-xs mt-1 max-w-xs">
              Escribí el nombre del proyecto en el buscador. Los resultados aparecen automáticamente.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
