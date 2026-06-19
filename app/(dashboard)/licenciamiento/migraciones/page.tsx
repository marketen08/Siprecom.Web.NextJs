"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Database, CheckCircle2, AlertTriangle, PlayCircle } from "lucide-react"

import { apiClient } from "@/lib/api-client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"

interface MigracionesStatus {
  canConnect: boolean
  appliedCount?: number
  pendingCount?: number
  lastApplied?: string | null
  applied?: string[]
  pending?: string[]
  upToDate?: boolean
  error?: string
}

interface AplicarResult {
  success: boolean
  aplicadas?: string[]
  message?: string
  error?: string
}

export default function MigracionesPage() {
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["mantenimiento", "migraciones"],
    queryFn: () => apiClient.get<MigracionesStatus>("/api/mantenimiento/migraciones"),
  })

  const aplicar = useMutation({
    mutationFn: () => apiClient.post<AplicarResult>("/api/mantenimiento/migraciones/aplicar", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mantenimiento", "migraciones"] })
    },
  })

  const pending = data?.pending ?? []
  const hayPendientes = (data?.pendingCount ?? 0) > 0

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Database className="h-6 w-6 text-blue-700" />
          Migraciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado del esquema de la base de datos de esta instancia. Aplicá las migraciones pendientes
          si el deploy no las aplicó automáticamente al iniciar.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando estado…
          </div>
        ) : error || data?.canConnect === false ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">No se pudo consultar el estado de la base.</p>
              {data?.error && <p className="mt-0.5 text-xs opacity-80">{data.error}</p>}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="text-gray-700">
                  Aplicadas: <strong>{data?.appliedCount ?? 0}</strong> · Pendientes:{" "}
                  <strong>{data?.pendingCount ?? 0}</strong>
                </p>
                {data?.lastApplied && (
                  <p className="mt-0.5 text-xs text-muted-foreground font-mono">Última: {data.lastApplied}</p>
                )}
              </div>
              {data?.upToDate ? (
                <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Al día
                </Badge>
              ) : (
                <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                  <AlertTriangle className="h-3.5 w-3.5" /> {data?.pendingCount ?? 0} pendiente(s)
                </Badge>
              )}
            </div>

            {hayPendientes && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Migraciones pendientes:</p>
                <ul className="space-y-1">
                  {pending.map((m) => (
                    <li key={m} className="text-xs font-mono bg-amber-50 border border-amber-100 rounded px-2 py-1 text-amber-800">
                      {m}
                    </li>
                  ))}
                </ul>

                <ConfirmActionDialog
                  trigger={
                    <span className="inline-flex items-center gap-1.5">
                      <PlayCircle className="h-4 w-4" /> Aplicar migraciones
                    </span>
                  }
                  triggerClassName="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                  title="¿Aplicar migraciones pendientes?"
                  description={
                    <>
                      Se aplicarán <strong>{data?.pendingCount}</strong> migración(es) sobre la base de esta
                      instancia. Esta acción modifica el esquema y no se revierte automáticamente.
                    </>
                  }
                  confirmText="Aplicar"
                  pendingText="Aplicando…"
                  onConfirm={() => aplicar.mutateAsync()}
                />
              </div>
            )}

            {aplicar.isSuccess && aplicar.data?.success && (
              <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{aplicar.data.message ?? "Migraciones aplicadas correctamente."}</p>
              </div>
            )}

            {aplicar.isError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  No se pudieron aplicar las migraciones.
                  {aplicar.error instanceof Error ? ` ${aplicar.error.message}` : ""}
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
