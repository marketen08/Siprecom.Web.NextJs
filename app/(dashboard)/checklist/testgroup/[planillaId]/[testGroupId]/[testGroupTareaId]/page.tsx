"use client"

import { useState, useRef, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetTareasPack, ESTADO_TAREA_LABEL } from "@/features/testgroups/api/use-get-tareas-pack"
import { useGetTestGroup } from "@/features/testgroups/api/use-get-testgroup"
import { useIniciarRegistroTarea } from "@/features/testgroups/api/use-iniciar-registro-tarea"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { FirmaPanel } from "@/features/registros/components/firma-panel"
import { Button } from "@/components/ui/button"
import {
  Upload, CheckCircle2, Loader2, ArrowLeft, FileUp, X, FileText,
} from "lucide-react"

// ─── Página ─────────────────────────────────────────────────────────────────
//
// Espejo de /checklist/[planillaId]/[elementoTareaId] pero para test groups.
// La URL incluye testGroupId para poder resolver la tarea sin endpoint nuevo:
// la lista de tareas del pack ya se trae con useGetTareasPack.

function CargarPdfTestGroupContent() {
  const params = useParams()
  const router = useRouter()
  const testGroupId = params.testGroupId as string
  const testGroupTareaId = params.testGroupTareaId as string

  const queryClient = useQueryClient()

  // Toda la lista de tareas del pack → filtramos por id. Idempotente y sin
  // endpoint específico.
  const { data: tareasRaw, isLoading, isError } = useGetTareasPack(testGroupId)
  const tarea = tareasRaw?.data?.find((t) => t.id === testGroupTareaId) ?? null

  // Datos del pack para el header (código, subsistema, tipo).
  const { data: tgRaw } = useGetTestGroup(testGroupId)
  const tg = tgRaw?.data

  // Proyecto para saber si los PDFs físicos son pre-firmados (cambia el wording).
  const { data: proyectoRaw } = useGetProyecto(tg?.proyectoId ?? null)
  const proyecto = proyectoRaw?.data
  const preFirmado = proyecto?.registrosFisicosPreFirmados ?? false

  useBreadcrumb([
    { label: "Ejecución" },
    { label: "Paquetes de prueba" },
    { label: preFirmado ? "Cargar registro firmado" : "Cargar planilla física" },
  ])

  const iniciarRegistro = useIniciarRegistroTarea()

  const [archivo, setArchivo]       = useState<File | null>(null)
  const [observaciones, setObs]     = useState("")
  const [subiendo, setSubiendo]     = useState<"idle" | "iniciando" | "subiendo" | "ok" | "error">("idle")
  const [mensajeError, setError]    = useState("")
  const [registroIdFinal, setRegistroIdFinal] = useState<string | null>(null)
  const [urlArchivo, setUrlArchivo] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubir() {
    if (!archivo || !tarea) return
    setSubiendo("iniciando")
    setError("")

    let registroId = tarea.registroId

    // Si aún no hay registro, lo creamos con el hook dedicado del pack. El backend
    // crea el registro asociado a esta TestGroupTarea.
    if (!registroId) {
      try {
        const res = await iniciarRegistro.mutateAsync({
          testGroupId,
          tareaId: tarea.tareaId,
        })
        registroId = res?.data?.registroId ?? null
      } catch (err) {
        setError((err as Error)?.message ?? "No se pudo iniciar el registro.")
        setSubiendo("error")
        return
      }
    }

    if (!registroId) {
      setError("No se pudo obtener el registro asociado.")
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
      queryClient.invalidateQueries({ queryKey: ["testgroups", testGroupId, "tareas"] })
      queryClient.invalidateQueries({ queryKey: ["testgroups", testGroupId] })
      queryClient.invalidateQueries({ queryKey: ["avance"] })
      // SAS URL del archivo recién subido.
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

  const estadoLabel = ESTADO_TAREA_LABEL[tarea.estado] ?? String(tarea.estado)

  // PENDIENTE, EN_PROCESO, RECHAZADO — mismo criterio que la de elementos.
  const estadosPermitidos = [1, 2, 5]
  if (!estadosPermitidos.includes(tarea.estado)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <TaskHeader tarea={tarea} tg={tg} estadoLabel={estadoLabel} />
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

  if (subiendo === "ok") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <TaskHeader tarea={tarea} tg={tg} estadoLabel={estadoLabel} />
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <TaskHeader tarea={tarea} tg={tg} estadoLabel={estadoLabel} />

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

        <Button
          className="w-full gap-2"
          size="lg"
          onClick={handleSubir}
          disabled={!archivo || ocupado}
        >
          {ocupado ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {subiendo === "iniciando" ? "Iniciando registro..." : "Subiendo archivo..."}
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

// ─── Header con datos del pack + tarea ──────────────────────────────────────

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
  tarea, tg, estadoLabel,
}: {
  tarea: { tareaNombre: string; tareaCodigo: number; estado: number }
  tg: { codigo?: string; nombre?: string; subSistemaCodigo?: string | null; subSistemaNombre?: string | null; tipoTexto?: string } | null | undefined
  estadoLabel: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <h1 className="text-lg font-bold text-gray-900 truncate">{tarea.tareaNombre}</h1>
        {tg && (
          <p className="text-sm text-gray-700 truncate">
            <span className="font-mono font-semibold text-blue-700 mr-2">{tg.codigo}</span>
            {tg.nombre || "(sin nombre)"} · {tg.tipoTexto}
          </p>
        )}
        {tg?.subSistemaCodigo && (
          <p className="text-xs text-muted-foreground">
            Subsistema: {tg.subSistemaCodigo}{tg.subSistemaNombre ? ` — ${tg.subSistemaNombre}` : ""}
          </p>
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

export default function CargarPdfTestGroupPage() {
  return (
    <Suspense>
      <CargarPdfTestGroupContent />
    </Suspense>
  )
}
