/**
 * Wrapper sobre @thatopen/components para el viewer IFC. Encapsulado en un
 * factory `createViewer(container)` que devuelve handle con loadIfc/dispose.
 *
 * IMPORTANTE: este archivo SOLO debe importarse client-side (vía dynamic import).
 * @thatopen/components y three usan `window`/`document` a nivel de módulo.
 *
 * Recursos:
 *  - WASM (`web-ifc.wasm`) servido desde /wasm/ — `scripts/copy-ifc-wasm.mjs`
 *    lo copia desde node_modules en postinstall.
 *  - Worker de fragments lo trae automáticamente `FragmentsManager.getWorker()`
 *    desde unpkg (matchea la versión instalada).
 */

import * as OBC from "@thatopen/components"
import * as FRAGS from "@thatopen/fragments"
import * as THREE from "three"

export interface ViewerHandle {
  loadIfc: (buffer: Uint8Array, name?: string) => Promise<{ totalItems: number }>
  /**
   * Resalta en pantalla la entidad cuyo IfcGuid se le pase. Si pasás null,
   * limpia el highlight actual. Si el GUID no está en el modelo, no hace nada.
   */
  highlightByGuid: (guid: string | null) => Promise<void>
  /**
   * Aplica un "ghost" sobre el modelo: las entidades cuyos GUIDs NO estén en
   * la lista quedan grises y transparentes; las que SÍ están quedan con su
   * material original. Pasá null para limpiar el ghost (todo vuelve a colores
   * originales).
   */
  // El parámetro `opts.hide` lo respeta el viewer APS (oculta vs atenúa). El
  // IFC ignora ese flag por ahora — su ghost siempre se ve atenuado (color
  // gris + opacidad). Si en el futuro queremos "ocultar" en IFC, se cambia
  // setOpacity a 0 o se usa visibility de @thatopen/components.
  applyGhost: (visibleGuids: string[] | null, opts?: { hide?: boolean }) => Promise<void>
  /**
   * Pinta el modelo con colores semáforo según el estado del Elemento vinculado:
   * verde=completado, amarillo=en curso, gris=no iniciado, rojo=rechazado. Las
   * entidades sin vínculo quedan con su color IFC original. Pasá null para
   * volver a los colores originales.
   */
  applyColorPorEstado: (buckets: BucketsPorEstado | null) => Promise<void>
  dispose: () => void
}

/** Buckets de IfcGuids por estado del Elemento — el viewer pinta cada bucket. */
export interface BucketsPorEstado {
  noIniciados: string[]
  enCurso: string[]
  completados: string[]
  rechazados: string[]
}

export interface CreateViewerOptions {
  /**
   * Callback al hacer click sobre una entidad del modelo. El parámetro es el
   * IfcGuid (string 22 chars) o null si se clickeó vacío. El viewer también
   * resalta automáticamente la entidad clickeada — el caller solo tiene que
   * resolverlo a un Elemento si quiere mostrar info.
   */
  onPick?: (guid: string | null) => void
}

// Material amarillo de selección para el highlight (preset).
const HIGHLIGHT_MATERIAL: FRAGS.MaterialDefinition = {
  color: new THREE.Color(0xfbbf24), // tailwind amber-400
  renderedFaces: FRAGS.RenderedFaces.TWO,
  opacity: 1,
  transparent: false,
}

