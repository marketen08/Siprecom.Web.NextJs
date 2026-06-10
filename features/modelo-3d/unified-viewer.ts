/**
 * Wrapper unificado del visor 3D. Decide qué motor instanciar según el formato
 * del archivo:
 *  - IFC → `viewer.ts` (`@thatopen/components` + web-ifc)
 *  - NWD → `aps-viewer.ts` (Autodesk Viewer + SVF2)
 *
 * Ambos viewers exponen las mismas operaciones (`highlightByGuid`, `applyGhost`,
 * `applyColorPorEstado`, `dispose`) — la única diferencia es CÓMO se carga el
 * modelo, que requiere parámetros distintos. Encapsulamos eso acá para que las
 * páginas no tengan que hacer switches por formato.
 *
 * Solo importar client-side (dynamic import) — los dos motores subyacentes lo
 * requieren.
 */

import { downloadIfcBuffer } from "./api/use-ifc-archivos"
import {
  ApsTranslationStatus,
  FormatoArchivo3d,
  type ProyectoIfcArchivo,
} from "./types"

/**
 * Handle unificado para ambos motores. Las operaciones marcadas como opcionales
 * pueden no estar implementadas según el motor.
 */
export interface UnifiedViewerHandle {
  highlightByGuid: (guid: string | null) => Promise<void>
  /**
   * Selecciona en el visor TODAS las entidades indicadas (por guid/externalId)
   * sin re-disparar onPick. Se usa para resaltar la línea/equipo completo al
   * clickear una de sus piezas.
   */
  selectByGuids: (guids: string[]) => void
  /**
   * Aplica el ghost a las entidades visibles. Si `opts.hide` es true, las no
   * visibles quedan completamente invisibles. Si es false (default), quedan
   * semi-transparentes (efecto fantasma del viewer).
   */
  applyGhost: (visibleGuids: string[] | null, opts?: { hide?: boolean }) => Promise<void>
  applyColorPorEstado: (buckets: BucketsPorEstado | null) => Promise<void>
  /**
   * Notifica al viewer que su contenedor cambió de tamaño. Lo llaman las
   * páginas vía ResizeObserver para evitar que el click se desfase cuando
   * un panel lateral empuja el canvas.
   */
  resize: () => void
  dispose: () => void
}

export interface BucketsPorEstado {
  noIniciados: string[]
  enCurso: string[]
  completados: string[]
  rechazados: string[]
}

export interface CreateUnifiedViewerOptions {
  onPick?: (guids: string[] | null) => void
  /**
   * Callback para reportar progreso de la carga: usado para el indicador de
   * "Descargando IFC… X MB" o "Cargando NWD desde APS…" en la UI.
   */
  onProgress?: (msg: string) => void
}

/**
 * Crea el viewer y carga el archivo en él. Hace el setup completo:
 *  - Importa dinámicamente el motor correcto
 *  - Inicializa el contenedor
 *  - Descarga (IFC) o referencia (APS) el modelo
 *  - Devuelve el handle listo para usar
 *
 * Si el archivo es NWD pero la traducción APS NO está Completada todavía,
 * tira un error con mensaje claro (el caller debe esperar a que termine).
 */
export async function createUnifiedViewer(
  container: HTMLElement,
  archivo: ProyectoIfcArchivo,
  proyectoId: string,
  opts: CreateUnifiedViewerOptions = {},
): Promise<UnifiedViewerHandle> {
  if (archivo.formatoArchivo === FormatoArchivo3d.Ifc) {
    return await crearIfcViewer(container, archivo, proyectoId, opts)
  }
  if (archivo.formatoArchivo === FormatoArchivo3d.Nwd) {
    return await crearApsViewer(container, archivo, opts)
  }
  throw new Error(`Formato no soportado: ${archivo.formatoArchivo}`)
}

async function crearIfcViewer(
  container: HTMLElement,
  archivo: ProyectoIfcArchivo,
  proyectoId: string,
  opts: CreateUnifiedViewerOptions,
): Promise<UnifiedViewerHandle> {
  const { createViewer } = await import("./viewer")
  const handle = await createViewer(container, { onPick: opts.onPick })

  opts.onProgress?.("Descargando archivo…")
  const buffer = await downloadIfcBuffer(proyectoId, archivo.id, (p) => {
    if (p.via === "cache") {
      opts.onProgress?.("Cargando desde caché local…")
      return
    }
    const mb = Math.round((p.loaded / (1024 * 1024)) * 10) / 10
    const totalMb = p.total ? Math.round((p.total / (1024 * 1024)) * 10) / 10 : null
    opts.onProgress?.(
      totalMb !== null
        ? `Descargando archivo… ${mb} / ${totalMb} MB`
        : `Descargando archivo… ${mb} MB`,
    )
  }, archivo.tamanioBytes)

  opts.onProgress?.("Parseando IFC (puede tardar varios segundos)…")
  await handle.loadIfc(new Uint8Array(buffer), archivo.nombre)
  opts.onProgress?.("")
  return handle
}

async function crearApsViewer(
  container: HTMLElement,
  archivo: ProyectoIfcArchivo,
  opts: CreateUnifiedViewerOptions,
): Promise<UnifiedViewerHandle> {
  if (archivo.apsTranslationStatus !== ApsTranslationStatus.Completado) {
    throw new Error(
      "La traducción del NWD todavía no terminó — esperá a que aparezca el estado Completado.",
    )
  }
  if (!archivo.apsUrn) {
    throw new Error("Archivo NWD sin URN APS asignada — re-procesá la traducción.")
  }
  const { createApsViewer } = await import("./aps-viewer")
  const handle = await createApsViewer(container, { onPick: opts.onPick })

  opts.onProgress?.("Cargando NWD desde Autodesk…")
  await handle.loadModel(archivo.apsUrn)
  opts.onProgress?.("")
  return handle
}
