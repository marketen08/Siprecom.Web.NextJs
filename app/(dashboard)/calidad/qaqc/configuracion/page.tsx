"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Settings2, Trash2 } from "lucide-react"

import { useEliminarPie, useInstanciar, usePiesProyecto, usePlantillas } from "@/features/qaqc/api/use-qaqc"
import { CLASE_SELECT, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia, usePermisosQaqc } from "@/features/qaqc/components/comunes"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Los PIE del proyecto: se agregan copiando una plantilla vigente del catálogo y después
 * se ajustan acá sin tocar la plantilla. Quitar uno solo se puede mientras no tenga firmas,
 * registros ni documentos.
 */
export default function ConfiguracionQaqcPage() {
  const pies = usePiesProyecto()
  const plantillas = usePlantillas(true)
  const instanciar = useInstanciar()
  const eliminar = useEliminarPie()
  const { gestion } = usePermisosQaqc()
  const [plantilla, setPlantilla] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [borrar, setBorrar] = useState<string | null>(null)
  const usadas = new Set((pies.data ?? []).map((p) => p.plantillaOrigenId))
  const disponibles = (plantillas.data ?? []).filter((p) => !usadas.has(p.id))

  async function agregar() {
    setError(null)
    try { await instanciar.mutateAsync(plantilla); setPlantilla("") }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="PIE del proyecto"
        descripcion="Cada PIE es una copia de una plantilla del catálogo. Lo que se cambie acá queda en el proyecto; si la plantilla cambia de revisión, este PIE no se entera."
      />

      {gestion && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-white p-4">
          <div className="min-w-72 flex-1">
            <label className="text-sm font-medium">Agregar desde una plantilla</label>
            <select className={`${CLASE_SELECT} mt-1`} value={plantilla} onChange={(e) => setPlantilla(e.target.value)}>
              <option value="">Elegí una plantilla vigente…</option>
              {disponibles.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre} (rev. {p.revision}, {p.puntos} puntos)</option>)}
            </select>
          </div>
          <Button onClick={agregar} disabled={!plantilla || instanciar.isPending}><Plus className="h-4 w-4" /> {instanciar.isPending ? "Copiando..." : "Agregar PIE"}</Button>
          <div className="w-full"><ErrorTexto error={error} /></div>
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>PIE</TableHead>
              <TableHead>Obra / área</TableHead>
              <TableHead className="text-right">Hojas</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
              <TableHead>Plantilla</TableHead>
              <TableHead className="w-48" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(pies.data ?? []).length === 0 && <FilaVacia columnas={7} cargando={pies.isLoading} vacio="El proyecto no tiene PIE." />}
            {(pies.data ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.codigo}</TableCell>
                <TableCell><Link href={`/calidad/qaqc/pie/${p.id}`} className="hover:underline">{p.disciplina ?? p.nombre}</Link><div className="text-xs text-muted-foreground">{p.nombre}</div></TableCell>
                <TableCell className="text-sm">{[p.obra, p.area].filter(Boolean).join(" · ") || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{p.hojas}</TableCell>
                <TableCell className="text-right tabular-nums">{p.puntos}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.plantillaRevision ? `rev. ${p.plantillaRevision}` : "—"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" asChild><Link href={`/calidad/qaqc/configuracion/${p.id}`}><Settings2 className="h-3.5 w-3.5" /> Estructura</Link></Button>
                  {gestion && <Button size="icon-sm" variant="ghost" onClick={() => { setError(null); setBorrar(p.id) }}><Trash2 className="h-4 w-4" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmarBorrado
        abierto={borrar !== null}
        titulo="Quitar PIE del proyecto"
        descripcion="Solo se puede mientras no tenga firmas, registros ni documentos."
        pendiente={eliminar.isPending}
        error={error}
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => eliminar.mutateAsync(borrar!).then(() => setBorrar(null)).catch((e) => setError(e.message))}
      />
    </div>
  )
}
