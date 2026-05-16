"use client"

import { useState, useRef, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import { ESTADO_ELEMENTO_TAREA, type ElementoTarea } from "@/features/elementos-tareas/types"
import { useGetElemento } from "@/features/elementos/api/use-get-elemento"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { FirmaPanel } from "@/features/registros/components/firma-panel"
import { Button } from "@/components/ui/button"
import {
  Upload, CheckCircle2, Loader2, ArrowLeft, FileUp, X, FileText,
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

  // Breadcrumb: Ejecución → Registros → Cargar planilla física
  // (consistente con /ejecucion/registros/[id] que usa el mismo prefijo).
  useBreadcrumb([
    { label: "Ejecución" },
    { label: "Registros" },
    { label: preFirmado ? "Cargar registro firmado" : "Cargar planilla física" },
  ])

  const [archivo, setArchivo]       = useState<File | null>(null)
  const [observaciones, setObs]     = useState("")
  const [subiendo, setSubiendo]     = useState<"idle" | "iniciando" | "subiendo" | "ok" | "error">("idle")
  const [mensajeError, setError]    = useState("")
  const [registroIdFinal, setRegistroIdFinal] = useState<string | null>(null)
  const [urlArchivo, setUrlArchivo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Iniciar tarea si está PENDIENTE, luego subir ──────────────────────────

  async function handleSubir() {
    if (!archivo || !tarea) return
    setSubiendo("iniciando")
    setError("")

    let registroId = tarea.registroId

    // Si está PENDIENTE, primero iniciar
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
    form.append("Archivo", archivo)
    if (observaciones.trim()) form.append("Observaciones", observaciones.trim())

    const res = await fetch(`/api/registros/${registroId}/completar/fisico`, {
      method: "POST",
      body: form,
    })

    if (res.ok) {
      setRegistroIdFinal(registroId)
      // Invalidar cache de avance y tareas para que la lista se actualice
      queryClient.invalidateQueries({ queryKey: ["avance"] })
      queryClient.invalidateQueries({ queryKey: ["elementos-tareas"] })
      // Obtener SAS URL del archivo recién subido
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

  // ── Drop / selección ──────────────────────────────────────────────────────

  function handleFile(f: File | null) {
    if (!f) return
    const ext = f.name.split(".").pop()?.toLowerCase()
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext ?? "")) {
      setError("Solo se permiten PDF o imágenes (jpg, jpeg, png).")
      return
    }
    setError("")
    setArchivo(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0] ?? null)
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
    elemento?.elementoTipoEspecialidad,
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

        {/* Firmas digitales — sólo si el proyecto NO es pre-firmado y hay slots configurados.
            En pre-firmado el backend no crea slots, así que el panel sale vacío de todas formas;
            ocultarlo evita la confusión visual. */}
        {registroIdFinal && !preFirmado && <FirmaPanel registroId={registroIdFinal} />}
      </div>
    )
  }

  const ocupado = subiendo === "iniciando" || subiendo === "subiendo"

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      <TaskHeader
        tarea={tarea}
        elemento={elemento}
        estadoLabel={estadoLabel}
        detallesElemento={detallesElemento}
      />

      {/* Card de carga */}
      <div className="rounded-xl border bg-white p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-800">
            {preFirmado ? "Cargar registro firmado" : "Cargar planilla física"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {preFirmado
              ? "El PDF/escaneo debe contener la firma manuscrita. La tarea pasa directo a 'Firmado físico'."
              : "Subí el PDF o imagen de la planilla. Después se firma digitalmente desde el registro."}
          </p>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !ocupado && inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !ocupado && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer
            ${archivo ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 bg-gray-50"}
            ${ocupado ? "pointer-events-none opacity-60" : ""}
            p-8 flex flex-col items-center gap-3 text-center`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {archivo ? (
            <>
              <FileUp className="h-10 w-10 text-blue-500" />
              <div className="space-y-1">
                <p className="font-medium text-blue-900 text-sm break-all">{archivo.name}</p>
                <p className="text-xs text-gray-500">{(archivo.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setArchivo(null) }}
                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-gray-400" />
              <div className="space-y-1">
                <p className="font-medium text-gray-700">Arrastrá el archivo acá o hacé clic para seleccionar</p>
                <p className="text-xs text-gray-400">PDF, JPG o PNG</p>
              </div>
            </>
          )}
        </div>

        {/* Observaciones */}
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

        {/* Error */}
        {mensajeError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{mensajeError}</p>
        )}

        {/* Botón subir */}
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleSubir}
          disabled={!archivo || ocupado}
        >
          {ocupado ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {subiendo === "iniciando" ? "Iniciando tarea..." : "Subiendo archivo..."}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Subir planilla
            </>
          )}
        </Button>
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
        {/* Título: nombre de la tarea */}
        <h1 className="text-lg font-bold text-gray-900 truncate">
          {tarea.tareaNombre}
        </h1>
        {/* Elemento: TAG + nombre */}
        {elemento && (
          <p className="text-sm text-gray-700 truncate">
            <span className="font-mono font-semibold text-blue-700 mr-2">{elemento.tag}</span>
            {elemento.nombre}
          </p>
        )}
        {/* Detalles del elemento */}
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
