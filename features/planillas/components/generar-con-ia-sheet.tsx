"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Recycle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { apiClient } from "@/lib/api-client"
import { useGetCamposSelect } from "@/features/campos/api/use-get-campos-select"
import type { Campo } from "@/features/campos/types"
import type {
  DescripcionParsePayload,
  PlanillaImportada,
  SeccionImportada,
  CampoImportado,
  CatalogoCampoResumen,
} from "../import-types"
import type { Planilla, PlanillaSeccion, CampoTipoDato } from "../types"
import { CAMPO_TIPO_DATO, CAMPO_TAMANO_DEFAULT } from "../types"

const TIPOS = Object.entries(CAMPO_TIPO_DATO)
  .filter(([k]) => k !== "6") // excluir Firma (igual que en Excel)
  .map(([value, label]) => ({ value: value as string, label }))

// --- Estado interno editable ---
interface CampoEditable extends CampoImportado {
  _id: string
  _eliminado: boolean
}

interface SeccionEditable extends Omit<SeccionImportada, "campos"> {
  _id: string
  _abierta: boolean
  campos: CampoEditable[]
}

interface PlanillaEditable extends Omit<PlanillaImportada, "secciones"> {
  secciones: SeccionEditable[]
}

function toEditable(p: PlanillaImportada): PlanillaEditable {
  let campoIdx = 0
  let seccionIdx = 0
  return {
    nombre: p.nombre,
    secciones: p.secciones.map((s) => ({
      _id: `s-${seccionIdx++}`,
      _abierta: true,
      nombre: s.nombre,
      campos: s.campos.map((c) => ({
        _id: `c-${campoIdx++}`,
        _eliminado: false,
        ...c,
      })),
    })),
  }
}

type Step = "descripcion" | "analizando" | "preview" | "creando" | "ok" | "error"

interface Props {
  open: boolean
  onClose: () => void
}

interface IAUso {
  habilitada: boolean
  usadoHoy: number
  maxPorUsuarioPorDia: number
  restante: number | null
}

