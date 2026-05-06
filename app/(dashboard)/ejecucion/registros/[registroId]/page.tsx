"use client"

import { use, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Save, Upload, CheckCircle2, Loader2, FileUp, Download, PenLine, Clock, Check, FileImage, Lock } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"

import { useGetRegistroDetalle } from "@/features/registros/api/use-get-registro-detalle"
import { useCompletarDigital } from "@/features/registros/api/use-completar-digital"
import { useCompletarFisico } from "@/features/registros/api/use-completar-fisico"
import { useGetPlanillaEstructura } from "@/features/planillas/api/use-get-planilla-estructura"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetFirmasStatus } from "@/features/registros/api/use-get-firmas-status"
import { useFirmarRegistro } from "@/features/registros/api/use-firmar-registro"

import type { RegistroValorInput } from "@/features/registros/types"
import type { PlanillaCampoDetalle } from "@/features/planillas/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BarraAvance } from "@/components/barra-avance"

interface PageProps {
  params: Promise<{ registroId: string }>
}

export default function RegistroFormPage({ params }: PageProps) {
  const { registroId } = use(params)
  const router = useRouter()

  const { data: detalleRaw, isLoading: loadingDetalle } = useGetRegistroDetalle(registroId)
  const registro = detalleRaw?.data

  const planillaId = registro?.planillaId ?? null
  const proyectoId = registro?.proyectoId ?? null

  const { data: estructuraRaw, isLoading: loadingEstructura } = useGetPlanillaEstructura(planillaId)
  const estructura = (estructuraRaw as any)?.data ?? estructuraRaw

  const { data: proyectoRaw } = useGetProyecto(proyectoId)
  const proyecto = proyectoRaw?.data

  // Defaults defensivos mientras carga: digital permitido, físico no.
  // Coincide con el comportamiento previo cuando solo existía permitirRegistroFisico.
  const permitirFisico = proyecto?.permitirRegistroFisico ?? false
  const permitirDigital = proyecto?.permitirRegistroDigital ?? true

  const completarDigital = useCompletarDigital(registroId)
  const completarFisico = useCompletarFisico(registroId)

  // Form state: { [planillaCampoId]: value }
  const [valores, setValores] = useState<Record<string, string>>({})
  const [observaciones, setObservaciones] = useState("")
  const [observacionesCampo, setObservacionesCampo] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // Pre-rellenar con valores existentes cuando cargan
  const prefilledRef = useRef(false)
  if (registro && estructura && !prefilledRef.current) {
    prefilledRef.current = true
    const init: Record<string, string> = {}
    for (const v of registro.valores) {
      if (v.valorTexto != null)        init[v.planillaCampoId] = v.valorTexto
      else if (v.valorNumero != null)  init[v.planillaCampoId] = String(v.valorNumero)
      else if (v.valorFecha != null)   init[v.planillaCampoId] = v.valorFecha.substring(0, 10)
      else if (v.valorBit != null)     init[v.planillaCampoId] = v.valorBit ? "true" : "false"
    }
    setValores(init)
    setObservaciones(registro.observaciones ?? "")
  }

  // Modo: lo que el usuario elija (con override) sobre el default de la config.
  // El default se calcula reactivamente porque `proyecto` carga async.
  const defaultModo: "digital" | "fisico" = permitirDigital ? "digital" : "fisico"
  const [userModo, setUserModo] = useState<"digital" | "fisico" | null>(null)
  const modo = userModo ?? defaultModo
  const showToggle = permitirDigital && permitirFisico

  const [archivoFisico, setArchivoFisico] = useState<File | null>(null)

  const isLoading = loadingDetalle || loadingEstructura
  const isReadOnly = registro?.estado === "COMPLETADO" || registro?.estado === "FIRMADO" || registro?.estado === "APROBADO"

  // Breadcrumb dinámico: Ejecución → Registros → {nombre planilla}
  // "Registros" es texto (no tiene página listing), pero da contexto.
  const planillaNombre = (estructura as any)?.planilla?.nombre ?? null
  useBreadcrumb(
    planillaNombre
      ? [
          { label: "Ejecución" },
          { label: "Registros" },
          { label: planillaNombre },
        ]
      : null
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando formulario...
      </div>
    )
  }

  if (!registro || !estructura) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No se pudo cargar el registro.
      </div>
    )
  }

  const { planilla, secciones, campos } = estructura

  // Agrupar campos por sección (null = sin sección)
  const camposPorSeccion = campos.reduce<Record<string, PlanillaCampoDetalle[]>>((acc, c) => {
    const key = c.planillaSeccionId ?? "__sin_seccion__"
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  const ordenSecciones = [
    ...secciones.sort((a, b) => a.orden - b.orden).map((s) => s.id),
    "__sin_seccion__",
  ].filter((id) => camposPorSeccion[id]?.length > 0)

  function setValue(planillaCampoId: string, val: string) {
    setValores((prev) => ({ ...prev, [planillaCampoId]: val }))
    if (errors[planillaCampoId]) setErrors((prev) => ({ ...prev, [planillaCampoId]: false }))
  }

  function setObsCampo(planillaCampoId: string, val: string) {
    setObservacionesCampo((prev) => ({ ...prev, [planillaCampoId]: val }))
  }

  function buildValores(): RegistroValorInput[] {
    return campos
      .filter((c) => c.visible && !c.soloLectura && c.campoTipoDato !== 6 && c.campoTipoDato !== 7)
      .map((c) => {
        const raw = valores[c.id] ?? c.valorDefault ?? ""
        const input: RegistroValorInput = {
          planillaCampoId: c.id,
          observaciones: observacionesCampo[c.id] || null,
        }
        switch (c.campoTipoDato) {
          case 2: input.valorNumero = raw !== "" ? Number(raw) : null; break
          case 3: input.valorFecha  = raw || null; break
          case 4: input.valorBit    = raw === "true" ? true : raw === "false" ? false : null; break
          default: input.valorTexto = raw || null
        }
        return input
      })
  }

  function validate(): boolean {
    const camposObligatorios = campos.filter(
      (c) => c.visible && !c.soloLectura && c.esObligatorio && c.campoTipoDato !== 6 && c.campoTipoDato !== 7
    )
    const newErrors: Record<string, boolean> = {}
    for (const c of camposObligatorios) {
      const val = valores[c.id] ?? c.valorDefault ?? ""
      if (val === "" || val == null) newErrors[c.id] = true
    }
    setErrors(newErrors)
    const firstErrorId = Object.keys(newErrors)[0]
    if (firstErrorId) {
      document.getElementById(`campo-${firstErrorId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmitDigital() {
    if (!validate()) return
    await completarDigital.mutateAsync({
      observaciones: observaciones || null,
      valores: buildValores(),
    })
    router.back()
  }

  async function handleSubmitFisico() {
    if (!archivoFisico) return
    const fd = new FormData()
    fd.append("Archivo", archivoFisico)
    if (observaciones) fd.append("Observaciones", observaciones)
    await completarFisico.mutateAsync(fd)
    router.back()
  }

  const isSaving = completarDigital.isPending || completarFisico.isPending

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header de contexto */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            {planilla.codigo && <span className="mr-2">{planilla.codigo}</span>}
            Registro <span className="font-mono">{registroId.slice(0, 8)}…</span>
            {registro.porcentajeCompletitud > 0 && (
              <span className="ml-3 font-medium text-blue-700">{registro.porcentajeCompletitud}% completado</span>
            )}
          </p>
        </div>
        {isReadOnly && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`/api/registros/${registroId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Descargar PDF</span>
              </Button>
            </a>
            {registro.estado === "COMPLETADO" && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700">
                <Clock className="h-3.5 w-3.5" /> Pendiente de firma
              </span>
            )}
            {registro.estado === "FIRMADO" && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Firmado
              </span>
            )}
            {registro.estado === "APROBADO" && (
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado
              </span>
            )}
          </div>
        )}
      </div>

      {registro.porcentajeCompletitud > 0 && (
        <BarraAvance porcentaje={registro.porcentajeCompletitud} />
      )}

      {!isReadOnly && showToggle && (
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
          <button
            onClick={() => setUserModo("digital")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              modo === "digital" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Completar formulario
          </button>
          <button
            onClick={() => setUserModo("fisico")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              modo === "fisico" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Cargar PDF físico
          </button>
        </div>
      )}

      {/* ── Modo PDF físico ── */}
      {modo === "fisico" && !isReadOnly && permitirFisico && (
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Cargar planilla física escaneada</h2>
          <p className="text-sm text-muted-foreground">
            Adjuntá el archivo PDF o imagen (JPG/PNG) de la planilla completada a mano.
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <FileUp className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">
              {archivoFisico ? archivoFisico.name : "Seleccioná o arrastrá el archivo aquí"}
            </span>
            <span className="text-xs text-muted-foreground mt-1">PDF, JPG o PNG · máx. 20 MB</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(e) => setArchivoFisico(e.target.files?.[0] ?? null)}
            />
          </label>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Observaciones (opcional)</label>
            <Textarea
              placeholder="Notas sobre el registro físico..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmitFisico}
            disabled={!archivoFisico || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir y completar
          </Button>
        </div>
      )}

      {/* ── Registro físico (solo lectura) ── */}
      {registro.esFisico && isReadOnly && (
        <div className="rounded-xl border bg-orange-50 border-orange-200 p-5 flex items-center gap-4">
          <FileImage className="h-8 w-8 text-orange-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-800">Registro cargado como planilla física</p>
            <p className="text-xs text-orange-600 mt-0.5">Este registro fue completado con un documento escaneado.</p>
          </div>
          <a href={`/api/registros/${registroId}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100">
              <Download className="h-3.5 w-3.5" />
              Ver archivo
            </Button>
          </a>
        </div>
      )}

      {/* ── Modo formulario digital ──
          Se muestra cuando: el registro es de solo lectura digital (para visualizar),
          o cuando es editable y el proyecto permite completar digitalmente. */}
      {!registro.esFisico && (isReadOnly || (modo === "digital" && permitirDigital)) && (
        <div className="space-y-6">
          {ordenSecciones.map((seccionId) => {
            const seccion = secciones.find((s) => s.id === seccionId)
            const camposSeccion = camposPorSeccion[seccionId]
              .filter((c) => c.visible)
              .sort((a, b) => a.orden - b.orden)

            return (
              <div key={seccionId} className="rounded-xl border bg-white overflow-hidden">
                {seccion && (
                  <div className="px-5 py-3 bg-gray-50 border-b">
                    <h2 className="font-semibold text-gray-800">{seccion.nombre}</h2>
                  </div>
                )}
                <div className="p-5 space-y-5">
                  {camposSeccion.map((campo) => (
                    <CampoInput
                      key={campo.id}
                      campo={campo}
                      value={valores[campo.id] ?? campo.valorDefault ?? ""}
                      observacion={observacionesCampo[campo.id] ?? ""}
                      onChange={(v) => setValue(campo.id, v)}
                      onObservacionChange={(v) => setObsCampo(campo.id, v)}
                      readOnly={isReadOnly || campo.soloLectura}
                      hasError={!!errors[campo.id]}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Observaciones generales */}
          <div className="rounded-xl border bg-white p-5 space-y-2">
            <label className="text-sm font-semibold text-gray-700 block">
              Observaciones generales
            </label>
            <Textarea
              placeholder="Notas sobre este registro..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={isReadOnly}
              rows={3}
            />
          </div>

          {!isReadOnly && (
            <div className="flex flex-col items-end gap-2 pb-4">
              {Object.values(errors).some(Boolean) && (
                <p className="text-sm text-red-600">
                  Completá los campos obligatorios marcados en rojo antes de guardar.
                </p>
              )}
              <Button onClick={handleSubmitDigital} disabled={isSaving} className="gap-2 px-6">
                {isSaving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Save className="h-4 w-4" />
                }
                Guardar y completar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Firmas ── */}
      {(registro.estado === "COMPLETADO" || registro.estado === "FIRMADO") && (
        <FirmasSection registroId={registroId} />
      )}
    </div>
  )
}

// ─── Sección de firmas ────────────────────────────────────────────────────────

function FirmasSection({ registroId }: { registroId: string }) {
  const { data: raw, isLoading } = useGetFirmasStatus(registroId)
  const firmar = useFirmarRegistro(registroId)
  const status = (raw as any)?.data ?? raw

  const [slotFirmando, setSlotFirmando] = useState<string | null>(null)
  const [rolLibre, setRolLibre] = useState("")
  const [observacionFirma, setObservacionFirma] = useState("")

  async function handleFirmar(rolNombre: string) {
    await firmar.mutateAsync({ rolFirmante: rolNombre, observaciones: observacionFirma || null })
    setSlotFirmando(null)
    setObservacionFirma("")
    setRolLibre("")
  }

  if (isLoading) return null

  const slots: any[] = status?.slots ?? []
  const sinSlots = slots.length === 0
  const yaFirmadoLibre = status?.todasLasFirmasCompletadas && sinSlots

  // Sin slots configurados: formulario libre
  if (sinSlots) {
    return (
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b">
          <h2 className="font-semibold text-gray-800">Firma del registro</h2>
        </div>
        <div className="p-5">
          {yaFirmadoLibre ? (
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Check className="h-4 w-4" /> Registro firmado
            </div>
          ) : slotFirmando === "__libre__" ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Tu rol <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Ej: Inspector, Supervisor..."
                  value={rolLibre}
                  onChange={(e) => setRolLibre(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones (opcional)</label>
                <Textarea
                  placeholder="Notas sobre esta firma..."
                  value={observacionFirma}
                  onChange={(e) => setObservacionFirma(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleFirmar(rolLibre)}
                  disabled={firmar.isPending || !rolLibre.trim()}
                >
                  {firmar.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <PenLine className="h-3.5 w-3.5" />
                  }
                  Confirmar firma
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSlotFirmando(null)} disabled={firmar.isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => { setSlotFirmando("__libre__"); setObservacionFirma("") }}
            >
              <PenLine className="h-3.5 w-3.5" />
              Firmar registro
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Firmas</h2>
        <span className="text-xs text-muted-foreground">
          {status.firmasCompletadas} / {status.totalFirmas} completadas
        </span>
      </div>
      <div className="divide-y">
        {slots.map((slot: any) => {
          const firmado = !!slot.firmaId
          const esActivo = slotFirmando === slot.id

          return (
            <div key={slot.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  {firmado ? (
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{slot.rolNombre}</p>
                    {slot.descripcion && (
                      <p className="text-xs text-muted-foreground">{slot.descripcion}</p>
                    )}
                  </div>
                </div>

                {firmado ? (
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="font-medium text-gray-700">{slot.nombreFirmante}</p>
                    <p>{new Date(slot.fechaFirma).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                ) : slot.puedeFirearUsuarioActual ? (
                  !esActivo && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 shrink-0"
                      onClick={() => { setSlotFirmando(slot.id); setObservacionFirma("") }}
                    >
                      <PenLine className="h-3.5 w-3.5" />
                      Firmar
                    </Button>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Lock className="h-3 w-3" />
                    Sin permiso
                  </span>
                )}
              </div>

              {esActivo && (
                <div className="pl-8 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Observaciones (opcional)
                    </label>
                    <Textarea
                      placeholder="Notas sobre esta firma..."
                      value={observacionFirma}
                      onChange={(e) => setObservacionFirma(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleFirmar(slot.rolNombre)}
                      disabled={firmar.isPending}
                    >
                      {firmar.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <PenLine className="h-3.5 w-3.5" />
                      }
                      Confirmar firma
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSlotFirmando(null)}
                      disabled={firmar.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Campo dinámico ──────────────────────────────────────────────────────────

function CampoInput({
  campo, value, observacion, onChange, onObservacionChange, readOnly, hasError,
}: {
  campo: PlanillaCampoDetalle
  value: string
  observacion: string
  onChange: (v: string) => void
  onObservacionChange: (v: string) => void
  readOnly: boolean
  hasError?: boolean
}) {
  const label = (
    <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
      {campo.campoEtiqueta || campo.campoNombre}
      {campo.esObligatorio && <span className="text-red-500">*</span>}
      {campo.campoUnidad && (
        <span className="text-xs text-muted-foreground font-normal">({campo.campoUnidad})</span>
      )}
    </label>
  )

  let input: React.ReactNode

  switch (campo.campoTipoDato) {
    case 2: // Número
      input = (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder="0"
        />
      )
      break
    case 3: // Fecha
      input = (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      )
      break
    case 4: // Boolean
      input = (
        <Select value={value} onValueChange={onChange} disabled={readOnly}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sí</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      )
      break
    case 5: // Lista
      input = (
        <Select value={value} onValueChange={onChange} disabled={readOnly}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná una opción..." />
          </SelectTrigger>
          <SelectContent>
            {campo.opciones.sort((a, b) => a.orden - b.orden).map((op) => (
              <SelectItem key={op.id} value={op.valor}>
                {op.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
      break
    case 6: // Firma — manejada por separado
      return (
        <div className="space-y-1">
          {label}
          <div className="rounded-lg border border-dashed bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
            La firma se gestiona al finalizar el formulario.
          </div>
        </div>
      )
    case 7: // Adjunto
      return (
        <div className="space-y-1">
          {label}
          <div className="rounded-lg border border-dashed bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
            Los adjuntos se gestionan por separado.
          </div>
        </div>
      )
    default: // 1 = Texto
      input = (
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder={campo.valorDefault ?? ""}
        />
      )
  }

  return (
    <div id={`campo-${campo.id}`} className="space-y-1.5">
      {label}
      <div className={hasError ? "ring-2 ring-red-400 rounded-md" : undefined}>
        {input}
      </div>
      {hasError && (
        <p className="text-xs text-red-500">Este campo es obligatorio.</p>
      )}
    </div>
  )
}
