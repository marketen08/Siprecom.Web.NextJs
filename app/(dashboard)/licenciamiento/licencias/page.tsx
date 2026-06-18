"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, KeyRound, Check } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

interface LicenciasResponse {
  licenciasBase: number
}

export default function LicenciasPage() {
  const qc = useQueryClient()
  // `edit` es null mientras el usuario no tocó el input → mostramos el valor del
  // backend; al editar pasa a string. Evita sincronizar con setState-in-effect.
  const [edit, setEdit] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ["licenciamiento", "licencias"],
    queryFn: () => apiClient.get<LicenciasResponse>("/api/licenciamiento/licencias"),
  })

  const mutation = useMutation({
    mutationFn: (licenciasBase: number) =>
      apiClient.put<LicenciasResponse>("/api/licenciamiento/licencias", { licenciasBase }),
    onSuccess: (res) => {
      qc.setQueryData(["licenciamiento", "licencias"], res)
      setEdit(null) // re-sincroniza al valor recién guardado
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    },
  })

  const valor = edit ?? (data?.licenciasBase != null ? String(data.licenciasBase) : "")
  const parsed = Number(valor)
  const valido = Number.isInteger(parsed) && parsed >= 0
  const cambiado = data?.licenciasBase != null && parsed !== data.licenciasBase

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <KeyRound className="h-6 w-6 text-blue-700" /> Licencias
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alcance base de licencias incluidas. La facturación de usuarios adicionales se calcula
          sobre la concurrencia pico del mes: si el pico no supera este número, no se factura
          cargo adicional.
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
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="licenciasBase" className="text-sm font-medium text-gray-800">
                Licencias base
              </label>
              <Input
                id="licenciasBase"
                type="number"
                min={0}
                step={1}
                value={valor}
                onChange={(e) => setEdit(e.target.value)}
                className="max-w-40"
              />
              {!valido && valor !== "" && (
                <p className="text-xs text-destructive">Debe ser un entero ≥ 0.</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => mutation.mutate(parsed)}
                disabled={!valido || !cambiado || mutation.isPending}
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
