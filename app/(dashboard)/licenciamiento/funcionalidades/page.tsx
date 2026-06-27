"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, ToggleRight } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface FuncionalidadGlobal {
  clave: string
  nombre: string
  descripcion: string
  habilitada: boolean
  permiteOverrideProyecto: boolean
}

export default function FuncionalidadesPage() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["licenciamiento", "funcionalidades"],
    queryFn: () => apiClient.get<FuncionalidadGlobal[]>("/api/licenciamiento/funcionalidades"),
  })

  const mutation = useMutation({
    mutationFn: (body: { clave: string; habilitada: boolean }) =>
      apiClient.put<FuncionalidadGlobal>("/api/licenciamiento/funcionalidades", body),
    onSuccess: (res) => {
      qc.setQueryData<FuncionalidadGlobal[]>(["licenciamiento", "funcionalidades"], (prev) =>
        prev?.map((f) => (f.clave === res.clave ? { ...f, habilitada: res.habilitada } : f)),
      )
    },
  })

  async function handleToggle(clave: string, habilitada: boolean) {
    setSaving(clave)
    try {
      await mutation.mutateAsync({ clave, habilitada })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ToggleRight className="h-6 w-6 text-blue-700" /> Funcionalidades
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Habilitá o deshabilitá funciones para todo el deployment. Es el interruptor maestro: si
          una función está apagada acá, ningún proyecto puede usarla (aunque la tenga activada en su
          configuración). Cada proyecto puede luego ajustarla a su nivel desde Alcance → Proyectos.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">No se pudo cargar la configuración.</p>
      ) : (
        <div className="space-y-3">
          {data?.map((f) => (
            <div
              key={f.clave}
              className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium text-gray-900">{f.nombre}</p>
                <p className="text-xs text-muted-foreground">{f.descripcion}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {saving === f.clave && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                <Toggle
                  checked={f.habilitada}
                  onChange={(v) => handleToggle(f.clave, v)}
                  disabled={saving !== null}
                />
              </div>
            </div>
          ))}
          {mutation.isError && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
        </div>
      )}
    </div>
  )
}

function Toggle({
  checked, onChange, disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}
