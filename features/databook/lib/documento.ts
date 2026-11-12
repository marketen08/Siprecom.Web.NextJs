/**
 * Cómo se llama el entregable que sale de un databook, según el Nivel.
 *
 * En comisionado al entregable se le dice *dossier* y en calidad *databook*.
 * Para el sistema es la misma cosa —un DatabookJob acotado a un Nivel—, así que
 * la palabra la define el Nivel (`nivel.nombreDocumento`) y no hay dos features.
 *
 * Espejo de `Core/Helpers/NivelDocumento.cs`: el default tiene que ser el mismo
 * en los dos lados. Si el backend cayera a "Databook" y el front a otra cosa, el
 * usuario entraría por un item del menú y bajaría un archivo con otro nombre.
 */

/** Lo que se usa cuando el nivel no define nombre. Es la palabra histórica. */
export const DOCUMENTO_DEFAULT = "Databook"

/** Lo mínimo que este módulo necesita de un Nivel. */
export interface NivelDocumento {
  id: string
  nombre: string
  posicion?: number
  nombreDocumento?: string | null
}

/** Un nombre de documento y los niveles que lo comparten. */
export interface GrupoDocumento {
  /** Nombre como se muestra (el del nivel de menor posición del grupo). */
  nombre: string
  /** Clave de agrupación, normalizada. No se muestra. */
  clave: string
  /** Niveles que generan este documento, ordenados por posición. */
  niveles: NivelDocumento[]
  /** Posición del primer nivel del grupo — ordena los grupos entre sí. */
  posicion: number
}

/** El nombre del documento de un nivel, con el default ya resuelto. */
export function nombreDocumentoDe(nivel?: NivelDocumento | null): string {
  const v = nivel?.nombreDocumento?.trim()
  return v ? v : DOCUMENTO_DEFAULT
}

/**
 * Clave de agrupación. Se normaliza para que "Dossier" y "dossier " caigan en
 * el mismo grupo: los nombres los escribe un admin a mano, nivel por nivel, y
 * dos variantes de tipeo no tienen que abrir dos items en el menú.
 */
export function claveDocumento(nombre: string): string {
  return nombre.trim().toLocaleLowerCase("es")
}

/**
 * Agrupa los niveles por nombre de documento.
 *
 * Es el punto del diseño: si precomisionado y comisionado dicen los dos
 * "Dossier", el menú tiene que mostrar *una* opción, no una por nivel.
 *
 * Los grupos salen ordenados por la posición del nivel más bajo de cada uno, así
 * el orden del menú sigue el orden del proyecto (precomisionado antes que
 * calidad) y no el alfabético.
 */
export function agruparPorDocumento(niveles: NivelDocumento[]): GrupoDocumento[] {
  const porClave = new Map<string, GrupoDocumento>()

  for (const nivel of niveles) {
    const nombre = nombreDocumentoDe(nivel)
    const clave = claveDocumento(nombre)
    const pos = nivel.posicion ?? 0

    const grupo = porClave.get(clave)
    if (!grupo) {
      porClave.set(clave, { nombre, clave, niveles: [nivel], posicion: pos })
      continue
    }

    grupo.niveles.push(nivel)
    // El nombre que se muestra es el del nivel más bajo del grupo: con dos
    // tipeos distintos gana el primero del proyecto, no el último que se cargó.
    if (pos < grupo.posicion) {
      grupo.posicion = pos
      grupo.nombre = nombre
    }
  }

  const grupos = [...porClave.values()]
  for (const g of grupos) {
    g.niveles.sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))
  }
  return grupos.sort(
    (a, b) => a.posicion - b.posicion || a.nombre.localeCompare(b.nombre, "es"),
  )
}

/**
 * El grupo que pide la URL (`?doc=Dossier`), o null.
 *
 * Devuelve null cuando hay un solo grupo: ahí el documento abarca todos los
 * niveles, y acotar a uno le quitaría al usuario el "todos los niveles" que es
 * el caso más usado. También null si el nombre no existe más —alguien renombró
 * el nivel y quedó un link viejo—, que degrada a la pantalla sin filtro en vez
 * de dejarla vacía.
 */
export function grupoDeLaUrl(
  grupos: GrupoDocumento[],
  doc: string | null,
): GrupoDocumento | null {
  if (!doc || grupos.length <= 1) return null
  const clave = claveDocumento(doc)
  return grupos.find((g) => g.clave === clave) ?? null
}
