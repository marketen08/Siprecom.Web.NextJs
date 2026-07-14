"use client"

import { useState, Suspense } from "react"
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
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Loader2, ArrowLeft, FileUp, FileText,
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

  // Breadcrumb: Ejecución → Registros → Cargar planilla física
  useBreadcrumb([
    { label: "Ejecución" },
    { label: "Registros" },
    { label: preFirmado ? "Cargar registro firmado" : "Cargar planilla física" },
  ])

  const [observaciones, setObs]     = useState("")
  const [subiendo, setSubiendo]     = useState<"idle" | "iniciando" | "subiendo" | "ok" | "error">("idle")
  const [mensajeError, setError]    = useState("")
  const [registroIdFinal, setRegistroIdFinal] = useState<string | null>(null)
  const [urlArchivo, setUrlArchivo] = useState<string | null>(null)

  // ── Handler que recibe el componente después de todos los gates ────────────

  async function handleSubmit(params: CargaFisicaSubmitParams) {
    if (!tarea) return
    setSubiendo("iniciando")
    setError("")

    let registroId = tarea.registroId

    // Si la tarea está PENDIENTE, primero iniciamos para crear el Registro.
    if (tarea.estado === 1) {
      const res = await fetch(`/api/elementos-tareas/${elementoTareaId}/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.message ?? "No se pudo iniciar la tarea.")
        setSubiendo("error")
        return
      }
      registroId = json?.data?.registroId ?? json?.registroId ?? null
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

        {registroIdFinal && !preFirmado && <FirmaPanel registroId={registroIdFinal} />}
      </div>
    )
  }

  const ocupado = subiendo === "iniciando" || subiendo === "subiendo"
  const submittingLabel = subiendo === "iniciando" ? "Iniciando tarea..." : "Subiendo archivo..."

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <TaskHeader
        tarea={tarea}
        elemento={elemento}
        estadoLabel={estadoLabel}
        detallesElemento={detallesElemento}
      />

      <CargaFisicaUploader
        esperadoPlanillaId={planillaIdEsperada}
        esperadoElementoTareaId={elementoTareaIdEsperada}
        hayFirmasFisicas={hayFirmasFisicas}
        cantidadFirmasFisicas={cantidadFirmasFisicas}
        onSubmit={handleSubmit}
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
