"use client"

import { useMemo, useState } from "react"
import {
  ArrowDown, ArrowUp, Link2, Loader2, Plus, Recycle, Trash2, X,
} from "lucide-react"

import {
  useCreateDependencia,
  useDeleteDependencia,
  useGetDependencias,
  useUpdateDependencia,
  type Dependencia,
} from "@/features/elementos-tareas/api/dependencias"
import { useGetElementosTareasPorElemento } from "@/features/elementos-tareas/api/use-get-elementostareas-por-elemento"
import { apiClient } from "@/lib/api-client"
import { useQuery } from "@tanstack/react-query"
import type { PagedResponse } from "@/features/proyectos/types"
import type { ElementoTarea } from "@/features/elementos-tareas/types"

import { useAuthStore } from "@/store/auth-store"
import { meetsRole } from "@/lib/roles"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Combobox,
} from "@/components/ui/combobox"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  open: boolean
  onClose: () => void
  /** ElementoTarea "punto de vista" desde donde se abre el sheet. */
  elementoTareaId: string | null
  /** Datos de contexto para el header. */
  elementoTag?: string | null
  tareaNombre?: string | null
  /** ElementoId del contexto — usamos para el filtro "Del mismo elemento". */
  elementoId: string | null
}

type Direccion = "predecesor" | "sucesor"

