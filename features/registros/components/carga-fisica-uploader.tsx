"use client"

import { useState, useRef, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react"

import { readQrFromFile, type QrLeidoResult } from "@/features/registros/lib/read-qr"
import { detectSignatureRemote } from "@/features/registros/lib/detect-signature-remote"
import { rotateFile } from "@/features/registros/lib/rotate-file"

import { Button } from "@/components/ui/button"
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

/** Argumentos con los que el uploader llama a `onSubmit` después de todos los gates. */
export interface CargaFisicaSubmitParams {
  /** Archivo con la orientación ya corregida (rotación derivada del QR). */
  archivoFinal: File
  /** Detalle esperado vs encontrado cuando el usuario forzó la carga con QR no coincidente. */
  qrOverrideDetalle?: string
  /** Densidad observada cuando el usuario forzó carga sin firma detectada. */
  firmaOverrideDetalle?: string
}

interface Props {
  /** GUID lowercased de la planilla esperada — para comparar con el QR. */
  esperadoPlanillaId: string
  /** GUID lowercased de la ET esperada — para comparar con el QR. */
  esperadoElementoTareaId: string
  /** Si el proyecto/tarea tiene al menos un slot Fisica → activa la detección visual. */
  hayFirmasFisicas: boolean
  /** Cantidad de slots Fisica configurados. Si > 1, la detección analiza cada
   *  slot horizontalmente (los slots se renderizan lado a lado en el footer).
   *  Default 1 → comportamiento clásico. Ignorado si hayFirmasFisicas=false. */
  cantidadFirmasFisicas?: number
  /** Flag global: si true + hayFirmasFisicas + imagen con ancho < anchoMinimoImagen,
   *  el uploader bloquea el submit y muestra un banner rojo. Default false. */
  rechazarBajaResolucion?: boolean
  /** Ancho mínimo (px) para imágenes cuando rechazarBajaResolucion está activo.
   *  Coincide con la config global del detector de firmas. Default 1500. */
  anchoMinimoImagen?: number
  /**
   * Callback al confirmar el submit. Recibe el archivo rotado + los detalles de
   * override que correspondan. El padre decide qué hacer (subir directo, iniciar
   * primero la tarea si estaba PENDIENTE, manejar el response, etc.).
   */
  onSubmit: (params: CargaFisicaSubmitParams) => Promise<void> | void
  /** true mientras el padre está procesando el submit. Bloquea la UI y muestra spinner. */
  isSubmitting?: boolean
  /** Copy del botón en idle. Default "Subir planilla". */
  submitLabel?: string
  /** Copy mientras `isSubmitting=true`. Default "Subiendo...". */
  submittingLabel?: string
  /** Deshabilita todo el uploader (ej. registro readonly). */
  disabled?: boolean
  /**
   * Slot entre los banners y el botón — típicamente para el textarea de
   * "Observaciones" que suele controlar el padre.
   */
  children?: ReactNode
  /** Sobrescribe el título del bloque. Default "Cargar planilla física". */
  titulo?: string
  /** Descripción bajo el título. */
  descripcion?: string
  /**
   * Se dispara cada vez que el user elige un archivo nuevo (o lo quita). Sirve al
   * padre para limpiar mensajes de error de intentos previos — el uploader no
   * tiene visibilidad sobre el estado del padre.
   */
  onArchivoElegido?: (f: File | null) => void
}

/**
 * Uploader compartido de PDF/imagen físico para las pantallas
 * `/ejecucion/registros/{id}` (modo físico) y `/checklist/{planillaId}/{etId}`.
 * Encapsula:
 *  - Drop zone + input file.
 *  - Lectura del QR y comparación con lo esperado.
 *  - Rotación pre-subida (si el QR se leyó torcido).
 *  - Detección visual de firma en la última página (solo si hayFirmasFisicas).
 *  - Los 2 gates de override (QR mismatch + firma no detectada) con sus dialogs.
 *
 * NO gestiona: cómo se resuelve el registroId, cómo se maneja el response ni
 * las observaciones — todo eso queda del lado del padre vía `children` y
 * `onSubmit`.
 */
export function CargaFisicaUploader({
  esperadoPlanillaId,
  esperadoElementoTareaId,
  hayFirmasFisicas,
  cantidadFirmasFisicas = 1,
  rechazarBajaResolucion = false,
  anchoMinimoImagen = 1500,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Subir planilla",
  submittingLabel = "Subiendo...",
  disabled = false,
  children,
  titulo = "Cargar planilla física",
  descripcion,
  onArchivoElegido,
}: Props) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [qrState, setQrState] = useState<
    | null
    | { kind: "reading" }
    | { kind: "ok"; result: QrLeidoResult }
    | { kind: "mismatch"; result: QrLeidoResult }
    | { kind: "missing"; result: QrLeidoResult }
  >(null)
  const [firmaState, setFirmaState] = useState<
    | null
    | { kind: "detectando" }
    | { kind: "detectada"; slotsDetectados: number; slotsTotal: number }
    // Detección parcial: al menos una firma detectada pero no todas. El backend
    // auto-firmará las detectadas y las no detectadas quedarán pendientes de
    // firma digital (cuando el flag FIRMA_DIGITAL_SI_VISUAL_FALLA está ON).
    // Se sube sin diálogo — es un flujo esperado, no una falla.
    | { kind: "parcial"; slotsDetectados: number; slotsTotal: number }
    // Detección cero: 0 firmas encontradas de N esperadas. Se mantiene el
    // diálogo de confirmación porque suele ser un error de escaneo / rotación.
    | { kind: "no-detectada"; slotsDetectados: number; slotsTotal: number }
    // Planilla no tiene fiduciales impresos (generada antes del cambio) —
    // no podemos verificar visualmente, mostramos el estado y dejamos al
    // usuario decidir. Diferenciado de "no-detectada" para no dar falso
    // negativo.
    | { kind: "sin-fiduciales" }
    | { kind: "no-aplica" }
  >(null)
  const [confirmarMismatch, setConfirmarMismatch] = useState(false)
  const [confirmarFirmaNoDetectada, setConfirmarFirmaNoDetectada] = useState(false)
  // Aviso de baja resolución en 2 modos:
  //  - "aviso" (amber, informativo): imagen con ancho < 800 px, detector server-side
  //    va a intentar upscale pero puede no recuperar los trazos finos.
  //  - "bloqueante" (rojo, bloquea submit): flag RECHAZAR_IMAGEN_BAJA_RESOLUCION ON
  //    + imagen con ancho < anchoMinimoImagen (default 1500). El backend rechazaría
  //    igual con 400 — mejor cortarlo antes en la UI.
  const [avisoBajaRes, setAvisoBajaRes] = useState<
    | null
    | { kind: "aviso"; ancho: number }
    | { kind: "bloqueante"; ancho: number }
  >(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const bloqueado = disabled || isSubmitting

  async function elegirArchivo(f: File | null) {
    setArchivo(f)
    setQrState(f ? { kind: "reading" } : null)
    setFirmaState(null)
    setAvisoBajaRes(null)
    // Aviso al padre para que limpie su estado de error/éxito. Corre siempre —
    // tanto al elegir nuevo como al quitar el archivo (f=null).
    onArchivoElegido?.(f)
    if (!f) return

    // Aviso preventivo de baja resolución (solo imágenes).
    //  - Si flag global RECHAZAR_IMAGEN_BAJA_RESOLUCION ON: bloquea si ancho <
    //    anchoMinimoImagen (mismo umbral que el gate del backend).
    //  - Si no: aviso amber informativo cuando ancho < 800 (upscale puede no
    //    recuperar los trazos).
    if (hayFirmasFisicas && f.type.startsWith("image/")) {
      try {
        const url = URL.createObjectURL(f)
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error("no image"))
          img.src = url
        })
        URL.revokeObjectURL(url)
        const ancho = img.naturalWidth
        if (ancho > 0) {
          if (rechazarBajaResolucion && ancho < anchoMinimoImagen) {
            setAvisoBajaRes({ kind: "bloqueante", ancho })
          } else if (ancho < 800) {
            setAvisoBajaRes({ kind: "aviso", ancho })
          }
        }
      } catch {
        // No pudimos leer dimensiones — no bloqueamos ni avisamos.
      }
    }

    // QR: defensivo — si readQrFromFile tira (worker pdfjs, PDF cifrado, etc.),
    // caemos a "missing" con el mensaje. Sin esto el estado se quedaría en "reading".
    let result: QrLeidoResult
    try {
      result = await readQrFromFile(f)
    } catch (err) {
      console.error("[CargaFisicaUploader] readQrFromFile threw:", err)
      const errMsg = err instanceof Error ? err.message : "Error al leer el QR."
      result = {
        qrEncontrado: false,
        esChecklist: false,
        planillaId: null,
        elementoTareaId: null,
        esPendienteCarga: false,
        pendienteId: null,
        contenidoQr: null,
        error: errMsg,
        rotacionDetectada: 0,
      }
    }

    if (!result.esChecklist) {
      setQrState({ kind: "missing", result })
    } else {
      const matchea =
        result.planillaId === esperadoPlanillaId &&
        result.elementoTareaId === esperadoElementoTareaId
      setQrState({ kind: matchea ? "ok" : "mismatch", result })
    }

    // Detección visual de firma manuscrita — sólo cuando el proyecto/tarea tiene
    // slots Fisica. Corre en paralelo al flujo QR, no bloqueamos si tarda.
    if (!hayFirmasFisicas) {
      setFirmaState({ kind: "no-aplica" })
      return
    }
    setFirmaState({ kind: "detectando" })
    // La rotación derivada del QR se aplica antes de mandar al backend: el
    // detector server-side espera el archivo con orientación correcta. Si no
    // hace falta rotar, `rotateFile` devuelve el archivo tal cual.
    const rotacion = result.esChecklist ? result.rotacionDetectada : 0
    try {
      const archivoParaDetectar = rotacion === 0 ? f : await rotateFile(f, rotacion)
      const deteccion = await detectSignatureRemote(archivoParaDetectar, cantidadFirmasFisicas)
      if (deteccion.sinFiduciales) {
        setFirmaState({ kind: "sin-fiduciales" })
      } else {
        const det = deteccion.slotsDetectados
        const tot = deteccion.slotsTotal
        // Tri-estado: todas / algunas / ninguna. Solo "ninguna" (0) sigue con
        // diálogo — el resto es un flujo esperado.
        let kind: "detectada" | "parcial" | "no-detectada"
        if (det === tot && tot > 0) kind = "detectada"
        else if (det > 0) kind = "parcial"
        else kind = "no-detectada"
        setFirmaState({ kind, slotsDetectados: det, slotsTotal: tot })
      }
    } catch (err) {
      console.error("[CargaFisicaUploader] detectSignatureRemote threw:", err)
      setFirmaState({
        kind: "no-detectada",
        slotsDetectados: 0,
        slotsTotal: cantidadFirmasFisicas,
      })
    }
  }

  async function handleClickSubir(forzarOverride: boolean = false) {
    if (!archivo) return
    if (qrState?.kind === "mismatch" && !forzarOverride) {
      setConfirmarMismatch(true)
      return
    }
    if (firmaState?.kind === "no-detectada" && !forzarOverride) {
      setConfirmarFirmaNoDetectada(true)
      return
    }
    // Rotación derivada del QR: no-op cuando fue 0 y silencioso ante error.
    const rotacion =
      (qrState?.kind === "ok" || qrState?.kind === "mismatch") && qrState.result
        ? qrState.result.rotacionDetectada
        : 0
    const archivoFinal = await rotateFile(archivo, rotacion)

    const params: CargaFisicaSubmitParams = { archivoFinal }
    if (qrState?.kind === "mismatch" && forzarOverride) {
      const r = qrState.result
      params.qrOverrideDetalle = (
        `esperado planilla=${esperadoPlanillaId} tarea=${esperadoElementoTareaId} · ` +
        `encontrado planilla=${r.planillaId ?? "?"} tarea=${r.elementoTareaId ?? "?"}`
      ).slice(0, 500)
    }
    if (firmaState?.kind === "no-detectada" && forzarOverride) {
      const detalle = `firmas detectadas ${firmaState.slotsDetectados}/${firmaState.slotsTotal} en la zona de firmas`
      params.firmaOverrideDetalle = detalle.slice(0, 500)
    }
    if (firmaState?.kind === "parcial") {
      // Solo trazabilidad — no bloquea el submit. El backend re-ejecuta la
      // detección server-side y auto-firma solo los slots que él detectó.
      const detalle = `deteccion parcial ${firmaState.slotsDetectados}/${firmaState.slotsTotal}`
      params.firmaOverrideDetalle = detalle.slice(0, 500)
    }
    if (firmaState?.kind === "sin-fiduciales") {
      const detalle = `planilla sin fiduciales — no fue posible verificar firmas visualmente`
      params.firmaOverrideDetalle = detalle.slice(0, 500)
    }
    await onSubmit(params)
  }

  const submitBloqueado =
    !archivo || bloqueado
    || qrState?.kind === "reading"
    || firmaState?.kind === "detectando"
    || avisoBajaRes?.kind === "bloqueante"

  return (
    <div className="rounded-xl border bg-white p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">{titulo}</h2>
        {descripcion && (
          <p className="text-xs text-muted-foreground mt-0.5">{descripcion}</p>
        )}
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !bloqueado && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !bloqueado && inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault()
          if (!bloqueado) void elegirArchivo(e.dataTransfer.files[0] ?? null)
        }}
        onDragOver={(e) => e.preventDefault()}
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer
          ${archivo ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-400 bg-gray-50"}
          ${bloqueado ? "pointer-events-none opacity-60" : ""}
          p-8 flex flex-col items-center gap-3 text-center`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => void elegirArchivo(e.target.files?.[0] ?? null)}
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
              onClick={(e) => {
                e.stopPropagation()
                setArchivo(null)
                setQrState(null)
                setFirmaState(null)
                setAvisoBajaRes(null)
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Quitar archivo"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-400" />
            <div className="space-y-1">
              <p className="font-medium text-gray-700">
                Arrastrá el archivo acá o hacé clic para seleccionar
              </p>
              <p className="text-xs text-gray-400">PDF, JPG o PNG</p>
            </div>
          </>
        )}
      </div>

      {/* Banner QR */}
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
              El QR apunta a otra planilla o elemento. Si estás seguro, podés cargarlo
              de todos modos — quedará marcado en las observaciones.
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

      {/* Banner firma */}
      {firmaState?.kind === "detectando" && (
        <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando firma en el escaneo...
        </div>
      )}
      {firmaState?.kind === "detectada" && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {firmaState.slotsTotal > 1
            ? `Todas las firmas detectadas (${firmaState.slotsDetectados}/${firmaState.slotsTotal}) en el escaneo.`
            : "Firma detectada en el escaneo."}
        </div>
      )}
      {avisoBajaRes && avisoBajaRes.kind === "bloqueante" && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">
              Imagen de baja resolución ({avisoBajaRes.ancho} px de ancho).
            </p>
            <p className="text-xs mt-1">
              Para una mejor detección de firmas la resolución debe ser mínimo 150 DPI.
              Volvé a subir el escaneo en mayor resolución.
            </p>
          </div>
        </div>
      )}
      {avisoBajaRes && avisoBajaRes.kind === "aviso" && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">
              Imagen de baja resolución ({avisoBajaRes.ancho} px de ancho).
            </p>
            <p className="text-xs mt-1">
              Para una mejor detección de firmas la resolución debe ser mínimo 150 DPI.
            </p>
          </div>
        </div>
      )}
      {firmaState?.kind === "parcial" && (
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">
              Firmas detectadas: {firmaState.slotsDetectados}/{firmaState.slotsTotal}.
            </p>
            <p className="text-xs mt-1">
              Los slots detectados quedarán firmados con la firma en papel. Los slots
              sin firma detectada quedarán pendientes de firma digital.
            </p>
          </div>
        </div>
      )}
      {firmaState?.kind === "no-detectada" && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">
              {firmaState.slotsTotal > 1
                ? "No se detectaron firmas en el escaneo."
                : "No se detectó firma manuscrita en el escaneo."}
            </p>
            <p className="text-xs mt-1">
              Si estás seguro que la planilla está firmada, podés cargarla igual — queda registrado en las observaciones.
            </p>
          </div>
        </div>
      )}
      {firmaState?.kind === "sin-fiduciales" && (
        <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">No se puede verificar la firma en este escaneo.</p>
            <p className="text-xs mt-1">
              La planilla impresa fue generada antes del sistema de fiduciales. Podés cargarla igual —
              para futuras cargas conviene reimprimir la planilla desde el sistema para que se puedan
              detectar las firmas automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Slot del padre — típicamente el textarea de observaciones. */}
      {children}

      {/* Botón subir */}
      <Button
        className="w-full gap-2"
        size="lg"
        onClick={() => handleClickSubir()}
        disabled={submitBloqueado}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {submittingLabel}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {submitLabel}
          </>
        )}
      </Button>

      {/* Dialog: QR no coincide */}
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
                <span className="font-mono">planilla {esperadoPlanillaId}</span> /{" "}
                <span className="font-mono">tarea {esperadoElementoTareaId}</span>
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
                void handleClickSubir(true)
              }}
            >
              Cargar de todos modos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: firma no detectada */}
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
              Firmas detectadas:{" "}
              <span className="font-mono font-medium">
                {firmaState.slotsDetectados}/{firmaState.slotsTotal}
              </span>
              <span className="text-muted-foreground"> (se esperaban las {firmaState.slotsTotal})</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmarFirmaNoDetectada(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarFirmaNoDetectada(false)
                void handleClickSubir(true)
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
