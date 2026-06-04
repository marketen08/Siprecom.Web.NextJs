"use client"

import { useState } from "react"
import {
  AlertTriangle, ArrowLeft, Box, ChevronRight, Cloud, Folder, FolderOpen,
  Link2, Loader2, RefreshCw, Unlink,
} from "lucide-react"

import {
  startApsLogin,
  useApsDisconnect,
  useApsFolderContents,
  useApsHubs,
  useApsImportar,
  useApsProjects,
  useApsStatus,
} from "../api/use-aps"
import type {
  ApsFolderItem,
  ApsHub,
  ApsProject,
} from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  proyectoId: string
  open: boolean
  onClose: () => void
}

// Niveles de browse: hub → project → folder(s) → archivo seleccionado.
interface BreadcrumbItem { tipo: "hub" | "project" | "folder"; id: string; nombre: string }

/**
 * Sheet de browse y selección de un archivo IFC desde Autodesk Construction
 * Cloud / BIM 360. Si el usuario no está conectado a APS, muestra CTA para
 * iniciar OAuth. Si está conectado, hace browse jerárquico de hubs → projects
 * → carpetas → archivos y permite importar el IFC seleccionado.
 */
export function ImportarDesdeApsSheet({ proyectoId, open, onClose }: Props) {
  const status = useApsStatus()
  const conectado = status.data?.data?.conectado ?? false

  const [hubId, setHubId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  // Hub seleccionado para resolver topFolder
  const [topFolderId, setTopFolderId] = useState<string | null>(null)
  // Stack de carpetas para navegación (último elemento = carpeta actual)
  const [folderStack, setFolderStack] = useState<{ id: string; nombre: string }[]>([])
  // Archivo seleccionado para importar
  const [seleccionado, setSeleccionado] = useState<ApsFolderItem | null>(null)
  const [nombreImport, setNombreImport] = useState("")
  const [disciplina, setDisciplina] = useState("")
  const [marcarPrincipal, setMarcarPrincipal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hubs = useApsHubs(open && conectado && !hubId)
  const projects = useApsProjects(hubId)
  const folderId = folderStack[folderStack.length - 1]?.id ?? topFolderId
  const folderContents = useApsFolderContents(projectId, folderId)

  const disconnect = useApsDisconnect()
  const importar = useApsImportar()

  function reset() {
    setHubId(null); setProjectId(null); setTopFolderId(null)
    setFolderStack([]); setSeleccionado(null)
    setNombreImport(""); setDisciplina(""); setMarcarPrincipal(false)
    setError(null)
  }

  function close() {
    if (importar.isPending) return
    reset()
    onClose()
  }

  function selectHub(h: ApsHub) {
    setHubId(h.id)
    setProjectId(null); setTopFolderId(null); setFolderStack([])
  }

  function selectProject(p: ApsProject) {
    setProjectId(p.id)
    setTopFolderId(p.topFolderId)
    setFolderStack([])
  }

  function enterFolder(f: ApsFolderItem) {
    setFolderStack((s) => [...s, { id: f.id, nombre: f.nombre }])
  }

  function up() {
    setFolderStack((s) => s.slice(0, -1))
  }

  function back() {
    if (seleccionado) { setSeleccionado(null); return }
    if (folderStack.length > 0) { up(); return }
    if (projectId) { setProjectId(null); setTopFolderId(null); return }
    if (hubId) { setHubId(null); return }
  }

  async function confirmarImport() {
    if (!seleccionado || !seleccionado.latestVersionId || !hubId || !projectId) return
    setError(null)
    try {
      await importar.mutateAsync({
        proyectoId,
        hubId,
        projectId,
        itemId: seleccionado.id,
        versionId: seleccionado.latestVersionId,
        nombre: nombreImport.trim() || undefined,
        disciplina: disciplina.trim() || undefined,
        marcarComoPrincipal: marcarPrincipal,
      })
      reset()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const breadcrumb: BreadcrumbItem[] = [
    ...(hubId
      ? [{ tipo: "hub" as const, id: hubId, nombre: hubs.data?.data?.find((h) => h.id === hubId)?.nombre ?? "Hub" }]
      : []),
    ...(projectId
      ? [{ tipo: "project" as const, id: projectId, nombre: projects.data?.data?.find((p) => p.id === projectId)?.nombre ?? "Proyecto" }]
      : []),
    ...folderStack.map((f) => ({ tipo: "folder" as const, id: f.id, nombre: f.nombre })),
  ]

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full sm:max-w-lg! overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-blue-600" />
            Importar desde Autodesk
          </SheetTitle>
          <SheetDescription>
            Navegá Construction Cloud / BIM 360 y elegí el IFC para importar al proyecto.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 mt-4 space-y-3">
          {!conectado ? (
            <ConectarPanel onConnect={() => startApsLogin(window.location.href)} />
          ) : (
            <>
              {/* Header con estado conexión + breadcrumb + back */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1 text-gray-500">
                  <Cloud className="h-3 w-3 text-emerald-600" /> Conectado
                </div>
                <button
                  type="button"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                  className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-1"
                >
                  <Unlink className="h-3 w-3" /> Desconectar
                </button>
              </div>

              {(hubId || projectId) && (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" /> Volver
                </button>
              )}

              {breadcrumb.length > 0 && (
                <nav className="flex items-center gap-1 text-xs text-gray-600 flex-wrap">
                  {breadcrumb.map((b, i) => (
                    <span key={`${b.tipo}-${b.id}`} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                      <span>{b.nombre}</span>
                    </span>
                  ))}
                </nav>
              )}

              {/* Lista según el nivel actual */}
              {seleccionado ? (
                <ConfirmarImportPanel
                  archivo={seleccionado}
                  nombre={nombreImport}
                  disciplina={disciplina}
                  marcarPrincipal={marcarPrincipal}
                  onNombre={setNombreImport}
                  onDisciplina={setDisciplina}
                  onMarcarPrincipal={setMarcarPrincipal}
                  onCancel={() => setSeleccionado(null)}
                  onConfirm={confirmarImport}
                  loading={importar.isPending}
                  error={error}
                />
              ) : !hubId ? (
                <ListaHubs
                  hubs={hubs.data?.data ?? []}
                  loading={hubs.isFetching}
                  onSelect={selectHub}
                />
              ) : !projectId ? (
                <ListaProyectos
                  projects={projects.data?.data ?? []}
                  loading={projects.isFetching}
                  onSelect={selectProject}
                />
              ) : (
                <ListaCarpeta
                  items={folderContents.data?.data ?? []}
                  loading={folderContents.isFetching}
                  onEnterFolder={enterFolder}
                  onSelectArchivo={(it) => {
                    setSeleccionado(it)
                    setNombreImport(it.nombre)
                  }}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sub-panels ────────────────────────────────────────────────────────────

function ConectarPanel({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <p className="text-sm text-blue-900">
        Para importar archivos, conectá tu cuenta de Autodesk. Vamos a redirigirte
        al login de Autodesk para que autorices el acceso de Siprecom a tus hubs.
      </p>
      <Button onClick={onConnect} className="gap-2 w-full">
        <Link2 className="h-4 w-4" /> Conectar con Autodesk
      </Button>
    </div>
  )
}

function ListaHubs({ hubs, loading, onSelect }: { hubs: ApsHub[]; loading: boolean; onSelect: (h: ApsHub) => void }) {
  if (loading) return <Cargando texto="Cargando hubs…" />
  if (hubs.length === 0) return <Vacio texto="No tenés hubs accesibles. ¿La APS app fue aprobada en el ACC del cliente?" />
  return (
    <ul className="border rounded-md divide-y">
      {hubs.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            onClick={() => onSelect(h)}
            className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-blue-50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Cloud className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-sm truncate">{h.nombre}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function ListaProyectos({ projects, loading, onSelect }: { projects: ApsProject[]; loading: boolean; onSelect: (p: ApsProject) => void }) {
  if (loading) return <Cargando texto="Cargando proyectos…" />
  if (projects.length === 0) return <Vacio texto="Este hub no tiene proyectos." />
  return (
    <ul className="border rounded-md divide-y max-h-96 overflow-y-auto">
      {projects.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p)}
            className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-blue-50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm truncate">{p.nombre}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function ListaCarpeta({
  items, loading, onEnterFolder, onSelectArchivo,
}: {
  items: ApsFolderItem[]
  loading: boolean
  onEnterFolder: (f: ApsFolderItem) => void
  onSelectArchivo: (f: ApsFolderItem) => void
}) {
  if (loading) return <Cargando texto="Cargando contenido…" />

  const carpetas = items.filter((i) => i.tipo === "folder")
  const archivos = items.filter((i) => i.tipo === "item")

  if (items.length === 0) return <Vacio texto="Esta carpeta está vacía." />

  return (
    <ul className="border rounded-md divide-y max-h-96 overflow-y-auto">
      {carpetas.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onEnterFolder(c)}
            className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-blue-50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm truncate">{c.nombre}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </li>
      ))}
      {archivos.map((a) => {
        const esIfc = a.extension === ".ifc"
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => esIfc && onSelectArchivo(a)}
              disabled={!esIfc}
              className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 ${
                esIfc ? "hover:bg-blue-50" : "opacity-50 cursor-not-allowed"
              }`}
              title={esIfc ? "Importar este IFC" : `Solo IFC se puede importar (este es ${a.extension ?? "sin extensión"})`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Box className={`h-4 w-4 shrink-0 ${esIfc ? "text-blue-600" : "text-gray-400"}`} />
                <span className="text-sm truncate">{a.nombre}</span>
              </div>
              {esIfc && <span className="text-xs text-emerald-700 font-medium shrink-0">IFC</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ConfirmarImportPanel({
  archivo, nombre, disciplina, marcarPrincipal,
  onNombre, onDisciplina, onMarcarPrincipal, onCancel, onConfirm, loading, error,
}: {
  archivo: ApsFolderItem
  nombre: string
  disciplina: string
  marcarPrincipal: boolean
  onNombre: (v: string) => void
  onDisciplina: (v: string) => void
  onMarcarPrincipal: (v: boolean) => void
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        Vas a importar <strong>{archivo.nombre}</strong> al proyecto. Cuando termine
        la descarga, el IFC se procesa con xbim como cualquier upload manual.
      </div>

      <div>
        <label className="text-sm font-medium">Nombre del IFC en Siprecom</label>
        <Input value={nombre} onChange={(e) => onNombre(e.target.value)} className="mt-1" maxLength={500} />
      </div>

      <div>
        <label className="text-sm font-medium">Disciplina</label>
        <Input
          value={disciplina}
          onChange={(e) => onDisciplina(e.target.value)}
          className="mt-1"
          placeholder="Eléctrico, Mecánico, …"
          maxLength={100}
        />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={marcarPrincipal}
          onChange={(e) => onMarcarPrincipal(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span>Marcar como IFC principal del proyecto</span>
      </label>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="whitespace-pre-wrap">{error}</span>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button onClick={onConfirm} disabled={loading} className="flex-1 gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {loading ? "Importando…" : "Importar"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  )
}

function Cargando({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
      <Loader2 className="h-4 w-4 animate-spin" /> {texto}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div className="text-xs text-muted-foreground italic py-4 text-center px-4">{texto}</div>
  )
}
