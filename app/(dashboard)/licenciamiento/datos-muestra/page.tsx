"use client"

import { useState } from "react"
import { Loader2, Database, CheckCircle2, AlertTriangle, Sprout } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { useSeedDemoStatus, useRunSeedDemo } from "@/features/mantenimiento/api/use-seed-demo"

export default function DatosMuestraPage() {
  const statusQuery = useSeedDemoStatus()
  const runMut = useRunSeedDemo()
  const [limpiarAntes, setLimpiarAntes] = useState(false)

  const yaCargados = statusQuery.data?.demoSeeded ?? false
  const resultado = runMut.data

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Sprout className="h-6 w-6 text-blue-700" />
          Datos de muestra
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Carga datos de ejemplo (clientes, proyectos, sistemas/subsistemas y elementos) para probar la
          instancia. Una instancia nueva viene solo con el usuario inicial; estos datos se cargan acá.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">Estado</div>
          {statusQuery.isLoading ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> consultando…
            </span>
          ) : yaCargados ? (
            <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              <CheckCircle2 className="h-3.5 w-3.5" /> Cargados
            </Badge>
          ) : (
            <Badge className="gap-1 bg-gray-100 text-gray-600 hover:bg-gray-100">Sin cargar</Badge>
          )}
        </div>

        {yaCargados && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={limpiarAntes}
              onChange={(e) => setLimpiarAntes(e.target.checked)}
            />
            Regenerar (borra los datos de muestra existentes y los vuelve a crear)
          </label>
        )}

        {!resultado && (
          <div>
            {yaCargados && !limpiarAntes ? (
              <p className="text-xs text-muted-foreground">
                Los datos de muestra ya están cargados. Marcá “Regenerar” si querés volver a crearlos.
              </p>
            ) : (yaCargados ? (
              <ConfirmActionDialog
                trigger={
                  <span className="inline-flex items-center gap-1.5">
                    <Database className="h-4 w-4" /> Regenerar datos de muestra
                  </span>
                }
                triggerClassName="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                title="¿Regenerar los datos de muestra?"
                description={<>Se borrarán los datos de muestra existentes (identificados como demo) y se volverán a crear. No afecta datos reales.</>}
                confirmText="Regenerar"
                pendingText="Cargando…"
                variant="destructive"
                onConfirm={() => runMut.mutateAsync({ limpiarAntes: true })}
              />
            ) : (
              <Button onClick={() => runMut.mutate({ limpiarAntes: false })} disabled={runMut.isPending} className="gap-2">
                {runMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Cargar datos de muestra
              </Button>
            ))}
          </div>
        )}

        {runMut.isPending && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esto puede tardar unos segundos (crea cientos de elementos)…
          </p>
        )}

        {runMut.isError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>No se pudieron cargar.{runMut.error instanceof Error ? ` ${runMut.error.message}` : ""}</p>
          </div>
        )}

        {resultado && (
          <div className={`flex items-start gap-2 rounded-md border p-3 text-sm ${resultado.aplicado ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {resultado.aplicado ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            <p>{resultado.message ?? resultado.error}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
