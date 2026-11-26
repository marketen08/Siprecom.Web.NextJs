"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Plus, X, XCircle } from "lucide-react"

import { clases as apiClases, soldadores as apiSoldadores, useResolverMatriz, wps as apiWps } from "@/features/soldadura/api/use-soldadura"
import { lotes as apiLotes, piezas as apiPiezas, useCreateJunta, useUpdateJunta, useValidarSoldador } from "@/features/soldadura/api/use-juntas"
import { EstadoWps, soloFecha, type ResultadoMatriz } from "@/features/soldadura/types"
import {
  EstadoLote, PASADA_LABEL, PasadaJunta, ResultadoHabilitacion, TIPO_PIEZA_LABEL, UbicacionJunta,
  type Habilitacion, type Junta, type Linea,
} from "@/features/soldadura/types-juntas"
import { CLASE_SELECT, Campo, ErrorTexto, numero, opcional, texto } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface FilaSoldador {
  clave: number
  soldadorProyectoId: string
  pasada: PasadaJunta
  proceso: string
  forzar: boolean
  motivoForzado: string
  validacion: Habilitacion | null
}

interface Form {
  id?: string
  lineaId: string
  hoja: string
  numero: string
  isometrico: string
  revisionIsometrico: string
  tipoJunta: string
  diametro: string
  schedule: string
  espesor: string
  material: string
  ubicacion: UbicacionJunta
  progresiva: string
  claseId: string
  wpsId: string
  piezaAId: string
  piezaBId: string
  fechaSoldadura: string
  observaciones: string
  loteIds: string[]
  soldadores: FilaSoldador[]
}

let siguienteClave = 1

/** Estado inicial del formulario: vacío para una línea, o el de una junta existente. */
export function formDeJunta(linea: Linea, j?: Junta): Form {
  return j ? {
    id: j.id, lineaId: j.lineaId, hoja: j.hoja ?? "", numero: j.numero, isometrico: j.isometrico ?? "",
    revisionIsometrico: j.revisionIsometrico ?? "", tipoJunta: j.tipoJunta ?? "", diametro: texto(j.diametro),
    schedule: j.schedule ?? "", espesor: texto(j.espesor), material: j.material ?? "", ubicacion: j.ubicacion,
    progresiva: j.progresiva ?? "",
    // Si la junta tiene la clase de su línea, se muestra "de la línea": así un cambio
    // de clase en la línea no queda pisado por una copia.
    claseId: j.claseId && j.claseId !== linea.claseId ? j.claseId : "",
    wpsId: j.origenWps === 2 ? (j.wpsId ?? "") : "",
    piezaAId: j.piezaAId ?? "", piezaBId: j.piezaBId ?? "", fechaSoldadura: soloFecha(j.fechaSoldadura),
    observaciones: j.observaciones ?? "", loteIds: j.lotes.map((l) => l.id),
    soldadores: j.soldadores.map((s) => ({
      clave: siguienteClave++, soldadorProyectoId: s.soldadorProyectoId, pasada: s.pasada, proceso: "",
      forzar: s.forzar, motivoForzado: s.motivoForzado ?? "", validacion: null,
    })),
  } : {
    lineaId: linea.id, hoja: "", numero: "", isometrico: "", revisionIsometrico: "", tipoJunta: "BW", diametro: "",
    schedule: "", espesor: "", material: "", ubicacion: UbicacionJunta.Obra, progresiva: "", claseId: "", wpsId: "",
    piezaAId: "", piezaBId: "", fechaSoldadura: "", observaciones: "", loteIds: [], soldadores: [],
  }
}

/**
 * Alta y edición de una junta. Mientras se carga muestra lo que va a decidir el
 * servidor —qué WPS da la matriz, si cada soldador está habilitado— para que nadie
 * se entere al guardar. El servidor vuelve a validar todo: esto es solo anticipo.
 */
