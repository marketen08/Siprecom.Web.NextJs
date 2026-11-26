"use client"

import { useState } from "react"
import { Download, Pencil, Plus, Trash2 } from "lucide-react"

import { clases as apiClases, normas as apiNormas, useCargarNormasBase } from "@/features/soldadura/api/use-soldadura"
import { ACCION_TASA_LABEL, AccionTasaReparacion, type Clase, type Norma } from "@/features/soldadura/types"
import {
  CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia,
  numero, opcional, texto, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FormNorma {
  id?: string
  codigo: string
  descripcion: string
  ensayosAdicionalesPorRechazo: string
  rondasDeAmpliacion: string
  limiteTasaReparacion: string
  accionAlSuperarLimite: AccionTasaReparacion
  mesesContinuidad: string
}

interface FormClase {
  id?: string
  codigo: string
  descripcion: string
  normaDiseno: string
  normaEvaluacionId: string
  servicio: string
  porcentajeRT: string
  porcentajePT: string
  otrosEnsayos: string
  requierePwht: boolean
  presionPrueba: string
}

/**
 * Los parámetros que hacen que el módulo no dependa de una norma: cada norma lleva
 * sus reglas de muestreo y la continuidad de la calificación, y cada clase de cañería
 * dice con qué norma se evalúa y qué porcentaje de juntas va a ensayo.
 */
export default function NormasClasesPage() {
  const normas = apiNormas.useList()
  const clases = apiClases.useList()
  const crearN = apiNormas.useCreate()
  const actualizarN = apiNormas.useUpdate()
  const borrarN = apiNormas.useDelete()
  const crearC = apiClases.useCreate()
  const actualizarC = apiClases.useUpdate()
  const borrarC = apiClases.useDelete()
  const base = useCargarNormasBase()
  const { parametros } = usePermisosSoldadura()

  const [fn, setFn] = useState<FormNorma | null>(null)
  const [fcl, setFcl] = useState<FormClase | null>(null)
  const [aBorrar, setABorrar] = useState<{ tipo: "norma" | "clase"; id: string; codigo: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const listaN = normas.data ?? []
  const listaC = clases.data ?? []

  async function guardarNorma() {
    if (!fn) return
    setError(null)
    const payload = {
      codigo: fn.codigo.trim(),
      descripcion: opcional(fn.descripcion),
      ensayosAdicionalesPorRechazo: numero(fn.ensayosAdicionalesPorRechazo) ?? 2,
      rondasDeAmpliacion: numero(fn.rondasDeAmpliacion) ?? 2,
      limiteTasaReparacion: numero(fn.limiteTasaReparacion),
      accionAlSuperarLimite: fn.accionAlSuperarLimite,
      mesesContinuidad: numero(fn.mesesContinuidad) ?? 6,
    }
    try {
      if (fn.id) await actualizarN.mutateAsync({ id: fn.id, ...payload })
      else await crearN.mutateAsync(payload)
      setFn(null)
    } catch (e) { setError((e as Error).message) }
  }

  async function guardarClase() {
    if (!fcl) return
    setError(null)
    const payload = {
      codigo: fcl.codigo.trim(),
      descripcion: opcional(fcl.descripcion),
      normaDiseno: opcional(fcl.normaDiseno),
      normaEvaluacionId: fcl.normaEvaluacionId,
      servicio: opcional(fcl.servicio),
      porcentajeRT: numero(fcl.porcentajeRT),
      porcentajePT: numero(fcl.porcentajePT),
      otrosEnsayos: opcional(fcl.otrosEnsayos),
      requierePwht: fcl.requierePwht,
      presionPrueba: opcional(fcl.presionPrueba),
    }
    try {
      if (fcl.id) await actualizarC.mutateAsync({ id: fcl.id, ...payload })
      else await crearC.mutateAsync(payload)
      setFcl(null)
    } catch (e) { setError((e as Error).message) }
  }

  function editarNorma(n?: Norma) {
    setError(null)
    setFn(n ? {
      id: n.id, codigo: n.codigo, descripcion: n.descripcion ?? "",
      ensayosAdicionalesPorRechazo: String(n.ensayosAdicionalesPorRechazo), rondasDeAmpliacion: String(n.rondasDeAmpliacion),
      limiteTasaReparacion: texto(n.limiteTasaReparacion), accionAlSuperarLimite: n.accionAlSuperarLimite,
      mesesContinuidad: String(n.mesesContinuidad),
    } : {
      codigo: "", descripcion: "", ensayosAdicionalesPorRechazo: "2", rondasDeAmpliacion: "2",
      limiteTasaReparacion: "", accionAlSuperarLimite: AccionTasaReparacion.Avisar, mesesContinuidad: "6",
    })
  }

  function editarClase(c?: Clase) {
    setError(null)
    setFcl(c ? {
      id: c.id, codigo: c.codigo, descripcion: c.descripcion ?? "", normaDiseno: c.normaDiseno ?? "",
      normaEvaluacionId: c.normaEvaluacionId, servicio: c.servicio ?? "", porcentajeRT: texto(c.porcentajeRT),
      porcentajePT: texto(c.porcentajePT), otrosEnsayos: c.otrosEnsayos ?? "", requierePwht: c.requierePwht,
      presionPrueba: c.presionPrueba ?? "",
    } : {
      codigo: "", descripcion: "", normaDiseno: "ASME B31.3", normaEvaluacionId: listaN[0]?.id ?? "",
      servicio: "", porcentajeRT: "", porcentajePT: "", otrosEnsayos: "", requierePwht: false, presionPrueba: "",
    })
  }

  async function confirmarBorrado() {
    if (!aBorrar) return
    setError(null)
    try {
      if (aBorrar.tipo === "norma") await borrarN.mutateAsync(aBorrar.id)
      else await borrarC.mutateAsync(aBorrar.id)
      setABorrar(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-8">
      {/* ── Normas ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <Encabezado
          titulo="Normas"
          descripcion="Los parámetros de cada norma en este proyecto. Las de evaluación (ASME B31.3, API 1104) fijan el muestreo de ensayos; las de calificación (ASME IX, AWS D1.1) fijan los meses de continuidad de los soldadores. El contrato puede apartarse de la norma: por eso se ajustan acá."
        >
          {listaN.length === 0 && !normas.isLoading && (
            <Button variant="outline" className="gap-2" disabled={!parametros || base.isPending}
              onClick={() => base.mutate(undefined, { onError: (e) => setError((e as Error).message) })}>
              <Download className="h-4 w-4" /> Cargar normas base
            </Button>
          )}
          <Button className="gap-2" disabled={!parametros} onClick={() => editarNorma()}>
            <Plus className="h-4 w-4" /> Nueva norma
          </Button>
        </Encabezado>

        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36 font-semibold text-gray-700">Código</TableHead>
                <TableHead className="font-semibold text-gray-700">Muestreo por rechazo</TableHead>
                <TableHead className="font-semibold text-gray-700">Tasa de reparación</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700">Continuidad</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {normas.isLoading || listaN.length === 0 ? (
                <FilaVacia columnas={5} cargando={normas.isLoading} vacio="No hay normas. Cargá las normas base (ASME B31.3 y ASME IX) para empezar." />
              ) : listaN.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">
                    {n.codigo}
                    {n.enUso && <span className="ml-2 text-xs text-muted-foreground">en uso</span>}
                    {n.descripcion && <span className="block text-xs text-muted-foreground font-normal line-clamp-2">{n.descripcion}</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {n.ensayosAdicionalesPorRechazo} juntas más por rechazo, {n.rondasDeAmpliacion} rondas; después, el lote completo
                  </TableCell>
                  <TableCell className="text-sm">
                    {n.limiteTasaReparacion == null ? <span className="text-muted-foreground">Sin límite</span>
                      : <>Hasta {n.limiteTasaReparacion}% · {ACCION_TASA_LABEL[n.accionAlSuperarLimite]}</>}
                  </TableCell>
                  <TableCell className="tabular-nums">{n.mesesContinuidad} meses</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} onClick={() => editarNorma(n)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros || n.enUso}
                      title={n.enUso ? "Hay clases que la usan como norma de evaluación." : "Eliminar"}
                      onClick={() => { setError(null); setABorrar({ tipo: "norma", id: n.id, codigo: n.codigo }) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Clases ─────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <Encabezado
          titulo="Clases de cañería"
          descripcion="La clase de la especificación —o de la estructura, el ducto o el recipiente— fija la norma con que se evalúan los ensayos y el porcentaje de juntas que va a cada uno."
        >
          <Button className="gap-2" disabled={!parametros || listaN.length === 0}
            title={listaN.length === 0 ? "Primero cargá al menos una norma." : undefined}
            onClick={() => editarClase()}>
            <Plus className="h-4 w-4" /> Nueva clase
          </Button>
        </Encabezado>

        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28 font-semibold text-gray-700">Clase</TableHead>
                <TableHead className="font-semibold text-gray-700">Servicio</TableHead>
                <TableHead className="w-36 font-semibold text-gray-700">Evaluación</TableHead>
                <TableHead className="w-20 font-semibold text-gray-700 text-right">% RT</TableHead>
                <TableHead className="w-20 font-semibold text-gray-700 text-right">% PT</TableHead>
                <TableHead className="font-semibold text-gray-700">Otros</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clases.isLoading || listaC.length === 0 ? (
                <FilaVacia columnas={7} cargando={clases.isLoading} vacio="No hay clases cargadas." />
              ) : listaC.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">
                    {c.codigo}
                    {c.enUso && <span className="block text-xs font-sans font-normal text-muted-foreground">en la matriz</span>}
                  </TableCell>
                  <TableCell className="text-sm">{c.servicio || c.descripcion || "—"}</TableCell>
                  <TableCell className="text-sm">{c.normaEvaluacionCodigo}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.porcentajeRT ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.porcentajePT ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[c.requierePwht ? "PWHT" : null, c.otrosEnsayos, c.presionPrueba ? `Prueba ${c.presionPrueba}` : null].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} onClick={() => editarClase(c)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros || c.enUso}
                      title={c.enUso ? "La matriz de soldadura tiene filas de esta clase." : "Eliminar"}
                      onClick={() => { setError(null); setABorrar({ tipo: "clase", id: c.id, codigo: c.codigo }) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {!fn && !fcl && <ErrorTexto error={aBorrar ? null : error} />}

      {/* ── Sheet de norma ─────────────────────────────────────────────── */}
      <Sheet open={fn !== null} onOpenChange={(v) => !v && setFn(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fn?.id ? "Editar norma" : "Nueva norma"}</SheetTitle>
            <SheetDescription>Cambiar un parámetro cambia lo que se valida de acá en adelante; lo ya validado guarda contra qué versión se hizo.</SheetDescription>
          </SheetHeader>
          {fn && (
            <div className="mt-6 px-4 space-y-3">
              <Campo label="Código"><Input value={fn.codigo} onChange={(e) => setFn({ ...fn, codigo: e.target.value })} placeholder="ASME B31.3" /></Campo>
              <Campo label="Descripción"><Textarea rows={2} value={fn.descripcion} onChange={(e) => setFn({ ...fn, descripcion: e.target.value })} /></Campo>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Muestreo de ensayos</p>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Juntas extra por rechazo" ayuda="Del mismo soldador. B31.3: 2.">
                  <Input inputMode="numeric" value={fn.ensayosAdicionalesPorRechazo} onChange={(e) => setFn({ ...fn, ensayosAdicionalesPorRechazo: e.target.value })} />
                </Campo>
                <Campo label="Rondas antes del total" ayuda="B31.3: 2.">
                  <Input inputMode="numeric" value={fn.rondasDeAmpliacion} onChange={(e) => setFn({ ...fn, rondasDeAmpliacion: e.target.value })} />
                </Campo>
                <Campo label="Límite de reparación (%)" ayuda="Vacío = sin límite. La convención es 3%.">
                  <Input inputMode="decimal" value={fn.limiteTasaReparacion} onChange={(e) => setFn({ ...fn, limiteTasaReparacion: e.target.value })} />
                </Campo>
                <Campo label="Al superarlo">
                  <select value={fn.accionAlSuperarLimite} onChange={(e) => setFn({ ...fn, accionAlSuperarLimite: Number(e.target.value) as AccionTasaReparacion })} className={CLASE_SELECT}>
                    {Object.entries(ACCION_TASA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Campo>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Calificación de soldadores</p>
              <Campo label="Meses de continuidad" ayuda="Sin usar el proceso durante este tiempo, la calificación caduca. ASME IX y AWS D1.1: 6.">
                <Input inputMode="numeric" value={fn.mesesContinuidad} onChange={(e) => setFn({ ...fn, mesesContinuidad: e.target.value })} className="w-24" />
              </Campo>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardarNorma} disabled={!fn.codigo.trim() || crearN.isPending || actualizarN.isPending}>
                  {crearN.isPending || actualizarN.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setFn(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet de clase ─────────────────────────────────────────────── */}
      <Sheet open={fcl !== null} onOpenChange={(v) => !v && setFcl(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fcl?.id ? "Editar clase" : "Nueva clase"}</SheetTitle>
            <SheetDescription>La norma de evaluación decide las reglas de muestreo de las juntas de esta clase.</SheetDescription>
          </SheetHeader>
          {fcl && (
            <div className="mt-6 px-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Código"><Input value={fcl.codigo} onChange={(e) => setFcl({ ...fcl, codigo: e.target.value })} placeholder="A1A" className="font-mono" /></Campo>
                <Campo label="Norma de evaluación">
                  <select value={fcl.normaEvaluacionId} onChange={(e) => setFcl({ ...fcl, normaEvaluacionId: e.target.value })} className={CLASE_SELECT}>
                    {listaN.map((n) => <option key={n.id} value={n.id}>{n.codigo}</option>)}
                  </select>
                </Campo>
                <Campo label="Servicio" className="col-span-2"><Input value={fcl.servicio} onChange={(e) => setFcl({ ...fcl, servicio: e.target.value })} placeholder="Gas natural, agua de producción…" /></Campo>
                <Campo label="Norma de diseño"><Input value={fcl.normaDiseno} onChange={(e) => setFcl({ ...fcl, normaDiseno: e.target.value })} /></Campo>
                <Campo label="Presión de prueba"><Input value={fcl.presionPrueba} onChange={(e) => setFcl({ ...fcl, presionPrueba: e.target.value })} placeholder="15 kg/cm²" /></Campo>
                <Campo label="% RT / UT" ayuda="Ensayo volumétrico."><Input inputMode="decimal" value={fcl.porcentajeRT} onChange={(e) => setFcl({ ...fcl, porcentajeRT: e.target.value })} /></Campo>
                <Campo label="% PT / MT" ayuda="Ensayo superficial."><Input inputMode="decimal" value={fcl.porcentajePT} onChange={(e) => setFcl({ ...fcl, porcentajePT: e.target.value })} /></Campo>
                <Campo label="Otros ensayos" className="col-span-2"><Input value={fcl.otrosEnsayos} onChange={(e) => setFcl({ ...fcl, otrosEnsayos: e.target.value })} placeholder="PMI 100%, dureza en PWHT" /></Campo>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={fcl.requierePwht} onChange={(e) => setFcl({ ...fcl, requierePwht: e.target.checked })} />
                Requiere tratamiento térmico post soldadura (PWHT)
              </label>
              <Campo label="Descripción"><Textarea rows={2} value={fcl.descripcion} onChange={(e) => setFcl({ ...fcl, descripcion: e.target.value })} /></Campo>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardarClase} disabled={!fcl.codigo.trim() || !fcl.normaEvaluacionId || crearC.isPending || actualizarC.isPending}>
                  {crearC.isPending || actualizarC.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setFcl(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo={aBorrar?.tipo === "norma" ? "Eliminar norma" : "Eliminar clase"}
        descripcion={<>¿Eliminar <strong>{aBorrar?.codigo}</strong>?</>}
        pendiente={borrarN.isPending || borrarC.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={confirmarBorrado}
      />
    </div>
  )
}
