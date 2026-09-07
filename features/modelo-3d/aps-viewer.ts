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

/**
 * Pide el token del viewer reintentando con backoff. Pensado para el arranque
 * en frío del backend (App Service recién despierto o base serverless saliendo
 * de pausa), donde la primera llamada puede tardar o fallar por unos segundos
 * antes de responder normal. ~6 intentos × 3s ≈ 18s de margen.
 */
async function fetchViewerTokenConReintentos(
  onProgress?: (msg: string) => void,
  intentos = 6,
  esperaMs = 3000,
): Promise<{ token: string; expiresIn: number }> {
  let ultimoError: unknown
  for (let i = 0; i < intentos; i++) {
    try {
      return await fetchViewerToken()
    } catch (e) {
      ultimoError = e
      if (i < intentos - 1) {
        onProgress?.(`El sistema está iniciando, reintentando… (${i + 2}/${intentos})`)
        await new Promise((r) => setTimeout(r, esperaMs))
      }
    }
  }
  throw ultimoError instanceof Error
    ? ultimoError
    : new Error("No se pudo conectar con el servidor para cargar el modelo 3D.")
}

export interface ApsViewerHandle {
  loadModel: (urn: string) => Promise<{ totalItems: number }>
  /**
   * Resuelve cuando el árbol de objetos terminó de cargar — el momento en que la
   * maqueta pasa a ser interactiva (clic, aislamiento, colores). La geometría ya
   * está mucho antes; esto es lo que realmente cuesta en modelos grandes.
   */
  esperarArbol: () => Promise<void>
  highlightByGuid: (guid: string | null) => Promise<void>
  /**
   * Selecciona en el visor TODAS las entidades indicadas (por externalId), sin
   * disparar el callback onPick. Se usa para resaltar la línea/equipo completo
   * cuando se clickea una de sus piezas.
   */
  selectByGuids: (guids: string[]) => void
  /** Selección por dbId — camino rápido, no requiere el índice externalId → dbId. */
  selectByDbIds: (dbIds: number[]) => void
  /**
   * Encuadra la cámara sobre las entidades indicadas (por externalId). Usado en
   * mobile al seleccionar para centrar la pieza en la zona visible una vez que
   * el bottom sheet redimensionó el viewer. No-op si no resuelve ningún dbId.
   */
  fitToGuids: (guids: string[]) => void
  applyGhost: (
    visibleGuids: string[] | null,
    opts?: { hide?: boolean; dbIds?: number[] },
  ) => Promise<void>
  applyColorPorEstado: (buckets: BucketsPorEstado | null) => Promise<void>
  /**
   * F7 del roadmap TestGroups: pinta cada TestGroup con un color de una paleta
   * cíclica de 12 colores. Pasá null para volver a los colores originales.
   */
  applyColorPorTestGroup: (buckets: BucketsPorTestGroup | null) => Promise<void>
  /**
   * Pintado genérico: cada grupo lleva sus piezas y su color. Los modos de
   * coloreado nuevos (pendientes por categoría, y los que vengan) usan esto en
   * vez de sumar un método por modo.
   */
  applyColorPorGrupos: (grupos: GrupoColor[] | null) => Promise<void>
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
  /**
   * dbIds paralelos a los guids, cuando el backend los tiene (ApsObjectId). Si
   * vienen, el visor pinta directo y no construye el índice externalId → dbId,
   * que en una maqueta de más de un millón de objetos son varios minutos.
   */
  noIniciadosIds?: number[]
  enCursoIds?: number[]
  completadosIds?: number[]
}

/** F7: buckets de IfcGuids agrupados por TestGroup para el modo APS/NWD. */
export interface BucketsPorTestGroup {
  buckets: Array<{ testGroupId: string; guids: string[]; ids?: number[] }>
  sinTestGroup: string[]
  sinTestGroupIds?: number[]
}

/**
 * Grupo de piezas a pintar de un color. `ids` son dbIds (ApsObjectId): si vienen,
 * el visor pinta directo; si no, cae al índice externalId → dbId, que en maquetas
 * grandes son minutos.
 */
export interface GrupoColor {
  guids: string[]
  ids?: number[]
  /** Color en 0xRRGGBB. */
  hex: number
}

/** Paleta cíclica para F7 — misma que viewer.ts (IFC) para consistencia. */
const TESTGROUP_PALETTE_APS = [
  0x0ea5e9, 0xf59e0b, 0x10b981, 0xef4444, 0x8b5cf6, 0x14b8a6,
  0xf97316, 0x6366f1, 0xec4899, 0x84cc16, 0x06b6d4, 0xa855f7,
] as const
const TESTGROUP_SIN_PACK_COLOR_APS = 0x94a3b8

