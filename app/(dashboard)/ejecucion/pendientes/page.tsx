"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Lock, MapPin, Plus, Search } from "lucide-react"

import { useSearchPendientes } from "@/features/pendientes/api/use-search-pendientes"
import {
  useGetPendienteCategorias, useGetPendienteEstados, useGetPendienteTipos,
} from "@/features/pendientes/api/use-catalogos"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetPids } from "@/features/pids/api/use-get-pids"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import {
  ESTADO_COLOR, ESTADO_LABEL, PRIORIDAD, PRIORIDAD_COLOR,
} from "@/features/pendientes/types"
import { useNewPendiente } from "@/features/pendientes/hooks/use-new-pendiente"
import { useCanWrite, useMeetsRole } from "@/lib/use-roles"
import { useOpenPendiente } from "@/features/pendientes/hooks/use-open-pendiente"
import { NewPendienteSheet } from "@/features/pendientes/components/new-pendiente-sheet"
import { PendienteDetalleSheet } from "@/features/pendientes/components/pendiente-detalle-sheet"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import {
  FiltersTrigger, FiltersChips, FiltersSheet, FilterField, type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"
// Estado especial "todos los abiertos" — se traduce a `soloAbiertos: true` en el
// filtro del backend. Es el valor default del select de Estado.
const OPEN = "__open__"

// El default export envuelve en <Suspense> — obligatorio en Next 16 cuando el
// componente usa useSearchParams (que hace client-side bailout durante el
// pre-render estático).
export default function PendientesPage() {
  return (
    <Suspense>
      <PendientesPageContent />
    </Suspense>
  )
}

function PendientesPageContent() {
  const searchParams = useSearchParams()

  // Estado inicial se lee de la URL para que un link compartido reabra la
  // misma vista. Sin `?estado=` en la URL, arranca en "Todos los abiertos".
  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const [sistemaId, setSistemaId] = useState(searchParams.get("sistemaId") ?? "")
  const [subSistemaId, setSubSistemaId] = useState(searchParams.get("subSistemaId") ?? "")
  const [elementoId, setElementoId] = useState(searchParams.get("elementoId") ?? "")
  const [especialidadId, setEspecialidadId] = useState(searchParams.get("especialidadId") ?? "")
  const [pidArchivoId, setPidArchivoId] = useState(searchParams.get("pidArchivoId") ?? "")
  const [estadoSel, setEstadoSel] = useState<string>(searchParams.get("estado") ?? OPEN)
  const [responsableId, setResponsableId] = useState(searchParams.get("responsableId") ?? "")
  const [grupoResponsableId, setGrupoResponsableId] = useState(searchParams.get("grupoResponsableId") ?? "")
  const [categoriaId, setCategoriaId] = useState(searchParams.get("categoriaId") ?? "")
  const [tipoId, setTipoId] = useState(searchParams.get("tipoId") ?? "")
  const [prioridad, setPrioridad] = useState(searchParams.get("prioridad") ?? "")
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1") || 1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const pageSize = 20

  const { open: openNew } = useNewPendiente()
  const canWrite = useCanWrite()
  const isSupervisorOrAbove = useMeetsRole("Supervisor")
  const openDetalle = useOpenPendiente((s) => s.open)
  const openIdEnStore = useOpenPendiente((s) => (s.isOpen ? s.id : null))

  // Sincronización con la URL: `?id=<pendienteId>` refleja qué pendiente está
  // abierto en el sheet. Sirve para compartir el link y volver al mismo estado.
  // `?scope=mine|all` refleja el tab activo (Míos / Todos).
  // El resto de los filtros también se serializan en la URL para que un link
  // compartido reabra la misma vista.
  const router = useRouter()
  const pathname = usePathname()
  const idEnUrl = searchParams.get("id")
  const scopeEnUrl = searchParams.get("scope") // "mine" | "all" | null

  // Tab de scope. Default por rol: User/Consultor/Auditor arrancan en "mine";
  // Supervisor y superior arrancan en "all". Los defaults corren SOLO cuando la
  // URL no trae `?scope=` explícito — así un link compartido "?scope=all"
  // funciona para cualquier rol.
  const [scope, setScope] = useState<"mine" | "all">(() =>
    scopeEnUrl === "mine" || scopeEnUrl === "all" ? scopeEnUrl : (isSupervisorOrAbove ? "all" : "mine"),
  )

  // Si al montar todavía no sabíamos el rol (roles llegan del store con
  // hydration guard) y ahora sí, re-aplicamos el default cuando no hay `?scope=`
  // en la URL. Evita el flash "Todos" en User mientras carga los roles.
  const scopeInitFromRoleRef = useRef(false)
  useEffect(() => {
    if (scopeInitFromRoleRef.current) return
    if (scopeEnUrl === "mine" || scopeEnUrl === "all") { scopeInitFromRoleRef.current = true; return }
    const defaultScope: "mine" | "all" = isSupervisorOrAbove ? "all" : "mine"
    setScope(defaultScope)
    scopeInitFromRoleRef.current = true
  }, [isSupervisorOrAbove, scopeEnUrl])

  // (1) Al montar / cambiar el `?id=`, si el store no tiene ese pendiente abierto
  //     lo abrimos. Guard con ref para evitar re-abrir cuando el user cerró el
  //     sheet manualmente pero el `?id=` sigue en la URL hasta que actualicemos.
  const lastSyncedFromUrlRef = useRef<string | null>(null)
  useEffect(() => {
    if (!idEnUrl) return
    if (openIdEnStore === idEnUrl) return
    if (lastSyncedFromUrlRef.current === idEnUrl) return
    lastSyncedFromUrlRef.current = idEnUrl
    openDetalle(idEnUrl)
  }, [idEnUrl, openIdEnStore, openDetalle])

  // (2) Cuando cambia el `id` abierto en el store, reflejamos en la URL. Usamos
  //     `router.replace` (no push) para no llenar el history con cada apertura
  //     de pendiente — solo queda la URL final visible.
  useEffect(() => {
    if (openIdEnStore === idEnUrl) return
    const params = new URLSearchParams(searchParams.toString())
    if (openIdEnStore) params.set("id", openIdEnStore)
    else params.delete("id")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [openIdEnStore, idEnUrl, pathname, router, searchParams])

  // (3) Sync scope → URL.
  useEffect(() => {
    if (scope === scopeEnUrl) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("scope", scope)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [scope, scopeEnUrl, pathname, router, searchParams])

  // (4) Sync todos los filtros de listado → URL. Los defaults se OMITEN de la
  // querystring para que un URL "/ejecucion/pendientes" quede limpio. Solo se
  // escriben los params que difieren del default (search vacío, estado=OPEN,
  // page=1, otros vacíos).
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    // Búsqueda + filtros de select
    setOrDelete(params, "search", search)
    setOrDelete(params, "sistemaId", sistemaId)
    setOrDelete(params, "subSistemaId", subSistemaId)
    setOrDelete(params, "elementoId", elementoId)
    setOrDelete(params, "especialidadId", especialidadId)
    setOrDelete(params, "pidArchivoId", pidArchivoId)
    setOrDelete(params, "responsableId", responsableId)
    setOrDelete(params, "grupoResponsableId", grupoResponsableId)
    setOrDelete(params, "categoriaId", categoriaId)
    setOrDelete(params, "tipoId", tipoId)
    setOrDelete(params, "prioridad", prioridad)
    // Estado: OPEN es default → no lo serializamos.
    if (estadoSel === OPEN) params.delete("estado")
    else params.set("estado", estadoSel)
    // Page: 1 es default → no lo serializamos.
    if (page === 1) params.delete("page")
    else params.set("page", String(page))

    const qs = params.toString()
    const target = qs ? `${pathname}?${qs}` : pathname
    // Solo replace si realmente cambia — evita loops en el effect de scope/id.
    const current = searchParams.toString()
    if (current !== qs) router.replace(target, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sistemaId, subSistemaId, elementoId, especialidadId, pidArchivoId, estadoSel, responsableId, grupoResponsableId, categoriaId, tipoId, prioridad, page])

  const { data: perfil } = useGetPerfil()
  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: estadosRaw } = useGetPendienteEstados()
  const { data: categoriasRaw } = useGetPendienteCategorias()
  const { data: tiposRaw } = useGetPendienteTipos()
  const { data: usuariosRaw } = useGetProyectoUsuarios(perfil?.proyectoId ?? null)
  // Solo grupos declarados para uso en Pendientes — mismo criterio que el form
  // de alta y la matriz de autorización.
  const { data: gruposResp } = useGetUsuariosGrupos("pendientes")

  const sistemas = sistemasRaw?.data ?? []
  const subSistemas = subSistemasRaw?.data ?? []
  const estados = estadosRaw?.data ?? []
  const categorias = categoriasRaw?.data ?? []
  const tipos = tiposRaw?.data ?? []
  const usuarios = usuariosRaw ?? []
  const gruposResponsables = gruposResp?.data ?? []

  const subSistemasFiltrados = useMemo(
    () => (sistemaId ? subSistemas.filter((ss) => ss.sistemaId === sistemaId) : subSistemas),
    [subSistemas, sistemaId],
  )

  // Traducción del estado seleccionado a los filtros del backend:
  //  - OPEN  → soloAbiertos: true, estadoId: undefined
  //  - ALL   → ambos undefined (todos los estados)
  //  - <id>  → estadoId: <id>, soloAbiertos: undefined
  const estadoIdFilter = estadoSel !== OPEN && estadoSel !== ALL ? estadoSel : undefined
  const soloAbiertosFilter = estadoSel === OPEN ? true : undefined

  const { data, isLoading } = useSearchPendientes({
    page,
    pageSize,
    filter: {
      search: search || undefined,
      sistemaId: sistemaId || undefined,
      subSistemaId: subSistemaId || undefined,
      elementoId: elementoId || undefined,
      especialidadId: especialidadId || undefined,
      pidArchivoId: pidArchivoId || undefined,
      estadoId: estadoIdFilter,
      responsableId: responsableId || undefined,
      grupoResponsableId: grupoResponsableId || undefined,
      categoriaId: categoriaId || undefined,
      tipoId: tipoId || undefined,
      prioridad: prioridad ? Number(prioridad) : undefined,
      soloAbiertos: soloAbiertosFilter,
      soloMios: scope === "mine" ? true : undefined,
    },
  })

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const items = data?.data ?? []

  function clearFiltros() {
    setSistemaId(""); setSubSistemaId(""); setElementoId(""); setEspecialidadId("")
    setPidArchivoId("")
    setEstadoSel(OPEN); setResponsableId(""); setGrupoResponsableId("")
    setCategoriaId(""); setTipoId(""); setPrioridad("")
    setPage(1)
  }

  // Chip del filtro por elemento (viene por URL desde la maqueta 3D u otros
  // enlaces). Necesitamos el TAG para mostrarlo — lo pedimos con el hook cuando
  // hay elementoId.
  const { data: elementoFiltroRaw } = useGetElemento(elementoId || null)
  const elementoFiltro = elementoFiltroRaw?.data

  // Catálogos para los selects nuevos.
  const { data: especialidadesRaw } = useGetEspecialidades()
  const especialidades = especialidadesRaw?.data ?? []

  const { data: pidsRaw } = useGetPids()
  const pids = pidsRaw?.data ?? []

  // Lista de elementos para el Combobox — respeta subsistema y especialidad
  // ya seleccionados. pageSize=500 como en el form del pendiente.
  const { data: elementosRaw } = useGetElementos({
    page: 1,
    pageSize: 500,
    subSistemaId: subSistemaId || undefined,
    especialidadId: especialidadId || undefined,
  })
  const elementos = elementosRaw?.data ?? []

  const elementoOptions = useMemo(
    () => [
      { value: "", label: "Cualquier elemento" },
      ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
    ],
    [elementos],
  )

  function handleSistemaChange(v: string | null) {
    const id = !v || v === ALL ? "" : v
    setSistemaId(id)
    if (id && subSistemaId) {
      const ss = subSistemas.find((s) => s.id === subSistemaId)
      if (ss?.sistemaId !== id) setSubSistemaId("")
    }
    setPage(1)
  }

  // Chips
  const activeFilters: FilterChip[] = []
  if (sistemaId) {
    const s = sistemas.find((x) => x.id === sistemaId)
    activeFilters.push({ id: "sistema", label: `Sistema: ${s?.nombre ?? "—"}`, onRemove: () => { setSistemaId(""); setSubSistemaId(""); setPage(1) } })
  }
  if (subSistemaId) {
    const ss = subSistemas.find((x) => x.id === subSistemaId)
    activeFilters.push({ id: "subsistema", label: `Subsistema: ${ss?.nombre ?? "—"}`, onRemove: () => { setSubSistemaId(""); setPage(1) } })
  }
  if (elementoId) {
    activeFilters.push({
      id: "elemento",
      label: `Elemento: ${elementoFiltro?.tag ?? "…"}`,
      onRemove: () => { setElementoId(""); setPage(1) },
    })
  }
  if (especialidadId) {
    const e = especialidades.find((x) => x.id === especialidadId)
    activeFilters.push({
      id: "especialidad",
      label: `Especialidad: ${e?.nombre ?? "—"}`,
      onRemove: () => { setEspecialidadId(""); setPage(1) },
    })
  }
  if (pidArchivoId) {
    const pid = pids.find((x) => x.id === pidArchivoId)
    activeFilters.push({
      id: "pidArchivo",
      label: `PID: ${pid?.codigo ?? "…"}`,
      onRemove: () => { setPidArchivoId(""); setPage(1) },
    })
  }
  // Chip para el Estado: solo aparece si el user eligió algo distinto al default
  // "Todos los abiertos" (OPEN). Muestra label distinto según el caso.
  if (estadoSel === ALL) {
    activeFilters.push({
      id: "estado",
      label: "Estado: Todos (incluye cerrados)",
      onRemove: () => { setEstadoSel(OPEN); setPage(1) },
    })
  } else if (estadoSel !== OPEN) {
    const e = estados.find((x) => x.id === estadoSel)
    activeFilters.push({
      id: "estado",
      label: `Estado: ${ESTADO_LABEL[e?.estado ?? ""] ?? e?.estado}`,
      onRemove: () => { setEstadoSel(OPEN); setPage(1) },
    })
  }
  if (responsableId) {
    const u = usuarios.find((x) => x.usuarioId === responsableId)
    activeFilters.push({ id: "responsable", label: `Responsable: ${u?.userName ?? "—"}`, onRemove: () => { setResponsableId(""); setPage(1) } })
  }
  if (grupoResponsableId) {
    const g = gruposResponsables.find((x) => x.id === grupoResponsableId)
    activeFilters.push({ id: "grupo-responsable", label: `Grupo: ${g?.nombre ?? "—"}`, onRemove: () => { setGrupoResponsableId(""); setPage(1) } })
  }
  if (categoriaId) {
    const c = categorias.find((x) => x.id === categoriaId)
    activeFilters.push({ id: "categoria", label: `Categoría: ${c?.nombre ?? "—"}`, onRemove: () => { setCategoriaId(""); setPage(1) } })
  }
  if (tipoId) {
    const t = tipos.find((x) => x.id === tipoId)
    activeFilters.push({ id: "tipo", label: `Tipo: ${t?.tipo ?? "—"}`, onRemove: () => { setTipoId(""); setPage(1) } })
  }
  if (prioridad) {
    activeFilters.push({ id: "prioridad", label: `Prioridad: ${PRIORIDAD[Number(prioridad)] ?? "—"}`, onRemove: () => { setPrioridad(""); setPage(1) } })
  }

  return (
    <>
      <NewPendienteSheet wide />
      <PendienteDetalleSheet wide />

      <div className="space-y-3">
        <h1 className="text-lg font-semibold">Listado de pendientes</h1>

        {/* Fila: tabs (Míos/Todos) a la izquierda + buscador y acciones a la derecha.
            Default por rol: User/Consultor/Auditor arrancan en "Míos" (creador o
            responsable); Supervisor+ arranca en "Todos". El link `?scope=` en la URL
            sobrescribe el default. */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="inline-flex items-center rounded-md border bg-muted p-0.5 self-start">
            <button
              type="button"
              onClick={() => { setScope("mine"); setPage(1) }}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
                scope === "mine"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={scope === "mine"}
            >
              Míos
            </button>
            <button
              type="button"
              onClick={() => { setScope("all"); setPage(1) }}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors cursor-pointer ${
                scope === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={scope === "all"}
            >
              Todos
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descripción o TAG..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 h-9"
              />
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/ejecucion/pids" title="Abrir visor de PIDs">
                <MapPin className="h-4 w-4 text-blue-700" />
                <span className="hidden sm:inline">Ver PIDs</span>
              </Link>
            </Button>
            <FiltersTrigger
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              activeCount={activeFilters.length}
            />
            {canWrite && (
              <Button onClick={() => openNew()} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuevo pendiente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </div>

        <FiltersChips activeFilters={activeFilters} onClearAll={clearFiltros} />

        <FiltersSheet
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          onClearAll={clearFiltros}
          hasActiveFilters={activeFilters.length > 0}
        >
          <FilterField label="Estado">
            <Select
              value={estadoSel}
              onValueChange={(v) => { setEstadoSel(v ?? OPEN); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(() => {
                    if (estadoSel === OPEN) return "Todos los abiertos"
                    if (estadoSel === ALL) return "Todos (incluye cerrados)"
                    const e = estados.find((x) => x.id === estadoSel)
                    return ESTADO_LABEL[e?.estado ?? ""] ?? e?.estado ?? "Estado"
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OPEN}>Todos los abiertos</SelectItem>
                <SelectItem value={ALL}>Todos (incluye cerrados)</SelectItem>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{ESTADO_LABEL[e.estado] ?? e.estado}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Responsable">
            <Select value={responsableId || ALL} onValueChange={(v) => { const value = v ?? ALL; setResponsableId(value === ALL ? "" : value); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {responsableId
                    ? usuarios.find((u) => u.usuarioId === responsableId)?.userName ?? "Responsable"
                    : "Cualquiera"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Cualquiera</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.usuarioId} value={u.usuarioId}>{u.userName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Grupo responsable">
            <Select value={grupoResponsableId || ALL} onValueChange={(v) => { const value = v ?? ALL; setGrupoResponsableId(value === ALL ? "" : value); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {grupoResponsableId
                    ? gruposResponsables.find((g) => g.id === grupoResponsableId)?.nombre ?? "Grupo"
                    : "Cualquiera"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Cualquiera</SelectItem>
                {gruposResponsables.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Sistema">
            <Select value={sistemaId || ALL} onValueChange={handleSistemaChange}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {sistemaId ? sistemas.find((s) => s.id === sistemaId)?.nombre ?? "Sistema" : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {sistemas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Subsistema">
            <Select
              value={subSistemaId || ALL}
              onValueChange={(v) => { setSubSistemaId(v === ALL ? "" : (v ?? "")); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {subSistemaId
                    ? subSistemas.find((ss) => ss.id === subSistemaId)?.nombre ?? "Subsistema"
                    : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {subSistemasFiltrados.map((ss) => (
                  <SelectItem key={ss.id} value={ss.id}>{ss.codigo} — {ss.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Elemento">
            <Combobox
              options={elementoOptions}
              value={elementoId}
              onChange={(v) => { setElementoId(v ?? ""); setPage(1) }}
              placeholder="Cualquier elemento"
              searchPlaceholder="Buscar por TAG o nombre..."
              emptyMessage="Sin resultados"
            />
          </FilterField>

          <FilterField label="Especialidad">
            <Select
              value={especialidadId || ALL}
              onValueChange={(v) => { const value = v ?? ALL; setEspecialidadId(value === ALL ? "" : value); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {especialidadId
                    ? especialidades.find((x) => x.id === especialidadId)?.nombre ?? "Especialidad"
                    : "Todas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {especialidades.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="PID">
            <Select
              value={pidArchivoId || ALL}
              onValueChange={(v) => { const value = v ?? ALL; setPidArchivoId(value === ALL ? "" : value); setPage(1) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {pidArchivoId
                    ? pids.find((x) => x.id === pidArchivoId)?.codigo ?? "PID"
                    : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {pids.map((pid) => (
                  <SelectItem key={pid.id} value={pid.id}>{pid.codigo} — {pid.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Categoría">
            <Select value={categoriaId || ALL} onValueChange={(v) => { const value = v ?? ALL; setCategoriaId(value === ALL ? "" : value); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {categoriaId ? categorias.find((c) => c.id === categoriaId)?.nombre ?? "Categoría" : "Todas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Tipo">
            <Select value={tipoId || ALL} onValueChange={(v) => { const value = v ?? ALL; setTipoId(value === ALL ? "" : value); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {tipoId ? tipos.find((t) => t.id === tipoId)?.tipo ?? "Tipo" : "Todos"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Prioridad">
            <Select value={prioridad || ALL} onValueChange={(v) => { const value = v ?? ALL; setPrioridad(value === ALL ? "" : value); setPage(1) }}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {prioridad ? PRIORIDAD[Number(prioridad)] : "Todas"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {Object.entries(PRIORIDAD).map(([id, nombre]) => (
                  <SelectItem key={id} value={id}>{nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

        </FiltersSheet>

        {/* Cards (solo mobile) */}
        <div className="md:hidden space-y-2">
          {isLoading ? (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              No hay pendientes que coincidan con los filtros.
            </div>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border bg-white p-3 space-y-2 active:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => openDetalle(p.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-blue-700 inline-flex items-center gap-1">
                      {p.esInterno && (
                        <Lock
                          className="h-3 w-3 text-amber-700"
                          aria-label="Pendiente interno"
                        />
                      )}
                      {p.codigoFormateado}
                    </p>
                    <p className="text-sm font-medium line-clamp-2">{p.descripcion}</p>
                    {(p.subSistemaNombre || p.subSistemaCodigo) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {p.subSistemaNombre ?? p.subSistemaCodigo}
                      </p>
                    )}
                    {p.elementoTag && (
                      <p className="text-xs text-muted-foreground truncate font-mono">{p.elementoTag}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_COLOR[p.estadoNombre ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                      {ESTADO_LABEL[p.estadoNombre ?? ""] ?? p.estadoNombre}
                    </span>
                  </div>
                </div>
                {(p.responsableNombre || p.fechaCierreEstimado) && (
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground border-t pt-2">
                    <span className="truncate">{p.responsableNombre || "Sin responsable"}</span>
                    {p.fechaCierreEstimado && (
                      <span className="font-mono shrink-0">{p.fechaCierreEstimado}</span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Tabla (solo desktop) */}
        <div className="hidden md:block rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24 font-semibold text-gray-700">Código</TableHead>
                <TableHead className="font-semibold text-gray-700">Descripción</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700">Subsistema</TableHead>
                <TableHead className="w-32 font-semibold text-gray-700">Categoría</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700">Estado</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700">Responsable</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Cierre est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No hay pendientes que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => openDetalle(p.id)}
                  >
                    <TableCell className="font-mono text-sm text-blue-700">
                      <span className="inline-flex items-center gap-1">
                        {p.esInterno && (
                          <Lock
                            className="h-3 w-3 text-amber-700"
                            aria-label={p.grupoResponsableNombre
                              ? `Interno · ${p.grupoResponsableNombre}`
                              : "Interno"}
                          />
                        )}
                        {p.codigoFormateado}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2">{p.descripcion}</p>
                      {p.elementoTag && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-mono">{p.elementoTag}</span>
                          {p.elementoNombre ? ` — ${p.elementoNombre}` : ""}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.subSistemaNombre || p.subSistemaCodigo ? (
                        <>
                          <p className="text-sm text-gray-600">{p.subSistemaNombre ?? "—"}</p>
                          {p.subSistemaCodigo && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {p.subSistemaCodigo}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{p.categoriaNombre}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_COLOR[p.estadoNombre ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                        {ESTADO_LABEL[p.estadoNombre ?? ""] ?? p.estadoNombre}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{p.responsableNombre}</TableCell>
                    <TableCell className="text-sm font-mono text-gray-500">{p.fechaCierreEstimado}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Total + Paginación */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} pendientes en total</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <span>Página {page} de {totalPages}</span>
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

// Helper: setea el param si el valor está seteado, lo borra si es vacío.
// Evita `?foo=` (query string con clave sin valor) que se ve feo.
function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value)
  else params.delete(key)
}
