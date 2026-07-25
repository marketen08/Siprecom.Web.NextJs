"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, ScanSearch, Save, Play, RotateCcw, CheckCircle2, XCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface DetectorConfig {
  umbralDensidadPct: number
  margenFiducial: number
  capSuperior: number
  anchoMinimo: number
}

interface DetectorSlot {
  indice: number
  detected: boolean
  densidadPct: number
}

interface DetectorResult {
  detected: boolean
  slotsDetectados: number
  slotsTotal: number
  slots: DetectorSlot[]
  sinFiduciales: boolean
  umbralUsado: number | null
  anchoBitmap: number | null
  altoBitmap: number | null
  brilloFiducial: number | null
  error: string | null
}

interface PreviewResponse {
  resultado: DetectorResult
  configUsada: DetectorConfig
}

const DEFAULTS: DetectorConfig = {
  umbralDensidadPct: 2.0,
  margenFiducial: 70,
  capSuperior: 160,
  anchoMinimo: 1500,
}

export default function DetectorFirmasPage() {
  const qc = useQueryClient()

  // Config vigente en el sistema (fuente de verdad).
  const { data: cfgActual, isLoading: cargandoCfg } = useQuery({
    queryKey: ["licenciamiento", "detector-firmas", "config"],
    queryFn: () => apiClient.get<DetectorConfig>("/api/licenciamiento/detector-firmas/config"),
  })

  // Valores editables del formulario. Se sincronizan al cargar la config.
  const [values, setValues] = useState<DetectorConfig>(DEFAULTS)
  useEffect(() => {
    if (cfgActual) setValues(cfgActual)
  }, [cfgActual])

  const [archivo, setArchivo] = useState<File | null>(null)
  const [cantidadSlots, setCantidadSlots] = useState(4)
  const [resultado, setResultado] = useState<PreviewResponse | null>(null)
  const [errorPreview, setErrorPreview] = useState<string | null>(null)

  const preview = useMutation({
    mutationFn: async () => {
      if (!archivo) throw new Error("Elegí un archivo primero.")
      const form = new FormData()
      form.append("archivo", archivo, archivo.name)
      form.append("cantidadSlots", String(cantidadSlots))
      form.append("umbralDensidadPct", String(values.umbralDensidadPct))
      form.append("margenFiducial", String(values.margenFiducial))
      form.append("capSuperior", String(values.capSuperior))
      form.append("anchoMinimo", String(values.anchoMinimo))
      const res = await fetch("/api/licenciamiento/detector-firmas/preview", {
        method: "POST",
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`)
      return json as PreviewResponse
    },
    onSuccess: (data) => { setResultado(data); setErrorPreview(null) },
    onError: (err: Error) => { setErrorPreview(err.message); setResultado(null) },
  })

  const guardar = useMutation({
    mutationFn: (cfg: DetectorConfig) =>
      apiClient.put<DetectorConfig>("/api/licenciamiento/detector-firmas/config", cfg),
    onSuccess: (res) => {
      qc.setQueryData(["licenciamiento", "detector-firmas", "config"], res)
    },
  })

  const cambiado =
    cfgActual != null &&
    (values.umbralDensidadPct !== cfgActual.umbralDensidadPct ||
      values.margenFiducial !== cfgActual.margenFiducial ||
      values.capSuperior !== cfgActual.capSuperior ||
      values.anchoMinimo !== cfgActual.anchoMinimo)

  const restaurarDefaults = () => setValues(DEFAULTS)
  const restaurarVigente = () => cfgActual && setValues(cfgActual)

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ScanSearch className="h-6 w-6 text-blue-700" /> Detector de firmas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustá los 4 parámetros del detector de firmas manuscritas y probalos contra un
          escaneo real. Los cambios afectan a todo el sistema una vez guardados (aplican
          en menos de 60 segundos por caché).
        </p>
      </div>

      {cargandoCfg ? (
        <Card className="p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración…
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Formulario de parámetros */}
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800">Parámetros</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Modificá los valores y usá "Probar" antes de guardar.
              </p>
            </div>

            <ParamField
              label="Umbral densidad (%)"
              descripcion="% mínimo de píxeles oscuros para considerar un slot firmado. Default 2.0."
              value={values.umbralDensidadPct}
              step={0.1}
              onChange={(v) => setValues({ ...values, umbralDensidadPct: v })}
            />
            <ParamField
              label="Margen sobre brillo fiducial"
              descripcion="Se suma al brillo promedio del fiducial para calibrar el umbral de 'oscuro'. Default 70."
              value={values.margenFiducial}
              step={5}
              onChange={(v) => setValues({ ...values, margenFiducial: Math.round(v) })}
            />
            <ParamField
              label="Cap superior del umbral"
              descripcion="Tope máximo del umbral auto-calibrado. Default 160."
              value={values.capSuperior}
              step={5}
              onChange={(v) => setValues({ ...values, capSuperior: Math.round(v) })}
            />
            <ParamField
              label="Ancho mínimo (px)"
              descripcion="Imágenes con ancho menor se escalan (bicúbico) hasta este valor antes de detectar. Default 1500."
              value={values.anchoMinimo}
              step={100}
              onChange={(v) => setValues({ ...values, anchoMinimo: Math.round(v) })}
            />

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                onClick={() => guardar.mutate(values)}
                disabled={!cambiado || guardar.isPending}
                className="gap-2"
              >
                {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar como default
              </Button>
              <Button variant="outline" size="sm" onClick={restaurarVigente} disabled={!cfgActual}>
                Volver a vigente
              </Button>
              <Button variant="ghost" size="sm" onClick={restaurarDefaults} className="gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Defaults
              </Button>
              {guardar.isSuccess && !cambiado && (
                <span className="flex items-center gap-1 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" /> Guardado
                </span>
              )}
              {guardar.isError && (
                <span className="text-sm text-destructive">
                  {(guardar.error as Error).message}
                </span>
              )}
            </div>
          </Card>

          {/* Playground */}
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800">Probar con un archivo</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Subí un escaneo real (imagen o PDF) y verificá cómo detecta con los valores actuales.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">Archivo (imagen o PDF)</label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
              {archivo && (
                <p className="text-xs text-muted-foreground">
                  {archivo.name} — {(archivo.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            <div className="space-y-2 max-w-40">
              <label className="text-sm font-medium text-gray-800">Cantidad de slots</label>
              <Input
                type="number"
                min={1}
                max={12}
                step={1}
                value={cantidadSlots}
                onChange={(e) => setCantidadSlots(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
              />
            </div>

            <Button
              onClick={() => preview.mutate()}
              disabled={!archivo || preview.isPending}
              className="w-full gap-2"
            >
              {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Probar detección
            </Button>

            {errorPreview && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {errorPreview}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800">Resultado</h2>
          </div>

          {resultado.resultado.sinFiduciales ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No se detectaron fiduciales en la imagen. El detector no puede afirmar nada.
            </div>
          ) : resultado.resultado.error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {resultado.resultado.error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <Metric label="Detectados" value={`${resultado.resultado.slotsDetectados}/${resultado.resultado.slotsTotal}`} />
                <Metric label="Umbral usado" value={String(resultado.resultado.umbralUsado ?? "—")} />
                <Metric label="Brillo fiducial" value={resultado.resultado.brilloFiducial != null ? resultado.resultado.brilloFiducial.toFixed(1) : "—"} />
                <Metric label="Bitmap" value={`${resultado.resultado.anchoBitmap ?? "?"}×${resultado.resultado.altoBitmap ?? "?"}`} />
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Detalle por slot</p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">#</th>
                        <th className="text-left px-3 py-2 font-semibold">Estado</th>
                        <th className="text-right px-3 py-2 font-semibold">Densidad (%)</th>
                        <th className="text-right px-3 py-2 font-semibold">Umbral requerido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.resultado.slots.map((s) => (
                        <tr key={s.indice} className="border-t">
                          <td className="px-3 py-2 tabular-nums">{s.indice + 1}</td>
                          <td className="px-3 py-2">
                            {s.detected ? (
                              <span className="flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Detectada
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-gray-500">
                                <XCircle className="h-3.5 w-3.5" /> No detectada
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{s.densidadPct.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {resultado.configUsada.umbralDensidadPct.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Configuración usada en este análisis:
                {" umbral "}{resultado.configUsada.umbralDensidadPct}
                {" · margen "}{resultado.configUsada.margenFiducial}
                {" · cap "}{resultado.configUsada.capSuperior}
                {" · ancho min "}{resultado.configUsada.anchoMinimo}
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  )
}

function ParamField({
  label,
  descripcion,
  value,
  step,
  onChange,
}: {
  label: string
  descripcion: string
  value: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-800">{label}</label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="max-w-40"
      />
      <p className="text-xs text-muted-foreground">{descripcion}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 border px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  )
}