export interface CreateApsViewerOptions {
  /**
   * Callback al hacer click sobre una entidad del modelo. Recibe la CADENA de
   * externalId desde la hoja clickeada hasta la raíz (hoja primero). El caller
   * resuelve contra el backend cuál de esos guids corresponde a un Elemento — en
   * modelos Navisworks el TAG vive en un nodo padre (la línea), no en la hoja de
   * geometría que el usuario realmente clickea. Cada guid es el externalId del
   * objeto o un sintético "aps-{dbId}". null = se deseleccionó.
   */
  onPick?: (guids: string[] | null, dbIds?: number[]) => void
  /**
   * Reporta progreso durante el arranque del visor (ej. mientras se espera el
   * token con el backend frío). El caller lo muestra en el banner de carga.
   */
  onProgress?: (msg: string) => void
  /**
   * Se dispara cuando termina de construirse el índice externalId → dbId, que
   * corre en segundo plano después de mostrar la geometría. Hasta entonces el
   * modelo se ve y se navega, pero clic, colores y filtros tienen que esperarlo.
   * Recibe la cantidad de piezas indexadas (0 si falló).
   */
  onIndiceListo?: (piezas: number) => void
  /**
   * Se dispara cuando el árbol de objetos del modelo terminó de cargar. Hasta
   * entonces la maqueta se ve y se navega, pero el clic y el aislamiento no
   * funcionan: ambos dependen del árbol.
   */
  onArbolListo?: () => void
}

// Paleta semáforo coherente con el viewer IFC.
const COLOR_COMPLETADO  = [0.063, 0.725, 0.506, 1] // emerald-500
const COLOR_EN_CURSO    = [0.961, 0.620, 0.043, 1] // amber-500
const COLOR_NO_INICIADO = [0.580, 0.639, 0.722, 1] // slate-400
// Sin "rechazado": cuando un Elemento no aplica se elimina, no se rechazan sus
// tareas. Ese bucket no se pinta en el visor.
const COLOR_HIGHLIGHT   = [0.984, 0.749, 0.141, 1] // amber-400
const GHOST_COLOR       = [0.796, 0.835, 0.882, 1] // slate-300 (con alpha bajo)

