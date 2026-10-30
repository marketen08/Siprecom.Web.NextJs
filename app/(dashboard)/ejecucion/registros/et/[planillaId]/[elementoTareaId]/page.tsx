"use client"

import { useRef, useState, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import { ESTADO_ELEMENTO_TAREA, type ElementoTarea } from "@/features/elementos-tareas/types"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { FirmaPanel } from "@/features/registros/components/firma-panel"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"
import {
  CargaFisicaUploader,
  type CargaFisicaSubmitParams,
} from "@/features/registros/components/carga-fisica-uploader"
import { useGetFirmasConfigEfectivaPorEt } from "@/features/elementos-tareas/api/use-get-firmas-config-efectiva"
import { useGetPlanilla } from "@/features/planillas/api/use-get-planilla"
import type { Planilla } from "@/features/planillas/types"
import { useGetRegistroArchivos } from "@/features/registros/api/use-registro-archivos"
import { RegistroAdjuntos } from "@/features/registros/components/registro-adjuntos"
import { useCanWrite } from "@/lib/use-roles"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Loader2, ArrowLeft, FileUp, FileText, Paperclip, Upload, AlertTriangle,
} from "lucide-react"

// ─── Hook: obtener ElementoTarea por ID ───────────────────────────────────────

function useGetElementoTarea(id: string) {
  return useQuery({
    queryKey: ["elemento-tarea", id],
    queryFn: () => apiClient.get<{ data: ElementoTarea }>(`/api/elementos-tareas/${id}`),
    enabled: !!id,
    retry: 1,
  })
}

// ─── Página ───────────────────────────────────────────────────────────────────

