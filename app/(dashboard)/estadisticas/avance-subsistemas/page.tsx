"use client"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetAvanceProyecto } from "@/features/avance/api/use-get-avance-proyecto"
import { AvanceSubsistemasChart } from "@/features/estadisticas/components/avance-subsistemas-chart"

export default function AvanceSubsistemasPage() {
  const { data: perfil } = useGetPerfil()
  const { data, isLoading, error } = useGetAvanceProyecto(perfil?.proyectoId)
  const avance = data?.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Avance por subsistemas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          % de avance de cada subsistema del proyecto activo.
        </p>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-gray-100 bg-white p-6 animate-pulse h-96" />
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Error al cargar el avance del proyecto.
        </div>
      )}

      {!isLoading && !error && avance && (
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <AvanceSubsistemasChart avance={avance} />
        </div>
      )}
    </div>
  )
}
