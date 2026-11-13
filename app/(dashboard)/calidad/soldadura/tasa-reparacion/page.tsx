"use client"

import { AlertTriangle } from "lucide-react"

import { useTasaReparacion } from "@/features/soldadura/api/use-inspeccion"
import { ACCION_TASA_LABEL } from "@/features/soldadura/types"
import { Encabezado, FilaVacia } from "@/features/soldadura/components/comunes"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Tasa de reparación por soldador: juntas de su soldadura original rechazadas en RT o
 * UT sobre las ensayadas. El límite y la acción salen de la norma de evaluación de sus
 * clases (si soldó en varias, la más exigente).
 */
export default function TasaReparacionPage() {
  const { data, isLoading } = useTasaReparacion()
  const lista = data ?? []
  const superan = lista.filter((t) => t.superaLimite)

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Tasa de reparación"
        descripcion="Por soldador: juntas rechazadas en ensayo volumétrico (RT/UT) sobre las ensayadas. Si supera el límite de la norma, se propone la acción que la norma tiene configurada: avisar, ensayar el 100%, suspender o recalificar."
      />

      {superan.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 max-w-3xl">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{superan.length} soldador{superan.length !== 1 ? "es superan" : " supera"} el límite de reparación: {superan.map((t) => t.cuno).join(", ")}.</span>
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Soldador</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Soldadas</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Ensayadas</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Rechazadas</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Tasa</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Límite</TableHead>
              <TableHead className="font-semibold text-gray-700">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || lista.length === 0 ? (
              <FilaVacia columnas={7} cargando={isLoading} vacio="Todavía no hay juntas soldadas." />
            ) : lista.map((t) => (
              <TableRow key={t.soldadorProyectoId} className={t.superaLimite ? "bg-red-50/50" : undefined}>
                <TableCell><span className="font-mono font-medium">{t.cuno}</span> <span className="text-sm text-muted-foreground">{t.soldador}</span></TableCell>
                <TableCell className="text-right tabular-nums">{t.juntasSoldadas}</TableCell>
                <TableCell className="text-right tabular-nums">{t.ensayadas}</TableCell>
                <TableCell className="text-right tabular-nums">{t.rechazadas}</TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${t.superaLimite ? "text-red-700" : ""}`}>{t.tasa != null ? `${t.tasa}%` : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{t.limite != null ? `${t.limite}%` : <span className="text-muted-foreground">sin límite</span>}</TableCell>
                <TableCell className="text-sm">{t.superaLimite && t.accion != null ? <span className="text-red-700">{ACCION_TASA_LABEL[t.accion]}</span> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
