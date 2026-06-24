"use client"

import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import * as XLSX from "xlsx"
import { FileSpreadsheet, Trash2, ChevronDown, ChevronRight, Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import type { ExcelParsePayload, PlanillaImportada, SeccionImportada, CampoImportado } from "../import-types"
import type { Planilla, PlanillaSeccion, CampoTipoDato } from "../types"
import { CAMPO_TIPO_DATO } from "../types"

const TIPOS = Object.entries(CAMPO_TIPO_DATO)
  .filter(([k]) => k !== "6") // excluir Firma
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

type Step = "upload" | "analizando" | "preview" | "creando" | "ok" | "error"

interface Props {
  open: boolean
  onClose: () => void
}

export function ImportExcelSheet({ open, onClose }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("upload")
  const [errorMsg, setErrorMsg] = useState("")
  const [progreso, setProgreso] = useState("")
  const [planilla, setPlanilla] = useState<PlanillaEditable | null>(null)

  function resetear() {
    setStep("upload")
    setErrorMsg("")
    setProgreso("")
    setPlanilla(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  function cerrar() {
    resetear()
    onClose()
  }

  // --- Parsear Excel y llamar a la API de IA ---
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStep("analizando")
    setErrorMsg("")

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const filas: string[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
        raw: false,
      }) as string[][]

      const payload: ExcelParsePayload = {
        nombreArchivo: file.name,
        filas,
      }

      const resultado = await fetch("/api/ai/planilla-desde-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!resultado.ok) {
        const err = await resultado.json().catch(() => ({ error: "Error desconocido" }))
        throw new Error(err.error ?? "Error al analizar el archivo")
      }

      const data: PlanillaImportada = await resultado.json()
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

  // --- Crear la planilla en cadena ---
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

        // 3. Crear campos de la sección
        for (let i = 0; i < camposActivos.length; i++) {
          const campo = camposActivos[i]
          setProgreso(`Creando campo "${campo.etiqueta}"...`)

          // Generar código único a partir de la etiqueta
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
          })

          await apiClient.post(`/api/planillas/${planillaId}/campos`, {
            planillaId,
            campoId: campoResp.data.id,
            planillaSeccionId: seccionId,
            orden: i + 1,
            esObligatorio: campo.esObligatorio,
            visible: true,
            soloLectura: false,
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

  return (
    <Sheet open={open} onOpenChange={cerrar}>
      <SheetContent className="w-full sm:max-w-2xl! flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Importar planilla desde Excel
          </SheetTitle>
          <SheetDescription>
            La IA analizará tu archivo Excel y generará la estructura de la planilla automáticamente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-1 pb-6 space-y-4">

          {/* STEP: upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-10 text-center gap-4 hover:border-blue-400 transition-colors">
              <Upload className="h-10 w-10 text-gray-400" />
              <div>
                <p className="font-medium text-gray-700">Seleccioná un archivo Excel</p>
                <p className="text-sm text-muted-foreground mt-1">Formatos soportados: .xlsx, .xls</p>
              </div>
              <Button onClick={() => fileRef.current?.click()} variant="outline">
                Elegir archivo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
          )}

          {/* STEP: analizando */}
          {step === "analizando" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="font-medium text-gray-700">Analizando con IA...</p>
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
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
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
                <Label htmlFor="nombre-planilla">Nombre de la planilla</Label>
                <Input
                  id="nombre-planilla"
                  value={planilla.nombre}
                  onChange={(e) => setNombrePlanilla(e.target.value)}
                  className="font-medium"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{planilla.secciones.length} secciones</Badge>
                <Badge variant="secondary">{totalCampos} campos</Badge>
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
                              {/* Etiqueta */}
                              <div className="flex-1 min-w-0">
                                <Input
                                  value={campo.etiqueta}
                                  onChange={(e) =>
                                    setCampo(seccion._id, campo._id, {
                                      etiqueta: e.target.value,
                                    })
                                  }
                                  className="h-7 text-sm border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                                  placeholder="Etiqueta del campo"
                                />
                              </div>

                              {/* Tipo de dato */}
                              <Select
                                value={String(campo.tipoDato)}
                                onValueChange={(v) =>
                                  setCampo(seccion._id, campo._id, {
                                    tipoDato: Number(v) as CampoTipoDato,
                                  })
                                }
                              >
                                <SelectTrigger className="h-7 w-32 text-xs border-gray-200">
                                  {/* Label explícito: Radix no resuelve el label de un
                                      valor seteado por código (import) con el dropdown
                                      cerrado y mostraría el número crudo. */}
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
