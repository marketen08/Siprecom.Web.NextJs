"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { useActualizarProcedimiento, usePlanillasCatalogo, useProcedimientosQaqc } from "@/features/qaqc/api/use-qaqc"
import { CLASE_SELECT, Campo, Encabezado, ErrorTexto, FilaVacia, opcional, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import type { ProcedimientoQaqc } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Fila = { codigo: string; nombre: string; planillaId: string }

/**
 * Procedimientos y sus registros anexos. Es el eslabón punto → procedimiento → registros:
 * un punto del PIE cita un procedimiento y el editor sugiere las planillas de sus anexos.
 * Los procedimientos (con su PDF) se cargan en Configuración › Procedimientos; acá se les
 * pone código, revisión y anexos.
 */
export default function ProcedimientosQaqcPage() {
  const { data, isLoading } = useProcedimientosQaqc()
  const planillas = usePlanillasCatalogo()
  const actualizar = useActualizarProcedimiento()
  const { catalogo } = usePermisosQaqc()
  const [buscar, setBuscar] = useState("")
  const [edit, setEdit] = useState<{ p: ProcedimientoQaqc; codigo: string; revision: string; filas: Fila[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filas = useMemo(() => {
    const t = buscar.trim().toLowerCase()
    return (data ?? []).filter((p) => !t || `${p.codigo} ${p.nombre}`.toLowerCase().includes(t))
  }, [data, buscar])

  async function guardar() {
    if (!edit) return
    setError(null)
    try {
      await actualizar.mutateAsync({
        id: edit.p.id, codigo: opcional(edit.codigo), revision: opcional(edit.revision),
        registros: edit.filas.filter((f) => f.codigo.trim()).map((f) => ({ codigo: f.codigo.trim(), nombre: opcional(f.nombre), planillaId: opcional(f.planillaId) })),
      })
      setEdit(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Procedimientos y registros anexos"
        descripcion="Cada procedimiento declara los registros con que se documenta (sus anexos). Los puntos del PIE que citan el procedimiento sugieren esas planillas."
      >
        <Input className="w-72" placeholder="Buscar código o nombre…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      </Encabezado>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Código</TableHead>
              <TableHead>Procedimiento</TableHead>
              <TableHead className="w-16">Rev.</TableHead>
              <TableHead>Registros anexos</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 && <FilaVacia columnas={5} cargando={isLoading} vacio="No hay procedimientos." />}
            {filas.map((p) => (
              <TableRow key={p.id} className="align-top">
                <TableCell className="font-medium">{p.codigo ?? <span className="text-muted-foreground">sin código</span>}</TableCell>
                <TableCell className="whitespace-normal">{p.nombre}{!p.tieneArchivo && <div className="text-xs text-muted-foreground">sin PDF cargado</div>}</TableCell>
                <TableCell>{p.revision}</TableCell>
                <TableCell className="whitespace-normal text-xs">
                  {p.registros.length === 0 ? <span className="text-muted-foreground">—</span> : (
                    <ul className="space-y-0.5">
                      {p.registros.map((r) => (
                        <li key={r.id}>
                          <span className="font-medium">{r.codigo}</span> {r.nombre}
                          {r.planillaId ? <span className="ml-1 text-green-700">· planilla {r.planillaCodigo}</span> : <span className="ml-1 text-amber-700">· sin planilla en la plataforma</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
                <TableCell>
                  {catalogo && (
                    <Button size="icon-sm" variant="ghost" onClick={() => { setError(null); setEdit({ p, codigo: p.codigo ?? "", revision: p.revision ?? "", filas: p.registros.map((r) => ({ codigo: r.codigo, nombre: r.nombre ?? "", planillaId: r.planillaId ?? "" })) }) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={edit !== null} onOpenChange={(v) => !v && setEdit(null)}>
        <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
          <SheetHeader><SheetTitle>{edit?.p.nombre}</SheetTitle><SheetDescription>Código, revisión y los registros que el procedimiento declara como anexos.</SheetDescription></SheetHeader>
          {edit && (
            <div className="space-y-4 px-4 pb-8">
              <div className="grid grid-cols-3 gap-3">
                <Campo label="Código" className="col-span-2"><Input value={edit.codigo} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} placeholder="QAQC-PR-C-0018" /></Campo>
                <Campo label="Revisión"><Input value={edit.revision} onChange={(e) => setEdit({ ...edit, revision: e.target.value })} /></Campo>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Registros anexos</label>
                  <Button size="xs" variant="outline" onClick={() => setEdit({ ...edit, filas: [...edit.filas, { codigo: "", nombre: "", planillaId: "" }] })}><Plus className="h-3 w-3" /> Registro</Button>
                </div>
                <div className="mt-2 space-y-2">
                  {edit.filas.map((f, i) => (
                    <div key={i} className="grid grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2">
                      <Input value={f.codigo} placeholder="Código" onChange={(e) => setEdit({ ...edit, filas: edit.filas.map((x, j) => j === i ? { ...x, codigo: e.target.value } : x) })} />
                      <Input value={f.nombre} placeholder="Nombre" onChange={(e) => setEdit({ ...edit, filas: edit.filas.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x) })} />
                      <select className={CLASE_SELECT} value={f.planillaId} onChange={(e) => setEdit({ ...edit, filas: edit.filas.map((x, j) => j === i ? { ...x, planillaId: e.target.value } : x) })}>
                        <option value="">Sin planilla</option>
                        {(planillas.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
                      </select>
                      <Button size="icon-sm" variant="ghost" onClick={() => setEdit({ ...edit, filas: edit.filas.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  {edit.filas.length === 0 && <p className="text-sm text-muted-foreground">Sin anexos.</p>}
                </div>
              </div>
              <ErrorTexto error={error} />
              <Button className="w-full" onClick={guardar} disabled={actualizar.isPending}>{actualizar.isPending ? "Guardando..." : "Guardar"}</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
