"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { piezas as api } from "@/features/soldadura/api/use-juntas"
import { TIPO_PIEZA_LABEL, TipoPieza, type Pieza } from "@/features/soldadura/types-juntas"
import {
  CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia, numero, opcional, texto, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Form {
  id?: string
  tipo: TipoPieza
  codigo: string
  descripcion: string
  material: string
  diametro: string
  serieSchedule: string
  espesor: string
  colada: string
  certificado: string
  piezaOrigenId: string
}

const VACIO: Form = {
  tipo: TipoPieza.Spool, codigo: "", descripcion: "", material: "", diametro: "", serieSchedule: "",
  espesor: "", colada: "", certificado: "", piezaOrigenId: "",
}

/**
 * Lo que se une con una soldadura: spools, tubos, niples, accesorios, planchas. Lo
 * que importa de cada pieza es su certificación —material, colada, certificado—: es
 * la "trazabilidad de materiales" del registro. Un niple hereda la del caño del que
 * se cortó.
 */
export default function PiezasPage() {
  const { data, isLoading } = api.useList()
  const crear = api.useCreate()
  const actualizar = api.useUpdate()
  const borrar = api.useDelete()
  const { padron } = usePermisosSoldadura()

  const [form, setForm] = useState<Form | null>(null)
  const [aBorrar, setABorrar] = useState<Pieza | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buscar, setBuscar] = useState("")
  const [tipo, setTipo] = useState<string>("")

  const todas = useMemo(() => data ?? [], [data])
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return todas.filter((p) =>
      (tipo === "" || p.tipo === Number(tipo)) &&
      (!q || [p.codigo, p.descripcion ?? "", p.coladaEfectiva ?? "", p.material ?? ""].some((v) => v.toLowerCase().includes(q))))
  }, [todas, buscar, tipo])
  // Origen: solo piezas madre (las que no salieron de otra), y nunca la misma.
  const origenes = todas.filter((p) => !p.piezaOrigenId && p.id !== form?.id)

  async function guardar() {
    if (!form) return
    setError(null)
    const payload = {
      tipo: form.tipo,
      codigo: form.codigo.trim(),
      descripcion: opcional(form.descripcion),
      material: opcional(form.material),
      diametro: numero(form.diametro),
      serieSchedule: opcional(form.serieSchedule),
      espesor: numero(form.espesor),
      colada: opcional(form.colada),
      certificado: opcional(form.certificado),
      piezaOrigenId: form.piezaOrigenId || null,
    }
    try {
      if (form.id) await actualizar.mutateAsync({ id: form.id, ...payload })
      else await crear.mutateAsync(payload)
      setForm(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Piezas"
        descripcion="Spools, tubos, niples y accesorios con su certificación. Es lo que va en la trazabilidad de materiales de cada junta. Un niple toma la colada y el certificado del caño del que se cortó (procedimiento 350-002, 6.8)."
      >
        <Button className="gap-2" disabled={!padron} onClick={() => { setError(null); setForm({ ...VACIO }) }}>
          <Plus className="h-4 w-4" /> Nueva pieza
        </Button>
      </Encabezado>

      <div className="flex flex-wrap gap-3">
        <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por código, descripción, material o colada" className="max-w-sm" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${CLASE_SELECT} w-40`}>
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_PIEZA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28 font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="font-semibold text-gray-700">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">Material</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Ø / SCH</TableHead>
              <TableHead className="font-semibold text-gray-700">Colada</TableHead>
              <TableHead className="font-semibold text-gray-700">Certificado</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || lista.length === 0 ? (
              <FilaVacia columnas={7} cargando={isLoading} vacio={todas.length ? "Ninguna pieza coincide." : "No hay piezas cargadas."} />
            ) : lista.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{TIPO_PIEZA_LABEL[p.tipo]}</TableCell>
                <TableCell className="font-mono font-medium">
                  {p.codigo}
                  {p.descripcion && <span className="block font-sans text-xs text-muted-foreground">{p.descripcion}</span>}
                  {p.piezaOrigenCodigo && <span className="block font-sans text-xs text-muted-foreground">cortada de {p.piezaOrigenCodigo}</span>}
                </TableCell>
                <TableCell className="text-sm">{p.material ?? "—"}</TableCell>
                <TableCell className="text-sm">{p.diametro != null ? `${p.diametro}"` : "—"}{p.serieSchedule ? ` · ${p.serieSchedule}` : ""}</TableCell>
                <TableCell className="text-sm">
                  {p.coladaEfectiva ?? "—"}
                  {p.heredada && !p.colada && p.coladaEfectiva && <span className="block text-xs text-muted-foreground">del caño madre</span>}
                </TableCell>
                <TableCell className="text-sm">{p.certificadoEfectivo ?? "—"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron} title="Editar"
                    onClick={() => {
                      setError(null)
                      setForm({
                        id: p.id, tipo: p.tipo, codigo: p.codigo, descripcion: p.descripcion ?? "", material: p.material ?? "",
                        diametro: texto(p.diametro), serieSchedule: p.serieSchedule ?? "", espesor: texto(p.espesor),
                        colada: p.colada ?? "", certificado: p.certificado ?? "", piezaOrigenId: p.piezaOrigenId ?? "",
                      })
                    }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!padron} title="Eliminar"
                    onClick={() => { setError(null); setABorrar(p) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{lista.length} piezas</p>

      <Sheet open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Editar pieza" : "Nueva pieza"}</SheetTitle>
            <SheetDescription>Si es un niple, elegí el caño del que se cortó: toma su colada y certificado cuando los dejás vacíos.</SheetDescription>
          </SheetHeader>
          {form && (
            <div className="mt-6 px-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Tipo">
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: Number(e.target.value) as TipoPieza })} className={CLASE_SELECT}>
                    {Object.entries(TIPO_PIEZA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Campo>
                <Campo label="Código"><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="font-mono" /></Campo>
                <Campo label="Descripción" className="col-span-2" ayuda="Como va en la trazabilidad: Caño, Codo 90°, Brida WN.">
                  <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                </Campo>
                <Campo label="Material" className="col-span-2"><Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="A106 Gr.B" /></Campo>
                <Campo label="Diámetro (pulg)"><Input inputMode="decimal" value={form.diametro} onChange={(e) => setForm({ ...form, diametro: e.target.value })} /></Campo>
                <Campo label="Serie / SCH"><Input value={form.serieSchedule} onChange={(e) => setForm({ ...form, serieSchedule: e.target.value })} /></Campo>
                <Campo label="Espesor (mm)"><Input inputMode="decimal" value={form.espesor} onChange={(e) => setForm({ ...form, espesor: e.target.value })} /></Campo>
                <Campo label="Colada"><Input value={form.colada} onChange={(e) => setForm({ ...form, colada: e.target.value })} /></Campo>
                <Campo label="Certificado" className="col-span-2"><Input value={form.certificado} onChange={(e) => setForm({ ...form, certificado: e.target.value })} /></Campo>
                <Campo label="Cortada de" className="col-span-2">
                  <select value={form.piezaOrigenId} onChange={(e) => setForm({ ...form, piezaOrigenId: e.target.value })} className={CLASE_SELECT}>
                    <option value="">No es un corte</option>
                    {origenes.map((p) => <option key={p.id} value={p.id}>{TIPO_PIEZA_LABEL[p.tipo]} {p.codigo}{p.colada ? ` · colada ${p.colada}` : ""}</option>)}
                  </select>
                </Campo>
              </div>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardar} disabled={!form.codigo.trim() || crear.isPending || actualizar.isPending}>
                  {crear.isPending || actualizar.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Eliminar pieza"
        descripcion={<>¿Eliminar la pieza <strong>{aBorrar?.codigo}</strong>?</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => { try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) } }}
      />
    </div>
  )
}