export async function createApsViewer(
  container: HTMLElement,
  opts: CreateApsViewerOptions = {},
): Promise<ApsViewerHandle> {
  await loadSdk()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Autodesk = (window as any).Autodesk

  // Pre-traemos el primer token ANTES de instanciar el viewer. Si el backend
  // está frío la llamada puede fallar unos segundos: reintentamos con backoff
  // para darle tiempo a calentar. Si tras los reintentos sigue fallando,
  // lanzamos — así la página muestra su banner de error en vez de que el SDK de
  // Autodesk pinte "Backend call failure" sobre el canvas negro.
  opts.onProgress?.("Conectando con Autodesk…")
  const tArranque = performance.now()
  let tokenInicialPendiente: { token: string; expiresIn: number } | null =
    await fetchViewerTokenConReintentos(opts.onProgress)
  const msToken = Math.round(performance.now() - tArranque)

  const viewerOptions = {
    env: "AutodeskProduction",
    api: "streamingV2",
    getAccessToken: async (
      callback: (token: string, expiresIn: number) => void,
    ) => {
      // El SDK pide el token al iniciar y luego para refrescarlo cerca del
      // vencimiento. En el primer pedido devolvemos el ya pre-obtenido para no
      // pegarle dos veces al backend; en los refrescos posteriores lo volvemos a
      // pedir (con reintentos por si el backend se volvió a dormir).
      if (tokenInicialPendiente) {
        const t = tokenInicialPendiente
        tokenInicialPendiente = null
        callback(t.token, t.expiresIn)
        return
      }
      try {
        const t = await fetchViewerTokenConReintentos()
        callback(t.token, t.expiresIn)
      } catch (e) {
        // En un refresh tardío ya no podemos abortar la sesión del viewer; al
        // menos lo dejamos registrado. El SDK reintentará en el próximo ciclo.
        console.error("APS token refresh:", e)
      }
    },
  }

  const tInit = performance.now()
  await new Promise<void>((resolve) => Autodesk.Viewing.Initializer(viewerOptions, () => resolve()))

  const viewer = new Autodesk.Viewing.GuiViewer3D(container)
  viewer.start()
  // eslint-disable-next-line no-console
  console.log(
    `[APS viewer] arranque — token ${msToken} ms · SDK+init ${Math.round(performance.now() - tInit)} ms`,
  )

  // Manija de debug fuera de producción: permite medir a mano desde la consola
  // (ej. cronometrar getExternalIdMapping) sin tener que instrumentar el código
  // cada vez. No se expone en producción para no dar acceso al viewer desde la
  // consola del cliente.
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    ;(window as unknown as Record<string, unknown>).__apsViewer = viewer
  }

  let currentModel: unknown | null = null
  let disposed = false
  // Cache GUID → dbId resuelto del modelo cargado, para no re-pegar a las
  // property tables en cada operación.
  const guidToDbId = new Map<string, number>()
  const dbIdToGuid = new Map<number, string>()
  // Estado del índice de piezas. Se construye en segundo plano tras mostrar la
  // geometría; las operaciones que resuelven guids esperan `indicePromesa`.
  let indicePromesa: Promise<void> | null = null
  let indiceListo = false

  // Árbol de objetos del modelo. Llega DESPUÉS de la geometría porque depende de
  // la base de propiedades, y es lo que realmente cuesta en maquetas grandes.
  // Sin él no funcionan `isolate` (necesita mapear dbId → fragmentos) ni la
  // subida por ancestros del click (el TAG vive en un nodo padre, no en la hoja).
  // Todo lo interactivo espera esto; la geometría se muestra igual mientras tanto.
  let arbolPromesa: Promise<unknown> | null = null
  let arbolListo = false

  function iniciarArbol(): Promise<unknown> {
    if (arbolPromesa) return arbolPromesa
    if (!currentModel) return Promise.resolve(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm: any = currentModel
    const t0 = performance.now()
    arbolPromesa = new Promise((resolve) => {
      mm.getObjectTree?.(
        (tree: unknown) => {
          arbolListo = true
          // eslint-disable-next-line no-console
          console.log(`[APS viewer] árbol de objetos listo en ${Math.round(performance.now() - t0)} ms`)
          opts.onArbolListo?.()
          resolve(tree)
        },
        (e: unknown) => {
          // Sin árbol el modelo se ve y se navega, pero no hay clic ni aislamiento.
          arbolListo = true
          // eslint-disable-next-line no-console
          console.warn("[APS viewer] no se pudo cargar el árbol de objetos:", e)
          opts.onArbolListo?.()
          resolve(null)
        },
      )
    })
    return arbolPromesa
  }

  /** Espera el árbol si todavía no está. Lo usan clic, isolate y colores. */
  async function conArbol(): Promise<void> {
    if (arbolListo) return
    await iniciarArbol()
  }

  // Fragmentos que apagamos a mano (camino sin árbol), para poder restaurarlos.
  let fragmentosApagados: number[] = []

  /**
   * Atenúa todo lo que NO está en `dbIdsVisibles`, operando a nivel de fragmento.
   *
   * `viewer.isolate` necesita el árbol de objetos, que en maquetas de más de un
   * millón de piezas tarda minutos. El mapa `fragId2dbId` en cambio viene con la
   * geometría, así que podemos resolver qué fragmentos apagar sin esperar nada.
   *
   * Devuelve false si la API de visibilidad del fragment list no está disponible
   * en esta versión del SDK — el caller cae entonces al camino con árbol.
   */
  function atenuarPorFragmentos(dbIdsVisibles: Set<number>, fantasma = true): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m2: any = currentModel
    const frag2db: ArrayLike<number> | undefined = m2?.getData?.()?.fragments?.fragId2dbId
    const fragList = m2?.getFragmentList?.()
    if (!frag2db || !fragList || typeof fragList.setVisibility !== "function") {
      // eslint-disable-next-line no-console
      console.warn("[APS viewer] atenuado por fragmentos no disponible; se espera el árbol.")
      return false
    }

    restaurarFragmentos()
    // Clave: un fragmento invisible se dibuja como FANTASMA (translúcido) si el
    // ghosting está activo, y desaparece si no lo está. Es la única diferencia
    // entre "atenuar lo que no aplica" y "ocultarlo".
    try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(fantasma) } catch { /* ignore */ }
    const t0 = performance.now()
    const apagar: number[] = []
    for (let fragId = 0; fragId < frag2db.length; fragId++) {
      if (!dbIdsVisibles.has(frag2db[fragId])) apagar.push(fragId)
    }
    for (const fragId of apagar) fragList.setVisibility(fragId, false)
    fragmentosApagados = apagar
    viewer.impl.invalidate(true, true, true)
    // eslint-disable-next-line no-console
    console.log(
      `[APS viewer] atenuado por fragmentos: ${apagar.length.toLocaleString()} de ` +
      `${frag2db.length.toLocaleString()} apagados en ${Math.round(performance.now() - t0)} ms`,
    )
    return true
  }

  /** Vuelve a mostrar los fragmentos que apagamos con atenuarPorFragmentos. */
  function restaurarFragmentos(): void {
    if (fragmentosApagados.length === 0) return
    const cuantos = fragmentosApagados.length
    // El ghosting va PRIMERO: con ghosting apagado, volver a marcar visible un
    // fragmento no siempre lo repinta. Restaurar el flag antes evita quedarse con
    // piezas invisibles al pasar de "ocultar" a "atenuar".
    try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fragList = (currentModel as any)?.getFragmentList?.()
    if (fragList?.setVisibility) {
      for (const fragId of fragmentosApagados) fragList.setVisibility(fragId, true)
    }
    fragmentosApagados = []
    // showAll además resetea el estado de visibilidad que el visor lleva por su
    // cuenta; sin esto quedaban piezas apagadas que no habíamos tocado nosotros.
    try { viewer.showAll() } catch { /* ignore */ }
    viewer.impl.invalidate(true, true, true)
    // eslint-disable-next-line no-console
    console.log(`[APS viewer] restaurados ${cuantos.toLocaleString()} fragmentos`)
  }
  // Último set de buckets de colores por estado aplicado. Lo guardamos para
  // poder re-aplicarlo cuando el filtro (isolate) cambia — sino los colores
  // pintados antes del filtro se pierden o quedan en dbIds incorrectos.
  let lastBuckets: BucketsPorEstado | null = null
  // Marca si el isolate actual lo causamos al activar "colores por estado"
  // (sin filtro). Sirve para limpiarlo al desactivar colores y NO romper un
  // isolate que pudo haber causado el filtro de forma independiente.
  let isolatedByColors = false
  // dbIds que el FILTRO mantiene aislados (null = sin filtro). Lo trackeamos a
  // mano en vez de sondear viewer.getIsolatedNodes(): showAll()/isolate() son
  // asíncronos, así que sondear justo después devuelve el isolate viejo y los
  // colores se re-pintaban solo sobre lo filtrado al limpiar el filtro.
  let filterIsolatedIds: number[] | null = null

  async function loadModel(urn: string): Promise<{ totalItems: number }> {
    if (disposed) throw new Error("Viewer dispuesto.")
    const fullUrn = urn.startsWith("urn:") ? urn : `urn:${urn}`
    // Cronómetro por etapa: "Cargando NWD desde Autodesk…" tapa tres fases con
    // costos muy distintos (manifest, geometría, índice de piezas). Sin separarlas
    // no se puede saber si conviene atacar la red, el modelo o el índice.
    const t0 = performance.now()
    const ms = (desde: number) => Math.round(performance.now() - desde)
    return new Promise((resolve, reject) => {
      Autodesk.Viewing.Document.load(
        fullUrn,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (doc: any) => {
          try {
            const tManifest = ms(t0)
            const t1 = performance.now()
            const viewable = doc.getRoot().getDefaultGeometry()
            currentModel = await viewer.loadDocumentNode(doc, viewable)
            const tGeometria = ms(t1)

            // El índice externalId → dbId NO se construye acá. Es carísimo (más de
            // 6 minutos en una maqueta de 1,4M de objetos, contra 90 ms de
            // geometría) y desde que el backend persiste ApsObjectId ya no hace
            // falta: colores, filtros, clic y selección van con dbIds directos.
            // Queda como fallback perezoso para maquetas procesadas antes de esa
            // columna — `conIndice()` lo construye recién si alguien lo necesita.

            // El árbol sí hace falta y es lo caro: lo arrancamos ya, sin esperarlo,
            // para que empiece a cargar mientras el usuario mira la maqueta.
            iniciarArbol()

            // eslint-disable-next-line no-console
            console.log(
              `[APS viewer] listo en ${ms(t0)} ms — manifest ${tManifest} ms · ` +
              `geometría ${tGeometria} ms · índice: no se construye (se usa ApsObjectId)`,
            )

            resolve({ totalItems: 0 })
          } catch (e) { reject(e) }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (errCode: number, errMsg: string) => {
          reject(new Error(`Error cargando modelo APS (${errCode}): ${errMsg}`))
        },
      )
    })
  }

  /**
   * Arranca la construcción del índice externalId → dbId y devuelve la promesa.
   * Idempotente: llamarla dos veces reusa la misma corrida.
   *
   * `getExternalIdMapping` necesita la base de propiedades del modelo, que se
   * descarga y parsea aparte de la geometría. En una maqueta de más de un millón
   * de objetos es la etapa más cara de toda la carga — por eso no se espera para
   * mostrar la planta.
   */
  function iniciarIndice(): Promise<void> {
    if (indicePromesa) return indicePromesa
    guidToDbId.clear()
    dbIdToGuid.clear()
    if (!currentModel) return Promise.resolve()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    const t0 = performance.now()

    indicePromesa = new Promise<void>((resolve) => {
      m.getExternalIdMapping(
        (mapping: Record<string, number>) => {
          for (const externalId in mapping) {
            const dbId = mapping[externalId]
            guidToDbId.set(externalId, dbId)
            dbIdToGuid.set(dbId, externalId)
          }
          indiceListo = true
          // eslint-disable-next-line no-console
          console.log(
            `[APS viewer] índice listo: ${guidToDbId.size} piezas en ` +
            `${Math.round(performance.now() - t0)} ms`,
          )
          opts.onIndiceListo?.(guidToDbId.size)
          resolve()
        },
        () => {
          // Sin índice no hay resolución de guids, pero el modelo sigue usable
          // para navegar. Marcamos listo para no dejar operaciones esperando
          // una promesa que nunca resuelve.
          indiceListo = true
          // eslint-disable-next-line no-console
          console.warn("[APS viewer] no se pudo construir el índice de piezas.")
          opts.onIndiceListo?.(0)
          resolve()
        },
      )
    })
    return indicePromesa
  }

  /** Espera el índice si todavía no está. Lo usan las operaciones que resuelven guids. */
  async function conIndice(): Promise<void> {
    if (indiceListo) return
    await iniciarIndice()
  }

  /**
   * Cadena de externalId desde un dbId hasta la raíz (hoja → raíz). En Navisworks
   * el TAG/Elemento suele estar en un nodo ANCESTRO (la línea), no en la hoja de
   * geometría clickeada, así que mandamos todos los candidatos y el backend
   * resuelve cuál es entidad. Cada nivel: su externalId, o "aps-{dbId}" sintético.
   */
  function ancestorGuids(dbId: number): string[] {
    return ancestorDbIds(dbId).map((id) => dbIdToGuid.get(id) ?? `aps-${id}`)
  }

  /**
   * Misma cadena de ancestros pero en dbIds. NO necesita el índice: el instance
   * tree viene con la geometría. Es el camino rápido del click — el backend
   * resuelve la entidad por ApsObjectId.
   */
  function ancestorDbIds(dbId: number): number[] {
    const out: number[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    const tree = m?.getInstanceTree?.()
    let id: number | undefined = dbId
    let guard = 0
    while (id !== undefined && id !== null && guard++ < 64) {
      out.push(id)
      const parent: number | undefined = tree?.getNodeParentId?.(id)
      if (parent === undefined || parent === null || parent === id || parent === 0) break
      id = parent
    }
    return out
  }

  // Selección programática (selectByGuids) — guardamos el set de dbIds que
  // seleccionamos nosotros para NO re-disparar onPick cuando llega su
  // SELECTION_CHANGED (sino haríamos un ida y vuelta innecesario al backend).
  let lastProgrammaticKey: string | null = null
  const keyDeDbIds = (ids: number[]) => ids.slice().sort((a, b) => a - b).join(",")

  /** Selección directa por dbId — no necesita el índice. */
  function selectByDbIds(dbIds: number[]): void {
    if (disposed || dbIds.length === 0) return
    lastProgrammaticKey = keyDeDbIds(dbIds)
    viewer.select(dbIds)
  }

  function selectByGuids(guids: string[]): void {
    // Si el índice todavía no está, reintentamos cuando termine en vez de no
    // hacer nada: el usuario ya pidió la acción y no tiene por qué repetirla.
    if (!indiceListo) { void conIndice().then(() => selectByGuids(guids)); return }
    const dbIds = guidsToIds(guids)
    if (dbIds.length === 0) return
    lastProgrammaticKey = keyDeDbIds(dbIds)
    viewer.select(dbIds)
  }

  // Encuadra sin tocar la selección — el encuadre se dispara aparte (en mobile,
  // después de que el bottom sheet redimensionó el viewer) para centrar la
  // pieza en la zona visible.
  function fitToGuids(guids: string[]): void {
    if (disposed) return
    if (!indiceListo) { void conIndice().then(() => fitToGuids(guids)); return }
    const dbIds = guidsToIds(guids)
    if (dbIds.length === 0) return
    viewer.fitToView(dbIds)
  }

  // Click handler — Autodesk Viewer emite SELECTION_CHANGED al hacer click.
  let lastSelectionKey: string | null = null
  const onSelectionChanged = (e: { dbIdArray: number[] }) => {
    if (!opts.onPick) return
    // Si esta selección la disparamos nosotros (selectByGuids), no re-pickear.
    if (e.dbIdArray && e.dbIdArray.length > 0 && keyDeDbIds(e.dbIdArray) === lastProgrammaticKey) {
      lastProgrammaticKey = null
      return
    }
    const dbId = e.dbIdArray?.[0]
    if (dbId === undefined) {
      if (lastSelectionKey !== null) {
        lastSelectionKey = null
        opts.onPick(null)
      }
      return
    }
    // Sin árbol no podemos subir por ancestros, pero SÍ tenemos el dbId de la
    // pieza clickeada — y en modelos donde el TAG vive en cada componente (CADWorx)
    // eso alcanza para resolver la entidad. Respondemos con la hoja sola y, si el
    // árbol ya está, con la cadena completa. Así el clic funciona desde el primer
    // segundo en vez de esperar minutos a la base de propiedades.
    if (!arbolListo) void conArbol()
    const chainIds = arbolListo ? ancestorDbIds(dbId) : [dbId]
    const chain = indiceListo ? ancestorGuids(dbId) : []
    const key = chainIds.join("|")
    if (key !== lastSelectionKey) {
      lastSelectionKey = key
      opts.onPick(chain, chainIds)
    }
  }
  viewer.addEventListener(Autodesk.Viewing.SELECTION_CHANGED_EVENT, onSelectionChanged)

  async function highlightByGuid(guid: string | null): Promise<void> {
    if (!currentModel) return
    await conIndice()
    if (guid === null) {
      viewer.clearSelection()
      // Al deseleccionar NO destruimos el pintado de colores-por-estado: si está
      // activo (lastBuckets), lo re-aplicamos respetando el isolate del filtro.
      // Solo limpiamos el theming si no hay colores por estado activos (sino al
      // cerrar el detalle se perdían los colores verde/amarillo/gris de avance).
      if (lastBuckets) {
        await aplicarBucketsRespetandoIsolate(lastBuckets)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(currentModel as any).clearThemingColors?.()
      }
      return
    }
    const dbId = guidToDbId.get(guid) ?? parseSyntheticGuid(guid)
    if (dbId === null) return
    viewer.select([dbId])
    viewer.fitToView([dbId])
  }

  async function applyGhost(
    visibleGuids: string[] | null,
    opts?: { hide?: boolean; dbIds?: number[] },
  ): Promise<void> {
    if (!currentModel) return
    // NO esperamos el árbol: si no está, atenuamos por fragmento igual que los
    // colores. Bloquear acá dejaba el filtro inerte por minutos.
    // Con dbIds del backend no hace falta traducir nada: nos salteamos el índice,
    // que es lo que tarda minutos en maquetas grandes.
    // Igual que en los colores: el índice solo hace falta para traducir guids.
    // Con visibleGuids null estamos LIMPIANDO el filtro y no hay nada que traducir.
    if (visibleGuids !== null && !opts?.dbIds?.length) await conIndice()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    // Si hide=true → los no-isolated quedan invisibles. Si false (default) →
    // quedan en ghost (semi-transparentes) por el comportamiento nativo del viewer.
    const hideMode = opts?.hide === true

    // Sin filtro: limpiar isolation + theming, mostrar todo.
    if (visibleGuids === null) {
      m.clearThemingColors?.()
      restaurarFragmentos()
      // Restaurar ghosting al default (true) → sin filtro el viewer vuelve a
      // su estado normal con todos los elementos en su color.
      try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
      viewer.showAll()
      isolatedByColors = false
      filterIsolatedIds = null
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

    const dbIds = opts?.dbIds?.length ? opts.dbIds : guidsToIds(visibleGuids)
    // eslint-disable-next-line no-console
    console.log(
      `[APS viewer] applyGhost: ${visibleGuids.length} guids pedidos → ${dbIds.length} dbIds resueltos`,
    )

    if (dbIds.length === 0) {
      // Filtro sin resultados. ANTES esto hacía showAll() + clearThemingColors,
      // o sea que un filtro que no matcheaba nada se veía igual que no tener
      // filtro Y encima borraba los colores por estado — el usuario leía
      // "se rompió el visor". Ahora no mostramos nada (que es lo que el filtro
      // pide) y la capa de color queda intacta para cuando el filtro cambie.
      // eslint-disable-next-line no-console
      console.warn(
        "[APS viewer] applyGhost: el filtro no matcheó ninguna entidad — no se muestra nada.",
      )
      try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(!hideMode) } catch { /* ignore */ }
      const rootId = m.getRootId?.()
      if (rootId !== undefined && rootId !== null) viewer.hide(rootId)
      // [] (y no null) = "hay filtro activo y no matchea nada". Con null,
      // aplicarBucketsRespetandoIsolate lo leería como "sin filtro" y volvería
      // a mostrar las entidades con estado, contradiciendo al filtro.
      filterIsolatedIds = []
      isolatedByColors = false
      viewer.impl.invalidate(true, true, true)
      return
    }

    // 1) Aislar lo filtrado. El isolate pasa a ser "propiedad del filtro" —
    //    si después se desactivan los colores, NO lo limpiamos.
    //    - hide=true  → setGhosting(false): los no-isolated quedan INVISIBLES.
    //    - hide=false → setGhosting(true): los no-isolated quedan en ghost
    //      (semi-transparentes/atenuados) — el comportamiento nativo del viewer.
    m.clearThemingColors?.()
    isolatedByColors = false
    // Sin árbol, `isolate` no tiene efecto (devuelve 0 aislados). Atenuamos por
    // fragmento, que solo necesita la geometría.
    if (!arbolListo && atenuarPorFragmentos(new Set(dbIds), !hideMode)) {
      filterIsolatedIds = dbIds
      isolatedByColors = false
      if (lastBuckets) await aplicarBucketsRespetandoIsolate(lastBuckets)
      return
    }
    try {
      (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(!hideMode)
    } catch { /* ignore */ }
    // Si venimos del estado "filtro sin resultados" ocultamos el árbol entero con
    // hide(rootId); isolate() no necesariamente revierte ese hidden state, así que
    // lo limpiamos explícitamente antes de aislar o quedaría todo negro.
    if (filterIsolatedIds !== null && filterIsolatedIds.length === 0) viewer.showAll()
    viewer.isolate(dbIds)
    filterIsolatedIds = dbIds

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
    // NO esperamos el árbol: pintar funciona sin él (setThemingColor resuelve por
    // fragmentos). Lo único que necesita árbol es el auto-isolate, y eso se aplica
    // solo, más tarde, cuando el árbol llega.
    // Si el backend mandó dbIds no necesitamos el índice — es el caso que hace
    // que los colores por estado sean inmediatos en vez de esperar minutos.
    // El índice solo hace falta para TRADUCIR guids → dbIds, o sea cuando hay
    // buckets y el backend no mandó los ids. Con buckets null estamos apagando
    // los colores: esperar el índice ahí dejaba el apagado colgado varios minutos.
    const tieneIds = !!(buckets
      && (buckets.noIniciadosIds?.length || buckets.enCursoIds?.length || buckets.completadosIds?.length))
    if (buckets !== null && !tieneIds) await conIndice()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel
    lastBuckets = buckets

    if (buckets === null) {
      m.clearThemingColors?.()
      // Restaurar lo que apagamos por fragmento (camino sin árbol).
      restaurarFragmentos()
      // Si el isolate actual lo causamos nosotros al activar colores (no fue
      // un filtro), limpiarlo ahora que se desactiva. Si fue por filtro, se
      // mantiene intacto.
      if (isolatedByColors) {
        try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
        viewer.showAll()
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
    // Preferimos los dbIds que ya trae el backend; solo traducimos si no vinieron.
    const dbIdsNoIniciados = buckets.noIniciadosIds?.length ? buckets.noIniciadosIds : guidsToIds(buckets.noIniciados)
    const dbIdsEnCurso     = buckets.enCursoIds?.length     ? buckets.enCursoIds     : guidsToIds(buckets.enCurso)
    const dbIdsCompletados = buckets.completadosIds?.length ? buckets.completadosIds : guidsToIds(buckets.completados)

    // Isolate del FILTRO (lo trackeamos a mano; NO sondeamos getIsolatedNodes()
    // porque showAll()/isolate() son async y devolvían el isolate viejo justo
    // después de limpiar el filtro → los colores se pintaban solo sobre lo
    // filtrado). Si el filtro está activo restringimos los colores a su set;
    // si no, isolatedSet queda null y abajo auto-aislamos los con-estado.
    // Ojo con el array vacío: `[]` significa "filtro activo, cero resultados" y
    // NO "sin filtro". Con `length > 0` acá, ese caso caía en el auto-isolate de
    // abajo y volvía a mostrar todo lo que tiene estado, contradiciendo al filtro.
    let isolatedSet: Set<number> | null =
      filterIsolatedIds !== null ? new Set(filterIsolatedIds) : null

    // Si NO hay isolate activo y se acaban de aplicar colores por estado,
    // automáticamente isolamos los dbIds de los 4 buckets para que las
    // entidades sin vincular (que no tienen estado) queden atenuadas. Es la
    // misma UX que aplicar un filtro: lo no relevante se atenúa.
    if (isolatedSet === null) {
      const todosLosConEstado = [
        ...dbIdsNoIniciados, ...dbIdsEnCurso, ...dbIdsCompletados,
      ]
      // El auto-isolate atenúa lo que no tiene estado, pero `viewer.isolate`
      // necesita el árbol de objetos: sin él devuelve 0 aislados y el resultado
      // es peor que no hacer nada (queda todo atenuado, nada clickeable). Así que
      // pintamos ya y re-aplicamos el aislamiento cuando el árbol llegue.
      if (todosLosConEstado.length > 0 && arbolListo) {
        try { (viewer as { setGhosting?: (b: boolean) => void }).setGhosting?.(true) } catch { /* ignore */ }
        viewer.isolate(todosLosConEstado)
        isolatedByColors = true
        isolatedSet = new Set(todosLosConEstado)
      } else if (todosLosConEstado.length > 0) {
        // Sin árbol: atenuamos por FRAGMENTO. `fragId2dbId` viene con la geometría
        // (disponible a los ~110 ms), así que no hay que esperar la base de
        // propiedades. Si la API de visibilidad no está donde esperamos, no
        // rompemos nada: el atenuado llega igual cuando el árbol termine.
        if (atenuarPorFragmentos(new Set(todosLosConEstado))) {
          isolatedByColors = true
          isolatedSet = new Set(todosLosConEstado)
        } else {
          void conArbol().then(() => {
            if (lastBuckets) void aplicarBucketsRespetandoIsolate(lastBuckets)
          })
        }
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

    // Diagnóstico: si esto reporta 0 pintados, el clearThemingColors de abajo
    // deja el modelo en sus colores originales aunque los colores por estado
    // sigan "activos" — es el síntoma de "se perdieron los colores".
    const pintables = [dbIdsNoIniciados, dbIdsEnCurso, dbIdsCompletados]
      .flat()
      .filter((id) => !isolatedSet || isolatedSet.has(id)).length
    // eslint-disable-next-line no-console
    console.log(
      `[APS viewer] colores por estado: guids ${buckets.noIniciados.length}/${buckets.enCurso.length}/${buckets.completados.length}`
      + ` → dbIds ${dbIdsNoIniciados.length}/${dbIdsEnCurso.length}/${dbIdsCompletados.length}`
      + ` | isolate=${isolatedSet ? isolatedSet.size : "ninguno"} | a pintar=${pintables}`,
    )

    m.clearThemingColors?.()
    setColor(dbIdsNoIniciados, COLOR_NO_INICIADO)
    setColor(dbIdsEnCurso,     COLOR_EN_CURSO)
    setColor(dbIdsCompletados, COLOR_COMPLETADO)
    viewer.impl.invalidate(true, true, true)
  }

  // F7 del roadmap TestGroups: pinta cada TestGroup con su color. No hace auto-
  // isolate porque los packs suelen cubrir sólo una parte del alcance — que las
  // entidades sin pack queden con su color original es un feedback visual válido
  // (o gris si el backend las devolvió en sinTestGroup).
  async function applyColorPorTestGroup(buckets: BucketsPorTestGroup | null): Promise<void> {
    if (!currentModel) return
    // Los buckets por TestGroup todavía viajan solo con guids (el backend no manda
    // sus dbIds), así que este camino sigue necesitando el índice para pintar. Pero
    // APAGARLO no: con buckets null no hay nada que traducir y esperar dejaba el
    // apagado colgado varios minutos.
    if (buckets !== null) await conIndice()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel

    if (buckets === null) {
      m.clearThemingColors?.()
      viewer.impl.invalidate(true, true, true)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = Autodesk.Viewing.Private?.THREE || (window as any).THREE
    const setColorHex = (ids: number[], hex: number) => {
      const r = ((hex >> 16) & 0xff) / 255
      const g = ((hex >> 8) & 0xff) / 255
      const b = (hex & 0xff) / 255
      const v4 = new THREE.Vector4(r, g, b, 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const id of ids) m.setThemingColor(id, v4, true)
    }

    m.clearThemingColors?.()
    for (let i = 0; i < buckets.buckets.length; i++) {
      const b = buckets.buckets[i]
      const ids = b.ids?.length ? b.ids : guidsToIds(b.guids)
      if (ids.length === 0) continue
      const hex = TESTGROUP_PALETTE_APS[i % TESTGROUP_PALETTE_APS.length]
      setColorHex(ids, hex)
    }
    const idsSinPack = buckets.sinTestGroupIds?.length
      ? buckets.sinTestGroupIds
      : guidsToIds(buckets.sinTestGroup)
    if (idsSinPack.length > 0) setColorHex(idsSinPack, TESTGROUP_SIN_PACK_COLOR_APS)
    viewer.impl.invalidate(true, true, true)
  }

  /**
   * Pintado genérico por grupos. Solo espera el índice si ALGÚN grupo llegó sin
   * dbIds — con `ApsObjectId` poblado no hace falta y el pintado es inmediato.
   */
  async function applyColorPorGrupos(grupos: GrupoColor[] | null): Promise<void> {
    if (!currentModel) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = currentModel

    if (grupos === null) {
      m.clearThemingColors?.()
      viewer.impl.invalidate(true, true, true)
      return
    }

    const faltanIds = grupos.some((g) => !g.ids?.length && g.guids.length > 0)
    if (faltanIds) await conIndice()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = Autodesk.Viewing.Private?.THREE || (window as any).THREE
    m.clearThemingColors?.()
    for (const g of grupos) {
      const ids = g.ids?.length ? g.ids : guidsToIds(g.guids)
      if (ids.length === 0) continue
      const r = ((g.hex >> 16) & 0xff) / 255
      const gg = ((g.hex >> 8) & 0xff) / 255
      const b = (g.hex & 0xff) / 255
      const v4 = new THREE.Vector4(r, gg, b, 1)
      for (const id of ids) m.setThemingColor(id, v4, true)
    }
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
    filterIsolatedIds = null
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

  return { loadModel, esperarArbol: conArbol, highlightByGuid, selectByGuids, selectByDbIds, fitToGuids, applyGhost, applyColorPorEstado, applyColorPorTestGroup, applyColorPorGrupos, resize, dispose }
}

/** Convierte un GUID sintético "aps-{dbId}" a dbId numérico. Si no matchea, null. */
function parseSyntheticGuid(guid: string): number | null {
  if (!guid.startsWith("aps-")) return null
  const n = Number(guid.substring(4))
  return Number.isFinite(n) ? n : null
}
