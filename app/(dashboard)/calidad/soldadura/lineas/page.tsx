"use client"

import { useState } from "react"
import Link from "next/link"
import { FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react"

import { clases as apiClases } from "@/features/soldadura/api/use-soldadura"
import { descargarTrazabilidad, lineas as api } from "@/features/soldadura/api/use-juntas"
import { TIPO_LINEA_LABEL, TipoLinea, type Linea } from "@/features/soldadura/types-juntas"
import {
  CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia, opcional, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Form {
  id?: string
  tipo: TipoLinea
  codigo: string
  descripcion: string
  claseId: string
  isometrico: string
}

/**
 * Lo que en cada disciplina hace de línea: la línea de piping, el tramo de ducto, la
 * estructura, el recipiente. Agrupa las juntas, les da su clase por defecto y es la
 * unidad del registro de trazabilidad.
 */
export default function LineasPage() {
  const { data, isLoading } = api.useList()
  const clases = apiClases.useList()
  const crear = api.useCreate()
  const actualizar = api.useUpdate()
  const borrar = api.useDelete()
  const { parametros } = usePermisosSoldadura()

  const [form, setForm] = useState<Form | null>(null)
  const [aBorrar, setABorrar] = useState<Linea | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lista = data ?? []

  async function guardar() {
    if (!form) return
    setError(null)
    const payload = {
      tipo: form.tipo,
      codigo: form.codigo.trim(),
      descripcion: opcional(form.descripcion),
      claseId: form.claseId || null,
      isometrico: opcional(form.isometrico),
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
        titulo="Líneas"
        descripcion="Líneas de piping, tramos de ducto, estructuras y recipientes. Cada una agrupa sus juntas, les da la clase por defecto y emite su registro de trazabilidad de soldadura, materiales y END."
      >
        <Button className="gap-2" disabled={!parametros}
          onClick={() => { setError(null); setForm({ tipo: TipoLinea.Piping, codigo: "", descripcion: "", claseId: "", isometrico: "" }) }}>
          <Plus className="h-4 w-4" /> Nueva línea
        </Button>
      </Encabezado>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Línea</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="w-24 font-semibold text-gray-700">Clase</TableHead>
              <TableHead className="font-semibold text-gray-700">Isométrico</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Juntas</TableHead>
              <TableHead className="w-44 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || lista.length === 0 ? (
              <FilaVacia columnas={6} cargando={isLoading} vacio="No hay líneas cargadas." />
            ) : lista.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono font-medium">
                  <Link href={`/calidad/soldadura/juntas?linea=${l.id}`} className="text-blue-700 hover:underline">{l.codigo}</Link>
                  {l.descripcion && <span className="block font-sans text-xs text-muted-foreground">{l.descripcion}</span>}
                </TableCell>
                <TableCell className="text-sm">{TIPO_LINEA_LABEL[l.tipo]}</TableCell>
                <TableCell className="font-mono text-sm">{l.claseCodigo ?? "—"}</TableCell>
                <TableCell className="text-sm">{l.isometrico ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {l.soldadas} / {l.juntas}
                  <span className="block text-xs text-muted-foreground">soldadas</span>
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-700" title="Registro de trazabilidad (Excel)"
                    onClick={() => descargarTrazabilidad(l.id)}>
                    <FileSpreadsheet className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} title="Editar"
                    onClick={() => {
                      setError(null)
                      setForm({ id: l.id, tipo: l.tipo, codigo: l.codigo, descripcion: l.descripcion ?? "", claseId: l.claseId ?? "", isometrico: l.isometrico ?? "" })
                    }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros || l.juntas > 0}
                    title={l.juntas > 0 ? "La línea tiene juntas." : "Eliminar"}
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
            <SheetTitle>{form?.id ? "Editar línea" : "Nueva línea"}</SheetTitle>
            <SheetDescription>
              {form?.id
                ? "Cambiar el código rearma la identificación de todas sus juntas."
                : "La clase y el isométrico son los que reciben por defecto sus juntas."}
            </SheetDescription>
          </SheetHeader>
          {form && (
            <div className="mt-6 px-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Código" className="col-span-2"><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="font-mono" placeholder={'6"-P-1001-A1A'} /></Campo>
                <Campo label="Tipo">
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: Number(e.target.value) as TipoLinea })} className={CLASE_SELECT}>
                    {Object.entries(TIPO_LINEA_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Campo>
                <Campo label="Clase">
                  <select value={form.claseId} onChange={(e) => setForm({ ...form, claseId: e.target.value })} className={CLASE_SELECT}>
                    <option value="">Sin clase</option>
                    {(clases.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                  </select>
                </Campo>
                <Campo label="Isométrico / plano" className="col-span-2"><Input value={form.isometrico} onChange={(e) => setForm({ ...form, isometrico: e.target.value })} /></Campo>
                <Campo label="Descripción" className="col-span-2"><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></Campo>
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
        titulo="Eliminar línea"
        descripcion={<>¿Eliminar la línea <strong>{aBorrar?.codigo}</strong>?</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => { try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) } }}
      />
    </div>
  )
}
