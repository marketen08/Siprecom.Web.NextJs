"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import { useConfiguracion, useGuardarConfiguracion } from "@/features/soldadura/api/use-inspeccion"
import { useGetNcAreas } from "@/features/no-conformidades/api/use-nc-areas"
import { useGetNcTipos } from "@/features/no-conformidades/api/use-catalogos"
import type { Configuracion } from "@/features/soldadura/types-inspeccion"
import { CLASE_SELECT, Campo, Encabezado, ErrorTexto, usePermisosSoldadura } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"

/**
 * Configuración del control de soldadura en el proyecto. Hoy, la no conformidad que se
 * abre sola cuando una junta se rechaza en la visual o en un ensayo: el módulo de No
 * Conformidades pide tipo, área afectada y área de seguimiento, y esas áreas son de
 * cada proyecto.
 */
export default function ConfiguracionSoldaduraPage() {
  const config = useConfiguracion()
  const guardar = useGuardarConfiguracion()
  const { parametros } = usePermisosSoldadura()
  const moduloNc = config.data?.moduloNcHabilitado ?? false
  const tipos = useGetNcTipos()
  const areas = useGetNcAreas(moduloNc)
  const [f, setF] = useState<Configuracion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  // Se copia una sola vez, cuando llega: después el formulario es del usuario.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (config.data && !f) setF(config.data) }, [config.data, f])

  if (!f) return <Encabezado titulo="Configuración" descripcion="Cargando..." />

  async function onGuardar() {
    if (!f) return
    setError(null)
    setOk(false)
    try { setF(await guardar.mutateAsync(f)); setOk(true) } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Encabezado titulo="Configuración" descripcion="Cómo se comporta el control de soldadura en este proyecto." />

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div>
          <p className="text-sm font-medium">No conformidad por rechazo</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cuando una junta se rechaza —en la visual o en un ensayo— se abre una no conformidad en el módulo de Calidad, con el
            usuario que cargó el rechazo. Si no se puede abrir, el rechazo se guarda igual y se avisa.
          </p>
        </div>

        {!moduloNc && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
            El módulo de No Conformidades está apagado en este proyecto: no se va a abrir ninguna aunque esté configurado. Se prende desde las funcionalidades del proyecto.
          </p>
        )}

        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" className="h-4 w-4 accent-blue-600" disabled={!parametros} checked={f.crearNcPorRechazo}
            onChange={(e) => setF({ ...f, crearNcPorRechazo: e.target.checked })} />
          Abrir una no conformidad por cada junta rechazada
        </label>

        {f.crearNcPorRechazo && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="Tipo de informe">
              <select value={f.ncTipoId ?? ""} onChange={(e) => setF({ ...f, ncTipoId: e.target.value || null })} className={CLASE_SELECT} disabled={!parametros}>
                <option value="">Elegí…</option>
                {(tipos.data?.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.codigo} — {t.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Área afectada">
              <select value={f.ncGrupoAfectadoId ?? ""} onChange={(e) => setF({ ...f, ncGrupoAfectadoId: e.target.value || null })} className={CLASE_SELECT} disabled={!parametros || !moduloNc}>
                <option value="">Elegí…</option>
                {(areas.data?.data?.afectada ?? []).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Área de seguimiento">
              <select value={f.ncGrupoSeguimientoId ?? ""} onChange={(e) => setF({ ...f, ncGrupoSeguimientoId: e.target.value || null })} className={CLASE_SELECT} disabled={!parametros || !moduloNc}>
                <option value="">Elegí…</option>
                {(areas.data?.data?.seguimiento ?? []).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Campo>
          </div>
        )}

        <ErrorTexto error={error} />
        {ok && <p className="text-sm text-green-700">Configuración guardada.</p>}
        <Button onClick={onGuardar} disabled={!parametros || guardar.isPending}>{guardar.isPending ? "Guardando..." : "Guardar"}</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Las normas, con su límite de reparación y la acción al superarlo, se ajustan en <Link href="/calidad/soldadura/normas-clases" className="text-blue-700 underline">Normas y clases</Link>.
      </p>
    </div>
  )
}
