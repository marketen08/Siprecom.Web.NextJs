"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Sparkles, Check } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface IAConfig {
  habilitada: boolean
  maxPorUsuarioPorDia: number
}

export default function LicenciamientoIAPage() {
  const qc = useQueryClient()
  const [habilitadaEdit, setHabilitadaEdit] = useState<boolean | null>(null)
  const [maxEdit, setMaxEdit] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["licenciamiento", "ia-config"],
    queryFn: () => apiClient.get<IAConfig>("/api/licenciamiento/ia-config"),
  })

  const mutation = useMutation({
    mutationFn: (payload: IAConfig) =>
      apiClient.put<IAConfig>("/api/licenciamiento/ia-config", payload),
    onSuccess: (res) => {
      qc.setQueryData(["licenciamiento", "ia-config"], res)
      setHabilitadaEdit(null)
      setMaxEdit(null)
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    },
  })

  const habilitada = habilitadaEdit ?? data?.habilitada ?? true
  const maxStr = maxEdit ?? (data?.maxPorUsuarioPorDia != null ? String(data.maxPorUsuarioPorDia) : "")
  const maxNum = Number(maxStr)
  const maxValido = Number.isInteger(maxNum) && maxNum >= 0

  const cambiado =
    data != null &&
    (habilitada !== data.habilitada || maxNum !== data.maxPorUsuarioPorDia)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Sparkles className="h-6 w-6 text-purple-600" /> Funciones de IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control del uso de las funciones asistidas por IA (generación e importación
          de planillas con Claude). El límite se cuenta por usuario y se resetea a
          las 00:00 UTC.
        </p>
      </div>

      <Card className="p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">No se pudo cargar la configuración.</p>
        ) : (
          <div className="space-y-6">
            {/* Master switch */}
            <div className="flex items-start justify-between gap-6">
              <div>
                <label className="text-sm font-medium text-gray-800">
                  Funciones de IA habilitadas
                </label>
                <p className="mt-1 text-xs text-muted-foreground max-w-md">
                  Si está apagado, ningún usuario puede usar las funciones de IA
                  (generación por descripción, importación de Excel con IA).
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={habilitada}
                  onChange={(e) => setHabilitadaEdit(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm">
                  {habilitada ? "Habilitada" : "Deshabilitada"}
                </span>
              </label>
            </div>

            {/* Máximo por día */}
            <div className="space-y-1.5">
              <label htmlFor="maxDia" className="text-sm font-medium text-gray-800">
                Máximo de llamadas por usuario por día
              </label>
              <Input
                id="maxDia"
                type="number"
                min={0}
                step={1}
                value={maxStr}
                onChange={(e) => setMaxEdit(e.target.value)}
                className="max-w-40"
                disabled={!habilitada}
              />
              <p className="text-xs text-muted-foreground">
                {maxNum === 0
                  ? "0 = sin límite (los usuarios pueden hacer todas las llamadas que quieran)."
                  : `Cada usuario puede hacer hasta ${maxNum} llamadas por día.`}
              </p>
              {!maxValido && maxStr !== "" && (
                <p className="text-xs text-destructive">Debe ser un entero ≥ 0.</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() =>
                  mutation.mutate({
                    habilitada,
                    maxPorUsuarioPorDia: maxNum,
                  })
                }
                disabled={!maxValido || !cambiado || mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
              {guardado && (
                <span className="flex items-center gap-1 text-sm text-green-700">
                  <Check className="h-4 w-4" /> Guardado
                </span>
              )}
              {mutation.isError && (
                <span className="text-sm text-destructive">
                  {(mutation.error as Error).message}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
