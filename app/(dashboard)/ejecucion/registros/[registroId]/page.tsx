"use client"

import { use, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Save, CheckCircle2, Loader2, Download, PenLine, Clock, Check, Lock } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"

import { apiClient } from "@/lib/api-client"
import { useGetRegistroDetalle } from "@/features/registros/api/use-get-registro-detalle"
import { useCompletarDigital } from "@/features/registros/api/use-completar-digital"
import { useCompletarFisico } from "@/features/registros/api/use-completar-fisico"
import { useGetPlanillaEstructura } from "@/features/planillas/api/use-get-planilla-estructura"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetFirmasStatus } from "@/features/registros/api/use-get-firmas-status"
import { useFirmarRegistro } from "@/features/registros/api/use-firmar-registro"
import { useGetMiFirma, useUploadMiFirma } from "@/features/usuarios/api/use-mi-firma"
import { SignaturePad, type SignaturePadHandle } from "@/components/ui/signature-pad"
import { RegistroAdjuntos } from "@/features/registros/components/registro-adjuntos"
import { CampoTablaInput, tablaTieneDatos } from "@/features/registros/components/campo-tabla-input"
import { ProximoCicloDialog } from "@/features/preservacion/components/proximo-ciclo-dialog"
import {
  CargaFisicaUploader,
  type CargaFisicaSubmitParams,
} from "@/features/registros/components/carga-fisica-uploader"
import { useGetFirmasConfigEfectiva } from "@/features/registros/api/use-get-firmas-config-efectiva"
import { useCanWrite } from "@/lib/use-roles"

import type { RegistroValorInput, RegistroDetalle } from "@/features/registros/types"
import type { ElementoTarea } from "@/features/elementos-tareas/types"
import type { PlanillaCampoDetalle } from "@/features/planillas/types"

// Hook local: la lista por elemento ya existe pero no hay uno por ID; lo inlineamos acá.
function useGetElementoTarea(id: string | null) {
  return useQuery({
    queryKey: ["elementos-tareas", id],
    queryFn: () => apiClient.get<{ data: ElementoTarea }>(`/api/elementos-tareas/${id}`),
    enabled: !!id,
  })
}
import { packCampos } from "@/features/planillas/lib/pack-campos"

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

interface PageProps {
  params: Promise<{ registroId: string }>
}

// Las clases de Tailwind deben ser literales para que el JIT las detecte; usamos un map estático.
const COL_SPAN_SM: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  11: "sm:col-span-11",
  12: "sm:col-span-12",
}

function clampTamano(t: number | null | undefined): number {
  const n = typeof t === "number" && Number.isFinite(t) ? Math.floor(t) : 4
  return Math.max(1, Math.min(12, n))
}

