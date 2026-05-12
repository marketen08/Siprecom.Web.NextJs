"use client"

import { useGetDistribucionPendientes } from "@/features/estadisticas/api/use-get-distribucion-pendientes"
import { DonutDistribucion } from "@/features/estadisticas/components/donut-distribucion"

export default function EstadoPendientesPage() {
  const porEstado = useGetDistribucionPendientes("estado")
  const porEspecialidad = useGetDistribucionPendientes("especialidad")
  const porCategoria = useGetDistribucionPendientes("categoria")

  const hayError =
    porEstado.error || porEspecialidad.error || porCategoria.error

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estado de pendientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Distribución de pendientes abiertos del proyecto activo (excluye cerrados y cancelados).
        </p>
      </div>

      {hayError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar la distribución de pendientes.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DonutDistribucion
          titulo="Por estado"
          descripcion="Abierto · En proceso · Pendiente aprobación"
          data={porEstado.data?.data ?? []}
          loading={porEstado.isLoading}
        />
        <DonutDistribucion
          titulo="Por especialidad"
          descripcion="Disciplina afectada por el pendiente"
          data={porEspecialidad.data?.data ?? []}
          loading={porEspecialidad.isLoading}
        />
        <DonutDistribucion
          titulo="Por categoría"
          descripcion="Tipo de hallazgo según catálogo"
          data={porCategoria.data?.data ?? []}
          loading={porCategoria.isLoading}
        />
      </div>
    </div>
  )
}
