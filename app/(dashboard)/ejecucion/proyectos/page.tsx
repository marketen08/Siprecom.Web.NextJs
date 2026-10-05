"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

import { useGetAvanceProyectos } from "@/features/avance/api/use-get-avance-proyectos"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useCambiarProyectoActivo } from "@/features/auth/api/use-cambiar-proyecto-activo"
import type { AvanceDTO } from "@/features/avance/types"
import { BarraAvance } from "@/components/barra-avance"
import { EstadoBadge, ESTADO_COLORS } from "@/components/estado-proyecto-badge"
import { ESTADO_PROYECTO } from "@/features/proyectos/types"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

/** "todos" o un estado puntual de ESTADO_PROYECTO. */
type FiltroEstado = "todos" | number

export default function AvanceProyectosPage() {
  const router = useRouter()
  const { data: avanceData, isLoading } = useGetAvanceProyectos()
  const { data: perfil } = useGetPerfil()
  const cambiarProyecto = useCambiarProyectoActivo()

  // Arranca en "todos" para no cambiarle la vista a nadie: el filtro suma una
  // forma de acotar, no esconde proyectos por default.
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos")

  // Memoizado porque `?? []` devuelve un array nuevo en cada render y eso haría
  // recalcular los useMemo de abajo siempre.
  const todos: AvanceDTO[] = useMemo(() => avanceData?.data ?? [], [avanceData])
  const proyectoActivoId = perfil?.proyectoId ?? null

  // Un chip por cada estado realmente presente, con su conteo. Armar los chips a
  // partir de los datos evita ofrecer filtros que no matchean nada.
  const estadosPresentes = useMemo(() => {
    const conteo = new Map<number, number>()
    for (const p of todos) {
      if (p.estado == null) continue
      conteo.set(p.estado, (conteo.get(p.estado) ?? 0) + 1)
    }
    return [...conteo.entries()].sort((a, b) => a[0] - b[0])
  }, [todos])

  const proyectos = useMemo(
    () => (filtroEstado === "todos" ? todos : todos.filter((p) => p.estado === filtroEstado)),
    [todos, filtroEstado],
  )

  useBreadcrumb([{ label: "Ejecución" }, { label: "Avance por proyectos" }])

  // Distinguir "no tenés proyectos" de "el filtro no matcheó": con el mismo cartel,
  // filtrar por un estado sin resultados parecía una pérdida de acceso.
  const mensajeVacio =
    todos.length > 0 && filtroEstado !== "todos"
      ? "Ningún proyecto con ese estado."
      : "No tenés proyectos asignados."

  // Al clickear un proyecto: si ya es el activo, solo redirigimos. Si no, lo activamos
  // y después navegamos. Manejamos el await para que el cache se invalide antes.
  async function handleSelectProyecto(proyectoId: string) {
    if (cambiarProyecto.isPending) return
    if (proyectoId !== proyectoActivoId) {
      try {
        await cambiarProyecto.mutateAsync(proyectoId)
      } catch {
        // si falla, no navegamos
        return
      }
    }
    router.push("/ejecucion/sistemas")
  }

  return (
    <div className="space-y-4">
      {/* Chips de estado. Sólo aparecen si hay más de un estado entre los proyectos:
          con todos en el mismo estado, filtrar no aporta nada. */}
      {!isLoading && estadosPresentes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltroEstado("todos")}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filtroEstado === "todos"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todos
            <span className="text-muted-foreground">{todos.length}</span>
          </button>

          {estadosPresentes.map(([estado, cantidad]) => {
            const activo = filtroEstado === estado
            return (
              <button
                key={estado}
                type="button"
                onClick={() => setFiltroEstado(activo ? "todos" : estado)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  activo
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${(ESTADO_COLORS[estado] ?? "").split(" ")[0]}`}
                  aria-hidden
                />
                {ESTADO_PROYECTO[estado as keyof typeof ESTADO_PROYECTO] ?? estado}
                <span className="text-muted-foreground">{cantidad}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Cards (solo mobile) */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Cargando proyectos...
          </div>
        ) : proyectos.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
            {mensajeVacio}
          </div>
        ) : (
          proyectos.map((p) => {
            const esActivo = p.id === proyectoActivoId
            return (
              <div
                key={p.id}
                className="rounded-lg border bg-white p-3 space-y-2 active:bg-blue-50 transition-colors"
                onClick={() => handleSelectProyecto(p.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {esActivo && <Check className="h-4 w-4 text-blue-700 shrink-0" />}
                    <p className="font-medium truncate">{p.nombre}</p>
                  </div>
                  <div onClick={(ev) => ev.stopPropagation()} className="shrink-0">
                    <EstadosPopover avance={p} />
                  </div>
                </div>
                {p.estado != null && <EstadoBadge estado={p.estado} />}
                <BarraAvance porcentaje={p.porcentajeAvance} />
              </div>
            )
          })
        )}
      </div>

      {/* Tabla (solo desktop) */}
      <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700 w-8"></TableHead>
              <TableHead className="font-semibold text-gray-700">Proyecto</TableHead>
              <TableHead className="font-semibold text-gray-700 w-32">Estado</TableHead>
              <TableHead className="font-semibold text-gray-700 w-56">Avance</TableHead>
              <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Cargando proyectos...
                </TableCell>
              </TableRow>
            ) : proyectos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  {mensajeVacio}
                </TableCell>
              </TableRow>
            ) : (
              proyectos.map((p) => {
                const esActivo = p.id === proyectoActivoId
                return (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => handleSelectProyecto(p.id)}
                  >
                    <TableCell className="py-3 text-center">
                      {esActivo && <Check className="h-4 w-4 text-blue-700 inline" />}
                    </TableCell>
                    <TableCell className="py-3 font-medium">{p.nombre}</TableCell>
                    <TableCell className="py-3">
                      {p.estado != null && <EstadoBadge estado={p.estado} />}
                    </TableCell>
                    <TableCell className="py-3">
                      <BarraAvance porcentaje={p.porcentajeAvance} />
                    </TableCell>
                    <TableCell className="py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                      <EstadosPopover avance={p} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {`${proyectos.length} proyecto${proyectos.length !== 1 ? "s" : ""}`}
          {filtroEstado !== "todos" && ` de ${todos.length}`}
          {cambiarProyecto.isPending && (
            <span className="ml-2 inline-flex items-center gap-1 text-blue-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cambiando proyecto activo...
            </span>
          )}
        </p>
      )}
    </div>
  )
}
