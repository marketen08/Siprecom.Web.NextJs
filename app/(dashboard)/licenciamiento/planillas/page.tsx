"use client"

import { useRef, useState } from "react"
import { Loader2, Download, Upload, AlertTriangle, CheckCircle2, FileJson, Trash2, RotateCcw } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  exportarTodasLasPlanillas,
  parseFileJson,
  useImportPlanillasAllPreview,
  useImportPlanillasAllApply,
  usePlanillasReferencias,
  usePlanillasNoUsadasPreview,
  useEliminarPlanillasNoUsadas,
  usePlanillasEliminadas,
  useReactivarPlanilla,
  type ImportModo,
} from "@/features/planillas/api/use-import-export"

const MODOS: { value: ImportModo; label: string; help: string; destructivo?: boolean }[] = [
  { value: "crear", label: "Crear (versionar si ya existe)", help: "Las que ya existen se importan como versión nueva (1.0-2, …)." },
  { value: "omitir", label: "Omitir las que ya existen", help: "Saltea las planillas con mismo código y versión." },
  { value: "reemplazar", label: "Reemplazar las que ya existen", help: "Pisa la definición existente. Falla si la planilla tiene registros cargados.", destructivo: true },
  { value: "eliminar-todas", label: "Eliminar TODAS y reimportar", help: "Borra todas las planillas de la base antes de importar. Falla si alguna tiene registros.", destructivo: true },
]

function badgeExistente(modo: ImportModo): string {
  switch (modo) {
    case "omitir": return "se omitirá"
    case "reemplazar": return "se reemplazará"
    case "eliminar-todas": return "se recreará"
    default: return "nueva versión"
  }
}

