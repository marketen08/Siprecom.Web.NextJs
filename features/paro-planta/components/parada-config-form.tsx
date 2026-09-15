"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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

/** Tanto por uno a porcentaje para editar: pedirle a alguien que escriba 0.03 para decir 3% es una fuente de errores gratuita. */
const aPorcentaje = (v: number) => String(Math.round(v * 1000) / 10)

export function ParadaConfigForm({ proyectoId, config, onGuardado }: Props) {
  // Estado inicializado directamente desde las props, sin efecto de sincronización.
  // El formulario se monta recién cuando se abre el panel, así que arranca siempre
  // con los valores frescos. Sincronizarlo con un useEffect además pisaría lo que el
  // usuario está tipeando si la query se revalida mientras edita.
  const [inicio, setInicio] = useState(() => aInputLocal(config.inicio))
  const [finPlan, setFinPlan] = useState(() => aInputLocal(config.finPlan))
  const [finReal, setFinReal] = useState(() => aInputLocal(config.finReal))
  const [curvaK, setCurvaK] = useState(() => String(config.curvaK))
  const [umbralSemaforo, setUmbralSemaforo] = useState(() => aPorcentaje(config.umbralSemaforo))
  const [umbralCobertura, setUmbralCobertura] = useState(() => aPorcentaje(config.umbralCobertura))
  const [usarImpacto, setUsarImpacto] = useState(config.usarImpacto)
  const [enviarMails, setEnviarMails] = useState(config.enviarMails)
  const [destinatarios, setDestinatarios] = useState(config.mailsDestinatarios ?? "")
  const [cadaHoras, setCadaHoras] = useState(() => String(config.mailsCadaHoras))
  const [mailsHasta, setMailsHasta] = useState(() => aInputLocal(config.mailsHasta))
  const [error, setError] = useState<string | null>(null)

  const mutation = useSetParadaConfig(proyectoId)

  /**
   * Mismo criterio que el backend, para que el contador que ve el usuario coincida
   * con lo que realmente se va a enviar. Acepta coma, punto y coma y saltos de
   * línea porque una lista pegada viene con cualquiera de los tres.
   */
  const destinatariosValidos = destinatarios
    .split(/[,;\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes("@"))

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

    const horas = Number(cadaHoras)
    if (enviarMails) {
      if (!Number.isFinite(horas) || horas < 1 || horas > 168) {
        setError("La frecuencia de envío va entre 1 hora y 1 semana (168 h).")
        return
      }
      if (destinatariosValidos.length === 0) {
        setError("Para activar el envío hace falta al menos un destinatario válido.")
        return
      }
      if (iIni === null) {
        setError("No se puede activar el envío sin la ventana de la parada configurada.")
        return
      }
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
        enviarMails,
        mailsDestinatarios: destinatarios.trim() === "" ? null : destinatarios,
        mailsCadaHoras: Number.isFinite(horas) ? horas : 4,
        mailsHasta: aIso(mailsHasta),
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

      <Separator />

      <div className="space-y-4">
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={enviarMails}
            onChange={(e) => setEnviarMails(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <span>
            Enviar resumen por mail
            <span className="block text-xs text-muted-foreground">
              Durante una parada la gente está en campo y no mirando el tablero.
            </span>
          </span>
        </label>

        {enviarMails && (
          <div className="space-y-4 border-l-2 pl-4">
            <div className="space-y-1.5">
              <Label htmlFor="parada-destinatarios">Destinatarios</Label>
              <Textarea
                id="parada-destinatarios"
                rows={3}
                placeholder="jefe.parada@cliente.com, supervisor@contratista.com"
                value={destinatarios}
                onChange={(e) => setDestinatarios(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separados por coma, punto y coma o salto de línea.{" "}
                {destinatariosValidos.length === 0 ? (
                  <span className="text-destructive">Ninguna dirección válida todavía.</span>
                ) : (
                  <>
                    Se reconocieron <strong>{destinatariosValidos.length}</strong>
                    {destinatariosValidos.length === 1 ? " dirección" : " direcciones"}.
                  </>
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="parada-cada-horas">Enviar cada (horas)</Label>
                <Input
                  id="parada-cada-horas"
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  value={cadaHoras}
                  onChange={(e) => setCadaHoras(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">4 horas ≈ un turno.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="parada-mails-hasta">Enviar hasta</Label>
                <Input
                  id="parada-mails-hasta"
                  type="datetime-local"
                  value={mailsHasta}
                  onChange={(e) => setMailsHasta(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Vacío = sin límite. Conviene cargarlo para que los mails no sigan llegando
                  cuando la parada terminó.
                </p>
              </div>
            </div>

            {config.ultimoMailEnviado && (
              <p className="text-xs text-muted-foreground">
                Último resumen enviado el{" "}
                {new Date(config.ultimoMailEnviado).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                .
              </p>
            )}
          </div>
        )}
      </div>

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
