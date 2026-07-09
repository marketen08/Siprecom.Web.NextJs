"use client"

import { useMemo, useState } from "react"
import {
  CheckCircle2, Loader2, Plus, Search, User as UserIcon, Users, X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { useAddUsuarioProyecto } from "@/features/proyectos/api/use-add-usuario-proyecto"
import { useRemoveUsuarioProyecto } from "@/features/proyectos/api/use-remove-usuario-proyecto"
import { useAddUsuariosDesdeGrupo } from "@/features/proyectos/api/use-add-usuarios-desde-grupo"
import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"

const TODOS = "__all__"

/**
 * Tab "Usuarios" del detalle del proyecto. Layout split-panel con filtros de
 * búsqueda + empresa + grupo en el panel derecho. Panel izquierdo lista los
 * asignados; el derecho lista los disponibles filtrados. Además el botón
 * "Agregar desde grupo" mantiene el bulk-add para asignar toda la membresía
 * de un grupo de una vez.
 */
export function TabUsuariosProyecto({ proyectoId }: { proyectoId: string }) {
  const { data: asignadosData, isLoading: cargandoAsignados } = useGetProyectoUsuarios(proyectoId)
  const addMutation = useAddUsuarioProyecto(proyectoId)
  const removeMutation = useRemoveUsuarioProyecto(proyectoId)

  const asignados = Array.isArray(asignadosData) ? asignadosData : []
  const asignadosIds = useMemo(() => new Set(asignados.map((u) => u.usuarioId)), [asignados])

  // Filtros del panel derecho
  const [busqueda, setBusqueda] = useState("")
  const [empresaId, setEmpresaId] = useState<string>(TODOS)
  const [grupoId, setGrupoId] = useState<string>(TODOS)

  const { data: clientesResp } = useGetClientesSelect()
  const empresas = [
    ...(clientesResp?.clientes ?? []),
    ...(clientesResp?.contratistas ?? []),
  ]

  const { data: gruposResp } = useGetUsuariosGrupos("acceso-proyecto")
  const grupos = gruposResp?.data ?? []

  const { data: disponiblesData, isFetching: buscando } = useGetUsuarios({
    pageSize: 50,
    isLocked: false, // sólo usuarios activos
    nombre: busqueda || undefined,
    clienteId: empresaId !== TODOS ? empresaId : undefined,
    grupoId: grupoId !== TODOS ? grupoId : undefined,
  })

  // Excluyo los ya asignados de la lista de disponibles.
  const disponibles = (disponiblesData?.data ?? []).filter((u) => !asignadosIds.has(u.id))

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Usuarios con acceso a este proyecto. El indicador <span className="font-medium">"Activo"</span> significa
        que es el proyecto actualmente seleccionado por el usuario al iniciar sesión.
      </p>

      <div className="flex gap-4 h-[calc(100vh-260px)]">

        {/* ─── Panel izquierdo: asignados ─────────────────────────── */}
        <div className="w-80 shrink-0 border rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-700">Usuarios asignados</h3>
            <p className="text-xs text-muted-foreground">
              {asignados.length} usuario{asignados.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {cargandoAsignados ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            ) : asignados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                <UserIcon className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Sin usuarios asignados.</p>
                <p className="text-xs mt-1 max-w-45">
                  Usá los filtros de la derecha para encontrar usuarios y agregarlos.
                </p>
              </div>
            ) : (
              asignados.map((u) => {
                const fullName = [u.nombre, u.apellido].filter(Boolean).join(" ")
                return (
                  <div
                    key={u.usuarioId}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserIcon className="h-4 w-4 text-blue-900 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{fullName || u.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {u.esActivo && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="h-3 w-3" />
                          Activo
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(u.usuarioId)}
                        aria-label="Quitar del proyecto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ─── Panel derecho: disponibles + filtros ─────────────────── */}
        <div className="flex-1 border rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-700">Usuarios disponibles</h3>
              <AgregarDesdeGrupoSheet proyectoId={proyectoId} />
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="pl-8"
              />
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground">Empresa</label>
                <Select value={empresaId} onValueChange={(v) => setEmpresaId(v ?? TODOS)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue>{empresaId === TODOS ? "Todas" : (empresas.find((e) => e.id === empresaId)?.nombre ?? "—")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todas</SelectItem>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre}
                        {e.esContratista && <span className="ml-1 text-xs text-muted-foreground">(contratista)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Grupo</label>
                <Select value={grupoId} onValueChange={(v) => setGrupoId(v ?? TODOS)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue>{grupoId === TODOS ? "Todos" : (grupos.find((g) => g.id === grupoId)?.nombre ?? "—")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lista de disponibles */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {buscando && disponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Buscando...</p>
            ) : disponibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                <Search className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">
                  {busqueda || empresaId !== TODOS || grupoId !== TODOS
                    ? "Sin resultados con los filtros actuales."
                    : "No hay usuarios disponibles para agregar."}
                </p>
                <p className="text-xs mt-1 max-w-xs">
                  {busqueda || empresaId !== TODOS || grupoId !== TODOS
                    ? "Ajustá los filtros o limpiá la búsqueda para ver más."
                    : "Todos los usuarios visibles ya están asignados al proyecto."}
                </p>
              </div>
            ) : (
              disponibles.map((u) => {
                const fullName = [u.nombre, u.apellido].filter(Boolean).join(" ")
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-gray-100 hover:bg-gray-50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{fullName || u.userName || u.email}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email}
                          {u.clienteNombre && <span className="ml-1">· {u.clienteNombre}</span>}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 shrink-0"
                      disabled={addMutation.isPending}
                      onClick={() => addMutation.mutate(u.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Agregar
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Sheet: Agregar todos los miembros de un grupo ────────────────────────────

function AgregarDesdeGrupoSheet({ proyectoId }: { proyectoId: string }) {
  const [open, setOpen] = useState(false)
  const [grupoSel, setGrupoSel] = useState<string | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  const { data: gruposResp, isLoading } = useGetUsuariosGrupos("acceso-proyecto")
  const addFromGroup = useAddUsuariosDesdeGrupo(proyectoId)

  const grupos = gruposResp?.data ?? []

  async function confirmar() {
    if (!grupoSel) return
    setResultado(null)
    try {
      const res = await addFromGroup.mutateAsync(grupoSel)
      setResultado(res.message ?? "Asignación completada.")
      setTimeout(() => { setOpen(false); setResultado(null); setGrupoSel(null) }, 1600)
    } catch (e) {
      setResultado((e as Error).message)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs"
        onClick={() => setOpen(true)}
      >
        <Users className="h-3.5 w-3.5" />
        Agregar desde grupo
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setGrupoSel(null); setResultado(null) } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Agregar usuarios desde grupo</SheetTitle>
            <SheetDescription>
              Se asignan al proyecto todos los miembros activos del grupo elegido. Los ya
              asignados no se duplican. Cambios posteriores al grupo NO se propagan.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 px-4 space-y-3 pb-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando grupos...</p>
            ) : grupos.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No hay grupos con uso "Acceso a proyecto". Configuralo en{" "}
                <span className="font-medium">Configuración → Grupos de usuarios</span>.
              </p>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-y-auto">
                {grupos.map((g) => {
                  const selected = grupoSel === g.id
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => setGrupoSel(g.id)}
                        className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{g.nombre}</p>
                          {g.descripcion && (
                            <p className="text-xs text-muted-foreground truncate">{g.descripcion}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                          {g.cantidadMiembros} miembro{g.cantidadMiembros !== 1 ? "s" : ""}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {resultado && (
              <p className="text-sm bg-blue-50 border border-blue-200 text-blue-900 rounded-md px-3 py-2">
                {resultado}
              </p>
            )}

            <div className="flex gap-2 pt-3">
              <Button
                disabled={!grupoSel || addFromGroup.isPending}
                onClick={confirmar}
                className="flex-1"
              >
                {addFromGroup.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Agregando...</>
                ) : (
                  "Agregar miembros"
                )}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
