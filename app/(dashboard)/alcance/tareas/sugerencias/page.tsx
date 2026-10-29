"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Download,
  Info,
  Loader2,
  PenLine,
} from "lucide-react"

import {
  useGetSugerenciasTareas,
  useImportarSugerenciasTareas,
  type SugerenciasTareasGrupo,
} from "@/features/tareas/api/use-sugerencias-tareas"
import { useMeetsRole } from "@/lib/use-roles"

import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"

/**
 * Sugerencias de tareas desde otras obras del mismo equipo de administración.
 *
 * Cierra el círculo que abre el panel "Tipos sin tareas" del listado: ese dice "a CAMARA
 * CIVIL le faltan tareas", y acá se ve qué tiene ese tipo en las otras obras del equipo para
 * traer lo que corresponda con un checkbox.
 *
 * Pantalla y no sheet porque la lista es larga y se trabaja sobre ella: se revisa grupo por
 * grupo, se compara contra lo que la obra necesita y se selecciona.
 */
export default function SugerenciasTareasPage() {
  // Importar escribe el catálogo del proyecto: Admin, igual que el endpoint.
  const esAdmin = useMeetsRole("Admin")

  const { data: preview, isLoading } = useGetSugerenciasTareas()
  const importarMut = useImportarSugerenciasTareas()

  const [elegidas, setElegidas] = useState<Set<string>>(new Set())
  const [resultado, setResultado] = useState<string | null>(null)
  const [motivos, setMotivos] = useState<string[]>([])

  const error = importarMut.error instanceof Error ? importarMut.error.message : null

  const totalElegidas = elegidas.size

  // Ids por grupo, para los atajos de "todas las de este tipo".
  const idsPorGrupo = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const g of preview?.grupos ?? []) {
      m.set(g.elementoTipoId, g.tareas.map((t) => t.tareaId))
    }
    return m
  }, [preview])

  function toggle(id: string) {
    setElegidas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGrupo(g: SugerenciasTareasGrupo) {
    const ids = idsPorGrupo.get(g.elementoTipoId) ?? []
    const todasPuestas = ids.every((id) => elegidas.has(id))
    setElegidas((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (todasPuestas) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  async function importar() {
    setResultado(null)
    setMotivos([])
    const r = await importarMut.mutateAsync([...elegidas])
    setElegidas(new Set())
    setResultado(
      r
        ? `Se trajeron ${r.importadas} tarea(s) al proyecto.` +
          (r.omitidas > 0 ? ` ${r.omitidas} quedaron afuera.` : "")
        : "Listo.",
    )
    setMotivos(r?.motivos ?? [])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/alcance/tareas"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a tareas
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">
            Traer tareas de otras obras
          </h1>
          <p className="text-sm text-muted-foreground">
            Tareas que existen en otros proyectos
            {preview?.acotadoPorEquipo && preview.equipoNombre
              ? ` del equipo ${preview.equipoNombre}`
              : ""}
            {" "}para los tipos de elemento que esta obra tiene cargados y todavía no configuró.
          </p>
        </div>

        {esAdmin && (preview?.sugerenciasTotal ?? 0) > 0 && (
          <Button
            onClick={importar}
            disabled={totalElegidas === 0 || importarMut.isPending}
            className="gap-2"
          >
            {importarMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {importarMut.isPending
              ? "Trayendo…"
              : `Traer ${totalElegidas} tarea${totalElegidas === 1 ? "" : "s"}`}
          </Button>
        )}
      </div>

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando tareas en las otras obras…
        </p>
      )}

      {resultado && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <p>{resultado}</p>
          {motivos.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs">
              {motivos.map((m, i) => (
                <li key={i}>· {m}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {preview && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Qué se buscó</CardTitle>
              <CardDescription>
                {preview.acotadoPorEquipo
                  ? `Se miraron ${preview.proyectosConsultados} proyecto(s) del equipo` +
                    `${preview.equipoNombre ? ` ${preview.equipoNombre}` : ""}.` +
                    " Las tareas referencian planillas y procedimientos del equipo, así que" +
                    " traer de otro equipo importaría referencias a catálogos que este equipo" +
                    " no administra."
                  : `Se miraron ${preview.proyectosConsultados} proyecto(s).` +
                    " La estructura de equipos de administración está desactivada, así que el" +
                    " catálogo es uno solo y no se acota la búsqueda."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid max-w-md grid-cols-2 gap-x-3 gap-y-1 text-sm text-gray-700">
                <dt>Tipos sin tareas en la obra</dt>
                <dd className="text-right font-medium">{preview.tiposSinTareas}</dd>
                <dt>Con algo para sugerir</dt>
                <dd className="text-right font-medium">{preview.tiposConSugerencias}</dd>
                <dt>Tareas distintas sugeridas</dt>
                <dd className="text-right font-medium">{preview.sugerenciasTotal}</dd>
              </dl>
            </CardContent>
          </Card>

          {preview.tiposSinTareas === 0 && (
            <p className="flex gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Todos los tipos de elemento presentes en la obra ya tienen tareas en el
                catálogo: no hay nada que traer.
              </span>
            </p>
          )}

          {preview.tiposSinTareas > 0 && preview.grupos.length === 0 && (
            <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Ninguna otra obra tiene tareas para estos tipos de elemento, así que no hay de
                dónde copiarlas. Van a tener que crearse a mano o importarse por Excel.
              </span>
            </p>
          )}

          {preview.grupos.map((g) => {
            const ids = idsPorGrupo.get(g.elementoTipoId) ?? []
            const todas = ids.length > 0 && ids.every((id) => elegidas.has(id))

            return (
              <Card key={g.elementoTipoId}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {g.esSintetico && <Boxes className="h-4 w-4 text-blue-700" />}
                        {g.elementoTipoNombre ?? "(tipo sin nombre)"}
                      </CardTitle>
                      <CardDescription>
                        {g.especialidadNombre ? `${g.especialidadNombre} · ` : ""}
                        {g.elementosEnObra}{" "}
                        {g.esSintetico ? "paquete(s) en la obra" : "elemento(s) en la obra"}
                        {" · "}
                        {g.tareas.length} sugerencia(s)
                      </CardDescription>
                    </div>
                    {esAdmin && (
                      <Button variant="outline" size="sm" onClick={() => toggleGrupo(g)}>
                        {todas ? "Quitar todas" : "Elegir todas"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="divide-y">
                    {g.tareas.map((t) => (
                      <li key={t.tareaId} className="flex items-start gap-3 py-2">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0"
                          checked={elegidas.has(t.tareaId)}
                          onChange={() => toggle(t.tareaId)}
                          disabled={!esAdmin || importarMut.isPending}
                          aria-label={`Traer ${t.nombre}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900">{t.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              t.nivelNombre,
                              t.planillaCodigo
                                ? `Planilla ${t.planillaCodigo}`
                                : "Sin planilla",
                              t.procedimientoNombre,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>
                              En <strong className="font-medium">{t.proyectos}</strong>{" "}
                              proyecto{t.proyectos === 1 ? "" : "s"}
                              {t.proyectoEjemplo ? ` (ej. ${t.proyectoEjemplo})` : ""}
                            </span>
                            {t.traeFirmasPropias && (
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <PenLine className="h-3 w-3" />
                                trae firmas propias
                              </span>
                            )}
                            {t.precedenteNombre && (
                              <span>depende de &quot;{t.precedenteNombre}&quot;</span>
                            )}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}

          {/* Las dos cosas que no son obvias al elegir. */}
          {preview.grupos.length > 0 && (
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Las tareas con <strong>firmas propias</strong> traen su propia configuración de
                firmas, que pisa la del proyecto. Y cuando una tarea{" "}
                <strong>depende de otra</strong>, la dependencia sólo viaja si traés las dos:
                si traés sólo la sucesora, llega sin predecesora.
              </span>
            </p>
          )}

          {preview.sinSugerencias.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Sin sugerencias ({preview.sinSugerencias.length})
                </CardTitle>
                <CardDescription>
                  Estos tipos están en la obra, no tienen tareas, y ninguna otra obra
                  {preview.acotadoPorEquipo ? " del equipo" : ""} tiene tareas para ellos. Hay
                  que crearlas.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-0.5 text-sm text-gray-700">
                  {preview.sinSugerencias.map((t) => (
                    <li key={t.elementoTipoId}>
                      <span className="font-medium">
                        {t.elementoTipoNombre ?? "(tipo sin nombre)"}
                      </span>
                      {t.especialidadNombre && ` · ${t.especialidadNombre}`}
                      {" · "}
                      {t.elementosEnObra} elemento(s)
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
