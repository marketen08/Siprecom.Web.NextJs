"use client"

import { useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpFromLine,
  Check,
  CheckCircle2,
  FileUp,
  Info,
  Loader2,
  Paperclip,
  QrCode,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { readQrFromFile, type QrLeidoResult } from "@/features/registros/lib/read-qr"
import { rotateFile } from "@/features/registros/lib/rotate-file"
import { detectSignatureInFooter } from "@/features/registros/lib/detect-signature"
import {
  useResolverRegistroPorEt,
  type RegistroResolverResult,
} from "@/features/registros/api/use-resolver-registro-por-et"
import type { FirmasConfigEfectiva } from "@/features/registros/api/use-get-firmas-config-efectiva"
import { invalidarPostCargaRegistro } from "@/features/registros/api/invalidar-post-carga"
import {
  useResolverPendientePorQr,
  type PendienteResolverQr,
} from "@/features/pendientes/api/use-resolver-pendiente-por-qr"
import { useBreadcrumb } from "@/components/breadcrumb-context"
import { apiClient, type ApiError } from "@/lib/api-client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Estados de una fila del batch. Espeja los `EstadoSincronizacion` de la app
// WinForms (Siprecom.Win.Local/Forms/CargaMasiva) pero simplificado — no
// distinguimos "otro proyecto / sin acceso" acá: el backend rechaza la
// resolución con un 403/404 y lo pintamos como `error`.
type FilaEstado =
  | "leyendo-qr"
  | "sin-qr"
  | "qr-invalido"
  | "resolviendo"
  | "listo"
  | "ya-cargado"
  | "estado-incompatible"
  | "otro-proyecto"
  | "subiendo"
  | "sincronizado"
  | "error"
  // Adjunto de otro archivo: sube a /archivos (tarea) o /adjuntos (pendiente)
  // después de que su carrier se haya subido con /completar/fisico. Cubre dos
  // casos: (a) archivos sin QR posteriores a un carrier en el orden, y (b) QR
  // duplicado de un carrier previo del mismo destino.
  | "adjunto"

/** Resultado de la detección visual de firma. `null` = no corrió todavía.
 *  Los kinds "detectada" y "no-detectada" ahora traen el conteo per-slot para
 *  planillas con N > 1 firmas físicas. `slotsDetectados==slotsTotal` = todas. */
type FirmaDeteccion =
  | null
  | { kind: "no-aplica" }
  | { kind: "detectada"; slotsDetectados: number; slotsTotal: number }
  | { kind: "no-detectada"; slotsDetectados: number; slotsTotal: number }
  // Planilla sin fiduciales impresos — la detección no puede afirmar nada.
  // Diferenciado de "no-detectada" para no dar falso negativo en el badge.
  | { kind: "sin-fiduciales"; slotsTotal: number }

/**
 * Tipo del QR leído — determina el pipeline (resolver + subir) que se aplica.
 * "tarea" = flujo clásico de registro/ET; "pendiente" = flujo nuevo de carga
 * física de pendientes. `null` mientras no se identificó todavía.
 */
type FilaTipo = "tarea" | "pendiente" | null

interface Fila {
  id: string
  archivo: File
  estado: FilaEstado
  qr: QrLeidoResult | null
  tipo: FilaTipo
  resuelto: RegistroResolverResult | null
  pendienteResuelto: PendienteResolverQr | null
  mensaje: string | null
  /** Resultado de la detección visual de firma (solo tareas con slots Fisica). */
  firmaDeteccion: FirmaDeteccion
  /** Orden explícito en la grilla (0-based). Se recalcula al mover filas ↑↓. */
  orden: number
  /** Id del carrier al que este archivo se adjunta. null = es carrier propio. */
  asociadoA: string | null
}

/** Clave estable del destino del QR — usada para detectar duplicados. */
function claveDestino(f: Fila): string | null {
  if (f.tipo === "pendiente" && f.pendienteResuelto)
    return "PEND::" + f.pendienteResuelto.pendienteId
  if (f.tipo === "tarea" && f.resuelto)
    return "ET::" + f.resuelto.elementoTareaId
  // Fallback: el QR crudo alcanza para dedupe temprano (antes de resolver).
  if (f.qr?.esChecklist && f.qr.elementoTareaId)
    return "ET::" + f.qr.elementoTareaId
  if (f.qr?.esPendienteCarga && f.qr.pendienteId)
    return "PEND::" + f.qr.pendienteId
  return null
}

/**
 * Recalcula la relación carrier/adjunto sobre el batch entero, respetando el
 * orden actual de las filas. Espeja `LocalDbService.RecalcularCarriers` de la
 * app WinForms:
 *   - Un archivo con QR válido es CARRIER, salvo que ya haya un carrier previo
 *     con el mismo destino → se degrada a ADJUNTO del primero (QR duplicado).
 *   - Un archivo SIN QR válido es ADJUNTO del último carrier previo. Si no hay
 *     ninguno anterior queda como SIN_QR huérfano.
 * Estados de subida (subiendo/sincronizado/error) NO se recalculan — ya se
 * consolidaron. Estados en proceso (leyendo-qr/resolviendo) se dejan pasar hasta
 * que terminen y luego se recalculan.
 */
function recalcularAgrupacion(filas: Fila[]): Fila[] {
  const ordenadas = [...filas].sort((a, b) => a.orden - b.orden)
  const carrierPorDestino = new Map<string, string>()
  let lastCarrier: { id: string; estado: FilaEstado } | null = null

  return ordenadas.map((f) => {
    // No tocar estados terminales o intermedios de subida.
    if (
      f.estado === "subiendo"
      || f.estado === "sincronizado"
      || f.estado === "error"
      || f.estado === "leyendo-qr"
      || f.estado === "resolviendo"
    ) {
      // Si es carrier útil, sigue siendo referencia para no-QR posteriores.
      const clave = claveDestino(f)
      if (clave && !f.asociadoA) {
        if (!carrierPorDestino.has(clave)) carrierPorDestino.set(clave, f.id)
        lastCarrier = { id: f.id, estado: f.estado }
      }
      return f
    }

    // Estados que no son útiles como carrier ni como adjunto (QR inválido, otro
    // proyecto, incompatible): quedan como están, no arrastran nada.
    if (f.estado === "qr-invalido" || f.estado === "otro-proyecto" || f.estado === "estado-incompatible") {
      return { ...f, asociadoA: null }
    }

    const clave = claveDestino(f)

    if (clave) {
      // Con QR: candidato a carrier o duplicado.
      const carrierPrevio = carrierPorDestino.get(clave)
      if (carrierPrevio && carrierPrevio !== f.id) {
        return {
          ...f,
          asociadoA: carrierPrevio,
          estado: "adjunto" as FilaEstado,
          mensaje: "QR duplicado — se adjuntará al primer archivo con este QR.",
        }
      }
      carrierPorDestino.set(clave, f.id)
      lastCarrier = { id: f.id, estado: f.estado }
      return { ...f, asociadoA: null }
    }

    // Sin QR: adjunto del último carrier o huérfano.
    if (!lastCarrier) {
      return {
        ...f,
        asociadoA: null,
        estado: "sin-qr" as FilaEstado,
        mensaje: "Sin QR — no hay archivo con QR previo en el orden.",
      }
    }
    return {
      ...f,
      asociadoA: lastCarrier.id,
      estado: "adjunto" as FilaEstado,
      mensaje: null,
    }
  })
}

const nuevoId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export default function CargaRapidaQrPage() {
  useBreadcrumb([{ label: "Ejecución" }, { label: "Carga rápida por QR" }])

  const [filas, setFilas] = useState<Fila[]>([])
  const [dragActive, setDragActive] = useState(false)
  const resolver = useResolverRegistroPorEt()
  const resolverPendiente = useResolverPendientePorQr()
  const queryClient = useQueryClient()

  // Cache local del batch: `cantidadFirmasFisicas` es una propiedad del proyecto/tarea,
  // no del archivo, así que la primera fila del proyecto la consulta y las demás
  // reusan el valor. Si el batch tiene 30 archivos de un solo proyecto, hacemos
  // 1 llamada en vez de 30. Persiste con useRef entre renders. 0 = sin firmas físicas.
  const cacheFirmasFisicas = useRef<Map<string, number>>(new Map())

  // Estado agregado para el header.
  const total = filas.length
  // "listos" cuenta CARRIERS listos para subir. Los adjuntos se cuentan aparte
  // porque suben "en cascada" con su carrier.
  const listos = filas.filter((f) => f.estado === "listo" || f.estado === "ya-cargado").length
  const adjuntos = filas.filter((f) => f.estado === "adjunto").length
  const sincronizados = filas.filter((f) => f.estado === "sincronizado").length
  const conError = filas.filter(
    (f) =>
      f.estado === "sin-qr" || f.estado === "qr-invalido" || f.estado === "error",
  ).length
  const otroProyecto = filas.filter((f) => f.estado === "otro-proyecto").length
  // Warning secundario: filas listas pero sin firma detectada. No bloquean —
  // se suben con FirmaOverrideDetalle y queda auditado en observaciones.
  const sinFirmaDetectada = filas.filter(
    (f) =>
      (f.estado === "listo" || f.estado === "ya-cargado")
      && f.firmaDeteccion?.kind === "no-detectada",
  ).length
  const puedeSubirTodo =
    listos > 0 && filas.every((f) => f.estado !== "subiendo" && f.estado !== "resolviendo")

  async function procesarArchivos(archivos: File[]) {
    // Agregamos filas en estado "leyendo-qr" y arrancamos el pipeline por cada una.
    // La resolución (llamada al backend) también corre por fila para poder mostrar
    // progreso individual — el volumen esperado es de decenas, no miles.
    setFilas((prev) => {
      const baseOrden = prev.length > 0 ? Math.max(...prev.map((f) => f.orden)) + 1 : 0
      const nuevas: Fila[] = archivos.map((archivo, i) => ({
        id: nuevoId(),
        archivo,
        estado: "leyendo-qr" as FilaEstado,
        qr: null,
        tipo: null,
        resuelto: null,
        pendienteResuelto: null,
        mensaje: null,
        firmaDeteccion: null,
        orden: baseOrden + i,
        asociadoA: null,
      }))
      // Dispara la lectura del QR en paralelo — cada procesarFila hace su propio
      // setFilas cuando termina. Cerramos sobre las ids nuevas.
      for (const fila of nuevas) {
        void procesarFila(fila.id, fila.archivo)
      }
      return [...prev, ...nuevas]
    })
  }

  async function procesarFila(id: string, archivo: File) {
    const qr = await readQrFromFile(archivo)
    if (!qr.qrEncontrado) {
      actualizar(id, { estado: "sin-qr", qr, mensaje: qr.error ?? "No se detectó QR." })
      return
    }
    if (qr.esChecklist) {
      await procesarFilaTarea(id, archivo, qr)
    } else if (qr.esPendienteCarga) {
      await procesarFilaPendiente(id, qr)
    } else {
      actualizar(id, {
        estado: "qr-invalido",
        qr,
        mensaje: qr.error ?? "El QR no es de carga (tarea ni pendiente).",
      })
    }
  }

  async function procesarFilaTarea(id: string, archivo: File, qr: QrLeidoResult) {
    actualizar(id, { estado: "resolviendo", qr, tipo: "tarea" })
    try {
      const res = await resolver.mutateAsync(qr.elementoTareaId!)
      const estadoBase: FilaEstado = res.data.registroYaExistia ? "ya-cargado" : "listo"
      const mensajeBase = res.data.registroYaExistia
        ? "Ya había un borrador — al subir se sobrescribe."
        : null

      const firmaDeteccion = await detectarFirmaSiCorresponde(res.data, archivo, qr)
      const mensajeFirma =
        firmaDeteccion?.kind === "no-detectada"
          ? firmaDeteccion.slotsTotal > 1
            ? `Faltan firmas: se detectaron ${firmaDeteccion.slotsDetectados}/${firmaDeteccion.slotsTotal} — se registra en observaciones.`
            : `Firma no detectada — se registra en observaciones.`
          : firmaDeteccion?.kind === "sin-fiduciales"
            ? `Planilla sin fiduciales — no fue posible verificar firmas visualmente.`
            : null

      actualizar(id, {
        estado: estadoBase,
        resuelto: res.data,
        firmaDeteccion,
        mensaje: [mensajeBase, mensajeFirma].filter(Boolean).join(" · ") || null,
      })
    } catch (err) {
      const apiErr = err as ApiError | undefined
      const isConflict = apiErr?.status === 409
      const msg = err instanceof Error ? err.message : "No se pudo resolver el registro."
      // El backend devuelve Conflict con "pertenece a otro proyecto" cuando la ET
      // es de otro. Detectamos por sustring para pintarlo distinto en la UI.
      const esOtroProyecto = isConflict && /otro proyecto/i.test(msg)
      actualizar(id, {
        estado: esOtroProyecto ? "otro-proyecto" : (isConflict ? "estado-incompatible" : "error"),
        mensaje: msg,
      })
    }
  }

  async function procesarFilaPendiente(id: string, qr: QrLeidoResult) {
    actualizar(id, { estado: "resolviendo", qr, tipo: "pendiente" })
    try {
      const res = await resolverPendiente.mutateAsync(qr.pendienteId!)
      if (!res.puedeCargar) {
        // Ya está terminal, ya tiene PDF cargado, o pertenece a otro proyecto.
        // El backend nos dice el motivo — matcheamos "otro proyecto" para pintar
        // distinto (rojo con warning), el resto queda como estado-incompatible.
        const esOtroProyecto = /otro proyecto/i.test(res.motivo ?? "")
        actualizar(id, {
          estado: esOtroProyecto ? "otro-proyecto" : "estado-incompatible",
          pendienteResuelto: res,
          mensaje: res.motivo ?? "El pendiente no admite carga en este momento.",
        })
        return
      }
      actualizar(id, {
        estado: "listo",
        pendienteResuelto: res,
        mensaje: null,
      })
    } catch (err) {
      const apiErr = err as Error & { status?: number }
      const isNotFound = apiErr?.status === 404
      actualizar(id, {
        estado: isNotFound ? "estado-incompatible" : "error",
        mensaje: err instanceof Error ? err.message : "No se pudo resolver el pendiente.",
      })
    }
  }

  function actualizar(id: string, patch: Partial<Fila>) {
    // Cada patch dispara el recalculo de agrupación — así una fila que resolvió
    // su QR y descubre que es duplicado se degrada a adjunto automáticamente.
    setFilas((prev) => recalcularAgrupacion(prev.map((f) => (f.id === id ? { ...f, ...patch } : f))))
  }

  function eliminarFila(id: string) {
    setFilas((prev) => recalcularAgrupacion(prev.filter((f) => f.id !== id)))
  }

  function limpiarSincronizados() {
    setFilas((prev) => recalcularAgrupacion(prev.filter((f) => f.estado !== "sincronizado")))
  }

  /** Sube o baja una fila en el orden. Reasigna `orden` secuencial y recalcula agrupación. */
  function moverFila(id: string, direccion: "arriba" | "abajo") {
    setFilas((prev) => {
      const ordenadas = [...prev].sort((a, b) => a.orden - b.orden)
      const idx = ordenadas.findIndex((f) => f.id === id)
      const target = direccion === "arriba" ? idx - 1 : idx + 1
      if (idx < 0 || target < 0 || target >= ordenadas.length) return prev
      ;[ordenadas[idx], ordenadas[target]] = [ordenadas[target], ordenadas[idx]]
      // Reasignar orden 0..N para normalizar (evita drift si se hicieron muchos moves).
      const conOrden = ordenadas.map((f, i) => ({ ...f, orden: i }))
      return recalcularAgrupacion(conOrden)
    })
  }

  /** Promueve un adjunto a carrier: lo mueve a la posición del carrier actual del grupo. */
  function hacerCarrier(id: string) {
    setFilas((prev) => {
      const ordenadas = [...prev].sort((a, b) => a.orden - b.orden)
      const fila = ordenadas.find((f) => f.id === id)
      if (!fila || !fila.asociadoA) return prev
      const carrierId = fila.asociadoA
      const carrierIdx = ordenadas.findIndex((f) => f.id === carrierId)
      const filaIdx = ordenadas.findIndex((f) => f.id === id)
      if (carrierIdx < 0 || filaIdx < 0) return prev
      // Sacamos la fila y la reinsertamos JUSTO ANTES del carrier actual.
      // Con eso queda como el nuevo primer archivo del grupo (mismo QR o no).
      const sinFila = ordenadas.filter((f) => f.id !== id)
      const nuevoCarrierIdx = sinFila.findIndex((f) => f.id === carrierId)
      sinFila.splice(nuevoCarrierIdx, 0, fila)
      const conOrden = sinFila.map((f, i) => ({ ...f, orden: i }))
      return recalcularAgrupacion(conOrden)
    })
  }

  /**
   * Corre la detección visual de firma sobre el archivo si el proyecto/tarea
   * tiene al menos un slot `Fisica`. El chequeo de `hayFirmasFisicas` se cachea
   * por proyecto para el batch entero. Silencioso ante error — devuelve `null`.
   */
  async function detectarFirmaSiCorresponde(
    resuelto: RegistroResolverResult,
    archivo: File,
    qr: QrLeidoResult,
  ): Promise<FirmaDeteccion> {
    const proyectoId = resuelto.proyectoId
    let cantidadFirmas = cacheFirmasFisicas.current.get(proyectoId)
    if (cantidadFirmas === undefined) {
      try {
        const res = await apiClient.get<{ data: FirmasConfigEfectiva }>(
          `/api/elementos-tareas/${resuelto.elementoTareaId}/firmas-config-efectiva`,
        )
        cantidadFirmas = res.data.cantidadSlotsFisica ?? 0
        cacheFirmasFisicas.current.set(proyectoId, cantidadFirmas)
      } catch (err) {
        console.error("[carga-rapida-qr] firmas-config-efectiva threw:", err)
        // No romper el flujo — asumimos que no aplica y seguimos.
        cacheFirmasFisicas.current.set(proyectoId, 0)
        return { kind: "no-aplica" }
      }
    }
    if (cantidadFirmas === 0) return { kind: "no-aplica" }
    try {
      const deteccion = await detectSignatureInFooter(archivo, {
        rotacion: qr.rotacionDetectada,
        cantidadSlots: cantidadFirmas,
      })
      if (deteccion.sinFiduciales) {
        return { kind: "sin-fiduciales", slotsTotal: cantidadFirmas }
      }
      return deteccion.detected
        ? {
            kind: "detectada",
            slotsDetectados: deteccion.slotsDetectados,
            slotsTotal: deteccion.slotsTotal,
          }
        : {
            kind: "no-detectada",
            slotsDetectados: deteccion.slotsDetectados,
            slotsTotal: deteccion.slotsTotal,
          }
    } catch (err) {
      console.error("[carga-rapida-qr] detectSignatureInFooter threw:", err)
      return { kind: "no-detectada", slotsDetectados: 0, slotsTotal: cantidadFirmas }
    }
  }

  async function subirTodas() {
    // Snapshot ordenado del batch — nos importa el ORDEN de los adjuntos para
    // que suban después de su carrier y en el orden en que están en la grilla.
    const snapshot = [...filas].sort((a, b) => a.orden - b.orden)
    const adjuntosPorCarrier = new Map<string, Fila[]>()
    for (const f of snapshot) {
      if (f.estado !== "adjunto" || !f.asociadoA) continue
      const arr = adjuntosPorCarrier.get(f.asociadoA) ?? []
      arr.push(f)
      adjuntosPorCarrier.set(f.asociadoA, arr)
    }

    // Recorremos carriers listos. Cada uno sube primero, y si OK, subimos sus
    // adjuntos secuencialmente contra el endpoint apropiado del tipo.
    for (const carrier of snapshot) {
      if (carrier.estado !== "listo" && carrier.estado !== "ya-cargado") continue

      const adjuntos = adjuntosPorCarrier.get(carrier.id) ?? []
      const carrierOk = await subirCarrier(carrier)
      if (!carrierOk) {
        // Marcamos sus adjuntos como error para que no se dejen "colgados".
        for (const adj of adjuntos)
          actualizar(adj.id, { estado: "error", mensaje: "No se subió porque el archivo principal falló." })
        continue
      }

      // Adjuntos: cada uno independiente; uno falla y los otros siguen.
      for (const adj of adjuntos) await subirAdjunto(carrier, adj)
    }
  }

  /** Sube el carrier al endpoint completar/fisico correspondiente. Devuelve true si OK. */
  async function subirCarrier(fila: Fila): Promise<boolean> {
    actualizar(fila.id, { estado: "subiendo" })
    try {
      const rotacion = fila.qr?.rotacionDetectada ?? 0
      const archivoFinal = await rotateFile(fila.archivo, rotacion)

      if (fila.tipo === "pendiente" && fila.pendienteResuelto) {
        const fd = new FormData()
        fd.append("archivo", archivoFinal)
        const res = await fetch(
          `/api/pendientes/${fila.pendienteResuelto.pendienteId}/completar/fisico`,
          { method: "POST", body: fd },
        )
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }))
          throw new Error(err.message ?? `Error ${res.status} al subir el archivo`)
        }
        actualizar(fila.id, { estado: "sincronizado", mensaje: null })
        queryClient.invalidateQueries({ queryKey: ["pendientes"] })
        return true
      }

      if (!fila.resuelto) throw new Error("Fila sin registro resuelto.")

      const fd = new FormData()
      fd.append("Archivo", archivoFinal)
      if (fila.firmaDeteccion?.kind === "no-detectada") {
        const { slotsDetectados, slotsTotal } = fila.firmaDeteccion
        const detalle = `firmas detectadas ${slotsDetectados}/${slotsTotal} en la zona de firmas`
        fd.append("FirmaOverrideDetalle", detalle.slice(0, 500))
      } else if (fila.firmaDeteccion?.kind === "sin-fiduciales") {
        const detalle = `planilla sin fiduciales — no fue posible verificar firmas visualmente`
        fd.append("FirmaOverrideDetalle", detalle.slice(0, 500))
      }
      const res = await fetch(
        `/api/registros/${fila.resuelto.registroId}/completar/fisico`,
        { method: "POST", body: fd },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message ?? `Error ${res.status} al subir el archivo`)
      }
      actualizar(fila.id, { estado: "sincronizado", mensaje: null })
      invalidarPostCargaRegistro(queryClient, fila.resuelto.registroId)
      return true
    } catch (err) {
      actualizar(fila.id, {
        estado: "error",
        mensaje: err instanceof Error ? err.message : "Error al subir.",
      })
      return false
    }
  }

  /**
   * Sube un adjunto al endpoint /archivos (tarea) o /adjuntos (pendiente) del
   * carrier. El tipo se determina por el carrier — el adjunto mismo puede tener
   * QR duplicado (mismo tipo que el carrier) o no tener QR (hereda el tipo).
   */
  async function subirAdjunto(carrier: Fila, fila: Fila): Promise<void> {
    actualizar(fila.id, { estado: "subiendo" })
    try {
      const rotacion = fila.qr?.rotacionDetectada ?? 0
      const archivoFinal = await rotateFile(fila.archivo, rotacion)
      const fd = new FormData()
      fd.append("archivo", archivoFinal)

      let url: string
      if (carrier.tipo === "pendiente" && carrier.pendienteResuelto) {
        url = `/api/pendientes/${carrier.pendienteResuelto.pendienteId}/adjuntos`
      } else if (carrier.tipo === "tarea" && carrier.resuelto) {
        url = `/api/registros/${carrier.resuelto.registroId}/archivos`
      } else {
        throw new Error("Carrier sin destino resuelto.")
      }

      const res = await fetch(url, { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message ?? `Error ${res.status} al subir el adjunto`)
      }
      actualizar(fila.id, { estado: "sincronizado", mensaje: null })
    } catch (err) {
      actualizar(fila.id, {
        estado: "error",
        mensaje: err instanceof Error ? err.message : "Error al subir adjunto.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-blue-700" />
          Carga rápida por QR
        </h1>
        <p className="text-sm text-muted-foreground">
          Soltá los PDFs firmados en papel — el sistema lee el QR de cada uno y los
          asocia al destino correcto. Detecta automáticamente si el QR corresponde a{" "}
          <em>tareas de elementos</em> o a <em>pendientes</em> y los procesa por el
          canal adecuado.
        </p>
      </div>

      {/* KPIs simples. Tailwind JIT no puede inferir grid-cols-N dinámico, así que
          usamos flex-wrap para que se distribuyan cuando hay más de 4. */}
      <div className="flex flex-wrap gap-3 *:flex-1 *:min-w-40">
        <Kpi label="En la lista" value={total} />
        <Kpi label="Listos para subir" value={listos} highlight="blue" />
        {adjuntos > 0 && (
          <Kpi label="Adjuntos" value={adjuntos} highlight="blue" />
        )}
        <Kpi label="Sincronizados" value={sincronizados} highlight="green" />
        <Kpi label="Con problemas" value={conError} highlight="red" />
        {sinFirmaDetectada > 0 && (
          <Kpi label="Sin firma detectada" value={sinFirmaDetectada} highlight="amber" />
        )}
        {otroProyecto > 0 && (
          <Kpi label="De otro proyecto" value={otroProyecto} highlight="red" />
        )}
      </div>

      {/* Dropzone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          const archivos = Array.from(e.dataTransfer.files).filter((f) =>
            /\.(pdf|jpg|jpeg|png)$/i.test(f.name),
          )
          if (archivos.length > 0) void procesarArchivos(archivos)
        }}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <FileUp className="h-8 w-8 text-gray-400 mb-2" />
        <span className="text-sm font-medium text-gray-700">
          Soltá varios archivos acá o hacé clic para seleccionar
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          PDF, JPG o PNG · con QR de planilla en blanco
        </span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="sr-only"
          onChange={(e) => {
            const archivos = Array.from(e.target.files ?? [])
            if (archivos.length > 0) void procesarArchivos(archivos)
            // Reset del input así se puede volver a elegir el mismo archivo.
            e.target.value = ""
          }}
        />
      </label>

      {/* Acciones */}
      {filas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            {total} archivo(s) · {listos} listo(s) para subir
          </span>
          <div className="ml-auto flex items-center gap-2">
            {sincronizados > 0 && (
              <Button variant="outline" size="sm" onClick={limpiarSincronizados} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Quitar sincronizados
              </Button>
            )}
            <Button
              onClick={subirTodas}
              disabled={!puedeSubirTodo}
              className="gap-1.5 bg-blue-900 hover:bg-blue-800"
            >
              <Upload className="h-4 w-4" />
              {adjuntos > 0
                ? `Subir todos (${listos} + ${adjuntos} adjuntos)`
                : `Subir todos (${listos})`}
            </Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      {filas.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...filas].sort((a, b) => a.orden - b.orden).map((f, idxOrdenado, arr) => {
                // Índice visible (1-based) del carrier al que este adjunto pertenece.
                const carrierIdx = f.asociadoA
                  ? arr.findIndex((x) => x.id === f.asociadoA)
                  : -1
                const puedeMover = f.estado !== "subiendo" && f.estado !== "resolviendo"
                return (
                  <TableRow
                    key={f.id}
                    className={
                      f.firmaDeteccion?.kind === "no-detectada"
                        ? "bg-amber-50/60"
                        : f.estado === "adjunto"
                          ? "bg-blue-50/40"
                          : undefined
                    }
                  >
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium truncate max-w-64" title={f.archivo.name}>
                          {f.archivo.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {(f.archivo.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={f.estado} mensaje={f.mensaje} />
                      {f.estado === "adjunto" && carrierIdx >= 0 && (
                        <div className="text-[11px] text-blue-800 mt-1 inline-flex items-center gap-1">
                          <Paperclip className="h-3 w-3" /> Adjunto de #{carrierIdx + 1}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {f.tipo === "tarea" && f.resuelto ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-blue-700 font-semibold">
                            {f.resuelto.elementoTag}
                          </span>
                          <span className="text-gray-700">{f.resuelto.elementoNombre}</span>
                        </div>
                      ) : f.tipo === "pendiente" && f.pendienteResuelto ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-blue-700 font-semibold">
                            {f.pendienteResuelto.codigoFormateado}
                          </span>
                          <span className="text-[11px] text-gray-500">Pendiente</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {f.tipo === "tarea" && f.resuelto ? (
                        <div className="flex flex-col">
                          <span>{f.resuelto.tareaNombre}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {f.resuelto.planillaNombre ?? "sin planilla"}
                          </span>
                        </div>
                      ) : f.tipo === "pendiente" && f.pendienteResuelto ? (
                        <span className="text-gray-700 line-clamp-2">
                          {f.pendienteResuelto.descripcion ?? "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <FirmaBadge deteccion={f.firmaDeteccion} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moverFila(f.id, "arriba")}
                          disabled={!puedeMover || idxOrdenado === 0}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 cursor-pointer hover:text-blue-700 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Subir en el orden"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moverFila(f.id, "abajo")}
                          disabled={!puedeMover || idxOrdenado === arr.length - 1}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 cursor-pointer hover:text-blue-700 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Bajar en el orden"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        {f.estado === "adjunto" && (
                          <button
                            type="button"
                            onClick={() => hacerCarrier(f.id)}
                            disabled={!puedeMover}
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 cursor-pointer hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Hacer principal (carrier) del grupo"
                          >
                            <ArrowUpFromLine className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => eliminarFila(f.id)}
                          disabled={!puedeMover}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 cursor-pointer hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Quitar de la lista"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: "blue" | "red" | "green" | "amber"
}) {
  const cls =
    highlight === "red"
      ? "text-red-700"
      : highlight === "green"
        ? "text-emerald-700"
        : highlight === "blue"
          ? "text-blue-700"
          : highlight === "amber"
            ? "text-amber-700"
            : "text-gray-900"
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  )
}

function EstadoBadge({
  estado,
  mensaje,
}: {
  estado: FilaEstado
  mensaje: string | null
}) {
  const map: Record<FilaEstado, { label: string; cls: string; icon: React.ReactNode }> = {
    "leyendo-qr": {
      label: "Leyendo QR...",
      cls: "bg-gray-100 text-gray-700",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    "sin-qr": {
      label: "Sin QR",
      cls: "bg-gray-100 text-gray-700",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    "qr-invalido": {
      label: "QR inválido",
      cls: "bg-amber-100 text-amber-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    resolviendo: {
      label: "Resolviendo...",
      cls: "bg-blue-100 text-blue-800",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    listo: {
      label: "Listo",
      cls: "bg-emerald-100 text-emerald-800",
      icon: <Check className="h-3 w-3" />,
    },
    "ya-cargado": {
      label: "Sobreescribe borrador",
      cls: "bg-violet-100 text-violet-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    "estado-incompatible": {
      label: "Ya resuelto",
      cls: "bg-amber-100 text-amber-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    "otro-proyecto": {
      label: "Otro proyecto",
      cls: "bg-red-100 text-red-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    subiendo: {
      label: "Subiendo...",
      cls: "bg-blue-100 text-blue-800",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    sincronizado: {
      label: "Sincronizado",
      cls: "bg-emerald-100 text-emerald-800",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    error: {
      label: "Error",
      cls: "bg-red-100 text-red-800",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    adjunto: {
      label: "Adjunto",
      cls: "bg-blue-100 text-blue-800",
      icon: <Paperclip className="h-3 w-3" />,
    },
  }
  const it = map[estado]
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium w-fit ${it.cls}`}>
        {it.icon}
        {it.label}
      </span>
      {mensaje && (
        <span className="text-[11px] text-muted-foreground max-w-xs whitespace-normal wrap-break-word">
          {mensaje}
        </span>
      )}
    </div>
  )
}

// ─── Badge de detección de firma ─────────────────────────────────────────────

function FirmaBadge({ deteccion }: { deteccion: FirmaDeteccion }) {
  if (!deteccion) return <span className="text-[11px] text-muted-foreground">—</span>
  if (deteccion.kind === "no-aplica") {
    return <span className="text-[11px] text-muted-foreground">N/A</span>
  }
  // Sin fiduciales: azul, no verificable — distinto de "faltan firmas".
  if (deteccion.kind === "sin-fiduciales") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium w-fit bg-blue-100 text-blue-800"
        title="La planilla fue impresa antes del sistema de fiduciales. La firma no se puede verificar visualmente."
      >
        <Info className="h-3 w-3" />
        Sin fiduciales
      </span>
    )
  }
  const multi = deteccion.slotsTotal > 1
  const label = multi
    ? `${deteccion.slotsDetectados}/${deteccion.slotsTotal} firmas`
    : deteccion.kind === "detectada" ? "Detectada" : "No detectada"
  const title = multi
    ? `${deteccion.slotsDetectados} de ${deteccion.slotsTotal} slots con firma detectada${deteccion.kind === "no-detectada" ? " — se registra en observaciones" : ""}`
    : deteccion.kind === "detectada" ? "Firma detectada" : "Firma no detectada — se registra en observaciones"
  const detectadaTodas = deteccion.kind === "detectada"
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium w-fit ${
        detectadaTodas ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
      title={title}
    >
      {detectadaTodas ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  )
}
