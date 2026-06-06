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
  applyGhost: (visibleGuids: string[] | null, opts?: { hide?: boolean }) => Promise<void>
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
  // Último set de buckets de colores por estado aplicado. Lo guardamos para
  // poder re-aplicarlo cuando el filtro (isolate) cambia — sino los colores
  // pintados antes del filtro se pierden o quedan en dbIds incorrectos.
  let lastBuckets: BucketsPorEstado | null = null

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
          // Debug: muestreamos para que se pueda comparar contra los IfcGuid
          // persistidos en DB (deberían tener exactamente el mismo formato).
          const sample = Array.from(guidToDbId.entries()).slice(0, 5)
          // eslint-disable-next-line no-console
          console.log(
            `[APS viewer] externalIdMapping: ${guidToDbId.size} entries. Sample:`,
            sample,
          )
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

  async function applyGhost(
    visibleGuids: string[] | null,
    opts?: { hide?: boolean },
  ): Promise<void> {
    if (!currentModel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    // Si hide=true → los no-isolated quedan invisibles. Si false (default) →
    // quedan en ghost (semi-transparentes) por el comportamiento nativo del viewer.
    const hideMode = opts?.hide === true

    // Sin filtro: limpiar isolation + theming, mostrar todo.
    if (visibleGuids === null) {
      m.clearThemingColors?.()
      // Restaurar ghosting al default (true) → sin filtro el viewer vuelve a
      // su estado normal con todos los elementos en su color.
      try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
      viewer.isolate([])
      if (lastBuckets) {
        await aplicarBucketsRespetandoIsolate(lastBuckets)
      } else {
        viewer.impl.invalidate(true, true, true)
      }
      return
    }

    const dbIds = guidsToIds(visibleGuids)
    // eslint-disable-next-line no-console
    console.log(
      `[APS viewer] applyGhost: ${visibleGuids.length} guids pedidos → ${dbIds.length} dbIds resueltos`,
    )

    if (dbIds.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[APS viewer] applyGhost: ninguna entidad mapeada — mostrando modelo completo.",
      )
      m.clearThemingColors?.()
      try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
      viewer.isolate([])
      if (lastBuckets) await aplicarBucketsRespetandoIsolate(lastBuckets)
      else viewer.impl.invalidate(true, true, true)
      return
    }

    // 1) Aislar lo filtrado.
    //    - hide=true  → setGhosting(false): los no-isolated quedan INVISIBLES.
    //    - hide=false → setGhosting(true): los no-isolated quedan en ghost
    //      (semi-transparentes/atenuados) — el comportamiento nativo del viewer.
    m.clearThemingColors?.()
    try {
      (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(!hideMode)
    } catch { /* ignore */ }
    viewer.isolate(dbIds)

    // 2) Aplicar colores:
    //    - Si los colores por estado están ACTIVOS, re-pintar SOLO los dbIds
    //      que están dentro del isolate (los de los buckets se filtran por
    //      ese set). Así no quedan colores "fantasma" en los dbIds atenuados.
    //    - Si NO están activos, pintar los filtrados con highlight amarillo
    //      para que destaquen en modelos grandes (muchísimas primitivas CAD).
    if (lastBuckets) {
      await aplicarBucketsRespetandoIsolate(lastBuckets)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const THREE = Autodesk.Viewing.Private?.THREE || (window as any).THREE
      const highlightVec = new THREE.Vector4(
        COLOR_HIGHLIGHT[0], COLOR_HIGHLIGHT[1], COLOR_HIGHLIGHT[2], 0.6,
      )
      for (const dbId of dbIds) m.setThemingColor(dbId, highlightVec)
      viewer.impl.invalidate(true, true, true)
    }
  }

  async function applyColorPorEstado(buckets: BucketsPorEstado | null): Promise<void> {
    if (!currentModel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    lastBuckets = buckets

    if (buckets === null) {
      m.clearThemingColors?.()
      viewer.impl.invalidate(true, true, true)
      return
    }
    await aplicarBucketsRespetandoIsolate(buckets)
  }

  /**
   * Pinta los 4 buckets de colores por estado, restringiendo a los dbIds que
   * están dentro del isolate activo (si lo hay). Si no hay isolate activo,
   * pinta todos los dbIds de cada bucket.
   *
   * Esto es lo que evita que cuando filtrás por "Completados" veas también
   * colores "amarillo" y "rojo" de los atenuados — esos no se pintan porque
   * NO están en el set isolated.
   */
  async function aplicarBucketsRespetandoIsolate(buckets: BucketsPorEstado): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    if (!m) return

    // Sondear el isolate activo. Si está vacío o no hay isolate, pintamos todo.
    let isolatedSet: Set<number> | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isolated = (viewer as any).getIsolatedNodes?.() ?? []
      if (Array.isArray(isolated) && isolated.length > 0) {
        isolatedSet = new Set(isolated as number[])
      }
    } catch { /* best-effort */ }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = Autodesk.Viewing.Private?.THREE || (window as any).THREE
    const setColor = (ids: number[], color: number[]) => {
      const filteredIds = isolatedSet
        ? ids.filter((id) => isolatedSet!.has(id))
        : ids
      const v4 = new THREE.Vector4(color[0], color[1], color[2], color[3])
      for (const id of filteredIds) m.setThemingColor(id, v4)
    }

    m.clearThemingColors?.()
    setColor(guidsToIds(buckets.noIniciados), COLOR_NO_INICIADO)
    setColor(guidsToIds(buckets.enCurso),     COLOR_EN_CURSO)
    setColor(guidsToIds(buckets.completados), COLOR_COMPLETADO)
    setColor(guidsToIds(buckets.rechazados),  COLOR_RECHAZADO)
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
    lastBuckets = null
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
