/**
 * Wrapper sobre Autodesk Viewer 7+ con la MISMA interfaz que el visor de IFC
 * (`@/features/modelo-3d/viewer`). Esto permite que la página del modelo-3d
 * elija qué viewer instanciar según el formato del archivo, sin cambiar el
 * resto de la lógica (highlight, applyGhost, applyColorPorEstado).
 *
 * El SDK de Autodesk se carga dinámico desde su CDN — no podemos npm-installarlo
 * porque pega assets a runtime y necesita el global `Autodesk.Viewing` disponible.
 *
 * IMPORTANTE: solo importar client-side (dynamic import).
 */

import { fetchViewerToken } from "../aps/api/use-aps"

const SDK_URL = "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js"
const CSS_URL = "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css"

let sdkLoadPromise: Promise<void> | null = null

function loadSdk(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise
  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("SSR")); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Autodesk?.Viewing) { resolve(); return }

    // CSS
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
      const link = document.createElement("link")
      link.rel = "stylesheet"
      link.href = CSS_URL
      document.head.appendChild(link)
    }
    // JS
    const script = document.createElement("script")
    script.src = SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("No se pudo cargar el Autodesk Viewer SDK."))
    document.head.appendChild(script)
  })
  return sdkLoadPromise
}

export interface ApsViewerHandle {
  loadModel: (urn: string) => Promise<{ totalItems: number }>
  highlightByGuid: (guid: string | null) => Promise<void>
  applyGhost: (visibleGuids: string[] | null) => Promise<void>
  applyColorPorEstado: (buckets: BucketsPorEstado | null) => Promise<void>
  dispose: () => void
}

export interface BucketsPorEstado {
  noIniciados: string[]
  enCurso: string[]
  completados: string[]
  rechazados: string[]
}

export interface CreateApsViewerOptions {
  /**
   * Callback al hacer click sobre una entidad del modelo. El "guid" para APS es
   * el externalId del objeto (si existe), o un sintético "aps-{dbId}" — lo
   * mismo que guardó el extractor del backend. Sirve para que el caller llame
   * al endpoint `/entidades/resolver` con ese GUID.
   */
  onPick?: (guid: string | null) => void
}

// Paleta semáforo coherente con el viewer IFC.
const COLOR_COMPLETADO  = [0.063, 0.725, 0.506, 1] // emerald-500
const COLOR_EN_CURSO    = [0.961, 0.620, 0.043, 1] // amber-500
const COLOR_NO_INICIADO = [0.580, 0.639, 0.722, 1] // slate-400
const COLOR_RECHAZADO   = [0.937, 0.267, 0.267, 1] // red-500
const COLOR_HIGHLIGHT   = [0.984, 0.749, 0.141, 1] // amber-400
const GHOST_COLOR       = [0.796, 0.835, 0.882, 1] // slate-300 (con alpha bajo)