export default function RegistroFormPage({ params }: PageProps) {
  const { registroId } = use(params)
  const router = useRouter()

  const { data: detalleRaw, isLoading: loadingDetalle } = useGetRegistroDetalle(registroId)
  const registro = detalleRaw?.data

  const planillaId = registro?.planillaId ?? null
  const proyectoId = registro?.proyectoId ?? null

  const { data: estructuraRaw, isLoading: loadingEstructura } = useGetPlanillaEstructura(planillaId)
  type EstructuraData = {
    planilla: { permiteAdjuntos?: boolean } & Record<string, any>
    secciones: Array<{ id: string; nombre: string; orden: number } & Record<string, any>>
    campos: PlanillaCampoDetalle[]
  }
  const estructura = ((estructuraRaw as any)?.data ?? estructuraRaw) as EstructuraData | undefined

  const { data: proyectoRaw } = useGetProyecto(proyectoId)
  const proyecto = proyectoRaw?.data

  // Datos del contexto: tarea (para el título y nombre del elemento) y elemento (TAG, tipo,
  // especialidad). Las dos queries son secuenciales: tarea trae el elementoId.
  const elementoTareaId = registro?.elementoTareaId ?? null
  const { data: tareaRaw } = useGetElementoTarea(elementoTareaId)
  const elementoTarea = tareaRaw?.data
  const elementoId = elementoTarea?.elementoId ?? null
  const { data: elementoRaw } = useGetElemento(elementoId)
  const elemento = elementoRaw?.data

  // Defaults defensivos mientras carga: digital permitido, físico no.
  // Coincide con el comportamiento previo cuando solo existía permitirRegistroFisico.
  const permitirFisico = proyecto?.permitirRegistroFisico ?? false
  const permitirDigital = proyecto?.permitirRegistroDigital ?? true
  // Adjuntos: AND entre proyecto y planilla. Si alguno veta, no se aceptan.
  const permiteAdjuntosProyecto = proyecto?.permiteAdjuntos ?? true
  const permiteAdjuntosPlanilla = (estructura as any)?.planilla?.permiteAdjuntos ?? true
  const permiteAdjuntos = permiteAdjuntosProyecto && permiteAdjuntosPlanilla

  const completarDigital = useCompletarDigital(registroId)
  const completarFisico = useCompletarFisico(registroId)
  // Consultor/Auditor: solo lectura del registro (form navegable, adjuntos y firmas
  // visibles, pero sin poder guardar/completar/firmar/subir).
  const canWrite = useCanWrite()

  // Form state: { [planillaCampoId]: value }
  const [valores, setValores] = useState<Record<string, string>>({})
  const [observaciones, setObservaciones] = useState("")
  const [observacionesCampo, setObservacionesCampo] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // Pre-rellenar con valores existentes cuando cargan. Si el registro todavía no
  // tiene valores guardados, el backend devuelve `valoresPrecargados` (datos del
  // elemento+planilla) que se usan como default editable.
  const prefilledRef = useRef(false)
  if (registro && estructura && !prefilledRef.current) {
    prefilledRef.current = true
    const init: Record<string, string> = {}
    const fuente = registro.valores.length > 0
      ? registro.valores
      : (registro.valoresPrecargados ?? [])
    for (const v of fuente) {
      if (v.valorTexto != null)        init[v.planillaCampoId] = v.valorTexto
      else if (v.valorNumero != null)  init[v.planillaCampoId] = String(v.valorNumero)
      else if (v.valorFecha != null)   init[v.planillaCampoId] = v.valorFecha.substring(0, 10)
      else if (v.valorBit != null)     init[v.planillaCampoId] = v.valorBit ? "true" : "false"
      else if (v.valorJson != null)    init[v.planillaCampoId] = v.valorJson
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

  const { data: firmasConfigRaw } = useGetFirmasConfigEfectiva(registroId)
  const hayFirmasFisicas = firmasConfigRaw?.data?.hayFirmasFisicas ?? false

  // Info del próximo ciclo de preservación generado por completar/firmar. Cuando
  // viene con generado=true mostramos el dialog y postergamos el router.back()
  // hasta que el usuario lo cierre (así ve la fecha antes de perder la pantalla).
  const [proximoCicloFecha, setProximoCicloFecha] = useState<string | null>(null)

  const isLoading = loadingDetalle || loadingEstructura
  // Consultor/Auditor fuerzan modo readonly aunque el registro esté editable.
  const isReadOnly = !canWrite
    || registro?.estado === "COMPLETADO"
    || registro?.estado === "FIRMADO"
    || registro?.estado === "APROBADO"

  // Breadcrumb dinámico: Ejecución → Registros → {Elemento (link)} → {Tarea}
  // El nombre del elemento es link a la pantalla de elementos con el sheet
  // abierto (?elementoId=...), para volver con el contexto intacto.
  // Si todavía no tenemos elemento/tarea, caemos al nombre de la planilla.
  const elementoNombre = registro?.elementoNombre ?? null
  const elementoIdReg = registro?.elementoId ?? null
  const tareaNombre = registro?.tareaNombre ?? null
  const planillaNombre = (estructura as any)?.planilla?.nombre ?? null
  useBreadcrumb(
    elementoNombre || tareaNombre || planillaNombre
      ? [
          { label: "Ejecución" },
          { label: "Registros" },
          ...(elementoNombre
            ? [{
                label: elementoNombre,
                href: elementoIdReg ? `/ejecucion/elementos?elementoId=${elementoIdReg}` : undefined,
              }]
            : []),
          { label: tareaNombre ?? planillaNombre ?? "—" },
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
    // Excluimos tipos que NO son inputs digitales: Imagen (8) y Label (10).
    return campos
      .filter((c) => c.visible && !c.soloLectura && c.campoTipoDato !== 8 && c.campoTipoDato !== 10)
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
          case 9: input.valorJson   = raw || null; break
          default: input.valorTexto = raw || null
        }
        return input
      })
  }

  function validate(): boolean {
    const camposObligatorios = campos.filter(
      (c) => c.visible && !c.soloLectura && c.esObligatorio && c.campoTipoDato !== 8 && c.campoTipoDato !== 10
    )
    const newErrors: Record<string, boolean> = {}
    for (const c of camposObligatorios) {
      const val = valores[c.id] ?? c.valorDefault ?? ""
      const vacio = c.campoTipoDato === 9 ? !tablaTieneDatos(val) : (val === "" || val == null)
      if (vacio) newErrors[c.id] = true
    }
    setErrors(newErrors)
    const firstErrorId = Object.keys(newErrors)[0]
    if (firstErrorId) {
      document.getElementById(`campo-${firstErrorId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    return Object.keys(newErrors).length === 0
  }

  // Extrae la fecha del próximo ciclo del response de completar/firmar, si el
  // backend disparó el generador de preservación. Retorna null cuando no
  // corresponde (registro no era de preservación, flag off, elemento retirado).
  function extraerFechaProximoCiclo(res: unknown): string | null {
    const data = (res as { data?: RegistroDetalle } | undefined)?.data
    const info = data?.preservacionCicloGenerado
    return info?.generado && info.fechaPlanificadaProximo ? info.fechaPlanificadaProximo : null
  }

  async function handleSubmitDigital() {
    if (!validate()) return
    const res = await completarDigital.mutateAsync({
      observaciones: observaciones || null,
      valores: buildValores(),
    })
    const fecha = extraerFechaProximoCiclo(res)
    if (fecha) setProximoCicloFecha(fecha)
    else router.back()
  }

  // Callback que le pasamos al <CargaFisicaUploader>. Los gates (QR mismatch,
  // firma no detectada) y la rotación pre-subida los maneja el componente; acá
  // solo armamos el FormData, mandamos y manejamos el response.
  async function handleSubmitFisico(params: CargaFisicaSubmitParams) {
    const fd = new FormData()
    fd.append("Archivo", params.archivoFinal)
    if (observaciones) fd.append("Observaciones", observaciones)
    if (params.qrOverrideDetalle) fd.append("QrOverrideDetalle", params.qrOverrideDetalle)
    if (params.firmaOverrideDetalle) fd.append("FirmaOverrideDetalle", params.firmaOverrideDetalle)
    const res = await completarFisico.mutateAsync(fd)
    const fecha = extraerFechaProximoCiclo(res)
    if (fecha) setProximoCicloFecha(fecha)
    else router.back()
  }

  const isSaving = completarDigital.isPending || completarFisico.isPending

  // Detalles del elemento (tipo / especialidad / % completado) que van en una línea muted
  // bajo el TAG + nombre. Filtramos los nulos así no quedan separadores huérfanos.
  const detallesElemento = [
    elemento?.elementoTipoNombre,
    elemento?.elementoTipoEspecialidadNombre,
  ].filter(Boolean) as string[]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Banner de solo lectura para Consultor/Auditor: el registro se ve completo
          (formulario navegable, adjuntos, firmas) pero sin poder guardar ni firmar. */}
      {!canWrite && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 flex items-start gap-2 text-sm text-blue-900">
          <Lock className="h-4 w-4 mt-0.5 shrink-0 text-blue-700" />
          <div>
            <p className="font-medium">Modo solo lectura</p>
            <p className="text-xs">
              Podés ver el registro y descargar el PDF, pero no cargar valores, firmar ni subir archivos.
            </p>
          </div>
        </div>
      )}

      {/* Header de contexto */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          {/* Título: nombre de la tarea */}
          <h1 className="text-lg font-bold text-gray-900 truncate">
            {elementoTarea?.tareaNombre ?? "Registro"}
          </h1>
          {/* Elemento: TAG (mono azul) + nombre */}
          {elemento && (
            <p className="text-sm text-gray-700 truncate">
              <span className="font-mono font-semibold text-blue-700 mr-2">{elemento.tag}</span>
              {elemento.nombre}
            </p>
          )}
          {/* Detalles del elemento */}
          {detallesElemento.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {detallesElemento.join(" · ")}
            </p>
          )}
        </div>
        {isReadOnly && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Descargar PDF: para digitales devuelve la planilla renderizada con
                valores; para físicos devuelve el escaneo (envuelto en PDF si era
                imagen) + página final de certificado si hay firma electrónica. */}
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
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-teal-100 text-teal-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Firmado físico
              </span>
            )}
          </div>
        )}
      </div>

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

      {/* ── Modo PDF físico ──
          Todo el flow (drop zone, chequeos QR, detección firma, dialogs, rotación)
          vive en <CargaFisicaUploader>. Este componente le entrega el archivo listo
          y los detalles de override para auditoría a través del callback onSubmit. */}
      {modo === "fisico" && !isReadOnly && permitirFisico && (
        <CargaFisicaUploader
          esperadoPlanillaId={(registro.planillaId ?? "").toLowerCase()}
          esperadoElementoTareaId={(registro.elementoTareaId ?? "").toLowerCase()}
          hayFirmasFisicas={hayFirmasFisicas}
          onSubmit={handleSubmitFisico}
          isSubmitting={isSaving}
          submitLabel="Subir y completar"
          submittingLabel="Subiendo..."
          titulo="Cargar planilla física escaneada"
          descripcion="Adjuntá el archivo PDF o imagen (JPG/PNG) de la planilla completada a mano."
        >
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Observaciones (opcional)</label>
            <Textarea
              placeholder="Notas sobre el registro físico..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>
        </CargaFisicaUploader>
      )}

      {/* ── Observaciones del registro físico (read-only) ──
          El form digital ya muestra observaciones dentro de su card, pero en flujo físico
          esa card no se renderiza, así que mostramos las observaciones acá para que el
          texto cargado al subir el PDF no quede oculto. */}
      {registro.esFisico && isReadOnly && registro.observaciones && (
        <div className="rounded-xl border bg-white p-5 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observaciones
          </p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{registro.observaciones}</p>
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
              // Las tablas (tipo 9) ocupan el ancho completo: forzamos tamano 12 para que
              // packCampos las ubique en su propia fila y no se compriman junto a otros campos.
              .map((c) => (c.campoTipoDato === 9 ? { ...c, tamano: 12 } : c))

            return (
              <div key={seccionId} className="rounded-xl border bg-white overflow-hidden">
                {seccion && (
                  <div className="px-5 py-3 bg-gray-50 border-b">
                    <h2 className="font-semibold text-gray-800">{seccion.nombre}</h2>
                  </div>
                )}
                <div className="p-5 space-y-5">
                  {packCampos<PlanillaCampoDetalle>(camposSeccion).map((fila, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4">
                      {fila.map((campo) => (
                        <div key={campo.id} className={`col-span-12 ${COL_SPAN_SM[clampTamano(campo.tamano)]}`}>
                          <CampoInput
                            campo={campo}
                            value={valores[campo.id] ?? campo.valorDefault ?? ""}
                            observacion={observacionesCampo[campo.id] ?? ""}
                            onChange={(v) => setValue(campo.id, v)}
                            onObservacionChange={(v) => setObsCampo(campo.id, v)}
                            readOnly={isReadOnly || campo.soloLectura}
                            hasError={!!errors[campo.id]}
                          />
                        </div>
                      ))}
                    </div>
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

      {/* ── Adjuntos ── disponibles para digital y físico, incluso después de completar/firmar.
          Sólo se bloquean cuando el registro está RECHAZADO. APROBADO ("PDF firmado en papel")
          sigue aceptando adjuntos para sumar evidencia/fotos posteriores. */}
      <RegistroAdjuntos
        registroId={registroId}
        permiteSubir={permiteAdjuntos && canWrite}
        readOnly={registro.estado === "RECHAZADO" || !canWrite}
      />

      {/* ── Firmas ── */}
      {(registro.estado === "COMPLETADO" || registro.estado === "FIRMADO") && (
        <FirmasSection registroId={registroId} canWrite={canWrite} />
      )}

      {/* Dialog de "próximo ciclo de preservación" — se abre cuando el backend
          confirma que generó el próximo ElementoTarea al completar/firmar. En
          los flujos de completar hacemos router.back() al cerrarlo. */}
      <ProximoCicloDialog
        open={!!proximoCicloFecha}
        fecha={proximoCicloFecha}
        onClose={() => {
          setProximoCicloFecha(null)
          router.back()
        }}
      />
    </div>
  )
}

// ─── Sección de firmas ────────────────────────────────────────────────────────

function FirmasSection({ registroId, canWrite }: { registroId: string; canWrite: boolean }) {
  const { data: raw, isLoading } = useGetFirmasStatus(registroId)
  const firmar = useFirmarRegistro(registroId)
  const miFirmaQuery = useGetMiFirma()
  const uploadMiFirma = useUploadMiFirma()
  const status = (raw as any)?.data ?? raw

  const [slotFirmando, setSlotFirmando] = useState<string | null>(null)
  const [rolLibre, setRolLibre] = useState("")
  const [observacionFirma, setObservacionFirma] = useState("")
  const [modoFirma, setModoFirma] = useState<"guardada" | "dibujar">("guardada")
  const [guardarPerfil, setGuardarPerfil] = useState(false)
  const [padIsEmpty, setPadIsEmpty] = useState(true)
  const padRef = useRef<SignaturePadHandle | null>(null)

  // Preservación: la última firma electrónica puede haber gatillado el próximo
  // ciclo. Cuando el response lo indica, mostramos el dialog con la fecha; el
  // usuario ya está en la pantalla del registro y no hace falta navegar.
  const [proximoCicloFecha, setProximoCicloFecha] = useState<string | null>(null)

  const firmaGuardadaUrl = miFirmaQuery.data?.data?.url ?? null
  const modoEfectivo = firmaGuardadaUrl ? modoFirma : "dibujar"

  async function handleFirmar(rolNombre: string) {
    // Resolver firma según el modo: el "guardada" lo resuelve el backend (evita CORS browser→Azure).
    let datosFirma: string | null = null
    let usarFirmaGuardada = false
    if (modoEfectivo === "guardada" && firmaGuardadaUrl) {
      usarFirmaGuardada = true
    } else if (modoEfectivo === "dibujar") {
      datosFirma = padRef.current?.getDataUrl() ?? null
      if (!datosFirma) return
      if (guardarPerfil) {
        try { await uploadMiFirma.mutateAsync(datosFirma) } catch { /* ignore */ }
      }
    }

    const res = await firmar.mutateAsync({
      rolFirmante: rolNombre,
      observaciones: observacionFirma || null,
      datosFirma,
      usarFirmaGuardada,
    })
    setSlotFirmando(null)
    setObservacionFirma("")
    setRolLibre("")
    setGuardarPerfil(false)

    const info = (res as { data?: RegistroDetalle } | undefined)?.data?.preservacionCicloGenerado
    if (info?.generado && info.fechaPlanificadaProximo) {
      setProximoCicloFecha(info.fechaPlanificadaProximo)
    }
  }

  if (isLoading) return null

  const slots: any[] = status?.slots ?? []
  const sinSlots = slots.length === 0
  const yaFirmadoLibre = status?.todasLasFirmasCompletadas && sinSlots

  const proximoCicloDialog = (
    <ProximoCicloDialog
      open={!!proximoCicloFecha}
      fecha={proximoCicloFecha}
      onClose={() => setProximoCicloFecha(null)}
    />
  )

  // Sin slots configurados: formulario libre
  if (sinSlots) {
    return (
      <>
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

              <FirmaCapturaInline
                firmaGuardadaUrl={firmaGuardadaUrl}
                modoEfectivo={modoEfectivo}
                setModoFirma={setModoFirma}
                guardarPerfil={guardarPerfil}
                setGuardarPerfil={setGuardarPerfil}
                padRef={padRef}
                setPadIsEmpty={setPadIsEmpty}
              />

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
                  disabled={
                    firmar.isPending
                    || uploadMiFirma.isPending
                    || !rolLibre.trim()
                    || (modoEfectivo === "dibujar" && padIsEmpty)
                  }
                >
                  {firmar.isPending || uploadMiFirma.isPending
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
          ) : canWrite ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => { setSlotFirmando("__libre__"); setObservacionFirma("") }}
            >
              <PenLine className="h-3.5 w-3.5" />
              Firmar registro
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Lock className="h-3 w-3" />
              Sin firmas cargadas
            </span>
          )}
        </div>
      </div>
      {proximoCicloDialog}
      </>
    )
  }

  return (
    <>
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
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                      {slot.rolNombre}
                      {slot.tipoFirma === 2 && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-medium">
                          En papel
                        </span>
                      )}
                    </p>
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
                ) : slot.tipoFirma === 2 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 shrink-0">
                    <Clock className="h-3 w-3" />
                    Se marca al subir el PDF físico
                  </span>
                ) : canWrite && slot.puedeFirearUsuarioActual ? (
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
                  <FirmaCapturaInline
                    firmaGuardadaUrl={firmaGuardadaUrl}
                    modoEfectivo={modoEfectivo}
                    setModoFirma={setModoFirma}
                    guardarPerfil={guardarPerfil}
                    setGuardarPerfil={setGuardarPerfil}
                    padRef={padRef}
                    setPadIsEmpty={setPadIsEmpty}
                  />
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
                      disabled={
                        firmar.isPending
                        || uploadMiFirma.isPending
                        || (modoEfectivo === "dibujar" && padIsEmpty)
                      }
                    >
                      {firmar.isPending || uploadMiFirma.isPending
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
    {proximoCicloDialog}
    </>
  )
}

// ─── Captura de firma compartida (libre + slot) ─────────────────────────────

function FirmaCapturaInline({
  firmaGuardadaUrl,
  modoEfectivo,
  setModoFirma,
  guardarPerfil,
  setGuardarPerfil,
  padRef,
  setPadIsEmpty,
}: {
  firmaGuardadaUrl: string | null
  modoEfectivo: "guardada" | "dibujar"
  setModoFirma: (m: "guardada" | "dibujar") => void
  guardarPerfil: boolean
  setGuardarPerfil: (v: boolean) => void
  padRef: React.RefObject<SignaturePadHandle | null>
  setPadIsEmpty: (v: boolean) => void
}) {
  return (
    <div className="space-y-2">
      {firmaGuardadaUrl && (
        <div className="flex gap-1 p-0.5 bg-gray-100 border rounded-md w-fit">
          <button
            type="button"
            onClick={() => setModoFirma("guardada")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              modoEfectivo === "guardada" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mi firma guardada
          </button>
          <button
            type="button"
            onClick={() => setModoFirma("dibujar")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              modoEfectivo === "dibujar" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Dibujar nueva
          </button>
        </div>
      )}

      {modoEfectivo === "guardada" && firmaGuardadaUrl && (
        <div className="rounded-md border bg-white p-2 max-w-sm">
          <img src={firmaGuardadaUrl} alt="Tu firma" className="max-h-28 max-w-full object-contain mx-auto" />
        </div>
      )}

      {modoEfectivo === "dibujar" && (
        <div className="space-y-1.5">
          <SignaturePad ref={padRef} height={140} onChange={(empty) => setPadIsEmpty(empty)} />
          {!firmaGuardadaUrl && (
            <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-gray-300"
                checked={guardarPerfil}
                onChange={(e) => setGuardarPerfil(e.target.checked)}
              />
              Guardar esta firma en mi perfil para próximas veces
            </label>
          )}
        </div>
      )}
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
    <div className="flex flex-col gap-0.5">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
        {campo.campoEtiqueta}
        {campo.esObligatorio && <span className="text-red-500">*</span>}
        {campo.campoUnidad && (
          <span className="text-xs text-muted-foreground font-normal">({campo.campoUnidad})</span>
        )}
      </label>
      {campo.campoEtiquetaAlt && (
        <span className="text-xs italic text-muted-foreground">{campo.campoEtiquetaAlt}</span>
      )}
    </div>
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
        <Select value={value} onValueChange={(v) => onChange(v ?? "")} disabled={readOnly}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccioná...">
              {value === "true" ? "Sí" : value === "false" ? "No" : "Seleccioná..."}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sí</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      )
      break
    case 5: { // Lista
      const opcionesOrdenadas = [...campo.opciones].sort((a, b) => a.orden - b.orden)
      // renderMode: 0=Auto, 1=Inline, 2=Dropdown, 3=Checklist.
      // En web Checklist se renderiza como Inline (la "tabla agrupada" es solo del PDF).
      // Auto: pocas opciones (≤4) → inline; muchas → dropdown.
      const useInline =
        campo.renderMode === 1 ||
        campo.renderMode === 3 ||
        (campo.renderMode !== 2 && opcionesOrdenadas.length > 0 && opcionesOrdenadas.length <= 4)

      if (useInline) {
        input = (
          <div className="flex flex-wrap gap-2">
            {opcionesOrdenadas.map((op) => {
              const selected = value === op.valor
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => !readOnly && onChange(op.valor)}
                  disabled={readOnly}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {op.etiqueta}
                </button>
              )
            })}
          </div>
        )
      } else {
        const selectedLabel = opcionesOrdenadas.find((op) => op.valor === value)?.etiqueta
        input = (
          <Select value={value} onValueChange={(v) => onChange(v ?? "")} disabled={readOnly}>
            <SelectTrigger className="cursor-pointer disabled:cursor-not-allowed">
              <SelectValue placeholder="Seleccioná una opción...">
                {selectedLabel ?? "Seleccioná una opción..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {opcionesOrdenadas.map((op) => (
                <SelectItem key={op.id} value={op.valor}>
                  {op.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
      break
    }
    case 11: { // Checklist — opciones como checkboxes seleccionables (una única
      //         respuesta a la vez). El valor persistido es el `valor` de la opción
      //         tildada, o cadena vacía si ninguna. Click sobre la ya tildada la
      //         limpia — así el user puede corregirse sin necesitar un botón extra.
      const opcionesOrdenadas = [...campo.opciones].sort((a, b) => a.orden - b.orden)
      input = (
        <div className="flex flex-col gap-1.5">
          {opcionesOrdenadas.map((op) => {
            const checked = value === op.valor
            return (
              <label
                key={op.id}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-gray-50"
                } ${checked ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600"
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => !readOnly && onChange(checked ? "" : op.valor)}
                />
                <span className={checked ? "font-medium text-blue-900" : "text-gray-700"}>
                  {op.etiqueta}
                </span>
              </label>
            )
          })}
        </div>
      )
      break
    }
    case 9: // Tabla — celdas de texto (matriz fija o dinámica)
      input = (
        <CampoTablaInput
          campo={campo}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      )
      break
    case 10: // Label — texto fijo display-only (no input, no label de campo)
      return (
        <div
          id={`campo-${campo.id}`}
          className={`text-sm ${campo.campoSinPadding ? "" : "px-2 py-1.5"} ${campo.campoSinMargen ? "-my-2.5" : ""} ${campo.campoFondoGris ? "bg-gray-100" : ""} ${campo.campoConBorde ? "border border-gray-300 rounded" : ""} ${campo.campoNegrita ? "font-bold" : ""}`}
          style={{ textAlign: campo.campoAlineacion === 1 ? "center" : campo.campoAlineacion === 2 ? "right" : "left" }}
        >
          {campo.campoEtiqueta}
        </div>
      )
    case 8: // Imagen — parte de la planilla (global del Campo), sin input
      return (
        <div id={`campo-${campo.id}`} className="space-y-1">
          {campo.campoImagenUrl ? (
            <img
              src={campo.campoImagenUrl}
              alt={campo.campoEtiqueta ?? "Imagen"}
              className="max-w-full h-auto rounded border bg-white"
            />
          ) : (
            <div className="rounded-lg border border-dashed bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
              Imagen no disponible.
            </div>
          )}
        </div>
      )
    case 12: { // TextoArea — multilínea, respeta saltos de línea
      const rows = Math.max(1, Math.min(20, campo.campoNumeroLineas ?? 3))
      input = (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder={campo.valorDefault ?? ""}
          rows={rows}
        />
      )
      break
    }
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
