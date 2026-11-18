import { apiClient } from "@/lib/api-client"
import type { CampoImportado, PlanillaImportada } from "./import-types"
import type { Planilla, PlanillaSeccion } from "./types"
import { CAMPO_TAMANO_DEFAULT } from "./types"
import { TABLA_MAX_FILAS } from "@/features/campos/lib/tabla-limites"

/**
 * Persistencia de una planilla generada por IA: la crea, crea sus secciones y,
 * por cada campo, crea (o reusa) el Campo del catálogo con TODA su definición
 * —opciones, columnas y filas de tabla, props por tipo— y lo vincula.
 *
 * Vive en un módulo propio porque los dos flujos de IA la comparten:
 *  - `generar-con-ia-sheet.tsx`  (input: descripción en lenguaje natural)
 *  - `import-excel-sheet.tsx`    (input: un Excel)
 *
 * Antes cada sheet tenía su propia copia y se fueron separando: el de Excel
 * quedó sin reuso de catálogo, sin tablas, sin tamaño y sin render mode, y
 * ninguno de los dos grababa las opciones ni mandaba `codigoAutomatico`. Toda
 * regla nueva va acá una sola vez.
 */

/** Tipos display-only: no capturan valor, así que nunca van obligatorios. */
const TIPOS_DISPLAY_ONLY: number[] = [8, 10, 13, 15, 16]

/**
 * Tipos que siempre ocupan la grilla completa (12). Es la misma convención que
 * aplica el builder: Tabla, Checklist y TextoArea no comparten fila con otro
 * campo.
 */
const TIPOS_ANCHO_COMPLETO: number[] = [9, 11, 12]

/** Tipos cuyas CampoOpcion hay que crear después del campo: Lista, Checklist, Leyenda. */
const TIPOS_CON_OPCIONES: number[] = [5, 11, 16]

function enteroEnRango(valor: unknown, min: number, max: number): number | undefined {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return undefined
  return Math.max(min, Math.min(max, Math.floor(valor)))
}

function esObligatorio(campo: CampoImportado): boolean {
  // Un display-only marcado obligatorio deja el registro sin poder completarse
  // nunca: la validación esperaría un valor que no hay forma de cargar. Es la
  // misma regla que `CampoTipoDatoExt.AdmiteObligatorio` del backend.
  if (TIPOS_DISPLAY_ONLY.includes(campo.tipoDato)) return false
  return !!campo.esObligatorio
}

function tamanoDelCampo(campo: CampoImportado): number {
  if (TIPOS_ANCHO_COMPLETO.includes(campo.tipoDato)) return 12
  return enteroEnRango(campo.tamano, 1, 12) ?? CAMPO_TAMANO_DEFAULT
}

/**
 * Normaliza las opciones que devuelve la IA. Para Lista y Checklist manda
 * strings sueltos ("Sí", "No", "N/A"); para Leyenda, pares código/descripción
 * ({ valor: "NC", etiqueta: "Chequeado y no conforme" }). Aceptamos las dos
 * formas y recortamos a los máximos del DTO (valor 100, etiqueta 200).
 */
function opcionesNormalizadas(campo: CampoImportado): Array<{ valor: string; etiqueta: string }> {
  if (!TIPOS_CON_OPCIONES.includes(campo.tipoDato)) return []

  const salida: Array<{ valor: string; etiqueta: string }> = []
  for (const cruda of campo.opciones ?? []) {
    const valor = (typeof cruda === "string" ? cruda : cruda?.valor ?? "").trim()
    const etiqueta = (typeof cruda === "string" ? cruda : cruda?.etiqueta ?? "").trim()
    if (!valor && !etiqueta) continue
    salida.push({
      valor: (valor || etiqueta).slice(0, 100),
      etiqueta: (etiqueta || valor).slice(0, 200),
    })
  }
  return salida
}

