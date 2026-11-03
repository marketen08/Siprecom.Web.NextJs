/**
 * Tipos de campo que NO son input: adornan la planilla pero no guardan valor, así que
 * el formulario nunca manda nada para ellos.
 *
 * Imagen (8), Label (10), Espacio (13), Nota (15) y Leyenda (16).
 *
 * Marcar uno como obligatorio dejaría al registro sin poder completarse nunca — la
 * validación esperaría un valor que no hay forma de cargar. El backend los excluye por
 * su lado (CampoTipoDatoExt.DisplayOnly); esta lista es la misma regla del lado del
 * formulario, para no ofrecer la opción de entrada.
 */
const DISPLAY_ONLY = new Set([8, 10, 13, 15, 16])

/** Si el tipo admite que se le exija un valor al completar el registro. */
export function tipoAdmiteObligatorio(tipoDato: number | undefined | null): boolean {
  return tipoDato != null && !DISPLAY_ONLY.has(tipoDato)
}

/**
 * Valor inicial del checkbox "Obligatorio" al crear un campo.
 *
 * Arranca activo: la mayoría de los campos de una planilla son datos que hay que
 * completar, y dejarlos opcionales por omisión hacía que la validación del registro no
 * sirviera de mucho. Los display-only arrancan —y quedan— en false.
 */
export function obligatorioPorDefecto(tipoDato: number | undefined | null): boolean {
  return tipoAdmiteObligatorio(tipoDato)
}
