"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table"
import { Plus, Search, FileSpreadsheet, FileJson, Sparkles, X, MoreHorizontal } from "lucide-react"
import Link from "next/link"

import { useGetPlanillas } from "@/features/planillas/api/use-get-planillas"
import { useNewPlanilla } from "@/features/planillas/hooks/use-new-planilla"
import { NewPlanillaSheet } from "@/features/planillas/components/new-planilla-sheet"
import { EditPlanillaSheet } from "@/features/planillas/components/edit-planilla-sheet"
import { ImportExcelSheet } from "@/features/planillas/components/import-excel-sheet"
import { ImportJsonSheet } from "@/features/planillas/components/import-json-sheet"
import { GenerarConIASheet } from "@/features/planillas/components/generar-con-ia-sheet"
import { useGetPlanillasGrupos } from "@/features/planillas-grupos/api/use-planillas-grupos"
import { useGetMisEquipos } from "@/features/equipos/api/use-equipos"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import {
  FUNCIONALIDAD,
  useFuncionalidadPlataforma,
} from "@/features/funcionalidades/api/use-funcionalidades-plataforma"
import { columns, ColeccionesBadges, EquipoBadge, RevisionCheck, RowActions, UsoBadge } from "./columns"
import { DataTableWrapper } from "@/components/data-table-wrapper"
import {
  FilterField,
  FiltersChips,
  FiltersSheet,
  FiltersTrigger,
  type FilterChip,
} from "@/components/ui/filters-bar"

/** Token sentinela en el CSV de PlanillaGrupoIds para pedir planillas sin grupo.
    Debe matchear el string usado en `PlanillaService` del backend. */
const TOKEN_SIN_GRUPO = "__none__"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

/**
 * Los cuatro recortes del eje "uso". "mi-proyecto" no es un punto medio entre los otros
 * dos: una planilla puede estar en uso en otro proyecto y no en el mío, o al revés.
 */
type UsoFiltro = "todas" | "sin-uso" | "en-uso" | "mi-proyecto"

const USO_LABEL: Record<UsoFiltro, string> = {
  "todas": "Todas",
  "sin-uso": "Sin uso",
  "en-uso": "En uso",
  "mi-proyecto": "En este proyecto",
}

/** Tilde de revisión. "pendientes" incluye las que se modificaron después del tilde. */
type RevisionFiltro = "todas" | "pendientes" | "revisadas"

const REVISION_LABEL: Record<RevisionFiltro, string> = {
  "todas": "Todas",
  "pendientes": "Pendientes",
  "revisadas": "Revisadas",
}