export function GenerarConIASheet({ open, onClose }: Props) {
  const qc = useQueryClient()
  // El hook no está tipado (retorna {}); casteamos al shape real del endpoint.
  const camposQuery = useGetCamposSelect() as {
    data?: { data?: Campo[] }
    isLoading: boolean
  }

  // Uso del usuario — se refresca cada vez que se abre el sheet y después de cada
  // generación (para reflejar el consumo).
  const usoQuery = useQuery({
    queryKey: ["ia", "uso"],
    queryFn: () => apiClient.get<IAUso>("/api/ia/uso"),
    enabled: open,
    staleTime: 0,
  })

  const [step, setStep] = useState<Step>("descripcion")
  const [descripcion, setDescripcion] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [progreso, setProgreso] = useState("")
  const [planilla, setPlanilla] = useState<PlanillaEditable | null>(null)

  function resetear() {
    setStep("descripcion")
    setErrorMsg("")
    setProgreso("")
    setPlanilla(null)
  }

  function cerrar() {
    resetear()
    setDescripcion("")
    onClose()
  }

  async function generar() {
    if (descripcion.trim().length < 10) {
      setErrorMsg("Escribí una descripción más detallada (mínimo 10 caracteres).")
      setStep("error")
      return
    }

    setStep("analizando")
    setErrorMsg("")

    try {
      // Armamos el catálogo compacto para minimizar tokens.
      const camposData = camposQuery.data?.data ?? []
      const catalogo: CatalogoCampoResumen[] = camposData.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        etiqueta: c.etiqueta,
        tipoDato: c.tipoDato,
      }))

      const payload: DescripcionParsePayload = {
        descripcion: descripcion.trim(),
        catalogo,
      }

      const resultado = await fetch("/api/ai/planilla-desde-descripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!resultado.ok) {
        const err = await resultado.json().catch(() => ({ error: "Error desconocido" }))
        // Un 429/403 igual consume ciclo — refrescamos el saldo por las dudas.
        qc.invalidateQueries({ queryKey: ["ia", "uso"] })
        throw new Error(err.error ?? "Error al generar la planilla")
      }

      const data: PlanillaImportada = await resultado.json()
      // Refresco del saldo después de un consumo exitoso.
      qc.invalidateQueries({ queryKey: ["ia", "uso"] })
      setPlanilla(toEditable(data))
      setStep("preview")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado")
      setStep("error")
    }
  }

  // --- Edición de la preview ---
  function setNombrePlanilla(nombre: string) {
    setPlanilla((p) => p ? { ...p, nombre } : p)
  }

  function setNombreSeccion(seccionId: string, nombre: string) {
    setPlanilla((p) => p ? {
      ...p,
      secciones: p.secciones.map((s) =>
        s._id === seccionId ? { ...s, nombre } : s
      ),
    } : p)
  }

  function toggleSeccion(seccionId: string) {
    setPlanilla((p) => p ? {
      ...p,
      secciones: p.secciones.map((s) =>
        s._id === seccionId ? { ...s, _abierta: !s._abierta } : s
      ),
    } : p)
  }

  function setCampo(seccionId: string, campoId: string, patch: Partial<CampoEditable>) {
    setPlanilla((p) => p ? {
      ...p,
      secciones: p.secciones.map((s) =>
        s._id === seccionId
          ? {
              ...s,
              campos: s.campos.map((c) =>
                c._id === campoId ? { ...c, ...patch } : c
              ),
            }
          : s
      ),
    } : p)
  }

  function eliminarCampo(seccionId: string, campoId: string) {
    setPlanilla((p) => p ? {
      ...p,
      secciones: p.secciones.map((s) =>
        s._id === seccionId
          ? { ...s, campos: s.campos.map((c) => c._id === campoId ? { ...c, _eliminado: true } : c) }
          : s
      ),
    } : p)
  }

  // --- Persistencia en cadena ---
  async function crearPlanilla() {
    if (!planilla) return
    setStep("creando")
    setErrorMsg("")

    try {
      // 1. Crear planilla base
      setProgreso("Creando planilla...")
      const planillaResp = await apiClient.post<{ data: Planilla }>("/api/planillas", {
        nombre: planilla.nombre,
        requiereFirma: true,
        permiteAdjuntos: false,
        generaPdfFinal: false,
      })
      const planillaId = planillaResp.data.id

      // 2. Crear secciones y sus campos
      for (const seccion of planilla.secciones) {
        const camposActivos = seccion.campos.filter((c) => !c._eliminado)
        if (camposActivos.length === 0) continue

        setProgreso(`Creando sección "${seccion.nombre}"...`)
        const seccionResp = await apiClient.post<{ data: PlanillaSeccion }>(
          `/api/planillas/${planillaId}/secciones`,
          {
            planillaId,
            nombre: seccion.nombre,
            orden: planilla.secciones.indexOf(seccion) + 1,
          }
        )
        const seccionId = seccionResp.data.id

        // 3. Crear/reusar campos y vincularlos a la planilla
        for (let i = 0; i < camposActivos.length; i++) {
          const campo = camposActivos[i]
          setProgreso(`Vinculando campo "${campo.etiqueta}"...`)

          let campoId: string

          if (campo.campoIdExistente) {
            // Reuso: usamos el id del catálogo tal cual — sin POST /api/campos.
            campoId = campo.campoIdExistente
          } else {
            // Nuevo: creamos el campo global.
            const codigo = campo.etiqueta
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "_")
              .replace(/_+/g, "_")
              .slice(0, 50)

            const campoResp = await apiClient.post<{ data: { id: string } }>("/api/campos", {
              codigo: `${codigo}_${Date.now()}`,
              etiqueta: campo.etiqueta,
              tipoDato: campo.tipoDato,
              esObligatorioDefault: campo.esObligatorio,
              permiteObservacion: false,
              permiteAdjunto: false,
              // Sólo Tabla dinámica usa numeroFilas. En matriz el back lo ignora.
              numeroFilas: campo.tipoDato === 9 ? campo.numeroFilas : undefined,
            })
            campoId = campoResp.data.id

            // Si es Tabla, creamos columnas y filas predefinidas del campo global.
            // (No aplica en reuso: si el campo ya existe en el catálogo, la
            // definición de tabla ya viene con él y no la tocamos.)
            if (campo.tipoDato === 9) {
              const columnas = campo.columnas ?? []
              for (let ci = 0; ci < columnas.length; ci++) {
                const col = columnas[ci]
                setProgreso(`Creando columna "${col.encabezado}"...`)
                await apiClient.post(`/api/campos/${campoId}/tabla/columnas`, {
                  campoId,
                  encabezado: col.encabezado,
                  orden: ci + 1,
                  esColumnaEtiqueta: !!col.esColumnaEtiqueta,
                })
              }
              const filas = campo.filas ?? []
              for (let fi = 0; fi < filas.length; fi++) {
                const fila = filas[fi]
                setProgreso(`Creando fila "${fila.etiquetaFila}"...`)
                await apiClient.post(`/api/campos/${campoId}/tabla/filas`, {
                  campoId,
                  etiquetaFila: fila.etiquetaFila,
                  orden: fi + 1,
                })
              }
            }
          }

          await apiClient.post(`/api/planillas/${planillaId}/campos`, {
            planillaId,
            campoId,
            planillaSeccionId: seccionId,
            orden: i + 1,
            esObligatorio: campo.esObligatorio,
            visible: true,
            soloLectura: false,
            // Tabla siempre ocupa ancho completo — forzamos 12 aunque la IA se olvide.
            tamano: campo.tipoDato === 9
              ? 12
              : (campo.tamano ?? CAMPO_TAMANO_DEFAULT),
            renderMode: campo.renderMode ?? 0,
          })
        }
      }

      setProgreso("")
      setStep("ok")
      qc.invalidateQueries({ queryKey: ["planillas"] })
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al crear la planilla")
      setStep("error")
    }
  }

  const camposVisibles = (s: SeccionEditable) => s.campos.filter((c) => !c._eliminado)
  const totalCampos = planilla
    ? planilla.secciones.reduce((acc, s) => acc + camposVisibles(s).length, 0)
    : 0
  const totalReusados = planilla
    ? planilla.secciones.reduce(
        (acc, s) => acc + camposVisibles(s).filter((c) => !!c.campoIdExistente).length,
        0,
      )
    : 0

  return (
    <Sheet open={open} onOpenChange={cerrar}>
      <SheetContent className="w-full sm:max-w-2xl! flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Generar planilla con IA
          </SheetTitle>
          <SheetDescription>
            Describí la planilla que necesitás y la IA propondrá la estructura,
            reusando campos del catálogo cuando sea posible.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-1 pb-6 space-y-4">

          {/* STEP: descripcion */}
          {step === "descripcion" && (() => {
            const uso = usoQuery.data
            const deshabilitadaGlobal = uso && !uso.habilitada
            const sinSaldo = uso && uso.restante !== null && uso.restante <= 0
            const bloqueado = deshabilitadaGlobal || sinSaldo

            return (
              <div className="space-y-4">
                {/* Aviso de deshabilitado o sin saldo */}
                {deshabilitadaGlobal && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Las funciones de IA están deshabilitadas por el administrador.
                  </div>
                )}
                {!deshabilitadaGlobal && sinSaldo && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    Alcanzaste el máximo diario de {uso!.maxPorUsuarioPorDia} llamadas
                    de IA. Vuelve mañana o pedile al administrador que aumente el límite.
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder={`Ej: Necesito una planilla de prueba hidrostática de cañería. Debe tener los parámetros de la prueba (presión de prueba en kg/cm², duración en minutos, medio de prueba), condiciones iniciales (presión inicial, temperatura ambiente) y resultados (presión final, variación registrada, resultado APROBADO/RECHAZADO).`}
                    rows={10}
                    className="resize-none"
                    disabled={!!bloqueado}
                  />
                  <p className="text-xs text-muted-foreground">
                    No hace falta mencionar código, fecha, proyecto, sistema, subsistema,
                    elemento, firmas ni observaciones — ya vienen incluidos en todas las
                    planillas. Enfocate en los campos técnicos específicos.
                  </p>
                </div>

                {camposQuery.isLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Cargando catálogo de campos...
                  </p>
                )}
                {camposQuery.data && (
                  <p className="text-xs text-muted-foreground">
                    La IA va a considerar {(camposQuery.data.data ?? []).length} campos
                    del catálogo para reusar.
                  </p>
                )}
                {uso && uso.habilitada && uso.restante !== null && !sinSaldo && (
                  <p className="text-xs text-muted-foreground">
                    Te quedan <span className="font-medium">{uso.restante}</span>{" "}
                    de {uso.maxPorUsuarioPorDia} llamadas de IA hoy.
                  </p>
                )}
                {uso && uso.habilitada && uso.restante === null && (
                  <p className="text-xs text-muted-foreground">
                    Sin límite diario configurado ({uso.usadoHoy} llamadas hoy).
                  </p>
                )}

                <Button
                  onClick={generar}
                  disabled={
                    camposQuery.isLoading ||
                    descripcion.trim().length < 10 ||
                    !!bloqueado
                  }
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generar planilla
                </Button>
              </div>
            )
          })()}

          {/* STEP: analizando */}
          {step === "analizando" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
              <p className="font-medium text-gray-700">Generando con IA...</p>
              <p className="text-sm text-muted-foreground">Esto puede tomar unos segundos</p>
            </div>
          )}

          {/* STEP: error */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="font-medium text-gray-700">Ocurrió un error</p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">{errorMsg}</p>
              <Button onClick={resetear} variant="outline">Intentar de nuevo</Button>
            </div>
          )}

          {/* STEP: ok */}
          {step === "ok" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-semibold text-lg text-gray-800">¡Planilla creada!</p>
              <p className="text-sm text-muted-foreground">La planilla se creó correctamente.</p>
              <Button onClick={cerrar}>Cerrar</Button>
            </div>
          )}

          {/* STEP: creando */}
          {step === "creando" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
              <p className="font-medium text-gray-700">Creando planilla...</p>
              {progreso && (
                <p className="text-sm text-muted-foreground text-center max-w-sm">{progreso}</p>
              )}
            </div>
          )}

          {/* STEP: preview */}
          {step === "preview" && planilla && (
            <div className="space-y-4">
              {/* Nombre de la planilla */}
              <div className="space-y-1.5">
                <Label htmlFor="nombre-planilla-ia">Nombre de la planilla</Label>
                <Input
                  id="nombre-planilla-ia"
                  value={planilla.nombre}
                  onChange={(e) => setNombrePlanilla(e.target.value)}
                  className="font-medium"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Badge variant="secondary">{planilla.secciones.length} secciones</Badge>
                <Badge variant="secondary">{totalCampos} campos</Badge>
                {totalReusados > 0 && (
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Recycle className="h-3 w-3 mr-1" />
                    {totalReusados} reusados del catálogo
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Secciones */}
              {planilla.secciones.map((seccion) => {
                const activos = camposVisibles(seccion)
                return (
                  <div key={seccion._id} className="border rounded-lg overflow-hidden">
                    {/* Header de sección */}
                    <div
                      className="flex items-center gap-2 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleSeccion(seccion._id)}
                    >
                      {seccion._abierta
                        ? <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
                      }
                      <Input
                        value={seccion.nombre}
                        onChange={(e) => {
                          e.stopPropagation()
                          setNombreSeccion(seccion._id, e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 font-semibold text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                        {activos.length} campos
                      </span>
                    </div>

                    {/* Campos */}
                    {seccion._abierta && (
                      <div className="divide-y">
                        {seccion.campos
                          .filter((c) => !c._eliminado)
                          .map((campo) => (
                            <div key={campo._id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group">
                              {/* Etiqueta + badge reusado */}
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <Input
                                  value={campo.etiqueta}
                                  onChange={(e) =>
                                    setCampo(seccion._id, campo._id, {
                                      etiqueta: e.target.value,
                                    })
                                  }
                                  className="h-7 text-sm border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                                  placeholder="Etiqueta del campo"
                                  disabled={!!campo.campoIdExistente}
                                />
                                {campo.campoIdExistente && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] h-5 shrink-0"
                                    title="Este campo se reusa del catálogo global"
                                  >
                                    <Recycle className="h-2.5 w-2.5 mr-0.5" />
                                    Reusado
                                  </Badge>
                                )}
                                {campo.tipoDato === 9 && !campo.campoIdExistente && (() => {
                                  const nCols = (campo.columnas ?? []).length
                                  const nFilas = (campo.filas ?? []).length
                                  const detalle = nFilas > 0
                                    ? `${nCols} cols × ${nFilas} filas`
                                    : `${nCols} cols · dinámica${campo.numeroFilas ? ` (${campo.numeroFilas})` : ""}`
                                  return (
                                    <Badge
                                      variant="secondary"
                                      className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] h-5 shrink-0"
                                      title={
                                        nFilas > 0
                                          ? `Matriz: ${(campo.filas ?? []).map((f) => f.etiquetaFila).join(", ")}`
                                          : "Tabla dinámica — el operador agrega filas"
                                      }
                                    >
                                      {detalle}
                                    </Badge>
                                  )
                                })()}
                              </div>

                              {/* Tipo de dato */}
                              <Select
                                value={String(campo.tipoDato)}
                                disabled={!!campo.campoIdExistente}
                                onValueChange={(v) =>
                                  setCampo(seccion._id, campo._id, {
                                    tipoDato: Number(v) as CampoTipoDato,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-32 text-xs border-gray-200">
                                  <SelectValue>{CAMPO_TIPO_DATO[campo.tipoDato]}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {TIPOS.map((t) => (
                                    <SelectItem key={t.value} value={t.value} className="text-xs">
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Obligatorio */}
                              <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={campo.esObligatorio}
                                  onChange={(e) =>
                                    setCampo(seccion._id, campo._id, { esObligatorio: e.target.checked })
                                  }
                                  className="h-3 w-3"
                                />
                                Req.
                              </label>

                              {/* Eliminar */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => eliminarCampo(seccion._id, campo._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}

                        {activos.length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-2 italic">
                            Sin campos activos
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={crearPlanilla}
                  disabled={!planilla.nombre.trim() || totalCampos === 0}
                  className="flex-1"
                >
                  Crear planilla
                </Button>
                <Button variant="outline" onClick={resetear}>
                  Volver
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