export default function PlanillasExportImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [modo, setModo] = useState<ImportModo>("omitir")

  const previewMut = useImportPlanillasAllPreview()
  const applyMut = useImportPlanillasAllApply()
  const referenciasQuery = usePlanillasReferencias()
  const bloquearDestructivos = referenciasQuery.data?.hayReferencias ?? false

  const preview = previewMut.data?.data
  const resultado = applyMut.data?.data
  const modoActual = MODOS.find((m) => m.value === modo)!

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)
    applyMut.reset()
    previewMut.reset()
    try {
      const json = await parseFileJson<unknown>(file)
      setData(json)
      previewMut.mutate(json)
    } catch (err) {
      setData(null)
      setParseError(err instanceof Error ? err.message : "Archivo inválido.")
    }
  }

  function reset() {
    setData(null)
    setFileName("")
    setParseError(null)
    previewMut.reset()
    applyMut.reset()
    if (fileRef.current) fileRef.current.value = ""
  }

  async function doApply() {
    if (data) await applyMut.mutateAsync({ data, modo })
  }

  const yaExistenCount = preview?.planillas.filter((p) => p.yaExiste).length ?? 0
  const aImportar = preview
    ? modo === "omitir"
      ? preview.totalPlanillas - yaExistenCount
      : preview.totalPlanillas
    : 0
  const applyLabel =
    modo === "eliminar-todas"
      ? `Eliminar todo e importar ${preview?.totalPlanillas ?? 0}`
      : `Importar ${aImportar} planilla(s)`

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <FileJson className="h-6 w-6 text-blue-700" />
          Exportar / Importar planillas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Migrá todas las planillas entre ambientes en un solo archivo JSON (incluye imágenes y tablas).
        </p>
      </div>

      {/* Export */}
      <Card className="p-6 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800">Exportar todas</h2>
          <p className="text-sm text-muted-foreground">
            Descarga un JSON con todas las planillas activas, sus campos, opciones, tablas e imágenes (base64).
          </p>
        </div>
        <Button onClick={exportarTodasLasPlanillas} className="gap-2">
          <Download className="h-4 w-4" /> Exportar todas las planillas
        </Button>
      </Card>

      {/* Limpieza de planillas no usadas */}
      <PlanillasNoUsadasCard />

      {/* Restauración de planillas soft-deleted */}
      <PlanillasEliminadasCard />

      {/* Import */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Importar</h2>
          <p className="text-sm text-muted-foreground">
            Subí un archivo exportado. Se previsualiza antes de aplicar. Los campos se reusan por código.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={onFile}
            className="hidden"
          />
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Elegir archivo
          </Button>
          {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
          {(data || parseError) && (
            <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
              Limpiar
            </Button>
          )}
        </div>

        {/* Modo de importación */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">Qué hacer con las que ya existen:</p>
          <div className="space-y-1">
            {MODOS.map((m) => {
              const bloqueado = !!m.destructivo && bloquearDestructivos
              return (
                <label
                  key={m.value}
                  className={`flex items-start gap-2 rounded-md px-1 py-0.5 ${bloqueado ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"}`}
                >
                  <input
                    type="radio"
                    name="modo-import"
                    className="mt-0.5 h-4 w-4"
                    checked={modo === m.value}
                    disabled={bloqueado}
                    onChange={() => setModo(m.value)}
                  />
                  <span className="text-sm">
                    <span className={m.destructivo ? "font-medium text-red-700" : "font-medium"}>{m.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {m.help}
                      {bloqueado ? " — Deshabilitado: hay tareas o registros que usan planillas." : ""}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{parseError}</p>
          </div>
        )}

        {previewMut.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Validando archivo…
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{preview.totalPlanillas}</strong> planilla(s) en el archivo
              {yaExistenCount > 0 && <span className="text-muted-foreground"> · {yaExistenCount} ya existe(n)</span>}.
            </p>
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {preview.planillas.map((p, i) => (
                <li
                  key={i}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    p.esAplicable ? "border-gray-200 bg-white" : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {p.nombre} <span className="font-mono text-gray-500">({p.codigoAplicar} v{p.versionAplicar})</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      {p.yaExiste && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            modo === "omitir" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {badgeExistente(modo)}
                        </span>
                      )}
                      {p.esAplicable ? (
                        <span className="text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      ) : (
                        <span className="text-destructive inline-flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Conflicto
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    Campos nuevos: {p.camposNuevos} · reusados: {p.camposReusados} · secciones: {p.seccionesACrear}
                  </p>
                  {p.conflictos
                    .filter((c) => c.severidad === "error")
                    .map((c, j) => (
                      <p key={j} className="text-destructive mt-0.5">{c.mensaje}</p>
                    ))}
                </li>
              ))}
            </ul>

            {modo === "eliminar-todas" && (
              <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Atención: se eliminarán <strong>TODAS</strong> las planillas de la base (no solo las del archivo)
                  antes de importar. Falla si alguna tiene registros cargados.
                </p>
              </div>
            )}

            {!resultado && (
              <div className="flex items-center gap-2">
                {!preview.esAplicable ? (
                  <Button disabled className="gap-2">
                    <Upload className="h-4 w-4" /> {applyLabel}
                  </Button>
                ) : modoActual.destructivo ? (
                  <ConfirmActionDialog
                    trigger={
                      <span className="inline-flex items-center gap-1.5">
                        <Upload className="h-4 w-4" /> {applyLabel}
                      </span>
                    }
                    triggerClassName="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                    title={modo === "eliminar-todas" ? "¿Eliminar TODAS las planillas?" : "¿Reemplazar las planillas existentes?"}
                    description={
                      modo === "eliminar-todas" ? (
                        <>Se borrarán <strong>todas</strong> las planillas de la base y luego se importarán las del archivo. No se puede deshacer. Falla si alguna tiene registros.</>
                      ) : (
                        <>Las planillas con el mismo código y versión se <strong>reemplazarán</strong> por las del archivo. Falla si alguna tiene registros cargados.</>
                      )
                    }
                    confirmText={modo === "eliminar-todas" ? "Eliminar todo e importar" : "Reemplazar"}
                    pendingText="Aplicando…"
                    variant="destructive"
                    confirmPhrase={modo === "eliminar-todas" ? "ELIMINAR TODAS" : undefined}
                    onConfirm={doApply}
                  />
                ) : (
                  <Button onClick={doApply} disabled={applyMut.isPending} className="gap-2">
                    {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {applyLabel}
                  </Button>
                )}
                {!preview.esAplicable && (
                  <span className="text-xs text-destructive">Resolvé los conflictos antes de importar.</span>
                )}
              </div>
            )}
          </div>
        )}

        {applyMut.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              No se pudo importar.
              {applyMut.error instanceof Error ? ` ${applyMut.error.message}` : ""}
            </p>
          </div>
        )}

        {resultado && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{resultado.mensaje}</p>
            </div>
            {resultado.resultados.filter((r) => !r.aplicado && !r.omitida).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-destructive">
                  Planillas que fallaron ({resultado.resultados.filter((r) => !r.aplicado && !r.omitida).length}):
                </p>
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {resultado.resultados
                    .filter((r) => !r.aplicado && !r.omitida)
                    .map((r, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                      >
                        {r.mensaje}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {resultado.resultados.filter((r) => r.omitida).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-amber-700">
                  Omitidas por ya existir ({resultado.resultados.filter((r) => r.omitida).length}):
                </p>
                <ul className="space-y-1 max-h-48 overflow-y-auto">
                  {resultado.resultados
                    .filter((r) => r.omitida)
                    .map((r, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                      >
                        {r.mensaje}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Limpieza de planillas no usadas (cross-tenant, SuperAdmin) ─────────────

function PlanillasNoUsadasCard() {
  const [expandido, setExpandido] = useState(false)
  const previewQuery = usePlanillasNoUsadasPreview()
  const eliminarMut = useEliminarPlanillasNoUsadas()

  const preview = previewQuery.data
  const cantPlanillas = preview?.planillas.length ?? 0
  const cantCampos = preview?.camposHuerfanosCount ?? 0
  const hayAlgo = cantPlanillas > 0 || cantCampos > 0
  const resultado = eliminarMut.data

  return (
    <Card className="p-6 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-red-600" />
          Limpiar planillas no usadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Elimina las planillas que no están referenciadas por ninguna Tarea ni Registro
          en ningún proyecto. Después limpia los campos huérfanos que queden.
        </p>
      </div>

      {previewQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
        </div>
      ) : previewQuery.isError ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          No se pudo obtener el preview.
        </div>
      ) : (
        <>
          <div className="rounded-md border bg-gray-50 p-3 text-sm">
            <p>
              <strong className="text-gray-900">{cantPlanillas}</strong> planilla(s) sin uso
              <span className="text-muted-foreground"> · </span>
              <strong className="text-gray-900">{cantCampos}</strong> campo(s) que quedarían huérfanos
            </p>
            {cantPlanillas > 0 && (
              <button
                type="button"
                onClick={() => setExpandido((v) => !v)}
                className="mt-1 text-xs text-blue-700 hover:text-blue-900 cursor-pointer"
              >
                {expandido ? "Ocultar detalle" : "Ver detalle"}
              </button>
            )}
            {expandido && cantPlanillas > 0 && (
              <ul className="mt-2 max-h-56 overflow-auto text-xs text-gray-700 space-y-0.5">
                {preview!.planillas.map((p) => (
                  <li key={p.id} className="font-mono">
                    <span className="text-blue-700 font-semibold">{p.codigo}</span>
                    <span className="text-muted-foreground"> v{p.version}</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-sans">{p.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hayAlgo ? (
              <ConfirmActionDialog
                trigger={
                  <>
                    <Trash2 className="h-4 w-4" />
                    Eliminar {cantPlanillas} planilla(s) + {cantCampos} campo(s)
                  </>
                }
                triggerClassName="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
                title="¿Eliminar planillas no usadas?"
                description={
                  <>
                    Vas a borrar <strong>{cantPlanillas}</strong> planilla(s) y{" "}
                    <strong>{cantCampos}</strong> campo(s) huérfano(s). Esta acción no se puede
                    deshacer.
                  </>
                }
                confirmText="Eliminar"
                pendingText="Eliminando..."
                variant="destructive"
                onConfirm={async () => {
                  await eliminarMut.mutateAsync()
                  await previewQuery.refetch()
                  setExpandido(false)
                }}
              />
            ) : (
              <Button variant="outline" disabled className="gap-2">
                <Trash2 className="h-4 w-4" /> Nada para eliminar
              </Button>
            )}
            {eliminarMut.isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
          </div>

          {resultado && !eliminarMut.isPending && (
            <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Se eliminaron <strong>{resultado.planillasEliminadas}</strong> planilla(s) y{" "}
                <strong>{resultado.camposEliminados}</strong> campo(s).
              </span>
            </div>
          )}
          {eliminarMut.isError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{(eliminarMut.error as Error)?.message ?? "No se pudo eliminar."}</span>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// ─── Restaurar planillas soft-deleted (cross-tenant, SuperAdmin) ────────────

function PlanillasEliminadasCard() {
  const [expandido, setExpandido] = useState(false)
  const eliminadasQuery = usePlanillasEliminadas()
  const reactivarMut = useReactivarPlanilla()

  const eliminadas = eliminadasQuery.data ?? []
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [errorInline, setErrorInline] = useState<string | null>(null)
  const [okId, setOkId] = useState<string | null>(null)

  async function handleReactivar(id: string) {
    setPendingId(id)
    setErrorInline(null)
    try {
      await reactivarMut.mutateAsync(id)
      setOkId(id)
      await eliminadasQuery.refetch()
      setTimeout(() => setOkId(null), 2000)
    } catch (err) {
      setErrorInline((err as Error)?.message ?? "No se pudo restaurar.")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Card className="p-6 space-y-3">
      <div>
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-blue-700" />
          Restaurar planillas eliminadas
        </h2>
        <p className="text-sm text-muted-foreground">
          Planillas dadas de baja con soft-delete (siguen en DB con IsActive=false). Sus campos
          y secciones no se tocaron — al restaurar quedan como antes.
        </p>
      </div>

      {eliminadasQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
        </div>
      ) : eliminadasQuery.isError ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
          No se pudo obtener la lista.
        </div>
      ) : eliminadas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay planillas eliminadas para restaurar.
        </p>
      ) : (
        <>
          <div className="rounded-md border bg-gray-50 p-3 text-sm">
            <p>
              <strong className="text-gray-900">{eliminadas.length}</strong> planilla(s) eliminada(s)
            </p>
            <button
              type="button"
              onClick={() => setExpandido((v) => !v)}
              className="mt-1 text-xs text-blue-700 hover:text-blue-900 cursor-pointer"
            >
              {expandido ? "Ocultar lista" : "Ver lista"}
            </button>
          </div>

          {expandido && (
            <div className="max-h-72 overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Código</th>
                    <th className="text-left p-2 font-medium">Nombre</th>
                    <th className="text-left p-2 font-medium">Eliminada</th>
                    <th className="text-right p-2 font-medium w-24">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {eliminadas.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-mono">
                        <span className="text-blue-700 font-semibold">{p.codigo}</span>
                        <span className="text-muted-foreground"> v{p.version}</span>
                      </td>
                      <td className="p-2 text-gray-800 truncate max-w-xs">{p.nombre}</td>
                      <td className="p-2 text-muted-foreground">
                        {new Date(p.updatedAt).toLocaleDateString("es-AR")}
                        {p.updatedByNombre && (
                          <span className="text-[10px] block">por {p.updatedByNombre}</span>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {okId === p.id ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Restaurada
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            disabled={pendingId === p.id}
                            onClick={() => handleReactivar(p.id)}
                          >
                            {pendingId === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            Restaurar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {errorInline && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorInline}</span>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
