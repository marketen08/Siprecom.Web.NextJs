"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import { useGetPendientesAmbitos } from "@/features/pendientes-ambitos/api/use-pendientes-ambitos"
import { AudienciaAmbito } from "@/features/pendientes-ambitos/types"
import {
  useGetPendientesAutorizacion,
  useSetPendientesAutorizacion,
} from "../api/use-pendientes-autorizacion"
import { ACCIONES_LIST, AccionPendiente } from "../types"

/**
 * Matriz de autorización del workflow de Pendiente por proyecto: filas = acciones,
 * columnas = grupos disponibles.
 *
 * Una acción sin ningún grupo tildado queda librada al rol del sistema. Con al menos
 * uno, esos grupos son los únicos que pueden ejecutarla: el rol deja de alcanzar. Es
 * lo que permite separar ejecución, revisión interna y aprobación del cliente.
 */
export function PendientesAutorizacionSection({ proyectoId }: { proyectoId: string }) {
  // Solo grupos declarados para uso en Pendientes — evita ofrecer grupos irrelevantes.
  const { data: gruposResp, isLoading: cargandoGrupos } = useGetUsuariosGrupos("pendientes")
  const { data: ambitosResp, isLoading: cargandoAmbitos } = useGetPendientesAmbitos()

  // La matriz es por ámbito: primero se elige cuál se está configurando.
  const ambitos = ambitosResp?.data ?? []
  const [ambitoId, setAmbitoId] = useState<string>("")
  const ambitoActual = ambitos.find((a) => a.id === ambitoId) ?? null
  useEffect(() => {
    if (!ambitoId && ambitos.length > 0) {
      setAmbitoId((ambitos.find((a) => a.esPrincipal) ?? ambitos[0]).id)
    }
  }, [ambitos, ambitoId])

  const { data: authResp, isLoading: cargandoAuth } = useGetPendientesAutorizacion(proyectoId, ambitoId)
  const save = useSetPendientesAutorizacion(proyectoId, ambitoId)

  // En un ámbito restringido las columnas son SOLO los grupos de su audiencia: el
  // backend rechaza dar una acción a un grupo que no ve el ámbito, así que acá el
  // invariante se cumple por construcción en vez de por un mensaje de error.
  const todosLosGrupos = gruposResp?.data ?? []
  const grupos =
    ambitoActual && ambitoActual.audiencia === AudienciaAmbito.SoloGrupos
      ? todosLosGrupos.filter((g) => ambitoActual.grupos.some((ag) => ag.grupoId === g.id))
      : todosLosGrupos
  // Estado local: por acción, un Set de grupoIds tildados.
  const [seleccion, setSeleccion] = useState<Record<number, Set<string>>>({})
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hidratar desde el server la primera vez y cuando cambia la data.
  const serverKey = useMemo(
    () => (authResp?.data ?? []).map((r) => `${r.accion}:${r.grupoId}`).sort().join("|"),
    [authResp?.data],
  )
  // Los grupos que efectivamente se dibujan como columna. Solo hidratamos con
  // estos: una asignación de un grupo que no está en la lista (eliminado, o sin
  // el flag de uso en Pendientes) no se puede ver ni destildar, pero se enviaba
  // igual al guardar y el backend la rechazaba — trabando la pantalla entera.
  // Lo que se guarda es exactamente la matriz que el usuario ve.
  const gruposKey = useMemo(() => grupos.map((g) => g.id).sort().join("|"), [grupos])
  useEffect(() => {
    const disponibles = new Set(grupos.map((g) => g.id))
    const inicial: Record<number, Set<string>> = {}
    for (const a of ACCIONES_LIST) inicial[a.value] = new Set()
    for (const row of authResp?.data ?? []) {
      if (!disponibles.has(row.grupoId)) continue
      inicial[row.accion] = inicial[row.accion] ?? new Set()
      inicial[row.accion].add(row.grupoId)
    }
    setSeleccion(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey, gruposKey])

  function toggle(accion: AccionPendiente, grupoId: string) {
    setSeleccion((prev) => {
      const next = { ...prev }
      const set = new Set(next[accion] ?? [])
      if (set.has(grupoId)) set.delete(grupoId)
      else set.add(grupoId)
      next[accion] = set
      return next
    })
  }

  // Qué filas tiene sentido configurar en ESTE ámbito.
  //
  // Crear sale en los abiertos: es la puerta de entrada, no un paso del circuito, y
  // ahí quién participa ya está definido —todo el proyecto—. Con los grupos ya
  // exclusivos, tildarla dejaría al resto sin poder reportar pendientes. El backend
  // también lo rechaza.
  //
  // Los pasos apagados del ámbito tampoco: si el paso no existe, no hay a quién
  // autorizar.
  const accionesVisibles = ACCIONES_LIST.filter((a) => {
    if (!ambitoActual) return true
    if (a.value === AccionPendiente.Crear
        && ambitoActual.audiencia === AudienciaAmbito.TodoElProyecto) return false
    if (a.value === AccionPendiente.Iniciar && !ambitoActual.pasoIniciar) return false
    if (a.value === AccionPendiente.PreAprobar && !ambitoActual.pasoPreAprobar) return false
    return true
  })

  // Ahora que los grupos tildados son los ÚNICOS que pueden ejecutar la acción,
  // tildar sólo grupos vacíos la deja sin nadie salvo Admin. Es fácil de hacer sin
  // darse cuenta —la columna dice los miembros, pero nadie los suma— así que lo
  // avisamos antes de guardar en vez de que aparezca como un permiso perdido.
  const accionesSinNadie = accionesVisibles.filter((a) => {
    const ids = seleccion[a.value]
    if (!ids || ids.size === 0) return false
    return grupos
      .filter((g) => ids.has(g.id))
      .every((g) => g.cantidadMiembros === 0)
  })

  async function guardar() {
    setError(null)
    try {
      // Se mandan TODAS, no sólo las visibles: una acción que dejó de aplicar
      // —Crear en un ámbito que pasó a abierto, un paso que se apagó— viaja con la
      // lista vacía y así se limpian sus filas viejas.
      const asignaciones = ACCIONES_LIST.map((a) => ({
        accion: a.value,
        grupoIds: Array.from(seleccion[a.value] ?? []),
      }))
      await save.mutateAsync({ asignaciones })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2500)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (cargandoGrupos || cargandoAuth || cargandoAmbitos) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Selector de ámbito: la matriz es una por ámbito, no una por proyecto. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ámbito</span>
        {ambitos.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAmbitoId(a.id)}
            className={`rounded-md border px-3 py-1.5 text-sm transition ${
              a.id === ambitoId
                ? "border-blue-600 bg-blue-50 font-medium text-blue-900"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
            }`}
          >
            {a.nombre}
            {a.esPrincipal && (
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                principal
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">
            Autorización del workflow por grupo
            {ambitoActual ? ` — ámbito ${ambitoActual.nombre}` : ""}
          </p>
          {ambitoActual?.audiencia === AudienciaAmbito.SoloGrupos ? (
            <p className="text-xs mt-0.5">
              Es un ámbito restringido: <span className="font-medium">no hay permiso por rol</span>.
              Solo los grupos tildados acá pueden ejecutar cada acción — si dejás una acción vacía,
              nadie puede ejecutarla salvo Admin. Las columnas son los grupos de la audiencia del
              ámbito; para sumar otro, agregalo primero a la audiencia en Configuración → Pendientes
              → Ámbitos. En <span className="font-medium">Iniciar</span>, además, el responsable y
              el grupo responsable del pendiente pueden hacerlo siempre.
            </p>
          ) : (
            <p className="text-xs mt-0.5">
              Si dejás una acción sin ningún grupo tildado, opera el permiso por rol del sistema
              (comportamiento por defecto). Con al menos un grupo tildado,{" "}
              <span className="font-medium">esos grupos son los únicos que pueden ejecutarla</span>:
              el rol deja de alcanzar para esa acción. Es lo que permite separar quién ejecuta,
              quién revisa internamente y quién aprueba. En <span className="font-medium">Iniciar</span>,
              además, el responsable y el grupo responsable del pendiente pueden hacerlo siempre.
              Admin siempre puede.
            </p>
          )}
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-6">
          {ambitoActual?.audiencia === AudienciaAmbito.SoloGrupos ? (
            <>
              El ámbito <span className="font-medium">{ambitoActual.nombre}</span> todavía no tiene
              grupos en su audiencia, así que no hay a quién autorizar. Configurala en{" "}
              <span className="font-medium">Configuración → Pendientes → Ámbitos</span>.
            </>
          ) : (
            <>
              No hay grupos de usuarios cargados. Creá grupos en{" "}
              <span className="font-medium">Configuración → Grupos de usuarios</span> y volvé a esta
              pantalla para asignarlos.
            </>
          )}
        </p>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-2 font-semibold text-gray-700 w-56">Acción</th>
                {grupos.map((g) => (
                  <th
                    key={g.id}
                    className="text-center px-2 py-2 font-medium text-gray-600 text-xs"
                    title={g.descripcion ?? undefined}
                  >
                    <div className="font-medium">{g.nombre}</div>
                    <div className="text-[10px] text-muted-foreground font-normal tabular-nums">
                      {g.cantidadMiembros} miembro{g.cantidadMiembros !== 1 ? "s" : ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accionesVisibles.map((a) => (
                <tr key={a.value} className="border-b last:border-0">
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium">{a.label}</div>
                    <div className="text-xs text-muted-foreground">{a.descripcion}</div>
                  </td>
                  {grupos.map((g) => {
                    const checked = seleccion[a.value]?.has(g.id) ?? false
                    return (
                      <td key={g.id} className="text-center align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                          checked={checked}
                          onChange={() => toggle(a.value, g.id)}
                          aria-label={`Autorizar ${a.label} a ${g.nombre}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {accionesSinNadie.length > 0 && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Los grupos tildados en{" "}
          <span className="font-medium">{accionesSinNadie.map((a) => a.label).join(", ")}</span>{" "}
          no tienen miembros, así que nadie va a poder ejecutar {accionesSinNadie.length === 1 ? "esa acción" : "esas acciones"} salvo Admin.
          Agregá usuarios al grupo en Configuración → Grupos de usuarios, o tildá otro grupo.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 whitespace-pre-line">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={guardar} disabled={save.isPending || grupos.length === 0} className="gap-2">
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar cambios
        </Button>
        {savedFlash && (
          <span className="text-sm text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>
    </div>
  )
}
