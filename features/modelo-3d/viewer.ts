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
  dispose: () => void
}

export async function createViewer(container: HTMLElement): Promise<ViewerHandle> {
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
  let disposed = false

  async function loadIfc(buffer: Uint8Array, name = "model"): Promise<{ totalItems: number }> {
    if (disposed) throw new Error("Viewer dispuesto.")

    // Setup descarga el WASM y construye la instancia de web-ifc — la primera
    // llamada tarda; las siguientes son instantáneas.
    await ifcLoader.setup()

    // Si quedó un modelo anterior, lo sacamos antes de cargar el nuevo.
    if (currentModel) {
      world.scene.three.remove(currentModel.object)
      currentModel = null
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
    try {
      if (currentModel) world.scene.three.remove(currentModel.object)
      components.dispose()
    } catch {
      // best-effort
    }
  }

  return { loadIfc, dispose }
}
