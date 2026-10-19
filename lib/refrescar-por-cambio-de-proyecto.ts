import type { QueryClient } from "@tanstack/react-query"

/**
 * Limpieza de caché después de cambiar el proyecto activo del usuario.
 *
 * Casi ninguna query lleva el proyecto en su queryKey, porque el backend no lo recibe:
 * lo deduce del usuario (`user.ProyectoId`). O sea que `["tareas", {...}]` es LA MISMA
 * entrada de caché para todos los proyectos, y lo único que cambia es la respuesta.
 *
 * Con `refetchQueries({ type: "active" })` alcanzaba para la pantalla que estaba a la
 * vista, pero no para las que no estaban montadas: esas se quedaban con los datos del
 * proyecto anterior y, con el staleTime de 5 minutos del QueryClient, al navegar hacia
 * ellas React Query las servía de la caché sin pedir nada. Era el caso de
 * /alcance/tareas después de cambiar de proyecto en el navbar: mostraba las tareas del
 * proyecto viejo hasta que se vencía el staleTime o se recargaba la página.
 *
 * El orden importa:
 *
 * 1. Se borra todo lo que NO está en pantalla, y esto es sincrónico. Tiene que pasar
 *    antes de cualquier navegación, o la pantalla destino monta sus queries mientras la
 *    caché vieja todavía está y se sirve de ella.
 * 2. Después se refetchea lo que sí está montado, sin esperarlo: quien llama suele
 *    redirigir enseguida y no tiene sentido demorar la redirección por un refetch de la
 *    pantalla que se está dejando.
 *
 * Se borra todo lo inactivo y no sólo lo que depende del proyecto porque la lista de qué
 * query es "de proyecto" sería imposible de mantener, y volver a traer un catálogo
 * global cuesta una request.
 */
export function refrescarPorCambioDeProyecto(queryClient: QueryClient) {
  queryClient.removeQueries({ type: "inactive" })
  void queryClient.refetchQueries({ type: "active" })
}

/**
 * Igual que la de arriba, pero sólo si el usuario que se está tocando es uno mismo.
 *
 * Las pantallas de administración de usuarios operan sobre cualquiera, y varias de sus
 * acciones cambian el proyecto activo del usuario tocado como efecto secundario: asignar
 * un proyecto cuando no tenía ninguno lo pone como activo, y quitarle el activo lo deja
 * en null. Si ese usuario sos vos, acabás de cambiar de proyecto sin pasar por el
 * switcher; si es otro, no hay nada que refrescar en tu caché.
 *
 * El id propio se lee de la caché del perfil, que es la query que alimenta todo el
 * layout: si no estuviera, no habría sesión que refrescar.
 */
export function refrescarSiEsMiUsuario(queryClient: QueryClient, usuarioId: string) {
  const perfil = queryClient.getQueryData<{ id?: string }>(["perfil"])
  if (perfil?.id && perfil.id === usuarioId) refrescarPorCambioDeProyecto(queryClient)
}
