"use client"

import { Fragment, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, UserMinus } from "lucide-react"

import {
  soldadores as api, useCreateCalificacion, useDeleteCalificacion, useUpdateCalificacion,
} from "@/features/soldadura/api/use-soldadura"
import {
  EstadoVencimiento, fechaCorta, rango, soloFecha, type Calificacion, type Soldador,
} from "@/features/soldadura/types"
import {
  BotonArchivo, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, EstadoBadge, FilaVacia,
  numero, opcional, texto, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FormSoldador {
  id?: string
  nombre: string
  documento: string
  empresa: string
  cuno: string
  desde: string
  observaciones: string
}

interface FormCalificacion {
  id?: string
  habilitacionId: string
  soldador: string
  numero: string
  norma: string
  proceso: string
  pNumber: string
  fNumber: string
  posiciones: string
  diametroMin: string
  espesorMin: string
  espesorMax: string
  conRespaldo: "" | "si" | "no"
  wpsReferencia: string
  fechaCalificacion: string
  vence: string
  ultimoUsoDeclarado: string
}

const PROCESOS = ["SMAW", "GTAW", "GMAW", "FCAW", "SAW"]

/**
 * El mejor estado entre sus calificaciones. Con una sola vigente el soldador puede
 * soldar en lo que esa calificación cubre; "Vencida" acá quiere decir que no le queda
 * ninguna, que es lo mismo que marca el tablero de vencimientos.
 */
function estadoGeneral(c: Calificacion[]): EstadoVencimiento | null {
  if (c.length === 0) return null
  return Math.min(...c.map((x) => x.estado)) as EstadoVencimiento
}

export default function SoldadoresPage() {
  const { data, isLoading } = api.useList()
  const crear = api.useCreate()
  const actualizar = api.useUpdate()
  const baja = api.useDelete()
  const crearCal = useCreateCalificacion()
  const actualizarCal = useUpdateCalificacion()
  const borrarCal = useDeleteCalificacion()
  const { padron } = usePermisosSoldadura()

  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [buscar, setBuscar] = useState("")
  const [fs, setFs] = useState<FormSoldador | null>(null)
  const [fc, setFc] = useState<FormCalificacion | null>(null)
  const [aBaja, setABaja] = useState<Soldador | null>(null)
  const [aBorrar, setABorrar] = useState<{ id: string; texto: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return (data ?? []).filter((s) =>
      !q || [s.nombre, s.documento, s.cuno, s.empresa ?? ""].some((v) => v.toLowerCase().includes(q)))
  }, [data, buscar])

  function alternar(id: string) {
    setAbiertos((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function guardarSoldador() {
    if (!fs) return
    setError(null)
    const payload = {
      nombre: fs.nombre.trim(),
      documento: fs.documento.trim(),
      cuno: fs.cuno.trim().toUpperCase(),
      empresa: opcional(fs.empresa),
      observaciones: opcional(fs.observaciones),
      desde: fs.desde || null,
    }
    try {
      if (fs.id) await actualizar.mutateAsync({ id: fs.id, ...payload })
      else await crear.mutateAsync(payload)
      setFs(null)
    } catch (e) { setError((e as Error).message) }
  }

  async function guardarCalificacion() {
    if (!fc) return
    setError(null)
    const payload = {
      numero: opcional(fc.numero),
      norma: fc.norma.trim(),
      proceso: fc.proceso.trim().toUpperCase(),
      pNumber: opcional(fc.pNumber),
      fNumber: opcional(fc.fNumber),
      posiciones: opcional(fc.posiciones),
      diametroMin: numero(fc.diametroMin),
      espesorMin: numero(fc.espesorMin),
      espesorMax: numero(fc.espesorMax),
      conRespaldo: fc.conRespaldo === "" ? null : fc.conRespaldo === "si",
      wpsReferencia: opcional(fc.wpsReferencia),
      fechaCalificacion: fc.fechaCalificacion,
      vence: fc.vence || null,
      ultimoUsoDeclarado: fc.ultimoUsoDeclarado || null,
    }
    try {
      if (fc.id) await actualizarCal.mutateAsync({ id: fc.id, ...payload })
      else await crearCal.mutateAsync({ habilitacionId: fc.habilitacionId, ...payload })
      setAbiertos((prev) => new Set(prev).add(fc.habilitacionId))
      setFc(null)
    } catch (e) { setError((e as Error).message) }
  }

  function nuevaCalificacion(s: Soldador): FormCalificacion {
    return {
      habilitacionId: s.id, soldador: `${s.cuno} — ${s.nombre}`, numero: "", norma: "ASME IX", proceso: "SMAW",
      pNumber: "", fNumber: "", posiciones: "", diametroMin: "", espesorMin: "", espesorMax: "",
      conRespaldo: "", wpsReferencia: "", fechaCalificacion: "", vence: "", ultimoUsoDeclarado: "",
    }
  }

  function editarCalificacion(s: Soldador, c: Calificacion): FormCalificacion {
    return {
      id: c.id, habilitacionId: s.id, soldador: `${s.cuno} — ${s.nombre}`, numero: c.numero ?? "",
      norma: c.norma, proceso: c.proceso, pNumber: c.pNumber ?? "", fNumber: c.fNumber ?? "",
      posiciones: c.posiciones ?? "", diametroMin: texto(c.diametroMin), espesorMin: texto(c.espesorMin),
      espesorMax: texto(c.espesorMax), conRespaldo: c.conRespaldo == null ? "" : c.conRespaldo ? "si" : "no",
      wpsReferencia: c.wpsReferencia ?? "", fechaCalificacion: soloFecha(c.fechaCalificacion),
      vence: soloFecha(c.vence), ultimoUsoDeclarado: soloFecha(c.ultimoUsoDeclarado),
    }
  }

  const okSoldador = !!fs && fs.nombre.trim() !== "" && fs.documento.trim() !== "" && fs.cuno.trim() !== ""
  const okCal = !!fc && fc.norma.trim() !== "" && fc.proceso.trim() !== "" && fc.fechaCalificacion !== ""

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Soldadores"
        descripcion={
          <>
            Soldadores habilitados en el proyecto con su cuño y sus calificaciones. El soldador es
            del padrón de toda la instalación: si el documento ya trabajó en otra obra, se reutiliza
            con sus calificaciones. El cuño es propio de este proyecto.
          </>
        }
      >
        <Button
          className="gap-2" disabled={!padron}
          onClick={() => { setError(null); setFs({ nombre: "", documento: "", empresa: "", cuno: "", desde: "", observaciones: "" }) }}
        >
          <Plus className="h-4 w-4" /> Habilitar soldador
        </Button>
      </Encabezado>

      <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, documento, cuño o empresa" className="max-w-sm" />

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-24 font-semibold text-gray-700">Cuño</TableHead>
              <TableHead className="font-semibold text-gray-700">Soldador</TableHead>
              <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700">Habilitado desde</TableHead>
              <TableHead className="w-40 font-semibold text-gray-700">Calificaciones</TableHead>
              <TableHead className="w-36 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || lista.length === 0 ? (
              <FilaVacia columnas={7} cargando={isLoading} vacio={buscar ? "Ningún soldador coincide." : "No hay soldadores habilitados."} />
            ) : (
              lista.map((s) => {
                const abierto = abiertos.has(s.id)
                const estado = estadoGeneral(s.calificaciones)
                return (
                  <Fragment key={s.id}>
                    <TableRow className="cursor-pointer" onClick={() => alternar(s.id)}>
                      <TableCell>{abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-mono font-medium">{s.cuno}</TableCell>
                      <TableCell className="font-medium">
                        {s.nombre}
                        <span className="block text-xs text-muted-foreground">Doc. {s.documento}</span>
                      </TableCell>
                      <TableCell className="text-sm">{s.empresa || "—"}</TableCell>
                      <TableCell className="tabular-nums">{fechaCorta(s.desde)}</TableCell>
                      <TableCell>
                        {estado == null
                          ? <span className="text-xs text-red-700">Sin calificaciones</span>
                          : <span className="flex items-center gap-2"><EstadoBadge estado={estado} /><span className="text-xs text-muted-foreground">{s.calificaciones.length}</span></span>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron} title="Agregar calificación"
                          onClick={() => { setError(null); setFc(nuevaCalificacion(s)) }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron} title="Editar"
                          onClick={() => {
                            setError(null)
                            setFs({ id: s.id, nombre: s.nombre, documento: s.documento, empresa: s.empresa ?? "", cuno: s.cuno, desde: soloFecha(s.desde), observaciones: s.observaciones ?? "" })
                          }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!padron} title="Dar de baja del proyecto"
                          onClick={() => { setError(null); setABaja(s) }}>
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {abierto && (
                      <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                        <TableCell />
                        <TableCell colSpan={6} className="py-3">
                          {s.calificaciones.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin calificaciones cargadas.</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead className="text-xs text-muted-foreground">
                                <tr className="text-left">
                                  <th className="py-1 font-medium">Proceso</th>
                                  <th className="py-1 font-medium">Norma</th>
                                  <th className="py-1 font-medium">Posiciones</th>
                                  <th className="py-1 font-medium">Espesor</th>
                                  <th className="py-1 font-medium">Calificado</th>
                                  <th className="py-1 font-medium">Vence</th>
                                  <th className="py-1 font-medium">Continuidad</th>
                                  <th className="py-1 font-medium">Estado</th>
                                  <th className="py-1" />
                                </tr>
                              </thead>
                              <tbody>
                                {s.calificaciones.map((c) => (
                                  <tr key={c.id} className="border-t">
                                    <td className="py-1.5 font-medium">{c.proceso}{c.numero && <span className="block text-xs text-muted-foreground">{c.numero}</span>}</td>
                                    <td className="py-1.5">{c.norma}</td>
                                    <td className="py-1.5">{c.posiciones || "—"}</td>
                                    <td className="py-1.5">{rango(c.espesorMin, c.espesorMax, "mm")}</td>
                                    <td className="py-1.5 tabular-nums">{fechaCorta(c.fechaCalificacion)}</td>
                                    <td className="py-1.5 tabular-nums">{fechaCorta(c.vence)}</td>
                                    <td className="py-1.5 tabular-nums">{fechaCorta(c.continuidadHasta)}</td>
                                    <td className="py-1.5"><EstadoBadge estado={c.estado} /></td>
                                    <td className="py-1.5 text-right whitespace-nowrap">
                                      <BotonArchivo tipo="Calificacion" id={c.id} tieneArchivo={c.tieneArchivo} nombre={c.archivoNombre} puedeSubir={padron} />
                                      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron} title="Editar"
                                        onClick={() => { setError(null); setFc(editarCalificacion(s, c)) }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!padron} title="Eliminar"
                                        onClick={() => { setError(null); setABorrar({ id: c.id, texto: `${c.proceso} ${c.norma} de ${s.nombre}` }) }}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{lista.length} soldadores</p>

      {/* ── Sheet del soldador ─────────────────────────────────────────── */}
      <Sheet open={fs !== null} onOpenChange={(v) => !v && setFs(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fs?.id ? "Editar soldador" : "Habilitar soldador"}</SheetTitle>
            <SheetDescription>
              {fs?.id
                ? "Nombre, documento y empresa son del padrón: el cambio se ve en todas las obras donde trabaje."
                : "Si el documento ya está en el padrón de otra obra, se reutiliza la persona con sus calificaciones."}
            </SheetDescription>
          </SheetHeader>
          {fs && (
            <div className="mt-6 px-4 space-y-3">
              <Campo label="Documento"><Input value={fs.documento} onChange={(e) => setFs({ ...fs, documento: e.target.value })} /></Campo>
              <Campo label="Apellido y nombre"><Input value={fs.nombre} onChange={(e) => setFs({ ...fs, nombre: e.target.value })} /></Campo>
              <Campo label="Empresa"><Input value={fs.empresa} onChange={(e) => setFs({ ...fs, empresa: e.target.value })} placeholder="Contratista" /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Cuño" ayuda="Su estampa en este proyecto.">
                  <Input value={fs.cuno} onChange={(e) => setFs({ ...fs, cuno: e.target.value })} className="font-mono uppercase" maxLength={20} />
                </Campo>
                <Campo label="Habilitado desde"><Input type="date" value={fs.desde} onChange={(e) => setFs({ ...fs, desde: e.target.value })} /></Campo>
              </div>
              <Campo label="Observaciones"><Textarea rows={2} value={fs.observaciones} onChange={(e) => setFs({ ...fs, observaciones: e.target.value })} /></Campo>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardarSoldador} disabled={!okSoldador || crear.isPending || actualizar.isPending}>
                  {crear.isPending || actualizar.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setFs(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet de la calificación ───────────────────────────────────── */}
      <Sheet open={fc !== null} onOpenChange={(v) => !v && setFc(null)}>
        <SheetContent className="w-full sm:max-w-lg! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fc?.id ? "Editar calificación" : "Nueva calificación"}</SheetTitle>
            <SheetDescription>{fc?.soldador}. El PDF del certificado se sube desde la lista, una vez guardada.</SheetDescription>
          </SheetHeader>
          {fc && (
            <div className="mt-6 px-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Proceso">
                  <Input list="procesos-soldadura" value={fc.proceso} onChange={(e) => setFc({ ...fc, proceso: e.target.value })} className="uppercase" />
                  <datalist id="procesos-soldadura">{PROCESOS.map((p) => <option key={p} value={p} />)}</datalist>
                </Campo>
                <Campo label="Norma" ayuda="De acá sale la continuidad.">
                  <Input value={fc.norma} onChange={(e) => setFc({ ...fc, norma: e.target.value })} placeholder="ASME IX" />
                </Campo>
                <Campo label="N° de certificado"><Input value={fc.numero} onChange={(e) => setFc({ ...fc, numero: e.target.value })} /></Campo>
                <Campo label="Posiciones"><Input value={fc.posiciones} onChange={(e) => setFc({ ...fc, posiciones: e.target.value })} placeholder="6G" /></Campo>
                <Campo label="P-number"><Input value={fc.pNumber} onChange={(e) => setFc({ ...fc, pNumber: e.target.value })} /></Campo>
                <Campo label="F-number"><Input value={fc.fNumber} onChange={(e) => setFc({ ...fc, fNumber: e.target.value })} /></Campo>
                <Campo label="Espesor mín. (mm)"><Input inputMode="decimal" value={fc.espesorMin} onChange={(e) => setFc({ ...fc, espesorMin: e.target.value })} /></Campo>
                <Campo label="Espesor máx. (mm)"><Input inputMode="decimal" value={fc.espesorMax} onChange={(e) => setFc({ ...fc, espesorMax: e.target.value })} /></Campo>
                <Campo label="Diámetro mín. (pulg)"><Input inputMode="decimal" value={fc.diametroMin} onChange={(e) => setFc({ ...fc, diametroMin: e.target.value })} /></Campo>
                <Campo label="Con respaldo">
                  <select value={fc.conRespaldo} onChange={(e) => setFc({ ...fc, conRespaldo: e.target.value as FormCalificacion["conRespaldo"] })} className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm">
                    <option value="">No se informa</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </Campo>
                <Campo label="WPS con que rindió" className="col-span-2"><Input value={fc.wpsReferencia} onChange={(e) => setFc({ ...fc, wpsReferencia: e.target.value })} /></Campo>
                <Campo label="Fecha de calificación"><Input type="date" value={fc.fechaCalificacion} onChange={(e) => setFc({ ...fc, fechaCalificacion: e.target.value })} /></Campo>
                <Campo label="Vence" ayuda="Vacío si solo caduca por continuidad."><Input type="date" value={fc.vence} onChange={(e) => setFc({ ...fc, vence: e.target.value })} /></Campo>
                <Campo label="Último uso declarado" className="col-span-2"
                  ayuda="Para un soldador que llega de otra obra: la última vez que usó el proceso. La continuidad corre desde la fecha más reciente.">
                  <Input type="date" value={fc.ultimoUsoDeclarado} onChange={(e) => setFc({ ...fc, ultimoUsoDeclarado: e.target.value })} className="w-48" />
                </Campo>
              </div>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardarCalificacion} disabled={!okCal || crearCal.isPending || actualizarCal.isPending}>
                  {crearCal.isPending || actualizarCal.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setFc(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmarBorrado
        abierto={aBaja !== null}
        titulo="Dar de baja del proyecto"
        descripcion={<>¿Dar de baja a <strong>{aBaja?.nombre}</strong> (cuño {aBaja?.cuno})? Deja de estar habilitado en este proyecto y el cuño queda libre. Sigue en el padrón con sus calificaciones.</>}
        pendiente={baja.isPending}
        error={error}
        onCancelar={() => setABaja(null)}
        onConfirmar={async () => {
          try { await baja.mutateAsync(aBaja!.id); setABaja(null) } catch (e) { setError((e as Error).message) }
        }}
      />
      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Eliminar calificación"
        descripcion={<>¿Eliminar la calificación <strong>{aBorrar?.texto}</strong>? La calificación es del padrón: deja de verse en todas las obras.</>}
        pendiente={borrarCal.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          try { await borrarCal.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) }
        }}
      />
    </div>
  )
}
