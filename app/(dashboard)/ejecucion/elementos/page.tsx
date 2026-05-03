"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import { ArrowLeft, Search, X, FileDown } from "lucide-react"
import { useGetAvanceElementosSubSistema } from "@/features/avance/api/use-get-avance-elementos-subsistema"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { ElementoDetalleSheet } from "@/features/avance/components/elemento-detalle-sheet"
import { ObtenerPlanillasDialog } from "@/features/planillas/components/obtener-planillas-dialog"
import { BarraAvance } from "@/components/barra-avance"
import type { AvanceElementoDTO } from "@/features/avance/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function AvanceElementosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const subSistemaIdParam = searchParams.get("subSistemaId") ?? undefined

  const [sistemaId, setSistemaId] = useState<string>("")
  const [subSistemaId, setSubSistemaId] = useState<string>(subSistemaIdParam ?? "")
  const [search, setSearch] = useState("")
  const [selectedElemento, setSelectedElemento] = useState<{ id: string; avance: AvanceElementoDTO } | null>(null)
  const [planillasDialogOpen, setPlanillasDialogOpen] = useState(false)

  useEffect(() => {
    if (subSistemaIdParam && subSistemaId !== subSistemaIdParam) {
      setSubSistemaId(subSistemaIdParam)
    }
  }, [subSistemaIdParam])

  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()

  const sistemas = sistemasRaw?.data ?? []
  const todosSubSistemas = subSistemasRaw?.data ?? []
  const subSistemasFiltrados = sistemaId
    ? todosSubSistemas.filter((ss) => ss.sistemaId === sistemaId)
    : todosSubSistemas

  const { data: raw, isLoading } = useGetAvanceElementosSubSistema(subSistemaId || undefined)

  const elementosTodos = raw?.data ?? []
  const elementos = search.trim()
    ? elementosTodos.filter(
        (e) =>
          e.nombre.toLowerCase().includes(search.toLowerCase()) ||
          e.codigo.toLowerCase().includes(search.toLowerCase())
      )
    : elementosTodos

  function handleSistemaChange(value: string) {
    setSistemaId(value === "__all__" ? "" : value)
    setSubSistemaId("")
    router.replace("/ejecucion/elementos")
  }

  function handleSubSistemaChange(value: string) {
    const id = value === "__all__" ? "" : value
    setSubSistemaId(id)
    setSearch("")
    if (id) {
      router.replace(`/ejecucion/elementos?subSistemaId=${id}`)
    } else {
      router.replace("/ejecucion/elementos")
    }
  }

  function handleClearFiltros() {
    setSistemaId("")
    setSubSistemaId("")
    setSearch("")
    router.replace("/ejecucion/elementos")
  }

  const hayFiltros = !!sistemaId || !!subSistemaId || !!search

  const sistemaSeleccionado = sistemas.find((s) => s.id === sistemaId)
  const subSistemaSeleccionado = todosSubSistemas.find((ss) => ss.id === subSistemaId)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {subSistemaIdParam && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-gray-500"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Subsistemas
              </Button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Avance por elementos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {!subSistemaId
              ? "Seleccioná un subsistema para ver el avance por elemento."
              : isLoading
              ? "Cargando..."
              : `${elementos.length}${search ? ` de ${elementosTodos.length}` : ""} elementos`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hayFiltros && (
            <Button variant="ghost" size="sm" className="text-gray-500 gap-1" onClick={handleClearFiltros}>
              <X className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPlanillasDialogOpen(true)}>
            <FileDown className="h-4 w-4" />
            Obtener planillas
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={sistemaId || "__all__"} onValueChange={handleSistemaChange}>
          <SelectTrigger className="w-56">
            <SelectValue>
              {sistemaSeleccionado
                ? `${sistemaSeleccionado.codigo} — ${sistemaSeleccionado.nombre}`
                : "Todos los sistemas"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los sistemas</SelectItem>
            {sistemas.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.codigo} — {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={subSistemaId || "__all__"} onValueChange={handleSubSistemaChange}>
          <SelectTrigger className="w-64">
            <SelectValue>
              {subSistemaSeleccionado
                ? `${subSistemaSeleccionado.codigo} — ${subSistemaSeleccionado.nombre}`
                : "Seleccioná un subsistema"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los subsistemas</SelectItem>
            {subSistemasFiltrados.map((ss) => (
              <SelectItem key={ss.id} value={ss.id}>
                {ss.codigo} — {ss.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {subSistemaId && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o TAG..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        )}
      </div>

      {/* Tabla */}
      {!subSistemaId ? (
        <div className="rounded-lg border bg-white p-10 text-center text-muted-foreground">
          Seleccioná un subsistema en el filtro de arriba, o navegá desde{" "}
          <button
            className="text-blue-600 underline underline-offset-2"
            onClick={() => router.push("/ejecucion/subsistemas")}
          >
            Avance por subsistemas
          </button>
          .
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700 w-28">TAG</TableHead>
                <TableHead className="font-semibold text-gray-700">Elemento</TableHead>
                <TableHead className="font-semibold text-gray-700 w-36">Tipo</TableHead>
                <TableHead className="font-semibold text-gray-700 w-32">Especialidad</TableHead>
                <TableHead className="font-semibold text-gray-700 w-24">Prioridad</TableHead>
                <TableHead className="font-semibold text-gray-700 w-28">PID</TableHead>
                <TableHead className="font-semibold text-gray-700 w-28">Testpack</TableHead>
                <TableHead className="font-semibold text-gray-700 w-52">Avance</TableHead>
                <TableHead className="font-semibold text-gray-700 text-center w-24">Estados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : elementos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    {search ? "No hay elementos que coincidan con la búsqueda." : "No hay elementos con datos de avance en este subsistema."}
                  </TableCell>
                </TableRow>
              ) : (
                elementos.map((e) => (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => setSelectedElemento({ id: e.id, avance: e })}
                  >
                    <TableCell className="font-mono text-sm text-gray-600">{e.codigo}</TableCell>
                    <TableCell className="font-medium">{e.nombre}</TableCell>
                    <TableCell className="text-sm text-gray-600">{e.elementoTipoNombre ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{e.elementoTipoEspecialidad ?? "—"}</TableCell>
                    <TableCell>
                      <PrioridadBadge prioridad={e.prioridadTexto} />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-500">{e.pid ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm text-gray-500">{e.testpack ?? "—"}</TableCell>
                    <TableCell>
                      <BarraAvance porcentaje={e.porcentajeAvance} />
                    </TableCell>
                    <TableCell className="text-center" onClick={(ev) => ev.stopPropagation()}>
                      <EstadosPopover elemento={e} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ElementoDetalleSheet
        elementoId={selectedElemento?.id ?? null}
        avance={selectedElemento?.avance ?? null}
        open={!!selectedElemento}
        onClose={() => setSelectedElemento(null)}
      />

      <ObtenerPlanillasDialog
        open={planillasDialogOpen}
        onClose={() => setPlanillasDialogOpen(false)}
      />
    </div>
  )
}

export default function AvanceElementosPage() {
  return (
    <Suspense>
      <AvanceElementosContent />
    </Suspense>
  )
}

// ── EstadosPopover ─────────────────────────────────────────────────────────────

function EstadosPopover({ elemento }: { elemento: AvanceElementoDTO }) {
  const filas = [
    { label: "Pendiente",   value: elemento.pendiente,   color: "bg-gray-100 text-gray-700" },
    { label: "En proceso",  value: elemento.enProceso,   color: "bg-blue-100 text-blue-700" },
    { label: "Completado",  value: elemento.completado,  color: "bg-yellow-100 text-yellow-700" },
    { label: "Firmado",     value: elemento.firmado,     color: "bg-indigo-100 text-indigo-700" },
    { label: "Aprobado",    value: elemento.aprobado,    color: "bg-green-100 text-green-700" },
    { label: "Rechazado",   value: elemento.rechazado,   color: "bg-red-100 text-red-700" },
    { label: "Cancelado",   value: elemento.cancelado,   color: "bg-gray-50 text-gray-400" },
  ].filter((f) => f.value > 0)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 cursor-default tabIndex={0}">
          {elemento.totalTareas}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-0">
        <div className="min-w-40 py-2 px-1">
          <p className="text-xs font-semibold text-gray-500 px-2 pb-1">Desglose de estados</p>
          {filas.length === 0 ? (
            <p className="text-xs text-gray-400 px-2">Sin tareas</p>
          ) : (
            filas.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3 px-2 py-0.5">
                <span className="text-xs text-gray-600">{f.label}</span>
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${f.color}`}>
                  {f.value}
                </span>
              </div>
            ))
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ── PrioridadBadge ─────────────────────────────────────────────────────────────

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  const styles: Record<string, string> = {
    Baja:    "bg-gray-100 text-gray-500",
    Media:   "bg-blue-50 text-blue-600",
    Alta:    "bg-orange-100 text-orange-700",
    Urgente: "bg-red-100 text-red-700",
  }
  const style = styles[prioridad] ?? "bg-gray-100 text-gray-500"
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${style}`}>
      {prioridad}
    </span>
  )
}