export function DependenciasSheet({
  open, onClose, elementoTareaId, elementoTag, tareaNombre, elementoId,
}: Props) {
  const { data: raw, isLoading, isError } = useGetDependencias(elementoTareaId)
  const resumen = raw?.data

  // Modificar dependencias es alcance: solo Supervisor y arriba pueden crear/editar/borrar.
  // El backend igual bloquea (Admin,Supervisor en POST/PUT/DELETE), pero acá evitamos
  // mostrar controles inútiles a un User.
  const userRoles = useAuthStore((s) => s.user?.roles)
  const puedeModificar = meetsRole(userRoles, "Supervisor")

  const [agregandoDireccion, setAgregandoDireccion] = useState<Direccion | null>(null)

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl! flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            Dependencias
          </SheetTitle>
          <SheetDescription>
            <span className="font-mono text-xs">{elementoTag ?? "—"}</span>
            {" · "}
            {tareaNombre ?? "—"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-1 pb-6 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">No se pudieron cargar las dependencias.</p>
          )}

          {resumen && (
            <>
              {/* Predecesores */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Predecesores</h3>
                    <Badge variant="secondary">{resumen.predecesores.length}</Badge>
                  </div>
                  {puedeModificar && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setAgregandoDireccion("predecesor")}
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tareas que <strong>deben terminar</strong> antes de que ésta pueda arrancar.
                </p>
                {resumen.predecesores.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Sin predecesores.</p>
                ) : (
                  <div className="space-y-1.5">
                    {resumen.predecesores.map((d) => (
                      <DependenciaFila key={d.id} dep={d} lado="predecesor" puedeModificar={puedeModificar} />
                    ))}
                  </div>
                )}
              </section>

              <Separator />

              {/* Sucesores */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Sucesores</h3>
                    <Badge variant="secondary">{resumen.sucesores.length}</Badge>
                  </div>
                  {puedeModificar && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setAgregandoDireccion("sucesor")}
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tareas que <strong>no pueden arrancar</strong> hasta que ésta se complete.
                </p>
                {resumen.sucesores.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">Sin sucesores.</p>
                ) : (
                  <div className="space-y-1.5">
                    {resumen.sucesores.map((d) => (
                      <DependenciaFila key={d.id} dep={d} lado="sucesor" puedeModificar={puedeModificar} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {agregandoDireccion && elementoTareaId && (
          <AgregarDependenciaDialog
            direccion={agregandoDireccion}
            elementoTareaId={elementoTareaId}
            elementoId={elementoId}
            onClose={() => setAgregandoDireccion(null)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── Fila de dependencia ────────────────────────────────────────────────────

function DependenciaFila({ dep, lado, puedeModificar }: { dep: Dependencia; lado: "predecesor" | "sucesor"; puedeModificar: boolean }) {
  // Punta "otra": si lado=predecesor, esta fila muestra al PREDECESOR (la ET del OTRO lado).
  const otraTag = lado === "predecesor" ? dep.predecesorTag : dep.sucesorTag
  const otraTarea = lado === "predecesor" ? dep.predecesorTareaNombre : dep.sucesorTareaNombre
  const otraEstado = lado === "predecesor" ? dep.predecesorEstadoTexto : dep.sucesorEstadoTexto
  const otraFecha = lado === "predecesor" ? dep.predecesorFechaPlanificada : dep.sucesorFechaPlanificada

  const [editandoLag, setEditandoLag] = useState(false)
  const [confirmarBorrar, setConfirmarBorrar] = useState(false)
  const [lagInput, setLagInput] = useState(String(dep.lagDias))
  const updateM = useUpdateDependencia()
  const deleteM = useDeleteDependencia()

  return (
    <div className="rounded-lg border bg-white p-3 space-y-1.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-medium text-gray-800">{otraTag ?? "—"}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm text-gray-800 truncate">{otraTarea ?? "—"}</span>
            {dep.esCatalogal ? (
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] h-5"
                title="Materializada por el catálogo (Tarea.TareaPrecedenteId). Si la borrás se rematerializa al próximo sync."
              >
                <Recycle className="h-2.5 w-2.5 mr-0.5" />
                Del catálogo
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] h-5"
              >
                Manual
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Estado: {otraEstado}</span>
            {otraFecha && <span>Fecha planificada: {formatFecha(otraFecha)}</span>}
          </div>
        </div>

        {puedeModificar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
            onClick={() => setConfirmarBorrar(true)}
            disabled={deleteM.isPending}
            title="Eliminar dependencia"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Lag:</span>
        {editandoLag ? (
          <>
            <Input
              type="number"
              min={0}
              max={365}
              value={lagInput}
              onChange={(e) => setLagInput(e.target.value)}
              className="h-7 w-20 text-xs"
              disabled={updateM.isPending}
            />
            <span>día(s)</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => {
                const n = Math.max(0, Math.min(365, parseInt(lagInput, 10) || 0))
                updateM.mutate(
                  { id: dep.id, lagDias: n },
                  {
                    onSuccess: () => setEditandoLag(false),
                  },
                )
              }}
              disabled={updateM.isPending}
            >
              {updateM.isPending ? "..." : "OK"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1"
              onClick={() => {
                setEditandoLag(false)
                setLagInput(String(dep.lagDias))
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : puedeModificar ? (
          <button
            className="text-blue-700 hover:underline"
            onClick={() => setEditandoLag(true)}
          >
            {dep.lagDias} día(s) — editar
          </button>
        ) : (
          <span>{dep.lagDias} día(s)</span>
        )}
      </div>

      <AlertDialog open={confirmarBorrar} onOpenChange={setConfirmarBorrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar dependencia?</AlertDialogTitle>
            <AlertDialogDescription>
              {dep.esCatalogal ? (
                <>
                  Esta dependencia está definida en el <strong>catálogo</strong> (Tarea →
                  Tarea precedente). Si la borrás, se volverá a materializar al próximo
                  cambio de alcance. Para eliminarla en serio, tocá el catálogo.
                </>
              ) : (
                <>Este override manual se elimina para siempre. ¿Continuar?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteM.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                deleteM.mutate(dep.id, { onSuccess: () => setConfirmarBorrar(false) })
              }
              disabled={deleteM.isPending}
            >
              {deleteM.isPending ? "Borrando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Diálogo "Agregar dependencia" ──────────────────────────────────────────

function AgregarDependenciaDialog({
  direccion, elementoTareaId, elementoId, onClose,
}: {
  direccion: Direccion
  elementoTareaId: string
  elementoId: string | null
  onClose: () => void
}) {
  const [filtroMismoElemento, setFiltroMismoElemento] = useState(true)
  const [otraId, setOtraId] = useState("")
  const [lagDias, setLagDias] = useState("0")

  // ETs del mismo elemento — always cargado.
  const { data: mismoElementoRaw } = useGetElementosTareasPorElemento(
    filtroMismoElemento ? elementoId : null,
  )
  const mismoElemento = (mismoElementoRaw as any)?.data ?? []

  // ETs de todo el proyecto — sólo si el filtro está apagado.
  const { data: todasRaw } = useQuery({
    queryKey: ["elementos-tareas", "todas-proyecto"],
    queryFn: () =>
      apiClient.post<PagedResponse<ElementoTarea>>("/api/elementos-tareas/search", {
        filter: {},
        page: 1,
        pageSize: 500,
      }),
    enabled: !filtroMismoElemento,
    staleTime: 60 * 1000,
  })
  const todas = (todasRaw as any)?.data ?? []

  const opciones = useMemo(() => {
    const lista = filtroMismoElemento ? mismoElemento : todas
    return (lista as ElementoTarea[])
      .filter((et) => et.id !== elementoTareaId) // excluir la propia ET del punto de vista
      .map((et) => ({
        value: et.id,
        label: `${et.elementoTag ?? "—"} · ${et.tareaNombre ?? "—"}`,
      }))
  }, [filtroMismoElemento, mismoElemento, todas, elementoTareaId])

  const createM = useCreateDependencia()

  const handleSubmit = () => {
    if (!otraId) return
    const predecesorId = direccion === "predecesor" ? otraId : elementoTareaId
    const sucesorId = direccion === "predecesor" ? elementoTareaId : otraId
    const lag = Math.max(0, Math.min(365, parseInt(lagDias, 10) || 0))
    createM.mutate(
      { predecesorId, sucesorId, lagDias: lag },
      {
        onSuccess: () => onClose(),
      },
    )
  }

  return (
    <AlertDialog open onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Agregar {direccion === "predecesor" ? "predecesor" : "sucesor"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {direccion === "predecesor"
              ? "Elegí la tarea que debe terminar ANTES."
              : "Elegí la tarea que arranca DESPUÉS."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filtroMismoElemento}
              onChange={(e) => {
                setFiltroMismoElemento(e.target.checked)
                setOtraId("")
              }}
              className="h-4 w-4"
            />
            Sólo tareas del mismo elemento
          </label>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Tarea</label>
            <Combobox
              options={opciones}
              value={otraId}
              onChange={setOtraId}
              placeholder="Elegí una tarea..."
              searchPlaceholder="Buscar por TAG o nombre..."
              emptyMessage="Sin resultados"
            />
          </div>

          <div className="space-y-1.5 max-w-40">
            <label className="text-xs font-medium text-gray-700">Días de espera</label>
            <Input
              type="number"
              min={0}
              max={365}
              value={lagDias}
              onChange={(e) => setLagDias(e.target.value)}
              className="h-8"
            />
          </div>

          {createM.isError && (
            <p className="text-xs text-red-600">
              {(createM.error as Error).message}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={createM.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!otraId || createM.isPending}
          >
            {createM.isPending ? "Guardando..." : "Agregar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function formatFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`
}
