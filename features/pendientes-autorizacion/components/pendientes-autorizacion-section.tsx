"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import {
  useGetPendientesAutorizacion,
  useSetPendientesAutorizacion,
} from "../api/use-pendientes-autorizacion"
import { ACCIONES_LIST, AccionPendiente } from "../types"

/**
 * Matriz de autorización del workflow de Pendiente por proyecto: filas = acciones,
 * columnas = grupos disponibles. Fallback: si no hay ningún grupo tildado para una
 * acción, opera el rol global (compatible con el estado actual del sistema).
 */
export function PendientesAutorizacionSection({ proyectoId }: { proyectoId: string }) {
  // Solo grupos declarados para uso en Pendientes — evita ofrecer grupos irrelevantes.
  const { data: gruposResp, isLoading: cargandoGrupos } = useGetUsuariosGrupos("pendientes")
  const { data: authResp, isLoading: cargandoAuth } = useGetPendientesAutorizacion(proyectoId)
  const save = useSetPendientesAutorizacion(proyectoId)

  const grupos = gruposResp?.data ?? []
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

  async function guardar() {
    setError(null)
    try {
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

  if (cargandoGrupos || cargandoAuth) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Autorización del workflow por grupo</p>
          <p className="text-xs mt-0.5">
            Si dejás una acción sin ningún grupo tildado, opera el permiso por rol
            del sistema (comportamiento por defecto). Con al menos un grupo tildado, solo los
            miembros de esos grupos pueden ejecutar la acción. Admin siempre puede.
          </p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-6">
          No hay grupos de usuarios cargados. Creá grupos en{" "}
          <span className="font-medium">Configuración → Grupos de usuarios</span> y volvé a esta
          pantalla para asignarlos.
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
              {ACCIONES_LIST.map((a) => (
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