export async function createViewer(
  container: HTMLElement,
  opts: CreateViewerOptions = {},
): Promise<ViewerHandle> {
  const components = new OBC.Components()

  const worlds = components.get(OBC.Worlds)
  const world = worlds.create<OBC.SimpleScene, OBC.SimpleCamera, OBC.SimpleRenderer>()
  world.scene = new OBC.SimpleScene(components)
  world.renderer = new OBC.SimpleRenderer(components, container)
  world.camera = new OBC.SimpleCamera(components)

  components.init()
  world.scene.setup()

  // Encuadre inicial razonable hasta que cargue el modelo.
  world.camera.controls.setLookAt(15, 15, 15, 0, 0, 0)

  // FragmentsManager necesita un worker URL inicializado ANTES de cargar IFC.
  // getWorker() devuelve un blob URL del worker matcheando la versión.
  const fragments = components.get(OBC.FragmentsManager)
  fragments.init(await OBC.FragmentsManager.getWorker())

  // IfcLoader con path al WASM en /public/wasm/ (no CDN).
  const ifcLoader = components.get(OBC.IfcLoader)
  ifcLoader.settings.wasm = {
    path: "/wasm/",
    absolute: true,
  }
  ifcLoader.settings.autoSetWasm = false

  let currentModel: FRAGS.FragmentsModel | null = null
  let highlightedIds: number[] = []
  let disposed = false

  // ─── Click handling ──────────────────────────────────────────────────────
  // Track pointerdown vs pointerup para distinguir click "neto" de drag (orbit).
  // Si el cursor se movió más que un umbral, no es click. Sin esto, cada
  // operación de cámara dispararía un raycast inútil.
  let pointerDownAt: { x: number; y: number; t: number } | null = null
  const CLICK_MOVE_THRESHOLD_PX = 5
  const CLICK_MAX_DURATION_MS = 500

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return // solo botón izquierdo
    pointerDownAt = { x: e.clientX, y: e.clientY, t: performance.now() }
  }

  const onPointerUp = async (e: PointerEvent) => {
    if (!pointerDownAt || e.button !== 0) return
    const dx = e.clientX - pointerDownAt.x
    const dy = e.clientY - pointerDownAt.y
    const moved = Math.hypot(dx, dy)
    const elapsed = performance.now() - pointerDownAt.t
    pointerDownAt = null
    if (moved > CLICK_MOVE_THRESHOLD_PX) return
    if (elapsed > CLICK_MAX_DURATION_MS) return

    await handleClick(e)
  }

  async function handleClick(e: PointerEvent) {
    if (!currentModel || disposed) return

    // Buscamos el canvas dentro del container — el renderer crea uno cuando
    // se inicializa, pero no es accesible directamente desde la API pública.
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )

    const result = await currentModel.raycast({
      camera: world.camera.three,
      mouse,
      dom: canvas,
    })

    if (!result) {
      await resetHighlight()
      opts.onPick?.(null)
      return
    }

    // Obtenemos el IfcGuid de la entidad clickeada para resolver el Elemento
    // del lado del backend.
    const guids = await currentModel.getGuidsByLocalIds([result.localId])
    const guid = guids[0] ?? null

    await applyHighlight([result.localId])
    opts.onPick?.(guid)
  }

  container.addEventListener("pointerdown", onPointerDown)
  container.addEventListener("pointerup", onPointerUp)

  // ─── Highlight ───────────────────────────────────────────────────────────

  async function applyHighlight(localIds: number[]) {
    if (!currentModel) return
    if (highlightedIds.length > 0) {
      await currentModel.resetHighlight(highlightedIds)
    }
    await currentModel.highlight(localIds, HIGHLIGHT_MATERIAL)
    highlightedIds = localIds
  }

  async function resetHighlight() {
    if (!currentModel || highlightedIds.length === 0) return
    await currentModel.resetHighlight(highlightedIds)
    highlightedIds = []
  }

  async function highlightByGuid(guid: string | null): Promise<void> {
    if (!currentModel || disposed) return
    if (guid === null) {
      await resetHighlight()
      return
    }
    const ids = await currentModel.getLocalIdsByGuids([guid])
    const valid = ids.filter((id): id is number => typeof id === "number")
    if (valid.length === 0) return
    await applyHighlight(valid)
  }

  // ─── Ghost mode (filtros visuales) ───────────────────────────────────────
  // Para que el filtro sea instantáneo, mantenemos los IDs visibles en una ref.
  // Cuando el filtro cambia, primero "pintamos" TODO de gris+transparente, y
  // después "destransparentamos" solo los visibles.

  // Color y opacidad del ghost (modo "fuera de foco").
  const GHOST_COLOR = new THREE.Color(0xcbd5e1) // tailwind slate-300
  const GHOST_OPACITY = 0.15
  let ghostActive = false

  // Paleta de estados — tailwind colors para coherencia con la UI.
  const ESTADO_COLORS = {
    completado: new THREE.Color(0x10b981), // emerald-500
    enCurso:    new THREE.Color(0xf59e0b), // amber-500
    noIniciado: new THREE.Color(0x94a3b8), // slate-400
    rechazado:  new THREE.Color(0xef4444), // red-500
  }
  let colorPorEstadoActive = false

  async function applyColorPorEstado(buckets: BucketsPorEstado | null): Promise<void> {
    if (!currentModel || disposed) return

    if (buckets === null) {
      if (colorPorEstadoActive) {
        await currentModel.resetColor(undefined)
        colorPorEstadoActive = false
      }
      return
    }

    // Resolución de GUIDs → localIds en paralelo por bucket. Cada llamada al
    // model devuelve un array correlativo con `null` para los que no encuentre.
    async function resolverIds(guids: string[]): Promise<number[]> {
      if (guids.length === 0) return []
      const ids = await currentModel!.getLocalIdsByGuids(guids)
      return ids.filter((id): id is number => typeof id === "number")
    }

    const [noIniciados, enCurso, completados, rechazados] = await Promise.all([
      resolverIds(buckets.noIniciados),
      resolverIds(buckets.enCurso),
      resolverIds(buckets.completados),
      resolverIds(buckets.rechazados),
    ])

    // Aplicamos los colores por bucket. Antes reseteamos por si veníamos de un
    // applyColorPorEstado anterior — el reset es por-id, no afecta a los items
    // sin vínculo (que mantienen su color IFC original durante toda la sesión).
    if (colorPorEstadoActive) {
      await currentModel.resetColor(undefined)
    }
    if (noIniciados.length > 0) await currentModel.setColor(noIniciados, ESTADO_COLORS.noIniciado)
    if (enCurso.length > 0)    await currentModel.setColor(enCurso,    ESTADO_COLORS.enCurso)
    if (completados.length > 0) await currentModel.setColor(completados, ESTADO_COLORS.completado)
    if (rechazados.length > 0) await currentModel.setColor(rechazados, ESTADO_COLORS.rechazado)
    colorPorEstadoActive = true
  }

  async function applyGhost(
    visibleGuids: string[] | null,
    _opts?: { hide?: boolean },  // IFC ignora — siempre atenúa con gris+opacidad
  ): Promise<void> {
    if (!currentModel || disposed) return

    // null o lista vacía con flag "sin filtro" → limpiar ghost.
    if (visibleGuids === null) {
      if (ghostActive) {
        await currentModel.resetColor(undefined)
        await currentModel.resetOpacity(undefined)
        ghostActive = false
      }
      return
    }

    // 1. Aplicar gris + transparencia a TODOS los items.
    await currentModel.setColor(undefined, GHOST_COLOR)
    await currentModel.setOpacity(undefined, GHOST_OPACITY)
    ghostActive = true

    // 2. Restaurar color/opacidad solo en los IDs visibles.
    if (visibleGuids.length > 0) {
      const ids = await currentModel.getLocalIdsByGuids(visibleGuids)
      const valid = ids.filter((id): id is number => typeof id === "number")
      if (valid.length > 0) {
        await currentModel.resetColor(valid)
        await currentModel.resetOpacity(valid)
      }
    }
  }

  // ─── Load IFC ────────────────────────────────────────────────────────────

  async function loadIfc(buffer: Uint8Array, name = "model"): Promise<{ totalItems: number }> {
    if (disposed) throw new Error("Viewer dispuesto.")

    // Setup descarga el WASM y construye la instancia de web-ifc — la primera
    // llamada tarda; las siguientes son instantáneas.
    await ifcLoader.setup()

    // Si quedó un modelo anterior, lo sacamos antes de cargar el nuevo.
    if (currentModel) {
      world.scene.three.remove(currentModel.object)
      currentModel = null
      highlightedIds = []
      ghostActive = false
      colorPorEstadoActive = false
    }

    // coordinate=true alinea el modelo al sistema de coordenadas global del kernel.
    const model = await ifcLoader.load(buffer, true, name)
    currentModel = model
    world.scene.three.add(model.object)

    // Encuadre del modelo en pantalla.
    const box = new THREE.Box3().setFromObject(model.object)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 10
    const offset = maxDim * 1.5
    world.camera.controls.setLookAt(
      center.x + offset, center.y + offset, center.z + offset,
      center.x, center.y, center.z,
    )

    // Cantidad de items reales (no meshes — cada ítem puede agrupar varios).
    const ids = await model.getItemsIds()
    return { totalItems: ids.length }
  }

  function dispose() {
    if (disposed) return
    disposed = true
    container.removeEventListener("pointerdown", onPointerDown)
    container.removeEventListener("pointerup", onPointerUp)
    try {
      if (currentModel) world.scene.three.remove(currentModel.object)
      components.dispose()
    } catch {
      // best-effort
    }
  }

  return { loadIfc, highlightByGuid, applyGhost, applyColorPorEstado, dispose }
}