export function JuntaSheet({ linea, inicial, onCerrar }: { linea: Linea; inicial: Form; onCerrar: () => void }) {
  // Se monta de nuevo cada vez que se abre (la página lo renderiza solo mientras edita),
  // así que el estado inicial alcanza y no hace falta sincronizarlo.
  const [form, setForm] = useState<Form | null>(inicial)
  const [error, setError] = useState<string | null>(null)

  const clases = apiClases.useList()
  const wps = apiWps.useList()
  const piezas = apiPiezas.useList()
  const lotes = apiLotes.useList()
  const soldadores = apiSoldadores.useList()
  const crear = useCreateJunta()
  const actualizar = useUpdateJunta()
  const resolver = useResolverMatriz()
  const validar = useValidarSoldador()
  const [matriz, setMatriz] = useState<ResultadoMatriz | null>(null)

  const claseEfectiva = form?.claseId || linea.claseId || ""
  const materialEfectivo = form?.material || (piezas.data ?? []).find((p) => p.id === form?.piezaAId)?.material || ""

  // ── Qué WPS da la matriz con los datos cargados ──────────────────────
  const claveMatriz = form ? [claseEfectiva, materialEfectivo, form.tipoJunta, form.diametro, form.espesor].join("|") : ""
  useEffect(() => {
    if (!form || !claseEfectiva) { setMatriz(null); return }
    const t = setTimeout(() => {
      resolver.mutate(
        { claseId: claseEfectiva, material: opcional(materialEfectivo), tipoJunta: opcional(form.tipoJunta), diametro: numero(form.diametro), espesor: numero(form.espesor) },
        { onSuccess: setMatriz, onError: () => setMatriz(null) },
      )
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMatriz])

  const wpsParaValidar = form?.wpsId || matriz?.wpsId || null

  // ── Validación de cada soldador ──────────────────────────────────────
  const claveValidacion = form
    ? [wpsParaValidar, form.diametro, form.espesor, form.fechaSoldadura, ...form.soldadores.map((s) => `${s.clave}:${s.soldadorProyectoId}:${s.pasada}:${s.proceso}`)].join("|")
    : ""
  useEffect(() => {
    if (!form) return
    const t = setTimeout(() => {
      form.soldadores.forEach((s) => {
        if (!s.soldadorProyectoId) return
        validar.mutate(
          {
            soldadorProyectoId: s.soldadorProyectoId, pasada: s.pasada, proceso: opcional(s.proceso), wpsId: wpsParaValidar,
            diametro: numero(form.diametro), espesor: numero(form.espesor), fecha: form.fechaSoldadura || null, juntaId: form.id ?? null,
          },
          { onSuccess: (v) => setForm((f) => f && { ...f, soldadores: f.soldadores.map((x) => (x.clave === s.clave ? { ...x, validacion: v } : x)) }) },
        )
      })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveValidacion])

  const piezasOrdenadas = useMemo(() => (piezas.data ?? []), [piezas.data])
  const lotesUsables = (lotes.data ?? []).filter((l) => l.estado === EstadoLote.Liberado || form?.loteIds.includes(l.id))
  const wpsElegibles = (wps.data ?? []).filter((w) => w.estado !== EstadoWps.Obsoleto || w.id === form?.wpsId)

  if (!form) return null

  function setSoldador(clave: number, cambios: Partial<FilaSoldador>) {
    setForm((f) => f && { ...f, soldadores: f.soldadores.map((s) => (s.clave === clave ? { ...s, ...cambios, validacion: "validacion" in cambios ? cambios.validacion ?? null : null } : s)) })
  }

  async function guardar() {
    if (!form) return
    setError(null)
    const payload = {
      lineaId: form.lineaId,
      hoja: opcional(form.hoja),
      numero: form.numero.trim(),
      isometrico: opcional(form.isometrico),
      revisionIsometrico: opcional(form.revisionIsometrico),
      tipoJunta: opcional(form.tipoJunta),
      diametro: numero(form.diametro),
      schedule: opcional(form.schedule),
      espesor: numero(form.espesor),
      material: opcional(form.material),
      ubicacion: form.ubicacion,
      progresiva: opcional(form.progresiva),
      claseId: form.claseId || null,
      wpsId: form.wpsId || null,
      piezaAId: form.piezaAId || null,
      piezaBId: form.piezaBId || null,
      fechaSoldadura: form.fechaSoldadura || null,
      observaciones: opcional(form.observaciones),
      loteIds: form.loteIds,
      soldadores: form.soldadores.filter((s) => s.soldadorProyectoId).map((s) => ({
        soldadorProyectoId: s.soldadorProyectoId, pasada: s.pasada, proceso: opcional(s.proceso),
        forzar: s.forzar, motivoForzado: opcional(s.motivoForzado),
      })),
    }
    try {
      if (form.id) await actualizar.mutateAsync({ id: form.id, ...payload })
      else await crear.mutateAsync(payload)
      onCerrar()
    } catch (e) { setError((e as Error).message) }
  }

  const guardando = crear.isPending || actualizar.isPending
  const bloqueado = form.soldadores.some((s) => s.validacion?.resultado === ResultadoHabilitacion.NoHabilitado && (!s.forzar || !s.motivoForzado.trim()))
  const claseLinea = (clases.data ?? []).find((c) => c.id === linea.claseId)

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent className="w-full sm:max-w-3xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{form.id ? "Editar junta" : "Nueva junta"} · {linea.codigo}</SheetTitle>
          <SheetDescription>
            Identificación: <strong className="font-mono">{linea.codigo}{form.hoja.trim() ? `-H${form.hoja.trim().toUpperCase()}` : ""}-{form.numero.trim().toUpperCase().replace(/[\s-]/g, "") || "?"}</strong>.
            El WPS lo da la matriz si no elegís otro; cada soldador se valida a la fecha de soldadura.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 px-4 pb-6 space-y-5">
          {/* ── Identificación y datos de la junta ─────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo label="Hoja"><Input value={form.hoja} onChange={(e) => setForm({ ...form, hoja: e.target.value })} /></Campo>
            <Campo label="Junta N°"><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="font-mono" placeholder="12" /></Campo>
            <Campo label="Isométrico"><Input value={form.isometrico} onChange={(e) => setForm({ ...form, isometrico: e.target.value })} placeholder={linea.isometrico ?? ""} /></Campo>
            <Campo label="Rev. iso"><Input value={form.revisionIsometrico} onChange={(e) => setForm({ ...form, revisionIsometrico: e.target.value })} /></Campo>
            <Campo label="Tipo">
              <select value={form.tipoJunta} onChange={(e) => setForm({ ...form, tipoJunta: e.target.value })} className={CLASE_SELECT}>
                <option value="">—</option>
                {["BW", "FW", "SW"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Campo>
            <Campo label="Ø (pulg)"><Input inputMode="decimal" value={form.diametro} onChange={(e) => setForm({ ...form, diametro: e.target.value })} /></Campo>
            <Campo label="Schedule"><Input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></Campo>
            <Campo label="Espesor (mm)"><Input inputMode="decimal" value={form.espesor} onChange={(e) => setForm({ ...form, espesor: e.target.value })} /></Campo>
            <Campo label="Ubicación">
              <select value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: Number(e.target.value) as UbicacionJunta })} className={CLASE_SELECT}>
                <option value={UbicacionJunta.Prefabricado}>Prefabricado (P)</option>
                <option value={UbicacionJunta.Obra}>Obra (O)</option>
              </select>
            </Campo>
            <Campo label="Material" className="col-span-2" ayuda={!form.material && materialEfectivo ? `Vacío: se usa el de la pieza A (${materialEfectivo}).` : undefined}>
              <Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            </Campo>
            <Campo label="Progresiva (ductos)"><Input value={form.progresiva} onChange={(e) => setForm({ ...form, progresiva: e.target.value })} /></Campo>
          </div>

          {/* ── Clase y WPS ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Clase">
              <select value={form.claseId} onChange={(e) => setForm({ ...form, claseId: e.target.value })} className={CLASE_SELECT}>
                <option value="">{claseLinea ? `De la línea (${claseLinea.codigo})` : "Sin clase"}</option>
                {(clases.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
              </select>
            </Campo>
            <Campo label="WPS">
              <select value={form.wpsId} onChange={(e) => setForm({ ...form, wpsId: e.target.value })} className={CLASE_SELECT}>
                <option value="">Según la matriz</option>
                {wpsElegibles.map((w) => <option key={w.id} value={w.id}>{w.codigo} rev. {w.revision}</option>)}
              </select>
            </Campo>
          </div>
          <AvisoMatriz matriz={matriz} elegido={form.wpsId} sinClase={!claseEfectiva} />

          {/* ── Materiales ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {(["piezaAId", "piezaBId"] as const).map((campo, i) => (
              <Campo key={campo} label={i === 0 ? "Pieza A" : "Pieza B"}>
                <select value={form[campo]} onChange={(e) => setForm({ ...form, [campo]: e.target.value })} className={CLASE_SELECT}>
                  <option value="">—</option>
                  {piezasOrdenadas.map((p) => (
                    <option key={p.id} value={p.id}>{TIPO_PIEZA_LABEL[p.tipo]} {p.codigo}{p.coladaEfectiva ? ` · colada ${p.coladaEfectiva}` : ""}</option>
                  ))}
                </select>
              </Campo>
            ))}
          </div>

          {/* ── Soldadura ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <Campo label="Fecha de soldadura" className="w-48" ayuda="Sin fecha la junta queda registrada, no soldada.">
                <Input type="date" value={form.fechaSoldadura} onChange={(e) => setForm({ ...form, fechaSoldadura: e.target.value })} />
              </Campo>
              <Button size="sm" variant="outline" className="gap-1"
                onClick={() => setForm({ ...form, soldadores: [...form.soldadores, { clave: siguienteClave++, soldadorProyectoId: "", pasada: form.soldadores.length === 0 ? PasadaJunta.Raiz : PasadaJunta.RellenoTerminacion, proceso: "", forzar: false, motivoForzado: "", validacion: null }] })}>
                <Plus className="h-3.5 w-3.5" /> Soldador
              </Button>
            </div>

            {form.soldadores.length === 0 && <p className="text-xs text-muted-foreground">Sin soldadores asignados.</p>}
            {form.soldadores.map((s) => (
              <div key={s.clave} className="rounded-md border p-3 space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <Campo label="Soldador" className="flex-1 min-w-48">
                    <select value={s.soldadorProyectoId} onChange={(e) => setSoldador(s.clave, { soldadorProyectoId: e.target.value })} className={CLASE_SELECT}>
                      <option value="">Elegí…</option>
                      {(soldadores.data ?? []).map((h) => <option key={h.id} value={h.id}>{h.cuno} — {h.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Pasada" className="w-48">
                    <select value={s.pasada} onChange={(e) => setSoldador(s.clave, { pasada: Number(e.target.value) as PasadaJunta })} className={CLASE_SELECT}>
                      {Object.entries(PASADA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Campo>
                  <Campo label="Proceso" className="w-28">
                    <Input value={s.proceso} onChange={(e) => setSoldador(s.clave, { proceso: e.target.value })} className="uppercase" placeholder={s.validacion?.proceso ?? "del WPS"} />
                  </Campo>
                  <Button size="icon" variant="ghost" className="h-9 w-9" title="Quitar"
                    onClick={() => setForm({ ...form, soldadores: form.soldadores.filter((x) => x.clave !== s.clave) })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ResultadoValidacion v={s.validacion} />
                {s.validacion?.resultado === ResultadoHabilitacion.NoHabilitado && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                      <input type="checkbox" className="h-4 w-4 accent-red-600" checked={s.forzar}
                        onChange={(e) => setSoldador(s.clave, { forzar: e.target.checked, validacion: s.validacion })} />
                      Guardar igual
                    </label>
                    {s.forzar && (
                      <Input className="flex-1 min-w-60 h-8 text-sm" placeholder="Motivo (obligatorio)" value={s.motivoForzado}
                        onChange={(e) => setSoldador(s.clave, { motivoForzado: e.target.value, validacion: s.validacion })} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Lotes de aporte ────────────────────────────────────────── */}
          <div>
            <p className="text-sm font-medium">Lotes de aporte</p>
            {lotesUsables.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">No hay lotes cargados.</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {lotesUsables.map((l) => (
                  <label key={l.id} className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.loteIds.includes(l.id)}
                      onChange={(e) => setForm({ ...form, loteIds: e.target.checked ? [...form.loteIds, l.id] : form.loteIds.filter((x) => x !== l.id) })} />
                    <span className="font-mono">{l.clasificacion}</span> <span className="text-muted-foreground">lote {l.lote}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <Campo label="Observaciones"><Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Campo>

          <ErrorTexto error={error} />
          <div className="flex gap-2 pt-2 max-w-md">
            <Button className="flex-1" onClick={guardar} disabled={!form.numero.trim() || guardando || bloqueado}
              title={bloqueado ? "Hay un soldador no habilitado: quitalo o marcá 'Guardar igual' con el motivo." : undefined}>
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onCerrar}>Cancelar</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AvisoMatriz({ matriz, elegido, sinClase }: { matriz: ResultadoMatriz | null; elegido: string; sinClase: boolean }) {
  if (sinClase) return <p className="text-xs text-amber-700 -mt-2">Sin clase no se puede consultar la matriz: el WPS hay que elegirlo a mano.</p>
  if (!matriz) return null
  if (!matriz.encontrado) return <p className="text-xs text-amber-700 -mt-2">{matriz.motivo}</p>
  if (elegido && elegido !== matriz.wpsId)
    return <p className="text-xs text-amber-700 -mt-2">La matriz asignaría <strong>{matriz.wpsCodigo}</strong> rev. {matriz.wpsRevision}: la junta va a quedar marcada como distinta de la matriz.</p>
  return <p className="text-xs text-green-700 -mt-2">La matriz asigna <strong>{matriz.wpsCodigo}</strong> rev. {matriz.wpsRevision}.</p>
}

function ResultadoValidacion({ v }: { v: Habilitacion | null }) {
  if (!v) return null
  const estilos = {
    [ResultadoHabilitacion.Habilitado]: { icono: <CheckCircle2 className="h-4 w-4 shrink-0" />, clase: "text-green-700 bg-green-50 border-green-200" },
    [ResultadoHabilitacion.ConAdvertencia]: { icono: <AlertTriangle className="h-4 w-4 shrink-0" />, clase: "text-amber-800 bg-amber-50 border-amber-200" },
    [ResultadoHabilitacion.NoHabilitado]: { icono: <XCircle className="h-4 w-4 shrink-0" />, clase: "text-red-700 bg-red-50 border-red-200" },
  }[v.resultado]
  return (
    <div className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs ${estilos.clase}`}>
      {estilos.icono}<span>{v.proceso && <strong className="mr-1">{v.proceso}:</strong>}{v.detalle}</span>
    </div>
  )
}
