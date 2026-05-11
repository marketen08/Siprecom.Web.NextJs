"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import { Search, FileDown } from "lucide-react"
import { useGetAvanceElementos } from "@/features/avance/api/use-get-avance-elementos"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { ElementoDetalleSheet } from "@/features/avance/components/elemento-detalle-sheet"
import { EstadosPopover } from "@/features/avance/components/estados-popover"
import { ObtenerPlanillasDialog } from "@/features/planillas/components/obtener-planillas-dialog"
import { BarraAvance } from "@/components/barra-avance"
import { useBreadcrumb } from "@/components/breadcrumb-context"
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
  FiltersTrigger,
  FiltersChips,
  FiltersSheet,
  FilterField,
  type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

function AvanceElementosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const subSistemaIdParam = searchParams.get("subSistemaId") ?? undefined

  const [sistemaId, setSistemaId] = useState<string>("")
  const [subSistemaId, setSubSistemaId] = useState<string>(subSistemaIdParam ?? "")
  const [search, setSearch] = useState("")
  const [selectedElemento, setSelectedElemento] = useState<{ id: string; avance: AvanceElementoDTO } | null>(null)
  const [planillasDialogOpen, setPlanillasDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  const { data: raw, isLoading } = useGetAvanceElementos({
    sistemaId: sistemaId || undefined,
    subSistemaId: subSistemaId || undefined,
  })

  const elementosTodos = raw?.data ?? []
  const elementos = search.trim()
    ? elementosTodos.filter(
        (e) =>
          e.nombre.toLowerCase().includes(search.toLowerCase()) ||
          e.codigo.toLowerCase().includes(search.toLowerCase())
      )
    : elementosTodos

  function handleSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSistemaId(id)
    // Si el subsistema actual no pertenece al nuevo sistema, lo reseteamos.
    if (id && subSistemaId) {
      const ss = todosSubSistemas.find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== id) {
        setSubSistemaId("")
        router.replace("/ejecucion/elementos")
      }
    } else if (!id) {
      router.replace("/ejecucion/elementos")
    }
  }

  function handleSubSistemaChange(value: string | null) {
    const id = !value || value === ALL ? "" : value
    setSubSistemaId(id)
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

  const sistemaSeleccionado = sistemas.find((s) => s.id === sistemaId)
  const subSistemaSeleccionado = todosSubSistemas.find((ss) => ss.id === subSistemaId)

  // Construir chips de filtros activos (la búsqueda es independiente y NO genera chip).
  const activeFilters: FilterChip[] = []
  if (sistemaId) {
    activeFilters.push({
      id: "sistema",
      label: `Sistema: ${sistemaSeleccionado
        ? `${sistemaSeleccionado.codigo} — ${sistemaSeleccionado.nombre}`
        : "—"}`,
      onRemove: () => handleSistemaChange(ALL),
    })
  }
  if (subSistemaId) {
    activeFilters.push({
      id: "subsistema",
      label: `Subsistema: ${subSistemaSeleccionado
        ? `${subSistemaSeleccionado.codigo} — ${subSistemaSeleccionado.nombre}`
        : "—"}`,
      onRemove: () => handleSubSistemaChange(ALL),
    })
  }

  // Breadcrumb dinámico cuando hay subsistema seleccionado.
  // Sin subsistema, breadcrumb default del menú (Ejecución → Avance por elementos).
  useBreadcrumb(
    subSistemaId && subSistemaSeleccionado
      ? [
          { label: "Ejecución" },
          { label: "Subsistemas", href: "/ejecucion/subsistemas" },
          { label: `${subSistemaSeleccionado.codigo} — ${subSistemaSeleccionado.nombre}` },
        ]
      : null
  )

  return (
    <div className="space-y-4">
      {/* Buscador + acciones (Obtener planillas, Filtros) */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o TAG..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPlanillasDialogOpen(true)}>
            <FileDown className="h-4 w-4" />
            Obtener planillas
          </Button>
          <FiltersTrigger
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeCount={activeFilters.length}
          />
        </div>
      </div>

      {/* Chips de filtros activos (línea propia, solo si hay alguno) */}
      <FiltersChips activeFilters={activeFilters} onClearAll={handleClearFiltros} />

      {/* Sheet con los controles */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={handleClearFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Sistema">
          <Select value={sistemaId || ALL} onValueChange={handleSistemaChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {sistemaSeleccionado
                  ? `${sistemaSeleccionado.codigo} — ${sistemaSeleccionado.nombre}`
                  : "Todos los sistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los sistemas</SelectItem>
              {sistemas.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.codigo} — {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Subsistema">
          <Select
            value={subSistemaId || ALL}
            onValueChange={handleSubSistemaChange}
            disabled={!!sistemaId && subSistemasFiltrados.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {subSistemaSeleccionado
                  ? `${subSistemaSeleccionado.codigo} — ${subSistemaSeleccionado.nombre}`
                  : "Todos los subsistemas"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los subsistemas</SelectItem>
              {subSistemasFiltrados.map((ss) => (
                <SelectItem key={ss.id} value={ss.id}>
                  {ss.codigo} — {ss.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FiltersSheet>

      {/* Tabla */}
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
                  {search
                    ? "No hay elementos que coincidan con la búsqueda."
                    : subSistemaId
                      ? "No hay elementos en este subsistema."
                      : sistemaId
                        ? "No hay elementos en este sistema."
                        : "No hay elementos en el proyecto."}
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
                    <EstadosPopover avance={e} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Total */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {`${elementos.length}${search ? ` de ${elementosTodos.length}` : ""} elementos`}
        </p>
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
