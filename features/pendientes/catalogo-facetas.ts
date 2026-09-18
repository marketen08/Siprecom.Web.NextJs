/**
 * Filtrado cruzado ("facetado") de las 5 dimensiones del catálogo maestro de
 * pendientes: Nivel, Especialidad, Tipo, Acción y Motivo.
 *
 * El catálogo es una tabla PLANA de 5-tuplas — `PendienteCatalogo` tiene las 5
 * FK en la misma fila. El endpoint `/pendientes-catalogo/arbol` las agrupa en
 * ese orden por comodidad, pero ese anidamiento es presentación: no existe una
 * regla de dominio que diga que una Especialidad "pertenezca" a un Nivel.
 *
 * Tratarlo como cascada estricta obligaba a completar los selects en orden y
 * rompía el caso real de arrancar por el Elemento (que define la Especialidad).
 * Acá lo aplanamos de vuelta y calculamos, para cada dimensión, los valores
 * todavía alcanzables según LAS OTRAS ya elegidas.
 *
 * Propiedad clave: como las opciones de una dimensión se calculan excluyéndose
 * a sí misma, cualquier valor ofrecido convive con el resto de la selección. La
 * selección nunca queda inconsistente eligiendo dentro de lo ofrecido, así que
 * no hace falta limpiar "hijos" al cambiar un select.
 */

import type { PendienteCatalogoArbolNivel } from "./types"

export const DIMENSIONES = ["nivel", "especialidad", "tipo", "accion", "motivo"] as const
export type Dimension = (typeof DIMENSIONES)[number]

/** Campo del form / DTO que corresponde a cada dimensión. */
export const CAMPO_DIMENSION = {
  nivel: "nivelId",
  especialidad: "especialidadId",
  tipo: "tipoId",
  accion: "accionId",
  motivo: "motivoId",
} as const satisfies Record<Dimension, string>

/** Etiqueta visible de cada dimensión. */
export const LABEL_DIMENSION = {
  nivel: "Nivel",
  especialidad: "Especialidad",
  tipo: "Tipo",
  accion: "Acción",
  motivo: "Motivo",
} as const satisfies Record<Dimension, string>

/** Una fila del catálogo, ya aplanada. */
export interface FilaCatalogo {
  nivelId: string
  nivelNombre: string
  nivelPosicion: number
  especialidadId: string
  especialidadNombre: string
  tipoId: string
  tipoNombre: string
  accionId: string
  accionNombre: string
  motivoId: string
  motivoNombre: string
  categoriaId: string
  categoriaNombre: string
  descripcion: string
}

/** Valor elegido por dimensión. Cadena vacía = sin elegir. */
export type SeleccionDimensiones = Record<Dimension, string>

export interface OpcionDimension {
  id: string
  label: string
  /** Solo Nivel tiene orden propio (Posicion); el resto ordena alfabéticamente. */
  orden: number
}

/** Deshace el agrupamiento del backend y devuelve las 5-tuplas originales. */
export function aplanarArbol(arbol: PendienteCatalogoArbolNivel[]): FilaCatalogo[] {
  const filas: FilaCatalogo[] = []
  for (const n of arbol) {
    for (const e of n.especialidades) {
      for (const t of e.tipos) {
        for (const a of t.acciones) {
          for (const m of a.motivos) {
            filas.push({
              nivelId: n.nivelId,
              nivelNombre: n.nivelNombre,
              nivelPosicion: n.nivelPosicion,
              especialidadId: e.especialidadId,
              especialidadNombre: e.especialidadNombre,
              tipoId: t.tipoId,
              tipoNombre: t.tipoNombre,
              accionId: a.accionId,
              accionNombre: a.accionNombre,
              motivoId: m.motivoId,
              motivoNombre: m.motivoNombre,
              categoriaId: m.categoriaId,
              categoriaNombre: m.categoriaNombre,
              descripcion: m.descripcion,
            })
          }
        }
      }
    }
  }
  return filas
}

/**
 * ¿La fila es compatible con la selección? `excepto` deja una dimensión fuera
 * del filtro — es lo que permite que un select siga ofreciendo alternativas
 * para su propio eje en vez de restringirse a lo ya elegido ahí.
 */
export function filaCoincide(
  fila: FilaCatalogo,
  seleccion: SeleccionDimensiones,
  excepto?: Dimension,
): boolean {
  for (const d of DIMENSIONES) {
    if (d === excepto) continue
    const valor = seleccion[d]
    if (valor && fila[`${d}Id`] !== valor) return false
  }
  return true
}

/** ¿Existe al menos una fila del catálogo compatible con esta selección? */
export function seleccionAlcanzable(
  filas: FilaCatalogo[],
  seleccion: SeleccionDimensiones,
): boolean {
  return filas.some((f) => filaCoincide(f, seleccion))
}

export const SELECCION_VACIA: SeleccionDimensiones = {
  nivel: "", especialidad: "", tipo: "", accion: "", motivo: "",
}

/**
 * Orden en que se sueltan dimensiones al reconciliar: de la más específica a la
 * más general. Especialidad queda afuera a propósito en el caso del Elemento,
 * que es justamente quien la impone — por eso el orden es un parámetro.
 */
export const SACRIFICIO_DEFAULT: Dimension[] = ["motivo", "accion", "tipo", "nivel"]

/**
 * Incluye Especialidad. Es el orden para cuando el usuario cambia una dimensión a
 * mano: ahí no hay nada que la proteja, y sin soltarla hay combinaciones que no se
 * pueden reconciliar (si el valor nuevo no convive con la especialidad actual, dar
 * de baja el resto no alcanza).
 */
export const SACRIFICIO_CON_ESPECIALIDAD: Dimension[] =
  ["motivo", "accion", "tipo", "especialidad", "nivel"]

/**
 * Reconcilia una selección que quedó inconsistente. Suelta dimensiones hasta que
 * la combinación vuelva a existir en el catálogo, en el orden de `sacrificio` y
 * sin tocar las ancladas.
 *
 * Dos usos hoy: el Elemento imponiendo su Especialidad, y el usuario cambiando
 * una de las 5 dimensiones cuando las cinco ya estaban completas.
 *
 * Devuelve la selección saneada y qué dimensiones se soltaron, para poder
 * avisarle al usuario en vez de limpiar en silencio.
 */
export function reconciliarSeleccion(
  filas: FilaCatalogo[],
  deseada: SeleccionDimensiones,
  ancladas: Dimension[] = [],
  sacrificio: Dimension[] = SACRIFICIO_DEFAULT,
): { seleccion: SeleccionDimensiones; soltadas: Dimension[] } {
  // Sin catálogo cargado no hay nada que validar: devolver tal cual evita
  // vaciar el formulario mientras la query está en vuelo.
  if (filas.length === 0) return { seleccion: deseada, soltadas: [] }

  let actual = { ...deseada }
  const soltadas: Dimension[] = []

  for (const d of sacrificio) {
    if (seleccionAlcanzable(filas, actual)) break
    if (ancladas.includes(d) || !actual[d]) continue
    actual = { ...actual, [d]: "" }
    soltadas.push(d)
  }
  return { seleccion: actual, soltadas }
}
