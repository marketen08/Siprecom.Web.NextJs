"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { lotes as api } from "@/features/soldadura/api/use-juntas"
import { fechaCorta, soloFecha } from "@/features/soldadura/types"
import { EstadoLote, type Lote } from "@/features/soldadura/types-juntas"
import {
  CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia, numero, opcional, texto, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Form {
  id?: string
  clasificacion: string
  lote: string
  fabricante: string
  diametro: string
  certificado: string
  fechaRecepcion: string
  estado: EstadoLote
}

/**
 * Lotes de material de aporte, con su certificado. Es lo que pide el procedimiento
 * 350-021 para trazar el consumible hasta la junta. Un lote no conforme se segrega:
 * deja de poder usarse, pero las juntas que ya lo usaron lo siguen mostrando.
 */
export default function ConsumiblesPage() {
  const { data, isLoading } = api.useList()
  const crear = api.useCreate()
  const actualizar = api.useUpdate()
  const borrar = api.useDelete()
  const { padron } = usePermisosSoldadura()

  const [form, setForm] = useState<Form | null>(null)
  const [aBorrar, setABorrar] = useState<Lote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lista = data ?? []

  async function guardar() {
    if (!form) return
    setError(null)
    const payload = {
      clasificacion: form.clasificacion.trim(),
      lote: form.lote.trim(),
      fabricante: opcional(form.fabricante),
      diametro: numero(form.diametro),
      certificado: opcional(form.certificado),
      fechaRecepcion: form.fechaRecepcion || null,
      estado: form.estado,
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
        titulo="Lotes de aporte"
        descripcion="Electrodos, alambres y varillas por lote, con su certificado. Se vinculan a cada junta para trazar el consumible. Un lote no conforme se marca como segregado y deja de poder usarse."
      >
        <Button className="gap-2" disabled={!padron}
          onClick={() => { setError(null); setForm({ clasificacion: "", lote: "", fabricante: "", diametro: "", certificado: "", fechaRecepcion: "", estado: EstadoLote.Liberado }) }}>
          <Plus className="h-4 w-4" /> Nuevo lote
        </Button>
      </Encabezado>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32 font-semibold text-gray-700">Clasificación</TableHead>
              <TableHead className="font-semibold text-gray-700">Lote</TableHead>
              <TableHead className="font-semibold text-gray-700">Fabricante</TableHead>
              <TableHead className="w-20 font-semibold text-gray-700">Ø mm</TableHead>
              <TableHead className="font-semibold text-gray-700">Certificado</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Recepción</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Estado</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || lista.length === 0 ? (
              <FilaVacia columnas={8} cargando={isLoading} vacio="No hay lotes de aporte cargados." />
            ) : lista.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono font-medium">{l.clasificacion}</TableCell>
                <TableCell className="font-mono">
                  {l.lote}
                  {l.juntasQueLoUsan > 0 && <span className="block font-sans text-xs text-muted-foreground">{l.juntasQueLoUsan} juntas</span>}
                </TableCell>
                <TableCell className="text-sm">{l.fabricante ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{l.diametro ?? "—"}</TableCell>
                <TableCell className="text-sm">{l.certificado ?? "—"}</TableCell>
                <TableCell className="tabular-nums">{fechaCorta(l.fechaRecepcion)}</TableCell>
                <TableCell>
                  {l.estado === EstadoLote.Segregado
                    ? <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border-red-200">Segregado</span>
                    : <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border-green-200">Liberado</span>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron} title="Editar"
                    onClick={() => {
                      setError(null)
                      setForm({ id: l.id, clasificacion: l.clasificacion, lote: l.lote, fabricante: l.fabricante ?? "", diametro: texto(l.diametro), certificado: l.certificado ?? "", fechaRecepcion: soloFecha(l.fechaRecepcion), estado: l.estado })
                    }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!padron || l.juntasQueLoUsan > 0}
                    title={l.juntasQueLoUsan > 0 ? "Hay juntas soldadas con este lote. Si no es conforme, marcalo como segregado." : "Eliminar"}
                    onClick={() => { setError(null); setABorrar(l) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Editar lote" : "Nuevo lote de aporte"}</SheetTitle>
            <SheetDescription>Clasificación AWS, lote y certificado del fabricante.</SheetDescription>
          </SheetHeader>
          {form && (
            <div className="mt-6 px-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Clasificación AWS"><Input value={form.clasificacion} onChange={(e) => setForm({ ...form, clasificacion: e.target.value })} className="font-mono uppercase" placeholder="E7018" /></Campo>
                <Campo label="Lote"><Input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} className="font-mono" /></Campo>
                <Campo label="Fabricante"><Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} /></Campo>
                <Campo label="Diámetro (mm)"><Input inputMode="decimal" value={form.diametro} onChange={(e) => setForm({ ...form, diametro: e.target.value })} /></Campo>
                <Campo label="Certificado"><Input value={form.certificado} onChange={(e) => setForm({ ...form, certificado: e.target.value })} /></Campo>
                <Campo label="Recepción"><Input type="date" value={form.fechaRecepcion} onChange={(e) => setForm({ ...form, fechaRecepcion: e.target.value })} /></Campo>
                <Campo label="Estado" className="col-span-2">
                  <select value={form.estado} onChange={(e) => setForm({ ...form, estado: Number(e.target.value) as EstadoLote })} className={CLASE_SELECT}>
                    <option value={EstadoLote.Liberado}>Liberado</option>
                    <option value={EstadoLote.Segregado}>Segregado (no conforme)</option>
                  </select>
                </Campo>
              </div>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardar} disabled={!form.clasificacion.trim() || !form.lote.trim() || crear.isPending || actualizar.isPending}>
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
        titulo="Eliminar lote"
        descripcion={<>¿Eliminar el lote <strong>{aBorrar?.lote}</strong> de {aBorrar?.clasificacion}?</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => { try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) } }}
      />
    </div>
  )
}