export default function PlanillasPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [gruposSel, setGruposSel] = useState<Set<string>>(new Set())
  // Tri-state: undefined = todas, true = solo encabezado TG, false = solo no encabezado.
  const [encabezadoFilter, setEncabezadoFilter] = useState<boolean | undefined>(undefined)
  // El eje "uso" tiene cuatro opciones, no un tri-estado: "mi-proyecto" no es ni
  // "en uso" ni "sin uso", es un recorte distinto (usada acá, aunque en otros
  // proyectos no se use, o al revés).
  const [usoFilter, setUsoFilter] = useState<UsoFiltro>("todas")

  // El filtro por proyecto sólo tiene sentido con un proyecto seleccionado. Sin él, el
  // backend contesta 400: mejor no ofrecer la opción que ofrecer una que falla.
  const { data: perfil } = useGetPerfil()
  const proyectoActivo = perfil?.proyectoId ? perfil : null

  // Filtro por equipo dueño. Vacío = lo que el backend decide por defecto: el equipo activo
  // del usuario más las globales, o todo para AdminGlobal.
  const [equipoFiltro, setEquipoFiltro] = useState<string>("")

  // Los dos ejes con los que se acota el catálogo son apagables por el SuperAdmin. Con
  // uno apagado desaparece su filtro Y su columna: dejar la columna sin el filtro —o al
  // revés— muestra una división que ya no divide nada.
  const hayColecciones = useFuncionalidadPlataforma(FUNCIONALIDAD.coleccionesPlanillas)
  const hayEquipos = useFuncionalidadPlataforma(FUNCIONALIDAD.equiposAdministracion)

  const [revisionFilter, setRevisionFilter] = useState<RevisionFiltro>("todas")

  const gruposIdsArr = useMemo(() => Array.from(gruposSel), [gruposSel])
  // Los filtros de siempre, sin el de revisión: el contador "X de Y revisadas" se mide
  // sobre este recorte, así que no puede depender del chip de revisión elegido.
  const filtrosBase = {
    nombre: search || undefined,
    planillaGrupoIds: gruposIdsArr.length > 0 ? gruposIdsArr : undefined,
    esEncabezadoTG: encabezadoFilter,
    equipoId: equipoFiltro || undefined,
    sinUso: usoFilter === "sin-uso" ? true : usoFilter === "en-uso" ? false : undefined,
    usadaEnProyectoActivo: usoFilter === "mi-proyecto" || undefined,
  }
  const { data, isLoading, isFetching } = useGetPlanillas({
    page,
    pageSize,
    ...filtrosBase,
    revisada: revisionFilter === "revisadas" ? true : revisionFilter === "pendientes" ? false : undefined,
  })
  // Contador de revisión: dos pedidos de una fila, sólo por el total.
  const { data: conteoTodas } = useGetPlanillas({ page: 1, pageSize: 1, ...filtrosBase })
  const { data: conteoRevisadas } = useGetPlanillas({ page: 1, pageSize: 1, ...filtrosBase, revisada: true })
  const { data: misEquipos } = useGetMisEquipos(hayEquipos)
  const { data: gruposRaw } = useGetPlanillasGrupos(hayColecciones)
  const grupos = hayColecciones ? gruposRaw?.data ?? [] : []
  const { open } = useNewPlanilla()

  const toggleGrupo = (id: string) => {
    setGruposSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setPage(1)
  }
  const limpiarGrupos = () => {
    setGruposSel(new Set())
    setPage(1)
  }
  const [importOpen, setImportOpen] = useState(false)
  const [importJsonOpen, setImportJsonOpen] = useState(false)
  const [generarIAOpen, setGenerarIAOpen] = useState(false)

  // ── Filtros en mobile ──────────────────────────────────────────────────────
  // En desktop los filtros son chips a la vista, que para elegir entre pocas
  // opciones es más rápido que abrir algo. En un teléfono las cuatro filas de
  // chips se comen la pantalla antes de que aparezca la primera planilla, así que
  // ahí van al Sheet, igual que en usuarios y elementos. El state es el mismo:
  // lo único que cambia es cómo se dibuja.
  const [filtrosOpen, setFiltrosOpen] = useState(false)

  const nombreEquipoFiltro = (id: string) =>
    id === "__none__" ? "Globales" : misEquipos?.equipos.find((e) => e.id === id)?.nombre ?? id

  const filtrosActivos: FilterChip[] = [
    ...(equipoFiltro
      ? [{
          id: "equipo",
          label: `Equipo: ${nombreEquipoFiltro(equipoFiltro)}`,
          onRemove: () => { setEquipoFiltro(""); setPage(1) },
        }]
      : []),
    ...gruposIdsArr.map((id) => ({
      id: `grupo-${id}`,
      label: `Colección: ${id === TOKEN_SIN_GRUPO
        ? "Sin colección"
        : grupos.find((g) => g.id === id)?.nombre ?? id}`,
      onRemove: () => toggleGrupo(id),
    })),
    ...(encabezadoFilter !== undefined
      ? [{
          id: "tipo",
          label: `Tipo: ${encabezadoFilter ? "Encabezado TG" : "Estándar"}`,
          onRemove: () => { setEncabezadoFilter(undefined); setPage(1) },
        }]
      : []),
    ...(usoFilter !== "todas"
      ? [{
          id: "uso",
          label: `Uso: ${USO_LABEL[usoFilter]}`,
          onRemove: () => { setUsoFilter("todas"); setPage(1) },
        }]
      : []),
    ...(revisionFilter !== "todas"
      ? [{
          id: "revision",
          label: `Revisión: ${REVISION_LABEL[revisionFilter]}`,
          onRemove: () => { setRevisionFilter("todas"); setPage(1) },
        }]
      : []),
  ]

  const limpiarTodo = () => {
    setEquipoFiltro("")
    setGruposSel(new Set())
    setEncabezadoFilter(undefined)
    setUsoFilter("todas")
    setRevisionFilter("todas")
    setPage(1)
  }

  // Las columnas se filtran acá y no en columns.tsx porque la decisión depende de un
  // hook: el array exportado es estático.
  const columnasVisibles = useMemo(
    () => columns.filter((c) =>
      c.id === "grupos" ? hayColecciones : c.id === "equipo" ? hayEquipos : true),
    [hayColecciones, hayEquipos],
  )

  const table = useReactTable({
    data: data?.data ?? [],
    columns: columnasVisibles,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualPagination: true,
    rowCount: data?.total ?? 0,
  })

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize)

  return (
    <>
      <NewPlanillaSheet />
      <EditPlanillaSheet />
      <ImportExcelSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <ImportJsonSheet open={importJsonOpen} onClose={() => setImportJsonOpen(false)} />
      <GenerarConIASheet open={generarIAOpen} onClose={() => setGenerarIAOpen(false)} />

      <div className="space-y-4">
        {/* Buscador + Acciones */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Las tres secundarias, cada una con su botón. Cuatro botones no entran en
                un teléfono, así que ahí se agrupan en el menú de abajo. */}
            <Button onClick={() => setGenerarIAOpen(true)} variant="outline" className="gap-2 hidden lg:inline-flex">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Generar con IA
            </Button>
            <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2 hidden lg:inline-flex">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              Importar desde Excel
            </Button>
            <Button onClick={() => setImportJsonOpen(true)} variant="outline" className="gap-2 hidden lg:inline-flex">
              <FileJson className="h-4 w-4 text-blue-600" />
              Importar JSON
            </Button>

            {/* Mismas tres acciones, agrupadas. Hasta lg, que es donde los botones
                sueltos empiezan a empujar al buscador a otra línea. */}
            <DropdownMenu>
              <DropdownMenuTrigger
                title="Más acciones"
                aria-label="Más acciones"
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white text-muted-foreground hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="cursor-pointer" onClick={() => setGenerarIAOpen(true)}>
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Generar con IA
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setImportOpen(true)}>
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Importar desde Excel
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setImportJsonOpen(true)}>
                  <FileJson className="h-4 w-4 text-blue-600" />
                  Importar JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Los filtros son chips a la vista en desktop; acá sólo hace falta el botón
                en mobile. El badge con la cantidad activa es lo que evita quedarse
                filtrando sin darse cuenta. */}
            <FiltersTrigger
              open={filtrosOpen}
              onOpenChange={setFiltrosOpen}
              activeCount={filtrosActivos.length}
              className="md:hidden"
            />

            <Button onClick={open} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva planilla</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>

        {/* Chips de lo que está filtrado (solo mobile: en desktop los chips de abajo ya
            lo muestran, y repetirlo sería decir dos veces lo mismo). */}
        <div className="md:hidden">
          <FiltersChips activeFilters={filtrosActivos} onClearAll={limpiarTodo} />
        </div>

        {/* Sheet con los controles, en mobile. Los mismos cuatro ejes que los chips del
            desktop: como acá hay lugar para un label, cada uno dice qué filtra. */}
        <FiltersSheet
          open={filtrosOpen}
          onOpenChange={setFiltrosOpen}
          onClearAll={limpiarTodo}
          hasActiveFilters={filtrosActivos.length > 0}
        >
          {misEquipos && (misEquipos.equipos.length > 1 || misEquipos.puedeElegirGlobales) && (
            <FilterField label="Equipo que la administra">
              <Select
                value={equipoFiltro || "__todas__"}
                onValueChange={(v) => { setEquipoFiltro(!v || v === "__todas__" ? "" : v); setPage(1) }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {equipoFiltro ? nombreEquipoFiltro(equipoFiltro) : "Todas"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todas__">Todas</SelectItem>
                  {misEquipos.equipos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                  ))}
                  <SelectItem value="__none__">Globales</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          )}

          {/* Colección es multi-select, así que acá también son toggles y no un Select:
              un Select no puede decir "estas dos". */}
          {grupos.length > 0 && (
            <FilterField label="Colección">
              <div className="flex flex-wrap gap-1.5 text-xs">
                {grupos.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGrupo(g.id)}
                    aria-pressed={gruposSel.has(g.id)}
                    className={
                      "inline-flex cursor-pointer items-center rounded-full border px-2.5 py-1 font-medium transition-colors "
                      + (gruposSel.has(g.id)
                        ? "border-blue-500 bg-blue-100 text-blue-900"
                        : "border-gray-200 bg-white text-gray-600")
                    }
                  >
                    {g.nombre}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => toggleGrupo(TOKEN_SIN_GRUPO)}
                  aria-pressed={gruposSel.has(TOKEN_SIN_GRUPO)}
                  className={
                    "inline-flex cursor-pointer items-center rounded-full border border-dashed px-2.5 py-1 font-medium italic transition-colors "
                    + (gruposSel.has(TOKEN_SIN_GRUPO)
                      ? "border-gray-400 bg-gray-100 text-gray-900"
                      : "border-gray-200 bg-white text-gray-600")
                  }
                >
                  Sin colección
                </button>
              </div>
            </FilterField>
          )}

          <FilterField label="Tipo">
            <Select
              value={encabezadoFilter === undefined ? "__todas__" : String(encabezadoFilter)}
              onValueChange={(v) => {
                setEncabezadoFilter(!v || v === "__todas__" ? undefined : v === "true")
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {encabezadoFilter === undefined
                    ? "Todas"
                    : encabezadoFilter ? "Encabezado TG" : "Estándar"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas__">Todas</SelectItem>
                <SelectItem value="true">Encabezado TG</SelectItem>
                <SelectItem value="false">Estándar</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Uso">
            <Select
              value={usoFilter}
              onValueChange={(v) => {
                setUsoFilter((v || "todas") as UsoFiltro)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{USO_LABEL[usoFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="sin-uso">Sin uso</SelectItem>
                <SelectItem value="en-uso">En uso</SelectItem>
                {proyectoActivo && (
                  <SelectItem value="mi-proyecto">{USO_LABEL["mi-proyecto"]}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Revisión">
            <Select
              value={revisionFilter}
              onValueChange={(v) => {
                setRevisionFilter((v || "todas") as RevisionFiltro)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{REVISION_LABEL[revisionFilter]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="pendientes">Pendientes</SelectItem>
                <SelectItem value="revisadas">Revisadas</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </FiltersSheet>

        {/* Filtro por equipo dueño. Solo aparece cuando hay más de una opción: para el Admin
            de un equipo único no hay nada que elegir —ve el suyo y las globales— y el chip
            sería ruido. Es el eje "de quién es", distinto de los chips de grupo de abajo, que
            son "de qué tipo es".

            De acá hasta la tabla, todo es `hidden md:*`: en mobile lo reemplaza el Sheet. */}
        {misEquipos && (misEquipos.equipos.length > 1 || misEquipos.puedeElegirGlobales) && (
          <div className="hidden md:flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-muted-foreground">Equipo:</span>
            {[
              { id: "", nombre: "Todas" },
              ...misEquipos.equipos,
              { id: "__none__", nombre: "Globales" },
            ].map((opcion) => {
              const activo = equipoFiltro === opcion.id
              return (
                <button
                  key={opcion.id || "todas"}
                  type="button"
                  onClick={() => { setEquipoFiltro(opcion.id); setPage(1) }}
                  aria-pressed={activo}
                  className={
                    "inline-flex cursor-pointer items-center rounded-full border px-2 py-0.5 font-medium transition-colors "
                    + (activo
                      ? "border-blue-500 bg-blue-100 text-blue-900"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
                  }
                >
                  {opcion.nombre}
                </button>
              )
            })}
          </div>
        )}

        {/* Filtro chips por colección de planillas (PlanillaGrupo en el código). Multi-select ESTRICTO: cada chip
            agrega su ID al filtro. El chip "Sin grupo" (token "__none__") pide
            explícitamente las planillas comodín (sin grupo). Sin nada seleccionado
            = sin filtro (muestra todas). Reemplazó al filtro por especialidad, que
            no aportaba valor al no usarse (todas caían en "Genérica"). */}
        {grupos.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-muted-foreground mr-1">Colección:</span>
            {grupos.map((g) => {
              const activo = gruposSel.has(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGrupo(g.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                  style={
                    activo
                      ? { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#3b82f6" }
                      : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                  }
                  title={g.descripcion ?? g.nombre}
                >
                  {g.nombre}
                </button>
              )
            })}
            {/* Chip especial "Sin grupo" — matchea planillas comodín (que no
                están en ningún grupo activo). Se envía como token "__none__". */}
            {(() => {
              const activo = gruposSel.has(TOKEN_SIN_GRUPO)
              return (
                <button
                  type="button"
                  onClick={() => toggleGrupo(TOKEN_SIN_GRUPO)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed px-2 py-0.5 font-medium italic transition-colors cursor-pointer"
                  style={
                    activo
                      ? { backgroundColor: "#f3f4f6", color: "#111827", borderColor: "#9ca3af" }
                      : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                  }
                  title="Planillas sin colección asignada (comodín — visibles en todos los proyectos)"
                >
                  Sin colección
                </button>
              )
            })()}
            {gruposSel.size > 0 && (
              <button
                type="button"
                onClick={limpiarGrupos}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>
        )}

        {/* Dos ejes en una fila. "Tipo" es qué clase de planilla es (encabezado de Test
            Pack o estándar); "Uso" es si alguna tarea la usa. Antes el primero se llamaba
            "Uso", y con los dos juntos el nombre quedaba para el segundo. Los chips de cada
            grupo son mutuamente excluyentes; click en el activo lo deselecciona. */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-muted-foreground mr-1">Tipo:</span>
          {([
            { key: true, label: "Encabezado TG", activeColor: "#1d4ed8" },
            { key: false, label: "Estándar", activeColor: "#4b5563" },
          ] as const).map(({ key, label, activeColor }) => {
            const activo = encabezadoFilter === key
            return (
              <button
                key={String(key)}
                type="button"
                onClick={() => {
                  setEncabezadoFilter(activo ? undefined : key)
                  setPage(1)
                }}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                style={
                  activo
                    ? { backgroundColor: `${activeColor}22`, color: activeColor, borderColor: activeColor }
                    : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {label}
              </button>
            )
          })}

          <span className="ml-3 text-muted-foreground mr-1">Uso:</span>
          {([
            { key: "sin-uso", label: "Sin uso", activeColor: "#b45309", titulo: "Planillas que ninguna tarea usa — se pueden eliminar sin afectar nada" },
            { key: "en-uso", label: "En uso", activeColor: "#047857", titulo: "Planillas que usa al menos una tarea, en cualquier proyecto" },
            // Sólo con proyecto seleccionado: sin él el backend contesta 400, y un chip
            // que siempre falla es peor que no tenerlo.
            ...(proyectoActivo
              ? [{
                  key: "mi-proyecto" as const,
                  label: "En este proyecto",
                  activeColor: "#1d4ed8",
                  titulo: `Planillas que usa alguna tarea de ${proyectoActivo.proyectoNombre ?? "el proyecto activo"}`,
                }]
              : []),
          ] as const).map(({ key, label, activeColor, titulo }) => {
            const activo = usoFilter === key
            return (
              <button
                key={key}
                type="button"
                title={titulo}
                onClick={() => {
                  setUsoFilter(activo ? "todas" : key)
                  setPage(1)
                }}
                aria-pressed={activo}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                style={
                  activo
                    ? { backgroundColor: `${activeColor}22`, color: activeColor, borderColor: activeColor }
                    : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {label}
              </button>
            )
          })}

          <span className="ml-3 text-muted-foreground mr-1">Revisión:</span>
          {([
            { key: "pendientes", label: "Pendientes", activeColor: "#b45309", titulo: "Sin tilde, o modificadas después de revisar" },
            { key: "revisadas", label: "Revisadas", activeColor: "#047857", titulo: "Con tilde y sin cambios desde entonces" },
          ] as const).map(({ key, label, activeColor, titulo }) => {
            const activo = revisionFilter === key
            return (
              <button
                key={key}
                type="button"
                title={titulo}
                onClick={() => {
                  setRevisionFilter(activo ? "todas" : key)
                  setPage(1)
                }}
                aria-pressed={activo}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium transition-colors cursor-pointer"
                style={
                  activo
                    ? { backgroundColor: `${activeColor}22`, color: activeColor, borderColor: activeColor }
                    : { backgroundColor: "white", color: "#6b7280", borderColor: "#e5e7eb" }
                }
              >
                {label}
              </button>
            )
          })}

          {(encabezadoFilter !== undefined || usoFilter !== "todas" || revisionFilter !== "todas") && (
            <button
              type="button"
              onClick={() => {
                setEncabezadoFilter(undefined)
                setUsoFilter("todas")
                setRevisionFilter("todas")
                setPage(1)
              }}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3 w-3" /> Limpiar
            </button>
          )}
        </div>

        {/* Tarjetas (solo mobile).

            Qué entra y qué no: el código y el nombre identifican la planilla; el badge de
            uso es lo que se vino a mirar; equipo y colecciones explican por qué aparece o
            no en un proyecto. La descripción y la fecha quedaron afuera — en 360px de ancho
            empujan el resto fuera de la pantalla y no son lo que se busca en un listado.

            El nombre linkea al diseñador, como la fila del desktop, y las acciones son el
            mismo menú. */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : (data?.data ?? []).length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              No se encontraron planillas.
            </div>
          ) : (
            (data?.data ?? []).map((p) => (
              <div key={p.id} className="rounded-lg border bg-white p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/configuracion/planillas/${p.id}`} className="min-w-0 flex-1">
                    <p className="font-medium text-blue-700 wrap-break-word">{p.nombre}</p>
                    {p.codigo && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground truncate">
                        {p.codigo}
                      </p>
                    )}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <UsoBadge cantidad={p.cantidadTareas} />
                    <RevisionCheck planilla={p} />
                  </span>
                </div>

                {/* Con los dos flags apagados esta fila no tiene nada que mostrar, y un div
                    vacío igual se lleva su margen del space-y: la tarjeta queda con un
                    hueco que parece un badge que no cargó. */}
                {(hayEquipos || hayColecciones) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hayEquipos && <EquipoBadge planilla={p} />}
                    {hayColecciones && <ColeccionesBadges planilla={p} />}
                  </div>
                )}

                <div className="flex justify-end border-t pt-2">
                  <RowActions planilla={p} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabla (solo desktop) */}
        <div className="hidden md:block">
        <DataTableWrapper isFetching={isFetching && !isLoading}>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} className="font-semibold text-gray-700">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columnasVisibles.length} className="text-center py-10 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnasVisibles.length} className="text-center py-10 text-muted-foreground">
                    No se encontraron planillas.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataTableWrapper>
        </div>

        {/* Total + Paginación. En mobile va en dos líneas: el total arriba y los botones
            abajo, a lo ancho, que es lo que los hace tocables con el pulgar. */}
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {data?.total ?? 0} planillas en total
            {conteoTodas && conteoRevisadas && conteoTodas.total > 0 && (
              <span className="ml-2 text-emerald-700" title="Con tilde y sin cambios desde entonces, sobre los filtros actuales">
                · {conteoRevisadas.total} de {conteoTodas.total} revisadas
              </span>
            )}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="whitespace-nowrap">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
