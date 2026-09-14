"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useSetParadaConfig } from "../api/use-parada"
import type { ParadaConfig } from "../types"

/**
 * Un DateTime ISO del backend a lo que espera un input datetime-local
 * ("yyyy-MM-ddTHH:mm"), en hora local del navegador.
 */
function aInputLocal(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Y de vuelta a ISO. Vacío = null, que el backend interpreta como "sin cargar". */
function aIso(valor: string): string | null {
  if (!valor) return null
  const d = new Date(valor)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

interface Props {
  proyectoId: string
  config: ParadaConfig
  onGuardado?: () => void
}

export function ParadaConfigForm({ proyectoId, config, onGuardado }: Props) {
  const [inicio, setInicio] = useState("")
  const [finPlan, setFinPlan] = useState("")
  const [finReal, setFinReal] = useState("")
  const [curvaK, setCurvaK] = useState("10")
  const [umbralSemaforo, setUmbralSemaforo] = useState("3")
  const [umbralCobertura, setUmbralCobertura] = useState("90")
  const [usarImpacto, setUsarImpacto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Los umbrales se guardan en tanto por uno pero se editan en porcentaje: pedirle
  // a alguien que escriba 0.03 para decir 3% es una fuente de errores gratuita.
  useEffect(() => {
    setInicio(aInputLocal(config.inicio))
    setFinPlan(aInputLocal(config.finPlan))
    setFinReal(aInputLocal(config.finReal))
    setCurvaK(String(config.curvaK))
    setUmbralSemaforo(String(Math.round(config.umbralSemaforo * 1000) / 10))
    setUmbralCobertura(String(Math.round(config.umbralCobertura * 1000) / 10))
    setUsarImpacto(config.usarImpacto)
  }, [config])

  const mutation = useSetParadaConfig(proyectoId)

  const guardar = async () => {
    setError(null)

    const iIni = aIso(inicio)
    const iFin = aIso(finPlan)

    if ((iIni === null) !== (iFin === null)) {
      setError("Cargá inicio y fin planificado juntos, o ninguno de los dos.")
      return
    }
    if (iIni && iFin && new Date(iFin) <= new Date(iIni)) {
      setError("El fin planificado tiene que ser posterior al inicio.")
      return
    }

    const k = Number(curvaK)
    const uSem = Number(umbralSemaforo) / 100
    const uCob = Number(umbralCobertura) / 100

    if (!Number.isFinite(k) || k <= 0) {
      setError("La K de la curva tiene que ser mayor a cero.")
      return
    }
    if (!Number.isFinite(uSem) || uSem < 0 || uSem > 100) {
      setError("El umbral del semáforo va entre 0 y 100%.")
      return
    }
    if (!Number.isFinite(uCob) || uCob < 0 || uCob > 100) {
      setError("El umbral de cobertura va entre 0 y 100%.")
      return
    }

    try {
      await mutation.mutateAsync({
        inicio: iIni,
        finPlan: iFin,
        finReal: aIso(finReal),
        curvaK: k,
        umbralSemaforo: uSem,
        umbralCobertura: uCob,
        usarImpacto,
      })
      onGuardado?.()
    } catch (e) {
      setError((e as Error).message ?? "No se pudo guardar la configuración.")
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="parada-inicio">Inicio de la parada</Label>
          <Input
            id="parada-inicio"
            type="datetime-local"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="parada-fin-plan">Fin planificado</Label>
          <Input
            id="parada-fin-plan"
            type="datetime-local"
            value={finPlan}
            onChange={(e) => setFinPlan(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="parada-fin-real">Fin real</Label>
        <Input
          id="parada-fin-real"
          type="datetime-local"
          value={finReal}
          onChange={(e) => setFinReal(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Se completa al cerrar la parada. Mientras esté vacío, la parada figura en curso.
        </p>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="parada-k">Pendiente de la curva (K)</Label>
          <Input
            id="parada-k"
            type="number"
            min={0.1}
            step={0.5}
            value={curvaK}
            onChange={(e) => setCurvaK(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Más alto = arranque y cierre más lentos con un pico al medio. 10 es el valor habitual.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="parada-umbral-semaforo">Umbral del semáforo (%)</Label>
          <Input
            id="parada-umbral-semaforo"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={umbralSemaforo}
            onChange={(e) => setUmbralSemaforo(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Desvío a partir del cual deja de estar en tiempo.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="parada-umbral-cobertura">Umbral de cobertura (%)</Label>
          <Input
            id="parada-umbral-cobertura"
            type="number"
            min={0}
            max={100}
            step={1}
            value={umbralCobertura}
            onChange={(e) => setUmbralCobertura(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Cuánto del trabajo necesita fecha planificada para que la curva salga del plan real en
            lugar del modelo teórico.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={usarImpacto}
          onChange={(e) => setUsarImpacto(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
        />
        <span>
          Ponderar también por criticidad
          <span className="block text-xs text-muted-foreground">
            Multiplica las horas por el impacto de la tarea y del elemento. Apagado, el peso son
            sólo las horas.
          </span>
        </span>
      </label>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={guardar} disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  )
}
