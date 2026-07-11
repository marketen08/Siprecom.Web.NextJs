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
  AlertTriangle, Info,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { readQrFromFile, type QrLeidoResult } from "@/features/registros/lib/read-qr"
import { rotateFile } from "@/features/registros/lib/rotate-file"
import { detectSignatureInFooter } from "@/features/registros/lib/detect-signature"
import { useGetFirmasConfigEfectivaPorEt } from "@/features/elementos-tareas/api/use-get-firmas-config-efectiva"

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

  // Estado del QR del archivo elegido. `null` = todavía no se procesó; después
  // toma uno de los 4 estados visibles con banner. Ver features/registros/lib/read-qr.ts.
  const [qrState, setQrState] = useState<
    | null
    | { kind: "reading" }
    | { kind: "ok"; result: QrLeidoResult }
    | { kind: "mismatch"; result: QrLeidoResult }
    | { kind: "missing"; result: QrLeidoResult }
  >(null)
  const [confirmarMismatch, setConfirmarMismatch] = useState(false)

  // Estado de detección visual de firma manuscrita. Solo aplica cuando la config
  // efectiva del proyecto/tarea tiene al menos un slot Fisica.
  const [firmaState, setFirmaState] = useState<
    | null
    | { kind: "detectando" }
    | { kind: "detectada"; densidadPct: number }
    | { kind: "no-detectada"; densidadPct: number }
    | { kind: "no-aplica" }
  >(null)
  const [confirmarFirmaNoDetectada, setConfirmarFirmaNoDetectada] = useState(false)

  const { data: firmasConfigRaw } = useGetFirmasConfigEfectivaPorEt(elementoTareaId)
  const hayFirmasFisicas = firmasConfigRaw?.data?.hayFirmasFisicas ?? false

  // ── Iniciar tarea si está PENDIENTE, luego subir ──────────────────────────

  async function handleSubir(forzarOverride: boolean = false) {
    if (!archivo || !tarea) return
    // Gates de override: QR primero, después firma. En cada uno abrimos el
    // dialog respectivo si el user no pidió forzar.
    if (qrState?.kind === "mismatch" && !forzarOverride) {
      setConfirmarMismatch(true)
      return
    }
    if (firmaState?.kind === "no-detectada" && !forzarOverride) {
      setConfirmarFirmaNoDetectada(true)
      return
    }
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

    // Rotación: si el QR se leyó rotado, corregimos la orientación del archivo
    // antes de subirlo así el registro queda derecho en el visor.
    const rotacion =
      (qrState?.kind === "ok" || qrState?.kind === "mismatch") && qrState.result
        ? qrState.result.rotacionDetectada
        : 0
    const archivoFinal = await rotateFile(archivo, rotacion)

    const form = new FormData()
    form.append("Archivo", archivoFinal)
    if (observaciones.trim()) form.append("Observaciones", observaciones.trim())
    // Auditoría: si aceptó cargar con QR no coincidente, mandamos el detalle
    // esperado vs encontrado — el backend lo appendéa a Observaciones.
    if (qrState?.kind === "mismatch" && forzarOverride) {
      const r = qrState.result
      const detalle =
        `esperado planilla=${planillaIdEsperada} tarea=${elementoTareaIdEsperada} · ` +
        `encontrado planilla=${r.planillaId ?? "?"} tarea=${r.elementoTareaId ?? "?"}`
      form.append("QrOverrideDetalle", detalle.slice(0, 500))
    }
    // Auditoría: si aceptó cargar sin firma detectada, mandamos la densidad.
    if (firmaState?.kind === "no-detectada" && forzarOverride) {
      const detalle = `densidad tinta ${firmaState.densidadPct.toFixed(2)}% en la zona de firmas`
      form.append("FirmaOverrideDetalle", detalle.slice(0, 500))
    }

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

  async function handleFile(f: File | null) {
    if (!f) return
    const ext = f.name.split(".").pop()?.toLowerCase()
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext ?? "")) {
      setError("Solo se permiten PDF o imágenes (jpg, jpeg, png).")
      return
    }
    setError("")
    setArchivo(f)
    setQrState({ kind: "reading" })
    // Defensivo: readQrFromFile puede tirar (worker pdfjs, PDF cifrado, etc.) —
    // caemos a "missing" con el mensaje del error en vez de dejar el estado pegado.
    let result: QrLeidoResult
    try {
      result = await readQrFromFile(f)
    } catch (err) {
      console.error("[checklist] readQrFromFile threw:", err)
      const errMsg = err instanceof Error ? err.message : "Error al leer el QR."
      result = {
        qrEncontrado: false,
        esChecklist: false,
        planillaId: null,
        elementoTareaId: null,
        contenidoQr: null,
        error: errMsg,
        rotacionDetectada: 0,
      }
    }
    if (!result.esChecklist) {
      setQrState({ kind: "missing", result })
    } else {
      const matchea =
        result.planillaId === planillaIdEsperada &&
        result.elementoTareaId === elementoTareaIdEsperada
      setQrState({ kind: matchea ? "ok" : "mismatch", result })
    }

    // Detección visual de firma manuscrita. Solo si la config del proyecto/tarea
    // tiene al menos un slot Fisica; sino no aporta y saltamos.
    if (!hayFirmasFisicas) {
      setFirmaState({ kind: "no-aplica" })
      return
    }
    setFirmaState({ kind: "detectando" })
    const rotacion = result.esChecklist ? result.rotacionDetectada : 0
    try {
      const deteccion = await detectSignatureInFooter(f, { rotacion })
      setFirmaState({
        kind: deteccion.detected ? "detectada" : "no-detectada",
        densidadPct: deteccion.densidadPct,
      })
    } catch (err) {
      console.error("[checklist] detectSignatureInFooter threw:", err)
      setFirmaState({ kind: "no-detectada", densidadPct: 0 })
    }
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
                onClick={(e) => { e.stopPropagation(); setArchivo(null); setQrState(null); setFirmaState(null) }}
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

        {/* Banner del QR: decodifica el QR del archivo y compara contra la
            planilla/tarea a la que apunta esta pantalla (los ids vienen en la URL). */}
        {qrState?.kind === "reading" && (
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando QR del archivo...
          </div>
        )}
        {qrState?.kind === "ok" && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            QR verificado — el archivo corresponde a esta tarea.
          </div>
        )}
        {qrState?.kind === "mismatch" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">El QR del archivo NO coincide con esta tarea.</p>
              <p className="text-xs mt-1">
                El QR apunta a otra planilla o elemento. Si estás seguro, podés cargarlo de
                todos modos — quedará marcado en las observaciones.
              </p>
            </div>
          </div>
        )}
        {qrState?.kind === "missing" && (
          <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              No se detectó QR de checklist en el archivo. Verificá que corresponda a esta
              tarea antes de cargarlo.
              {qrState.result.error && (
                <p className="text-[11px] mt-1 opacity-80">Detalle: {qrState.result.error}</p>
              )}
            </div>
          </div>
        )}

        {/* Banner de detección visual de firma manuscrita — se activa cuando la
            config de la tarea tiene al menos un slot Fisica. */}
        {firmaState?.kind === "detectando" && (
          <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando firma en el escaneo...
          </div>
        )}
        {firmaState?.kind === "detectada" && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Firma detectada en el escaneo ({firmaState.densidadPct.toFixed(1)}% de tinta en la zona esperada).
          </div>
        )}
        {firmaState?.kind === "no-detectada" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">No se detectó firma manuscrita en el escaneo.</p>
              <p className="text-xs mt-1">
                Densidad de tinta {firmaState.densidadPct.toFixed(1)}% (muy baja) en la zona
                esperada. Si estás seguro que la planilla está firmada, podés cargarla igual —
                queda registrado en las observaciones.
              </p>
            </div>
          </div>
        )}

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
          onClick={() => handleSubir()}
          disabled={!archivo || ocupado || qrState?.kind === "reading" || firmaState?.kind === "detectando"}
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

      {/* Confirmación cuando el QR del archivo no coincide con esta tarea. */}
      <AlertDialog
        open={confirmarMismatch}
        onOpenChange={(o) => !o && setConfirmarMismatch(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              El QR no coincide con esta tarea
            </AlertDialogTitle>
            <AlertDialogDescription>
              El QR del archivo pertenece a otra planilla o elemento. Si continuás, se
              cargará de todos modos y quedará marcado automáticamente en las
              observaciones del registro para auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {qrState?.kind === "mismatch" && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
              <p>
                <span className="text-muted-foreground">Esperado:</span>{" "}
                <span className="font-mono">planilla {planillaIdEsperada}</span> /{" "}
                <span className="font-mono">tarea {elementoTareaIdEsperada}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Encontrado:</span>{" "}
                <span className="font-mono">planilla {qrState.result.planillaId ?? "—"}</span> /{" "}
                <span className="font-mono">tarea {qrState.result.elementoTareaId ?? "—"}</span>
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmarMismatch(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarMismatch(false)
                void handleSubir(true)
              }}
            >
              Cargar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación cuando no se detectó firma manuscrita en el escaneo. */}
      <AlertDialog
        open={confirmarFirmaNoDetectada}
        onOpenChange={(o) => !o && setConfirmarFirmaNoDetectada(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              No se detectó firma en el escaneo
            </AlertDialogTitle>
            <AlertDialogDescription>
              El sistema no encontró tinta suficiente en la zona donde debería
              estar la firma manuscrita. Si estás seguro que la planilla está firmada
              correctamente, podés cargarla igual — quedará registrado en las
              observaciones del registro para revisión posterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {firmaState?.kind === "no-detectada" && (
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              Densidad de tinta observada:{" "}
              <span className="font-mono font-medium">
                {firmaState.densidadPct.toFixed(2)}%
              </span>
              <span className="text-muted-foreground"> (mínima esperada 0.8%)</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmarFirmaNoDetectada(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarFirmaNoDetectada(false)
                void handleSubir(true)
              }}
            >
              Cargar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