function CargarPdfContent() {
  const params  = useParams()
  const router  = useRouter()
  const elementoTareaId = params.elementoTareaId as string
  const planillaIdEsperada = (params.planillaId as string).toLowerCase()
  const elementoTareaIdEsperada = elementoTareaId.toLowerCase()

  const queryClient = useQueryClient()

  const { data: raw, isLoading, isError } = useGetElementoTarea(elementoTareaId)
  const tarea = raw?.data

  // Datos del elemento (TAG, tipo, especialidad) — encadenamos al fetch de la tarea.
  const { data: elementoRaw } = useGetElemento(tarea?.elementoId ?? null)
  const elemento = elementoRaw?.data

  // Proyecto para saber si los PDFs físicos son pre-firmados (cambia el wording).
  const { data: proyectoRaw } = useGetProyecto(tarea?.proyectoId ?? null)
  const proyecto = proyectoRaw?.data
  const preFirmado = proyecto?.registrosFisicosPreFirmados ?? false

  // Config de firmas efectiva — para saber si activar detección visual de firma.
  const { data: firmasConfigRaw } = useGetFirmasConfigEfectivaPorEt(elementoTareaId)
  const hayFirmasFisicas = firmasConfigRaw?.data?.hayFirmasFisicas ?? false
  const cantidadFirmasFisicas = firmasConfigRaw?.data?.cantidadSlotsFisica ?? 0
  const rechazarBajaResolucion = firmasConfigRaw?.data?.rechazarBajaResolucion ?? false
  const anchoMinimoImagen = firmasConfigRaw?.data?.anchoMinimoImagen ?? 1500

  // Breadcrumb navegable — mismo patrón que /ejecucion/registros/[id]:
  // Ejecución → Registros → {Elemento (link)} → {Tarea} → Cargar planilla física.
  // El nombre del elemento linkea al listado con el elemento pre-seleccionado
  // así el operador puede volver a la vista del elemento y sus tareas.
  const elementoIdReg = tarea?.elementoId ?? elemento?.id ?? null
  const elementoNombreReg = tarea?.elementoNombre ?? elemento?.nombre ?? null
  const tareaNombreReg = tarea?.tareaNombre ?? null
  const cargaLabel = preFirmado ? "Cargar registro firmado" : "Cargar planilla física"
  useBreadcrumb(
    elementoNombreReg || tareaNombreReg
      ? [
          { label: "Ejecución" },
          { label: "Registros" },
          ...(elementoNombreReg
            ? [{
                label: elementoNombreReg,
                href: elementoIdReg ? `/ejecucion/elementos?elementoId=${elementoIdReg}` : undefined,
              }]
            : []),
          ...(tareaNombreReg ? [{ label: tareaNombreReg }] : []),
          { label: cargaLabel },
        ]
      : [
          { label: "Ejecución" },
          { label: "Registros" },
          { label: cargaLabel },
        ]
  )

  const [observaciones, setObs]     = useState("")
  const [subiendo, setSubiendo]     = useState<"idle" | "iniciando" | "subiendo" | "ok" | "error">("idle")
  const [mensajeError, setError]    = useState("")
  const [registroIdFinal, setRegistroIdFinal] = useState<string | null>(null)
  const [urlArchivo, setUrlArchivo] = useState<string | null>(null)
  // Registro creado al iniciar la tarea desde esta página (por un adjunto o por la
  // carga de la planilla) — evita depender del refetch de la ET para conocerlo.
  const [registroIniciado, setRegistroIniciado] = useState<string | null>(null)
  const canWrite = useCanWrite()

  // Planilla: si es carátula, el respaldo de la tarea son los adjuntos — se piden
  // primero y, si la planilla los exige, sin adjuntos no se puede subir la carátula.
  const { data: planillaRaw } = useGetPlanilla(planillaIdEsperada)
  const planilla = ((planillaRaw as { data?: Planilla } | undefined)?.data ?? planillaRaw) as Planilla | undefined
  const esCaratula = planilla?.esCaratula ?? false
  const exigeAdjuntos = planilla?.exigeDocumentacionAdjunta ?? false

  const registroActualId = registroIniciado ?? tarea?.registroId ?? null
  const { data: archivosRaw, isLoading: cargandoArchivos } = useGetRegistroArchivos(registroActualId)
  const cantidadAdjuntos = (archivosRaw?.data ?? [])
    .filter((a) => a.posicion > 0 && a.posicion < 999).length

  // Crea el Registro de una tarea PENDIENTE. Devuelve el registroId o lanza con el
  // mensaje del backend.
  async function iniciarTarea(): Promise<string> {
    const res = await fetch(`/api/elementos-tareas/${elementoTareaId}/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message ?? "No se pudo iniciar la tarea.")
    const id: string | null = json?.data?.registroId ?? json?.registroId ?? null
    if (!id) throw new Error("No se encontró el registro asociado.")
    setRegistroIniciado(id)
    queryClient.invalidateQueries({ queryKey: ["elemento-tarea", elementoTareaId] })
    return id
  }

  // ── Handler que recibe el componente después de todos los gates ────────────

  async function handleSubmit(params: CargaFisicaSubmitParams) {
    if (!tarea) return
    setSubiendo("iniciando")
    setError("")

    let registroId = registroIniciado ?? tarea.registroId

    // Si la tarea está PENDIENTE (y no se inició ya al adjuntar), primero iniciamos
    // para crear el Registro.
    if (tarea.estado === 1 && !registroIniciado) {
      try {
        registroId = await iniciarTarea()
      } catch (e) {
        setError((e as Error).message)
        setSubiendo("error")
        return
      }
    }

    if (!registroId) {
      setError("No se encontró el registro asociado.")
      setSubiendo("error")
      return
    }

    setSubiendo("subiendo")

    const form = new FormData()
    form.append("Archivo", params.archivoFinal)
    if (observaciones.trim()) form.append("Observaciones", observaciones.trim())
    if (params.qrOverrideDetalle) form.append("QrOverrideDetalle", params.qrOverrideDetalle)
    if (params.firmaOverrideDetalle) form.append("FirmaOverrideDetalle", params.firmaOverrideDetalle)

    const res = await fetch(`/api/registros/${registroId}/completar/fisico`, {
      method: "POST",
      body: form,
    })

    if (res.ok) {
      setRegistroIdFinal(registroId)
      // Invalida los queries stale (avance, ET, registros, mis-firmas, estadísticas,
      // preservación) para que las pantallas de las que viene el user se actualicen
      // sin refresh al volver.
      invalidarPostCargaRegistro(queryClient, registroId)
      // SAS URL del archivo recién subido para "Ver archivo".
      try {
        const archRes = await fetch(`/api/registros/${registroId}/archivos`)
        if (archRes.ok) {
          const archJson = await archRes.json()
          const primero = archJson?.data?.[0]
          if (primero?.url) setUrlArchivo(primero.url)
        }
      } catch { /* no crítico */ }
      setSubiendo("ok")
    } else {
      const json = await res.json().catch(() => ({}))
      setError(json?.message ?? "Error al subir el archivo.")
      setSubiendo("error")
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Cargando información de la tarea...</span>
      </div>
    )
  }

  if (isError || !tarea) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <p className="text-red-600 font-medium">No se encontró la tarea.</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
      </div>
    )
  }

  const estadoLabel = ESTADO_ELEMENTO_TAREA[tarea.estado as keyof typeof ESTADO_ELEMENTO_TAREA] ?? tarea.estadoTexto
  const detallesElemento = [
    elemento?.elementoTipoNombre,
    elemento?.elementoTipoEspecialidadNombre,
  ].filter(Boolean) as string[]

  // Estado no permite carga
  const estadosPermitidos = [1, 2, 5] // PENDIENTE, EN_PROCESO, RECHAZADO
  if (!estadosPermitidos.includes(tarea.estado)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <TaskHeader
          tarea={tarea}
          elemento={elemento}
          estadoLabel={estadoLabel}
          detallesElemento={detallesElemento}
        />
        <div className="flex flex-col items-center justify-center gap-4 text-center py-10 rounded-xl border border-dashed bg-gray-50">
          <FileText className="h-12 w-12 text-gray-300" />
          <p className="text-gray-600 font-medium">
            Esta tarea está en estado <span className="font-bold">{estadoLabel}</span> y no admite carga de planilla.
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </div>
      </div>
    )
  }

  // Éxito
  if (subiendo === "ok") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <TaskHeader
          tarea={tarea}
          elemento={elemento}
          estadoLabel={estadoLabel}
          detallesElemento={detallesElemento}
        />
        <div className="rounded-xl border bg-green-50 border-green-200 p-6 space-y-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900">Planilla cargada correctamente</h2>
            <p className="text-sm text-muted-foreground">
              {preFirmado
                ? "El archivo fue subido y la tarea quedó marcada como Firmado físico."
                : "El archivo fue subido. La tarea queda en Completado a la espera de firmas digitales."}
            </p>
            <div className="flex gap-3 flex-wrap justify-center pt-1">
              {urlArchivo && (
                <a href={urlArchivo} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="gap-2">
                    <FileUp className="h-4 w-4" />
                    Ver archivo subido
                  </Button>
                </a>
              )}
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver
              </Button>
            </div>
          </div>
        </div>

        {registroIdFinal && (
          <RegistroAdjuntos registroId={registroIdFinal} permiteSubir={canWrite} />
        )}

        {registroIdFinal && !preFirmado && <FirmaPanel registroId={registroIdFinal} />}
      </div>
    )
  }

  const ocupado = subiendo === "iniciando" || subiendo === "subiendo"
  const submittingLabel = subiendo === "iniciando" ? "Iniciando tarea..." : "Subiendo archivo..."
  // RECHAZADO: el registro no acepta adjuntos nuevos (el backend lo rechaza).
  const adjuntosReadOnly = tarea.estado === 5 || !canWrite
  const faltanAdjuntos = exigeAdjuntos && !cargandoArchivos && cantidadAdjuntos === 0

  const bloqueAdjuntos = (
    <DocumentacionAdjunta
      registroId={registroActualId}
      readOnly={adjuntosReadOnly}
      onIniciar={iniciarTarea}
    />
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <TaskHeader
        tarea={tarea}
        elemento={elemento}
        estadoLabel={estadoLabel}
        detallesElemento={detallesElemento}
      />

      {esCaratula ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Esta planilla es una <span className="font-semibold">carátula</span>: la documentación
            que respalda la tarea va adjunta. Subí primero los documentos y después la carátula
            firmada.
          </p>
          {bloqueAdjuntos}
        </div>
      ) : (
        <details className="rounded-xl border bg-white [&>summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-medium text-gray-700">
            <Paperclip className="h-4 w-4" />
            Adjuntar documentación
            <span className="font-normal text-gray-400">(opcional)</span>
            {cantidadAdjuntos > 0 && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {cantidadAdjuntos} archivo{cantidadAdjuntos !== 1 ? "s" : ""}
              </span>
            )}
          </summary>
          <div className="border-t p-3">{bloqueAdjuntos}</div>
        </details>
      )}

      {faltanAdjuntos && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Esta planilla exige al menos un archivo adjunto. Subí la documentación de respaldo
            para habilitar la carga de la planilla.
          </span>
        </div>
      )}

      <CargaFisicaUploader
        esperadoPlanillaId={planillaIdEsperada}
        esperadoElementoTareaId={elementoTareaIdEsperada}
        hayFirmasFisicas={hayFirmasFisicas}
        cantidadFirmasFisicas={cantidadFirmasFisicas}
        rechazarBajaResolucion={rechazarBajaResolucion}
        anchoMinimoImagen={anchoMinimoImagen}
        onSubmit={handleSubmit}
        disabled={faltanAdjuntos}
        onArchivoElegido={() => {
          // Al elegir un archivo nuevo, limpiamos el error del intento anterior.
          if (mensajeError) setError("")
          if (subiendo === "error") setSubiendo("idle")
        }}
        isSubmitting={ocupado}
        submitLabel="Subir planilla"
        submittingLabel={submittingLabel}
        titulo={preFirmado ? "Cargar registro firmado" : "Cargar planilla física"}
        descripcion={
          preFirmado
            ? "El PDF/escaneo debe contener la firma manuscrita. La tarea pasa directo a 'Firmado físico'."
            : "Subí el PDF o imagen de la planilla. Después se firma digitalmente desde el registro."
        }
      >
        {/* Observaciones — el uploader las renderiza entre banners y botón. */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Observaciones <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObs(e.target.value)}
            rows={3}
            maxLength={1000}
            disabled={ocupado}
            placeholder="Ej: planilla completada con firma del supervisor de campo"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
        </div>

        {mensajeError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{mensajeError}</p>
        )}
      </CargaFisicaUploader>
    </div>
  )
}

// ─── Adjuntos: si todavía no hay registro, el primer archivo inicia la tarea ──

function DocumentacionAdjunta({
  registroId,
  readOnly,
  onIniciar,
}: {
  registroId: string | null
  readOnly: boolean
  onIniciar: () => Promise<string>
}) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (registroId) {
    return <RegistroAdjuntos registroId={registroId} permiteSubir={!readOnly} readOnly={readOnly} />
  }

  // Tarea PENDIENTE: no hay registro donde colgar el archivo. Al subir el primero se
  // inicia la tarea (igual que al subir la planilla) y desde ahí se muestra el bloque normal.
  async function subirPrimero(file: File) {
    setError(null)
    setSubiendo(true)
    try {
      const id = await onIniciar()
      const fd = new FormData()
      fd.append("archivo", file)
      const res = await fetch(`/api/registros/${id}/archivos`, { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message ?? "Error al subir el archivo")
      }
      queryClient.invalidateQueries({ queryKey: ["registros", id, "archivos"] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="px-5 py-3 bg-gray-50 border-b">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Archivos adjuntos
        </h2>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          La tarea todavía no está iniciada. Al subir el primer archivo se inicia automáticamente.
        </p>
        {!readOnly && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) subirPrimero(f)
                if (inputRef.current) inputRef.current.value = ""
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => inputRef.current?.click()}
                disabled={subiendo}
              >
                {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {subiendo ? "Subiendo..." : "Subir archivo"}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                PDF, imágenes, Word, Excel, CSV. Máximo 25 MB.
              </span>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Header reutilizable: misma estructura que /ejecucion/registros/[id] ─────

const ESTADO_BADGE_COLOR: Record<number, string> = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-teal-100 text-teal-700",
  5: "bg-red-100 text-red-700",
  6: "bg-gray-50 text-gray-400",
  7: "bg-emerald-100 text-emerald-700",
}

function TaskHeader({
  tarea,
  elemento,
  estadoLabel,
  detallesElemento,
}: {
  tarea: ElementoTarea
  elemento: { tag: string; nombre: string } | null | undefined
  estadoLabel: string
  detallesElemento: string[]
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <h1 className="text-lg font-bold text-gray-900 truncate">
          {tarea.tareaNombre}
        </h1>
        {elemento && (
          <p className="text-sm text-gray-700 truncate">
            <span className="font-mono font-semibold text-blue-700 mr-2">{elemento.tag}</span>
            {elemento.nombre}
          </p>
        )}
        {detallesElemento.length > 0 && (
          <p className="text-xs text-muted-foreground">{detallesElemento.join(" · ")}</p>
        )}
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium shrink-0 ${
          ESTADO_BADGE_COLOR[tarea.estado] ?? "bg-gray-100 text-gray-700"
        }`}
      >
        {estadoLabel}
      </span>
    </div>
  )
}

export default function CargarPdfPage() {
  return (
    <Suspense>
      <CargarPdfContent />
    </Suspense>
  )
}
