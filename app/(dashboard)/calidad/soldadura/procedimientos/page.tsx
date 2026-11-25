"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2, X } from "lucide-react"

import { pqr as apiPqr, wps as apiWps } from "@/features/soldadura/api/use-soldadura"
import {
  ESTADO_WPS_LABEL, EstadoWps, fechaCorta, rango, soloFecha, type Pqr, type Wps,
} from "@/features/soldadura/types"
import {
  BotonArchivo, CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia,
  numero, opcional, texto, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/** Una pasada en edición: todo como texto, se convierte al guardar. */
interface FilaPasada {
  pasada: string
  proceso: string
  clasificacionAporte: string
  diametroAporte: string
  amperajeMin: string
  amperajeMax: string
  voltajeMin: string
  voltajeMax: string
  velocidadMin: string
  velocidadMax: string
  polaridad: string
  progresion: string
}

interface FormWps {
  id?: string
  codigo: string
  revision: string
  norma: string
  procesos: string
  pNumbers: string
  espesorMin: string
  espesorMax: string
  diametroMin: string
  diametroMax: string
  posiciones: string
  tipoJunta: string
  precalentamientoMin: string
  interpasadaMax: string
  requierePwht: boolean
  estado: EstadoWps
  pasadas: FilaPasada[]
  pqrIds: string[]
}

interface FormPqr {
  id?: string
  codigo: string
  norma: string
  fecha: string
  descripcion: string
}

const PASADA_VACIA: FilaPasada = {
  pasada: "", proceso: "", clasificacionAporte: "", diametroAporte: "", amperajeMin: "", amperajeMax: "",
  voltajeMin: "", voltajeMax: "", velocidadMin: "", velocidadMax: "", polaridad: "", progresion: "",
}

const ESTILO_ESTADO: Record<EstadoWps, string> = {
  [EstadoWps.Borrador]: "bg-gray-100 text-gray-700 border-gray-200",
  [EstadoWps.Aprobado]: "bg-green-50 text-green-700 border-green-200",
  [EstadoWps.Obsoleto]: "bg-amber-50 text-amber-800 border-amber-200",
}

/**
 * Procedimientos de soldadura (WPS) y registros de calificación (PQR). Son dos
 * puntos de espera del PIE. Un WPS se identifica por código y revisión: una revisión
 * nueva es otro WPS, y la anterior se marca obsoleta en vez de borrarse.
 */
export default function ProcedimientosPage() {
  const wps = apiWps.useList()
  const pqrs = apiPqr.useList()
  const crearW = apiWps.useCreate()
  const actualizarW = apiWps.useUpdate()
  const borrarW = apiWps.useDelete()
  const crearP = apiPqr.useCreate()
  const actualizarP = apiPqr.useUpdate()
  const borrarP = apiPqr.useDelete()
  const { parametros } = usePermisosSoldadura()

  const [fw, setFw] = useState<FormWps | null>(null)
  const [fp, setFp] = useState<FormPqr | null>(null)
  const [aBorrar, setABorrar] = useState<{ tipo: "wps" | "pqr"; id: string; texto: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const listaW = wps.data ?? []
  const listaP = pqrs.data ?? []

  function editarWps(w?: Wps) {
    setError(null)
    setFw(w ? {
      id: w.id, codigo: w.codigo, revision: w.revision, norma: w.norma ?? "", procesos: w.procesos,
      pNumbers: w.pNumbers ?? "", espesorMin: texto(w.espesorMin), espesorMax: texto(w.espesorMax),
      diametroMin: texto(w.diametroMin), diametroMax: texto(w.diametroMax), posiciones: w.posiciones ?? "",
      tipoJunta: w.tipoJunta ?? "", precalentamientoMin: texto(w.precalentamientoMin), interpasadaMax: texto(w.interpasadaMax),
      requierePwht: w.requierePwht, estado: w.estado, pqrIds: w.pqrIds ?? [],
      pasadas: (w.pasadas ?? []).map((p) => ({
        pasada: p.pasada, proceso: p.proceso ?? "", clasificacionAporte: p.clasificacionAporte ?? "",
        diametroAporte: texto(p.diametroAporte), amperajeMin: texto(p.amperajeMin), amperajeMax: texto(p.amperajeMax),
        voltajeMin: texto(p.voltajeMin), voltajeMax: texto(p.voltajeMax), velocidadMin: texto(p.velocidadMin),
        velocidadMax: texto(p.velocidadMax), polaridad: p.polaridad ?? "", progresion: p.progresion ?? "",
      })),
    } : {
      codigo: "", revision: "0", norma: "ASME IX", procesos: "", pNumbers: "", espesorMin: "", espesorMax: "",
      diametroMin: "", diametroMax: "", posiciones: "", tipoJunta: "", precalentamientoMin: "", interpasadaMax: "",
      requierePwht: false, estado: EstadoWps.Borrador, pqrIds: [],
      pasadas: [{ ...PASADA_VACIA, pasada: "Raíz" }, { ...PASADA_VACIA, pasada: "Relleno" }, { ...PASADA_VACIA, pasada: "Terminación" }],
    })
  }

  async function guardarWps() {
    if (!fw) return
    setError(null)
    const payload = {
      codigo: fw.codigo.trim(),
      revision: fw.revision.trim() || "0",
      norma: opcional(fw.norma),
      procesos: fw.procesos.trim(),
      pNumbers: opcional(fw.pNumbers),
      espesorMin: numero(fw.espesorMin), espesorMax: numero(fw.espesorMax),
      diametroMin: numero(fw.diametroMin), diametroMax: numero(fw.diametroMax),
      posiciones: opcional(fw.posiciones),
      tipoJunta: opcional(fw.tipoJunta),
      precalentamientoMin: numero(fw.precalentamientoMin),
      interpasadaMax: numero(fw.interpasadaMax),
      requierePwht: fw.requierePwht,
      estado: fw.estado,
      pqrIds: fw.pqrIds,
      // Las pasadas sin nombre se descartan: son filas que se agregaron y no se usaron.
      pasadas: fw.pasadas.filter((p) => p.pasada.trim()).map((p, i) => ({
        orden: i + 1,
        pasada: p.pasada.trim(),
        proceso: opcional(p.proceso),
        clasificacionAporte: opcional(p.clasificacionAporte),
        diametroAporte: numero(p.diametroAporte),
        amperajeMin: numero(p.amperajeMin), amperajeMax: numero(p.amperajeMax),
        voltajeMin: numero(p.voltajeMin), voltajeMax: numero(p.voltajeMax),
        velocidadMin: numero(p.velocidadMin), velocidadMax: numero(p.velocidadMax),
        polaridad: opcional(p.polaridad),
        progresion: opcional(p.progresion),
      })),
    }
    try {
      if (fw.id) await actualizarW.mutateAsync({ id: fw.id, ...payload })
      else await crearW.mutateAsync(payload)
      setFw(null)
    } catch (e) { setError((e as Error).message) }
  }

  async function guardarPqr() {
    if (!fp) return
    setError(null)
    const payload = { codigo: fp.codigo.trim(), norma: opcional(fp.norma), fecha: fp.fecha || null, descripcion: opcional(fp.descripcion) }
    try {
      if (fp.id) await actualizarP.mutateAsync({ id: fp.id, ...payload })
      else await crearP.mutateAsync(payload)
      setFp(null)
    } catch (e) { setError((e as Error).message) }
  }

  function setPasada(i: number, campo: keyof FilaPasada, valor: string) {
    if (!fw) return
    setFw({ ...fw, pasadas: fw.pasadas.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)) })
  }

  async function confirmarBorrado() {
    if (!aBorrar) return
    setError(null)
    try {
      if (aBorrar.tipo === "wps") await borrarW.mutateAsync(aBorrar.id)
      else await borrarP.mutateAsync(aBorrar.id)
      setABorrar(null)
    } catch (e) { setError((e as Error).message) }
  }

  const celda = "h-8 px-1.5 text-xs"

  return (
    <div className="space-y-8">
      {/* ── WPS ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <Encabezado
          titulo="Procedimientos de soldadura (WPS)"
          descripcion="Cada WPS con sus rangos y los PQR que lo respaldan. Los rangos eléctricos van por pasada: son contra los que se va a validar el control de parámetros en campo."
        >
          <Button className="gap-2" disabled={!parametros} onClick={() => editarWps()}>
            <Plus className="h-4 w-4" /> Nuevo WPS
          </Button>
        </Encabezado>

        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36 font-semibold text-gray-700">WPS</TableHead>
                <TableHead className="font-semibold text-gray-700">Procesos</TableHead>
                <TableHead className="font-semibold text-gray-700">Espesor / Diámetro</TableHead>
                <TableHead className="font-semibold text-gray-700">Posiciones</TableHead>
                <TableHead className="font-semibold text-gray-700">PQR</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Estado</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wps.isLoading || listaW.length === 0 ? (
                <FilaVacia columnas={7} cargando={wps.isLoading} vacio="No hay procedimientos cargados." />
              ) : listaW.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono font-medium">
                    {w.codigo}
                    <span className="block text-xs font-sans font-normal text-muted-foreground">rev. {w.revision}{w.norma ? ` · ${w.norma}` : ""}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {w.procesos}
                    {(w.pasadas?.length ?? 0) > 0 && <span className="block text-xs text-muted-foreground">{w.pasadas!.length} pasadas</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {rango(w.espesorMin, w.espesorMax, "mm")}
                    <span className="block text-xs text-muted-foreground">Ø {rango(w.diametroMin, w.diametroMax, "pulg")}</span>
                  </TableCell>
                  <TableCell className="text-sm">{w.posiciones || "—"}</TableCell>
                  <TableCell className="text-sm">{w.pqrsDetalle.map((p) => p.codigo).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTILO_ESTADO[w.estado]}`}>{ESTADO_WPS_LABEL[w.estado]}</span>
                    {w.enUso && <span className="block text-xs text-muted-foreground mt-0.5">en la matriz</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <BotonArchivo tipo="Wps" id={w.id} tieneArchivo={w.tieneArchivo} nombre={w.archivoNombre} puedeSubir={parametros} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} onClick={() => editarWps(w)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros || w.enUso}
                      title={w.enUso ? "La matriz de soldadura lo asigna. Si lo reemplazó otra revisión, marcalo obsoleto después de cambiarlo en la matriz." : "Eliminar"}
                      onClick={() => { setError(null); setABorrar({ tipo: "wps", id: w.id, texto: `${w.codigo} rev. ${w.revision}` }) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── PQR ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <Encabezado
          titulo="Registros de calificación (PQR)"
          descripcion="El ensayo que respalda a uno o varios WPS. Se vinculan desde la edición de cada WPS."
        >
          <Button className="gap-2" variant="outline" disabled={!parametros}
            onClick={() => { setError(null); setFp({ codigo: "", norma: "ASME IX", fecha: "", descripcion: "" }) }}>
            <Plus className="h-4 w-4" /> Nuevo PQR
          </Button>
        </Encabezado>

        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36 font-semibold text-gray-700">PQR</TableHead>
                <TableHead className="w-32 font-semibold text-gray-700">Norma</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Fecha</TableHead>
                <TableHead className="font-semibold text-gray-700">Respalda a</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pqrs.isLoading || listaP.length === 0 ? (
                <FilaVacia columnas={5} cargando={pqrs.isLoading} vacio="No hay PQR cargados." />
              ) : listaP.map((p: Pqr) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium">{p.codigo}</TableCell>
                  <TableCell className="text-sm">{p.norma || "—"}</TableCell>
                  <TableCell className="tabular-nums">{fechaCorta(p.fecha)}</TableCell>
                  <TableCell className="text-sm">{p.wps.join(", ") || <span className="text-muted-foreground">Ningún WPS</span>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <BotonArchivo tipo="Pqr" id={p.id} tieneArchivo={p.tieneArchivo} nombre={p.archivoNombre} puedeSubir={parametros} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} title="Editar"
                      onClick={() => { setError(null); setFp({ id: p.id, codigo: p.codigo, norma: p.norma ?? "", fecha: soloFecha(p.fecha), descripcion: p.descripcion ?? "" }) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros || p.wps.length > 0}
                      title={p.wps.length > 0 ? "Respalda a un WPS: sacalo primero del WPS." : "Eliminar"}
                      onClick={() => { setError(null); setABorrar({ tipo: "pqr", id: p.id, texto: p.codigo }) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Sheet de WPS ───────────────────────────────────────────────── */}
      <Sheet open={fw !== null} onOpenChange={(v) => !v && setFw(null)}>
        <SheetContent className="w-full sm:max-w-4xl! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fw?.id ? `Editar ${fw.codigo} rev. ${fw.revision}` : "Nuevo WPS"}</SheetTitle>
            <SheetDescription>Para una revisión nueva, creá otro WPS con el mismo código y la revisión siguiente, y marcá el anterior como obsoleto.</SheetDescription>
          </SheetHeader>
          {fw && (
            <div className="mt-6 px-4 space-y-4 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Campo label="Código"><Input value={fw.codigo} onChange={(e) => setFw({ ...fw, codigo: e.target.value })} className="font-mono" /></Campo>
                <Campo label="Revisión"><Input value={fw.revision} onChange={(e) => setFw({ ...fw, revision: e.target.value })} className="font-mono" /></Campo>
                <Campo label="Norma"><Input value={fw.norma} onChange={(e) => setFw({ ...fw, norma: e.target.value })} /></Campo>
                <Campo label="Estado">
                  <select value={fw.estado} onChange={(e) => setFw({ ...fw, estado: Number(e.target.value) as EstadoWps })} className={CLASE_SELECT}>
                    {Object.entries(ESTADO_WPS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Campo>
                <Campo label="Procesos" className="col-span-2"><Input value={fw.procesos} onChange={(e) => setFw({ ...fw, procesos: e.target.value })} placeholder="GTAW + SMAW" /></Campo>
                <Campo label="P-numbers"><Input value={fw.pNumbers} onChange={(e) => setFw({ ...fw, pNumbers: e.target.value })} placeholder="P1 a P1" /></Campo>
                <Campo label="Tipo de junta"><Input value={fw.tipoJunta} onChange={(e) => setFw({ ...fw, tipoJunta: e.target.value })} placeholder="BW, FW" /></Campo>
                <Campo label="Espesor mín. (mm)"><Input inputMode="decimal" value={fw.espesorMin} onChange={(e) => setFw({ ...fw, espesorMin: e.target.value })} /></Campo>
                <Campo label="Espesor máx. (mm)"><Input inputMode="decimal" value={fw.espesorMax} onChange={(e) => setFw({ ...fw, espesorMax: e.target.value })} /></Campo>
                <Campo label="Diámetro mín. (pulg)"><Input inputMode="decimal" value={fw.diametroMin} onChange={(e) => setFw({ ...fw, diametroMin: e.target.value })} /></Campo>
                <Campo label="Diámetro máx. (pulg)"><Input inputMode="decimal" value={fw.diametroMax} onChange={(e) => setFw({ ...fw, diametroMax: e.target.value })} /></Campo>
                <Campo label="Posiciones"><Input value={fw.posiciones} onChange={(e) => setFw({ ...fw, posiciones: e.target.value })} placeholder="Todas" /></Campo>
                <Campo label="Precalentamiento mín. (°C)"><Input inputMode="decimal" value={fw.precalentamientoMin} onChange={(e) => setFw({ ...fw, precalentamientoMin: e.target.value })} /></Campo>
                <Campo label="Entre pasadas máx. (°C)"><Input inputMode="decimal" value={fw.interpasadaMax} onChange={(e) => setFw({ ...fw, interpasadaMax: e.target.value })} /></Campo>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none pt-6">
                  <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={fw.requierePwht} onChange={(e) => setFw({ ...fw, requierePwht: e.target.checked })} />
                  Requiere PWHT
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Pasadas</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setFw({ ...fw, pasadas: [...fw.pasadas, { ...PASADA_VACIA }] })}>
                    <Plus className="h-3.5 w-3.5" /> Pasada
                  </Button>
                </div>
                <div className="mt-2 overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-muted-foreground">
                      <tr className="text-left">
                        <th className="px-1.5 py-1 font-medium">Pasada</th>
                        <th className="px-1.5 py-1 font-medium">Proceso</th>
                        <th className="px-1.5 py-1 font-medium">Aporte</th>
                        <th className="px-1.5 py-1 font-medium">Ø mm</th>
                        <th className="px-1.5 py-1 font-medium" colSpan={2}>Amperaje (A)</th>
                        <th className="px-1.5 py-1 font-medium" colSpan={2}>Voltaje (V)</th>
                        <th className="px-1.5 py-1 font-medium" colSpan={2}>Velocidad (mm/min)</th>
                        <th className="px-1.5 py-1 font-medium">Polaridad</th>
                        <th className="px-1.5 py-1 font-medium">Progresión</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {fw.pasadas.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1"><Input className={`${celda} w-24`} value={p.pasada} onChange={(e) => setPasada(i, "pasada", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-16 uppercase`} value={p.proceso} onChange={(e) => setPasada(i, "proceso", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-20`} value={p.clasificacionAporte} onChange={(e) => setPasada(i, "clasificacionAporte", e.target.value)} placeholder="E7018" /></td>
                          <td className="p-1"><Input className={`${celda} w-12`} inputMode="decimal" value={p.diametroAporte} onChange={(e) => setPasada(i, "diametroAporte", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-12`} inputMode="decimal" placeholder="mín" value={p.amperajeMin} onChange={(e) => setPasada(i, "amperajeMin", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-12`} inputMode="decimal" placeholder="máx" value={p.amperajeMax} onChange={(e) => setPasada(i, "amperajeMax", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-12`} inputMode="decimal" placeholder="mín" value={p.voltajeMin} onChange={(e) => setPasada(i, "voltajeMin", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-12`} inputMode="decimal" placeholder="máx" value={p.voltajeMax} onChange={(e) => setPasada(i, "voltajeMax", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-14`} inputMode="decimal" placeholder="mín" value={p.velocidadMin} onChange={(e) => setPasada(i, "velocidadMin", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-14`} inputMode="decimal" placeholder="máx" value={p.velocidadMax} onChange={(e) => setPasada(i, "velocidadMax", e.target.value)} /></td>
                          <td className="p-1"><Input className={`${celda} w-14`} value={p.polaridad} onChange={(e) => setPasada(i, "polaridad", e.target.value)} placeholder="CC+" /></td>
                          <td className="p-1"><Input className={`${celda} w-24`} value={p.progresion} onChange={(e) => setPasada(i, "progresion", e.target.value)} placeholder="Ascendente" /></td>
                          <td className="p-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Quitar" onClick={() => setFw({ ...fw, pasadas: fw.pasadas.filter((_, j) => j !== i) })}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-1">El orden de las filas es el orden de las pasadas. Las filas sin nombre no se guardan.</p>
              </div>

              <div>
                <p className="text-sm font-medium">PQR que lo respaldan</p>
                {listaP.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">No hay PQR cargados todavía.</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {listaP.map((p) => (
                      <label key={p.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                        <input
                          type="checkbox" className="h-4 w-4 accent-blue-600"
                          checked={fw.pqrIds.includes(p.id)}
                          onChange={(e) => setFw({ ...fw, pqrIds: e.target.checked ? [...fw.pqrIds, p.id] : fw.pqrIds.filter((x) => x !== p.id) })}
                        />
                        <span className="font-mono">{p.codigo}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2 max-w-md">
                <Button className="flex-1" onClick={guardarWps} disabled={!fw.codigo.trim() || !fw.procesos.trim() || crearW.isPending || actualizarW.isPending}>
                  {crearW.isPending || actualizarW.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setFw(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet de PQR ───────────────────────────────────────────────── */}
      <Sheet open={fp !== null} onOpenChange={(v) => !v && setFp(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fp?.id ? "Editar PQR" : "Nuevo PQR"}</SheetTitle>
            <SheetDescription>El PDF se sube desde la lista, una vez guardado.</SheetDescription>
          </SheetHeader>
          {fp && (
            <div className="mt-6 px-4 space-y-3">
              <Campo label="Código"><Input value={fp.codigo} onChange={(e) => setFp({ ...fp, codigo: e.target.value })} className="font-mono" /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Norma"><Input value={fp.norma} onChange={(e) => setFp({ ...fp, norma: e.target.value })} /></Campo>
                <Campo label="Fecha"><Input type="date" value={fp.fecha} onChange={(e) => setFp({ ...fp, fecha: e.target.value })} /></Campo>
              </div>
              <Campo label="Descripción"><Textarea rows={3} value={fp.descripcion} onChange={(e) => setFp({ ...fp, descripcion: e.target.value })} /></Campo>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardarPqr} disabled={!fp.codigo.trim() || crearP.isPending || actualizarP.isPending}>
                  {crearP.isPending || actualizarP.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setFp(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo={aBorrar?.tipo === "wps" ? "Eliminar WPS" : "Eliminar PQR"}
        descripcion={<>¿Eliminar <strong>{aBorrar?.texto}</strong>?</>}
        pendiente={borrarW.isPending || borrarP.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={confirmarBorrado}
      />
    </div>
  )
}