/** Cuerpo del POST /api/campos para un campo nuevo del catálogo. */
function cuerpoDelCampoNuevo(campo: CampoImportado): Record<string, unknown> {
  const slug = campo.etiqueta
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 30)

  const body: Record<string, unknown> = {
    // El código es una PROPUESTA, no un valor definitivo: con `codigoAutomatico`
    // el backend le busca uno libre (sufijo _2, _3…) contra el alcance completo
    // del dueño. Sin el flag corta con "El código ya existe" o —peor, y en
    // silencio— reactiva un campo dado de baja con su historia y sus opciones
    // viejas. Es el mismo mecanismo que usa el alta en lote de campos.
    //
    // Por eso el código ya no lleva sufijo de timestamp: no hace falta
    // desempatar desde el front, y los códigos salen legibles.
    codigo: slug || "CAMPO",
    codigoAutomatico: true,
    etiqueta: campo.etiqueta,
    tipoDato: campo.tipoDato,
    esObligatorioDefault: esObligatorio(campo),
    permiteObservacion: false,
    permiteAdjunto: false,
  }

  // Props por tipo. Van sólo cuando aplican y con un entero válido: los campos
  // del DTO son int NO nullable con default, así que mandar null revienta la
  // deserialización ("The JSON value could not be converted to System.Int32").
  if (campo.tipoDato === 9 && (campo.filas ?? []).length === 0) {
    // Sólo en tabla dinámica — en matriz las filas son las de `filas`.
    const numeroFilas = enteroEnRango(campo.numeroFilas, 1, TABLA_MAX_FILAS)
    if (numeroFilas !== undefined) body.numeroFilas = numeroFilas
  }
  if (campo.tipoDato === 12) {
    const numeroLineas = enteroEnRango(campo.numeroLineas, 1, 20)
    if (numeroLineas !== undefined) body.numeroLineas = numeroLineas
  }
  if (campo.tipoDato === 13 || campo.tipoDato === 14) {
    const altoMm = enteroEnRango(campo.altoMm, 5, 200)
    if (altoMm !== undefined) body.altoMm = altoMm
  }
  if (campo.tipoDato === 15 && campo.textoLargo?.trim()) {
    // El texto de una Nota va en TextoLargo, no en Etiqueta: sin esto la Nota
    // nace vacía y no imprime nada.
    body.textoLargo = campo.textoLargo.trim().slice(0, 5000)
  }
  if (campo.tipoDato === 4 && campo.mostrarComoMarca) {
    body.mostrarComoMarca = true
  }

  return body
}

async function crearOpcionesAsync(
  campoId: string,
  campo: CampoImportado,
  onProgreso: (texto: string) => void,
): Promise<void> {
  const opciones = opcionesNormalizadas(campo)
  if (opciones.length === 0) return

  onProgreso(`Cargando opciones de "${campo.etiqueta}"...`)
  for (let i = 0; i < opciones.length; i++) {
    await apiClient.post(`/api/campos/${campoId}/opciones`, {
      campoId,
      valor: opciones[i].valor,
      etiqueta: opciones[i].etiqueta,
      orden: i + 1,
    })
  }
}

async function crearTablaAsync(
  campoId: string,
  campo: CampoImportado,
  onProgreso: (texto: string) => void,
): Promise<void> {
  if (campo.tipoDato !== 9) return

  const columnas = campo.columnas ?? []
  for (let i = 0; i < columnas.length; i++) {
    onProgreso(`Creando columna "${columnas[i].encabezado}"...`)
    await apiClient.post(`/api/campos/${campoId}/tabla/columnas`, {
      campoId,
      encabezado: columnas[i].encabezado,
      orden: i + 1,
      esColumnaEtiqueta: !!columnas[i].esColumnaEtiqueta,
      grupo: columnas[i].grupo?.trim() || null,
    })
  }

  const filas = campo.filas ?? []
  for (let i = 0; i < filas.length; i++) {
    onProgreso(`Creando fila "${filas[i].etiquetaFila}"...`)
    await apiClient.post(`/api/campos/${campoId}/tabla/filas`, {
      campoId,
      etiquetaFila: filas[i].etiquetaFila,
      celdasPrecargadas: filas[i].celdasPrecargadas ?? null,
      orden: i + 1,
    })
  }
}

export interface PlanillaCreada {
  id: string
  codigo: string
  nombre: string
}

/**
 * Crea la planilla completa. `planilla` ya viene sin los campos que el usuario
 * descartó en la preview. `onProgreso` recibe el texto a mostrar en el sheet.
 */
