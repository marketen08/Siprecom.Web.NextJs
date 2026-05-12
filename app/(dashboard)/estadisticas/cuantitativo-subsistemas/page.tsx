"use client"

import { useGetElementosPorSubsistema } from "@/features/estadisticas/api/use-get-elementos-por-subsistema"
import { CantidadElementosChart } from "@/features/estadisticas/components/cantidad-elementos-chart"

export default function CuantitativoSubsistemasPage() {
  const { data, isLoading, error } = useGetElementosPorSubsistema()
  const items = data?.data ?? []
  const total = items.reduce((acc, x) => acc + x.cantidad, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuantitativo por subsistemas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cantidad de elementos activos por subsistema del proyecto activo.
          </p>
        </div>
        {!isLoading && !error && items.length > 0 && (
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
            <div className="text-2xl font-bold tabular-nums text-gray-900">{total}</div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="rounded-lg border border-gray-100 bg-white p-6 animate-pulse h-96" />
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar la cantidad de elementos por subsistema.
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <CantidadElementosChart data={items} />
        </div>
      )}
    </div>
  )
}
