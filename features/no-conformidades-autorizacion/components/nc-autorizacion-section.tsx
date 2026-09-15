"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import {
  useGetNcAutorizacion,
  useSetNcAutorizacion,
} from "../api/use-no-conformidades-autorizacion"
import { NC_ACCIONES_LIST, AccionNoConformidad } from "../types"

/**
 * Matriz de autorización del workflow de Calidad por proyecto: filas = acciones,
 * columnas = grupos. Como cada acción corresponde a una etapa del circuito, esta
 * pantalla es la que responde "qué grupo firma en cada estado".
 *
 * Fallback: si una acción queda sin ningún grupo tildado, opera el permiso por rol
 * del sistema. Es lo que permite habilitar el módulo y empezar a operar sin
 * configurar nada.
 */
export function NcAutorizacionSection({ proyectoId }: { proyectoId: string }) {
  // Solo grupos declarados para uso en Calidad — evita ofrecer grupos irrelevantes.
  const { data: gruposResp, isLoading: cargandoGrupos } = useGetUsuariosGrupos("calidad")
  const { data: authResp, isLoading: cargandoAuth } = useGetNcAutorizacion(proyectoId)
  const save = useSetNcAutorizacion(proyectoId)

  const grupos = gruposResp?.data ?? []
  const [seleccion, setSeleccion] = useState<Record<number, Set<string>>>({})
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const serverKey = useMemo(
    () => (authResp?.data ?? []).map((r) => `${r.accion}:${r.grupoId}`).sort().join("|"),
    [authResp?.data],
  )
  // Solo hidratamos con los grupos que se dibujan como columna: una asignación de
  // un grupo que no está en la lista (eliminado, o sin el flag de uso en Calidad)
  // no se podría ver ni destildar, pero se enviaría igual al guardar y el backend
  // la rechazaría, trabando la pantalla. Se guarda exactamente lo que se ve.
  const gruposKey = useMemo(() => grupos.map((g) => g.id).sort().join("|"), [grupos])
  useEffect(() => {
    const disponibles = new Set(grupos.map((g) => g.id))
    const inicial: Record<number, Set<string>> = {}
    for (const a of NC_ACCIONES_LIST) inicial[a.value] = new Set()
    for (const row of authResp?.data ?? []) {
      if (!disponibles.has(row.grupoId)) continue
      inicial[row.accion] = inicial[row.accion] ?? new Set()
      inicial[row.accion].add(row.grupoId)
    }
    setSeleccion(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey, gruposKey])

  function toggle(accion: AccionNoConformidad, grupoId: string) {
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
      const asignaciones = NC_ACCIONES_LIST.map((a) => ({
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
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Quién firma cada etapa del informe</p>
          <p className="mt-0.5 text-xs">
            Cada acción corresponde a una etapa del circuito, y quien la ejecuta es quien
            firma. Si dejás una acción sin ningún grupo tildado, opera el permiso por rol
            del sistema. Con al menos un grupo tildado, solo los miembros de esos grupos
            pueden ejecutarla. Admin siempre puede.
          </p>
          <p className="mt-1 text-xs">
            Además, los miembros del <span className="font-medium">área afectada</span> del
            informe pueden ejecutar las etapas de ejecución, y los del{" "}
            <span className="font-medium">área de seguimiento</span> las de control, sin
            necesidad de figurar acá.
          </p>
        </div>
      </div>

      {grupos.length === 0 ? (
        <p className="py-6 text-sm italic text-muted-foreground">
          No hay grupos marcados para uso en Calidad. Marcá el checkbox{" "}
          <span className="font-medium">Calidad</span> en{" "}
          <span className="font-medium">Configuración → Grupos de usuarios</span> y volvé a
          esta pantalla.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="w-40 px-3 py-2 text-left font-semibold text-gray-700">
                  Etapa
                </th>
                <th className="w-64 px-3 py-2 text-left font-semibold text-gray-700">
                  Acción
                </th>
                {grupos.map((g) => (
                  <th
                    key={g.id}
                    className="px-2 py-2 text-center text-xs font-medium text-gray-600"
                    title={g.descripcion ?? undefined}
                  >
                    <div className="font-medium">{g.nombre}</div>
                    <div className="text-[10px] font-normal tabular-nums text-muted-foreground">
                      {g.cantidadMiembros} miembro{g.cantidadMiembros !== 1 ? "s" : ""}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NC_ACCIONES_LIST.map((a) => (
                <tr key={a.value} className="border-b last:border-0">
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {a.estado}
                  </td>
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
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-blue-600"
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
        <p className="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={guardar}
          disabled={save.isPending || grupos.length === 0}
          className="gap-2"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar cambios
        </Button>
        {savedFlash && (
          <span className="flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>
    </div>
  )
}
