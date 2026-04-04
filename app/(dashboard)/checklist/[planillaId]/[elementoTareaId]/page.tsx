"use client"

import { useState, useRef, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ElementoTarea } from "@/features/elementos-tareas/types"
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
  const planillaId      = params.planillaId as string
  const elementoTareaId = params.elementoTareaId as string

  const { data: raw, isLoading, isError } = useGetElementoTarea(elementoTareaId)
  const tarea = raw?.data

  const [archivo, setArchivo]       = useState<File | null>(null)
  const [observaciones, setObs]     = useState("")
  const [subiendo, setSubiendo]     = useState<"idle" | "iniciando" | "subiendo" | "ok" | "error">("idle")
  const [mensajeError, setError]    = useState("")
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

  // Estado no permite carga
  const estadosPermitidos = [1, 2, 5] // PENDIENTE, EN_PROCESO, RECHAZADO
  if (!estadosPermitidos.includes(tarea.estado)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <FileText className="h-12 w-12 text-gray-300" />
        <p className="text-gray-600 font-medium">
          Esta tarea está en estado <span className="font-bold">{tarea.estadoTexto}</span> y no admite carga de PDF.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
      </div>
    )
  }

  // Éxito
  if (subiendo === "ok") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900">Planilla cargada correctamente</h2>
        <p className="text-sm text-muted-foreground">
          El archivo fue subido y la tarea quedó marcada como completada.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
      </div>
    )
  }

  const ocupado = subiendo === "iniciando" || subiendo === "subiendo"

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <h1 className="text-xl font-bold text-gray-900">Cargar planilla física</h1>
        <p className="text-sm text-muted-foreground">{tarea.tareaNombre}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
          <span className="font-mono">{tarea.codigo}</span>
          <span>·</span>
          <span>{tarea.elementoNombre}</span>
          {tarea.estadoTexto && (
            <>
              <span>·</span>
              <span className="font-medium text-blue-700">{tarea.estadoTexto}</span>
            </>
          )}
        </div>
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
              <p className="text-xs text-gray-400">PDF, JPG o PNG · máx. permitido por el servidor</p>
            </div>
          </>
        )}
      </div>

      {/* Observaciones */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Observaciones <span className="font-normal text-gray-400">(opcional)</span></label>
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
  )
}

export default function CargarPdfPage() {
  return (
    <Suspense>
      <CargarPdfContent />
    </Suspense>
  )
}