export async function createApsViewer(
  container: HTMLElement,
  opts: CreateApsViewerOptions = {},
): Promise<ApsViewerHandle> {
  await loadSdk()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Autodesk = (window as any).Autodesk

  const viewerOptions = {
    env: "AutodeskProduction",
    api: "streamingV2",
    getAccessToken: async (
      callback: (token: string, expiresIn: number) => void,
    ) => {
      try {
        const t = await fetchViewerToken()
        callback(t.token, t.expiresIn)
      } catch (e) {
        console.error("APS token fetch:", e)
      }
    },
  }

  await new Promise<void>((resolve) => Autodesk.Viewing.Initializer(viewerOptions, () => resolve()))

  const viewer = new Autodesk.Viewing.GuiViewer3D(container)
  viewer.start()

  let currentModel: unknown | null = null
  let disposed = false
  // Cache GUID → dbId resuelto del modelo cargado, para no re-pegar a las
  // property tables en cada operación.
  const guidToDbId = new Map<string, number>()
  const dbIdToGuid = new Map<number, string>()

  async function loadModel(urn: string): Promise<{ totalItems: number }> {
    if (disposed) throw new Error("Viewer dispuesto.")
    const fullUrn = urn.startsWith("urn:") ? urn : `urn:${urn}`
    return new Promise((resolve, reject) => {
      Autodesk.Viewing.Document.load(
        fullUrn,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (doc: any) => {
          try {
            const viewable = doc.getRoot().getDefaultGeometry()
            currentModel = await viewer.loadDocumentNode(doc, viewable)

            // Pre-cargar mapping externalId → dbId.
            await refreshGuidMapping()

            resolve({ totalItems: guidToDbId.size })
          } catch (e) { reject(e) }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errCode: number, errMsg: string) => {
          reject(new Error(`Error cargando modelo APS (${errCode}): ${errMsg}`))
        },
      )
    })
  }

  async function refreshGuidMapping(): Promise<void> {
    guidToDbId.clear()
    dbIdToGuid.clear()
    if (!currentModel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    await new Promise<void>((resolve) => {
      m.getExternalIdMapping(
        (mapping: Record<string, number>) => {
          for (const [externalId, dbId] of Object.entries(mapping)) {
            guidToDbId.set(externalId, dbId)
            dbIdToGuid.set(dbId, externalId)
          }
          resolve()
        },
        () => resolve(),
      )
    })
  }

  // Click handler — Autodesk Viewer emite SELECTION_CHANGED al hacer click.
  let lastSelectionGuid: string | null = null
  const onSelectionChanged = (e: { dbIdArray: number[] }) => {
    if (!opts.onPick) return
    const dbId = e.dbIdArray?.[0]
    if (dbId === undefined) {
      if (lastSelectionGuid !== null) {
        lastSelectionGuid = null
        opts.onPick(null)
      }
      return
    }
    // Si todavía no tenemos mapping, usamos sintético "aps-{dbId}" como hace
    // el backend. Coincide con lo persistido en ProyectoIfcEntidad.IfcGuid.
    const guid = dbIdToGuid.get(dbId) ?? `aps-${dbId}`
    if (guid !== lastSelectionGuid) {
      lastSelectionGuid = guid
      opts.onPick(guid)
    }
  }
  viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged)

  async function highlightByGuid(guid: string | null): Promise<void> {
    if (!currentModel) return
    if (guid === null) {
      viewer.clearSelection()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(currentModel as any).clearThemingColors?.()
      return
    }
    const dbId = guidToDbId.get(guid) ?? parseSyntheticGuid(guid)
    if (dbId === null) return
    viewer.select([dbId])
    viewer.fitToView([dbId])
  }

  async function applyGhost(visibleGuids: string[] | null): Promise<void> {
    if (!currentModel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    if (visibleGuids === null) {
      viewer.showAll()
      m.clearThemingColors?.()
      return
    }
    const dbIds = guidsToIds(visibleGuids)
    if (dbIds.length === 0) {
      viewer.hideAll()
      return
    }
    // `isolate` muestra solo los pasados, atenúa el resto — equivalente al ghost.
    viewer.isolate(dbIds)
  }

  async function applyColorPorEstado(buckets: BucketsPorEstado | null): Promise<void> {
    if (!currentModel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    if (buckets === null) {
      m.clearThemingColors?.()
      viewer.impl.invalidate(true, true, true)
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = Autodesk.Viewing.Private?.THREE || (window as any).THREE
    const set = (ids: number[], color: number[]) => {
      const v4 = new THREE.Vector4(color[0], color[1], color[2], color[3])
      for (const id of ids) m.setThemingColor(id, v4)
    }
    m.clearThemingColors?.()
    set(guidsToIds(buckets.noIniciados), COLOR_NO_INICIADO)
    set(guidsToIds(buckets.enCurso),     COLOR_EN_CURSO)
    set(guidsToIds(buckets.completados), COLOR_COMPLETADO)
    set(guidsToIds(buckets.rechazados),  COLOR_RECHAZADO)
    viewer.impl.invalidate(true, true, true)
  }

  function guidsToIds(guids: string[]): number[] {
    const out: number[] = []
    for (const g of guids) {
      const id = guidToDbId.get(g) ?? parseSyntheticGuid(g)
      if (id !== null) out.push(id)
    }
    return out
  }

  function dispose() {
    if (disposed) return
    disposed = true
    try {
      viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged)
      viewer.finish()
    } catch { /* best-effort */ }
  }

  return { loadModel, highlightByGuid, applyGhost, applyColorPorEstado, dispose }
}

/** Convierte un GUID sintético "aps-{dbId}" a dbId numérico. Si no matchea, null. */
function parseSyntheticGuid(guid: string): number | null {
  if (!guid.startsWith("aps-")) return null
  const n = Number(guid.substring(4))
  return Number.isFinite(n) ? n : null
}
