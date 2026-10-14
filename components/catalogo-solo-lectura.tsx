"use client"

import { Lock } from "lucide-react"

import { useMeetsRole } from "@/lib/use-roles"

/**
 * Modo "solo lectura" de los catálogos globales de configuración: especialidades, niveles y
 * los de pendientes (ámbitos, categorías, tipos, acciones, motivos, catálogo maestro).
 *
 * Esos catálogos son vocabulario de la casa: los comparten todos los proyectos y de ellos
 * dependen los pendientes y el alcance ya cargado, así que los administra AdminGlobal. Pero
 * el Admin **necesita verlos**: son las opciones que su gente va a elegir y los valores con
 * los que carga alcance, y esconderlos lo deja configurando a ciegas.
 *
 * Por qué vive en un solo lugar: son ocho pantallas. Resuelto una por una, cada una termina
 * con su propia versión —un tooltip acá, un botón que desaparece allá— y el usuario no
 * aprende una sola regla sino ocho. Acá está el criterio y las pantallas lo declaran.
 *
 * Distinto de los catálogos CON dueño (planillas, campos, tipos de elemento, procedimientos,
 * colecciones): ahí el Admin sí crea y edita lo de su equipo, y el acotado es por fila.
 */
export function useCatalogoSoloLectura(): {
  soloLectura: boolean
  /** Motivo listo para un `title` o un tooltip. Vacío si puede editar. */
  motivo: string
} {
  const puedeEditar = useMeetsRole("AdminGlobal")
  return {
    soloLectura: !puedeEditar,
    motivo: puedeEditar ? "" : "Este catálogo lo administra un AdminGlobal",
  }
}

/**
 * Cartel que explica por qué la pantalla no deja tocar nada. Va arriba de la tabla, no sobre
 * cada botón: el motivo es de la pantalla entera.
 *
 * No se renderiza para quien sí puede editar, así que las pantallas lo ponen sin condicional.
 */
export function AvisoCatalogoSoloLectura({
  /** Qué administra el AdminGlobal, en plural y en minúscula: "las especialidades". */
  que,
  /** Para qué le sirve verlo al Admin. Una línea, concreta. */
  porQue,
  /**
   * True cuando el Admin **sí** puede dar de alta y lo que no puede es tocar lo que ya
   * existe: el caso de clientes y contratistas. El alta es aditiva y no le cambia nada a
   * nadie; renombrar o borrar sí, porque el nombre sale en los reportes y certificados de
   * los proyectos de todos los equipos.
   *
   * Cambia la frase porque "solo lectura" sería mentira: hay un botón de alta habilitado.
   */
  puedeCrear = false,
}: {
  que: string
  porQue?: string
  puedeCrear?: boolean
}) {
  const { soloLectura } = useCatalogoSoloLectura()
  if (!soloLectura) return null

  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {puedeCrear ? (
          <>
            Podés <span className="font-medium">dar de alta</span> {que}, pero editar o
            eliminar las que ya existen lo hace un AdminGlobal: su nombre aparece en los
            reportes y certificados de todos los proyectos.
          </>
        ) : (
          <>
            Estás viendo {que} en <span className="font-medium">solo lectura</span>: las
            administra un AdminGlobal porque las comparten todos los proyectos.
          </>
        )}
        {porQue ? ` ${porQue}` : ""}
      </p>
    </div>
  )
}
