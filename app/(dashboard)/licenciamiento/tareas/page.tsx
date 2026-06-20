"use client"

import { useRef, useState } from "react"
import { Loader2, Download, Upload, AlertTriangle, CheckCircle2, ListChecks } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  useProyectosMigracion,
  exportarTareas,
  parseFileJson,
  useImportTareasPreview,
  useImportTareasApply,
  type TareaModo,
} from "@/features/tareas/api/use-import-export"

export default function TareasMigracionPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const proyectosQuery = useProyectosMigracion()
  const proyectos = proyectosQuery.data?.data ?? []

  const [origenId, setOrigenId] = useState("")
  const [destinoId, setDestinoId] = useState("")
  const [data, setData] = useState<unknown | null>(null)
  const [fileName, setFileName] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const [modo, setModo] = useState<TareaModo>("omitir")

  const previewMut = useImportTareasPreview()
  const applyMut = useImportTareasApply()
  const preview = previewMut.data?.data
  const resultado = applyMut.data?.data

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
      if (destinoId) previewMut.mutate({ data: json, proyectoDestinoId: destinoId })
    } catch (err) {
      setData(null)
      setParseError(err instanceof Error ? err.message : "Archivo inválido.")
    }
  }

  function onDestinoChange(id: string) {
    setDestinoId(id)
    applyMut.reset()
    if (data && id) previewMut.mutate({ data, proyectoDestinoId: id })
  }

  const aplicables = preview?.tareas.filter((t) => t.esAplicable).length ?? 0

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ListChecks className="h-6 w-6 text-blue-700" />
          Migrar tareas entre proyectos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exporta el catálogo de tareas de un proyecto e impórtalo en otro (incluso de otro cliente).
          Las planillas referenciadas deben existir en el destino (importalas primero).
        </p>
      </div>

      {/* Export */}
      <Card className="p-6 space-y-3">
        <div>
          <h2 className="font-semibold text-gray-800">Exportar tareas</h2>
          <p className="text-sm text-muted-foreground">Elegí el proyecto origen y descargá su catálogo de tareas.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={origenId}
            onChange={(e) => setOrigenId(e.target.value)}
            className="h-9 flex-1 rounded-md border border-gray-300 px-2 text-sm"
          >
            <option value="">— Elegí un proyecto —</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}{p.clienteNombre ? ` — ${p.clienteNombre}` : ""}
              </option>
            ))}
          </select>
          <Button onClick={() => origenId && exportarTareas(origenId)} disabled={!origenId} className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </Card>

      {/* Import */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Importar tareas</h2>
          <p className="text-sm text-muted-foreground">
            Elegí el proyecto destino, subí el archivo y revisá el preview. Los catálogos faltantes
            (nivel, tipo de elemento, especialidad, terminal) se crean automáticamente.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Proyecto destino</label>
          <select
            value={destinoId}
            onChange={(e) => onDestinoChange(e.target.value)}
            className="h-9 w-full rounded-md border border-gray-300 px-2 text-sm"
          >
            <option value="">— Elegí un proyecto —</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}{p.clienteNombre ? ` — ${p.clienteNombre}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} className="hidden" />
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()} disabled={!destinoId}>
            <Upload className="h-4 w-4" /> Elegir archivo
          </Button>
          {fileName && <span className="text-sm text-muted-foreground truncate">{fileName}</span>}
        </div>
        {!destinoId && <p className="text-[11px] text-muted-foreground">Elegí primero el proyecto destino.</p>}

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-600">Si el código de tarea ya existe en el destino:</p>
          <div className="space-y-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="radio" name="modo-tareas" className="mt-0.5 h-4 w-4" checked={modo === "omitir"} onChange={() => setModo("omitir")} />
              <span className="text-sm"><span className="font-medium">Omitir</span><span className="block text-[11px] text-muted-foreground">Saltea las tareas con código ya usado.</span></span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="radio" name="modo-tareas" className="mt-0.5 h-4 w-4" checked={modo === "crear"} onChange={() => setModo("crear")} />
              <span className="text-sm"><span className="font-medium">Crear con nuevo código</span><span className="block text-[11px] text-muted-foreground">Reasigna el próximo código libre del proyecto.</span></span>
            </label>
          </div>
        </div>

        {parseError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <p>{parseError}</p>
          </div>
        )}

        {previewMut.isPending && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Validando…
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{preview.total}</strong> tarea(s) · <strong>{aplicables}</strong> aplicable(s) en{" "}
              <span className="font-medium">{preview.proyectoDestinoNombre}</span>.
            </p>
            <ul className="space-y-1 max-h-72 overflow-y-auto">
              {preview.tareas.map((t, i) => (
                <li
                  key={i}
                  className={`rounded-md border px-3 py-1.5 text-xs ${t.esAplicable ? "border-gray-200 bg-white" : "border-destructive/30 bg-destructive/5"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      <span className="font-mono text-gray-500">#{t.codigo}</span> {t.nombre}
                    </span>
                    <span className="inline-flex items-center gap-1.5 shrink-0">
                      {t.yaExisteEnDestino && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          {modo === "omitir" ? "se omitirá" : "nuevo código"}
                        </span>
                      )}
                      {t.esAplicable ? (
                        <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                      ) : (
                        <span className="text-destructive inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Bloqueada</span>
                      )}
                    </span>
                  </div>
                  {t.conflicto && <p className="text-destructive mt-0.5">{t.conflicto}</p>}
                </li>
              ))}
            </ul>

            {!resultado && (
              <Button
                onClick={() => data && destinoId && applyMut.mutate({ data, proyectoDestinoId: destinoId, modo })}
                disabled={applyMut.isPending || aplicables === 0}
                className="gap-2"
              >
                {applyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Importar tareas
              </Button>
            )}
          </div>
        )}

        {applyMut.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>No se pudo importar.{applyMut.error instanceof Error ? ` ${applyMut.error.message}` : ""}</p>
          </div>
        )}

        {resultado && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <p>{resultado.mensaje}</p>
            </div>
            {resultado.resultados.filter((r) => r.accion === "error").length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-destructive">
                  Con error ({resultado.resultados.filter((r) => r.accion === "error").length}):
                </p>
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {resultado.resultados
                    .filter((r) => r.accion === "error")
                    .map((r, i) => (
                      <li key={i} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        #{r.codigo} {r.nombre}: {r.mensaje}
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