export async function crearPlanillaImportada(
  planilla: PlanillaImportada,
  onProgreso: (texto: string) => void,
): Promise<PlanillaCreada> {
  // 1. Planilla base. El código sale del nombre + timestamp porque la clave de
  // negocio es (Codigo, Version) y del lado de planillas no hay un
  // `codigoAutomatico` equivalente. El usuario lo puede cambiar después desde
  // el detalle de la planilla.
  onProgreso("Creando planilla...")
  const codigo =
    (planilla.nombre || "PL")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 30) +
    "_" +
    Date.now().toString().slice(-6)

  const planillaResp = await apiClient.post<{ data: Planilla }>("/api/planillas", {
    codigo,
    nombre: planilla.nombre,
    requiereFirma: true,
    permiteAdjuntos: true,
    generaPdfFinal: false,
  })
  const planillaId = planillaResp.data.id

  // 2. Secciones y campos. El orden de sección se cuenta sobre las que REALMENTE
  // se crean: usar el índice del array dejaba huecos cuando una quedaba vacía
  // porque el usuario borró todos sus campos en la preview.
  let ordenSeccion = 0
  for (const seccion of planilla.secciones) {
    if (seccion.campos.length === 0) continue
    ordenSeccion += 1

    onProgreso(`Creando sección "${seccion.nombre}"...`)
    const seccionResp = await apiClient.post<{ data: PlanillaSeccion }>(
      `/api/planillas/${planillaId}/secciones`,
      { planillaId, nombre: seccion.nombre, orden: ordenSeccion },
    )
    const seccionId = seccionResp.data.id

    for (let i = 0; i < seccion.campos.length; i++) {
      const campo = seccion.campos[i]
      let campoId: string

      if (campo.campoIdExistente) {
        // Reuso: el campo del catálogo ya trae su definición completa (opciones,
        // columnas, filas). No la tocamos — es compartida con otras planillas.
        campoId = campo.campoIdExistente
      } else {
        onProgreso(`Creando campo "${campo.etiqueta}"...`)
        const campoResp = await apiClient.post<{ data: { id: string } }>(
          "/api/campos",
          cuerpoDelCampoNuevo(campo),
        )
        campoId = campoResp.data.id
        await crearOpcionesAsync(campoId, campo, onProgreso)
        await crearTablaAsync(campoId, campo, onProgreso)
      }

      onProgreso(`Vinculando campo "${campo.etiqueta}"...`)
      await apiClient.post(`/api/planillas/${planillaId}/campos`, {
        planillaId,
        campoId,
        planillaSeccionId: seccionId,
        orden: i + 1,
        esObligatorio: esObligatorio(campo),
        visible: true,
        soloLectura: false,
        tamano: tamanoDelCampo(campo),
        // RenderMode sólo aplica a Lista. El 0 (Auto) está deprecado y el
        // backend lo normaliza a 1, así que mandamos 1 cuando la IA no eligió.
        ...(campo.tipoDato === 5
          ? { renderMode: enteroEnRango(campo.renderMode, 1, 2) ?? 1 }
          : {}),
      })
    }
  }

  onProgreso("")
  return { id: planillaId, codigo, nombre: planilla.nombre }
}

/**
 * La IA a veces alucina GUIDs que no están en el catálogo. Si el id no matchea
 * (case-insensitive) uno real, lo borramos y el campo se crea nuevo; si matchea,
 * lo normalizamos al casing exacto. Sin este saneo el POST de vinculación falla
 * con "CampoId: El campo no existe" y se pierde la generación entera.
 */
export function sanearCampoIdsExistentes(
  planilla: PlanillaImportada,
  catalogo: Array<{ id: string }>,
): PlanillaImportada {
  const porIdLower = new Map(catalogo.map((c) => [c.id.toLowerCase(), c.id]))

  return {
    ...planilla,
    secciones: planilla.secciones.map((seccion) => ({
      ...seccion,
      campos: seccion.campos.map((campo) => {
        if (!campo.campoIdExistente) return campo
        const real = porIdLower.get(campo.campoIdExistente.toLowerCase())
        if (!real) {
          console.warn(
            "IA propuso id no existente, se creará campo nuevo:",
            campo.campoIdExistente,
            campo.etiqueta,
          )
          return { ...campo, campoIdExistente: undefined }
        }
        return { ...campo, campoIdExistente: real }
      }),
    })),
  }
}
