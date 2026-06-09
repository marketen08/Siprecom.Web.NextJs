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
  /**
   * Notifica al viewer que su contenedor cambió de tamaño. Recalcula offset y
   * dimensiones internas — sin esto, los clicks se desfasan cuando el panel
   * de filtros u otro elemento del layout empuja el canvas.
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

export interface CreateApsViewerOptions {
  /**
   * Callback al hacer click sobre una entidad del modelo. Recibe la CADENA de
   * externalId desde la hoja clickeada hasta la raíz (hoja primero). El caller
   * resuelve contra el backend cuál de esos guids corresponde a un Elemento — en
   * modelos Navisworks el TAG vive en un nodo padre (la línea), no en la hoja de
   * geometría que el usuario realmente clickea. Cada guid es el externalId del
   * objeto o un sintético "aps-{dbId}". null = se deseleccionó.
   */
  onPick?: (guids: string[] | null) => void
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
  // Marca si el isolate actual lo causamos al activar "colores por estado"
  // (sin filtro). Sirve para limpiarlo al desactivar colores y NO romper un
  // isolate que pudo haber causado el filtro de forma independiente.
  let isolatedByColors = false

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

  /**
   * Cadena de externalId desde un dbId hasta la raíz (hoja → raíz). En Navisworks
   * el TAG/Elemento suele estar en un nodo ANCESTRO (la línea), no en la hoja de
   * geometría clickeada, así que mandamos todos los candidatos y el backend
   * resuelve cuál es entidad. Cada nivel: su externalId, o "aps-{dbId}" sintético.
   */
  function ancestorGuids(dbId: number): string[] {
    const out: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    const tree = m?.getInstanceTree?.()
    let id: number | undefined = dbId
    let guard = 0
    while (id !== undefined && id !== null && guard++ < 64) {
      out.push(dbIdToGuid.get(id) ?? `aps-${id}`)
      const parent: number | undefined = tree?.getNodeParentId?.(id)
      if (parent === undefined || parent === null || parent === id || parent === 0) break
      id = parent
    }
    return out
  }

  // Click handler — Autodesk Viewer emite SELECTION_CHANGED al hacer click.
  let lastSelectionKey: string | null = null
  const onSelectionChanged = (e: { dbIdArray: number[] }) => {
    if (!opts.onPick) return
    const dbId = e.dbIdArray?.[0]
    if (dbId === undefined) {
      if (lastSelectionKey !== null) {
        lastSelectionKey = null
        opts.onPick(null)
      }
      return
    }
    const chain = ancestorGuids(dbId)
    const key = chain.join("|")
    if (key !== lastSelectionKey) {
      lastSelectionKey = key
      opts.onPick(chain)
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
      isolatedByColors = false
      // Si los colores están activos, aplicarBucketsRespetandoIsolate va a
      // detectar que no hay isolate y lo va a re-crear para los con estado,
      // actualizando isolatedByColors = true.
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

    // 1) Aislar lo filtrado. El isolate pasa a ser "propiedad del filtro" —
    //    si después se desactivan los colores, NO lo limpiamos.
    //    - hide=true  → setGhosting(false): los no-isolated quedan INVISIBLES.
    //    - hide=false → setGhosting(true): los no-isolated quedan en ghost
    //      (semi-transparentes/atenuados) — el comportamiento nativo del viewer.
    m.clearThemingColors?.()
    isolatedByColors = false
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
      for (const dbId of dbIds) m.setThemingColor(dbId, highlightVec, true)
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
      // Si el isolate actual lo causamos nosotros al activar colores (no fue
      // un filtro), limpiarlo ahora que se desactiva. Si fue por filtro, se
      // mantiene intacto.
      if (isolatedByColors) {
        try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
        viewer.isolate([])
        isolatedByColors = false
      }
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

    // Pre-resolver dbIds de cada bucket — los necesitamos tanto para pintar
    // como (eventualmente) para inicializar el isolate cuando no hay filtro.
    const dbIdsNoIniciados = guidsToIds(buckets.noIniciados)
    const dbIdsEnCurso     = guidsToIds(buckets.enCurso)
    const dbIdsCompletados = guidsToIds(buckets.completados)
    const dbIdsRechazados  = guidsToIds(buckets.rechazados)

    // Sondear el isolate activo.
    let isolatedSet: Set<number> | null = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isolated = (viewer as any).getIsolatedNodes?.() ?? []
      if (Array.isArray(isolated) && isolated.length > 0) {
        isolatedSet = new Set(isolated as number[])
      }
    } catch { /* best-effort */ }

    // Si NO hay isolate activo y se acaban de aplicar colores por estado,
    // automáticamente isolamos los dbIds de los 4 buckets para que las
    // entidades sin vincular (que no tienen estado) queden atenuadas. Es la
    // misma UX que aplicar un filtro: lo no relevante se atenúa.
    if (isolatedSet === null) {
      const todosLosConEstado = [
        ...dbIdsNoIniciados, ...dbIdsEnCurso, ...dbIdsCompletados, ...dbIdsRechazados,
      ]
      if (todosLosConEstado.length > 0) {
        try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
        viewer.isolate(todosLosConEstado)
        isolatedByColors = true
        isolatedSet = new Set(todosLosConEstado)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = Autodesk.Viewing.Private?.THREE || (window as any).THREE
    const setColor = (ids: number[], color: number[]) => {
      const filteredIds = isolatedSet
        ? ids.filter((id) => isolatedSet!.has(id))
        : ids
      const v4 = new THREE.Vector4(color[0], color[1], color[2], color[3])
      // recursive=true: un guid de entidad puede ser un nodo Group (la línea),
      // cuya geometría vive en los hijos. Sin recursión, setThemingColor no pinta
      // nada visible. Con recursión, colorea el nodo y todos sus descendientes.
      for (const id of filteredIds) m.setThemingColor(id, v4, true)
    }

    m.clearThemingColors?.()
    setColor(dbIdsNoIniciados, COLOR_NO_INICIADO)
    setColor(dbIdsEnCurso,     COLOR_EN_CURSO)
    setColor(dbIdsCompletados, COLOR_COMPLETADO)
    setColor(dbIdsRechazados,  COLOR_RECHAZADO)
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
    isolatedByColors = false
    try {
      viewer.removeEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged)
      viewer.finish()
    } catch { /* best-effort */ }
  }

  function resize() {
    if (disposed) return
    try {
      // Autodesk Viewer 7+: viewer.resize() recalcula viewport, offset y
      // proyección. Si por alguna razón ese método no está en esta versión,
      // el optional chaining lo hace no-op (mejor que romper).
      (viewer as { resize?: () => void }).resize?.()
    } catch { /* best-effort */ }
  }

  return { loadModel, highlightByGuid, applyGhost, applyColorPorEstado, resize, dispose }
}

/** Convierte un GUID sintético "aps-{dbId}" a dbId numérico. Si no matchea, null. */
function parseSyntheticGuid(guid: string): number | null {
  if (!guid.startsWith("aps-")) return null
  const n = Number(guid.substring(4))
  return Number.isFinite(n) ? n : null
}
