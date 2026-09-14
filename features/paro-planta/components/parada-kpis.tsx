"use client"

import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { ParadaKpi, ParadaSerie, Semaforo } from "../types"

function pct(v: number, decimales = 1): string {
  return `${(v * 100).toFixed(decimales)}%`
}

function horas(v: number): string {
  return `${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })} h`
}

function fechaHora(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * El semáforo es un color de estado, no una serie: va siempre con icono y texto.
 * Nadie tiene que deducir el estado del color solo.
 */
const SEMAFOROS: Record<Semaforo, { texto: string; clase: string; Icono: typeof CheckCircle2 }> = {
  ADELANTADO: {
    texto: "Adelantado",
    clase: "text-emerald-700 dark:text-emerald-400",
    Icono: TrendingUp,
  },
  EN_TIEMPO: {
    texto: "En tiempo",
    clase: "text-foreground",
    Icono: CheckCircle2,
  },
  ATRASADO: {
    texto: "Atrasado",
    clase: "text-red-700 dark:text-red-400",
    Icono: TrendingDown,
  },
}

function Tile({
  titulo,
  valor,
  detalle,
  destacado,
}: {
  titulo: string
  valor: React.ReactNode
  detalle?: string
  destacado?: boolean
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-muted-foreground">{titulo}</div>
      <div className={destacado ? "mt-1 text-3xl font-semibold" : "mt-1 text-2xl font-semibold"}>
        {valor}
      </div>
      {detalle && <div className="mt-1 text-xs text-muted-foreground">{detalle}</div>}
    </Card>
  )
}

/** Aviso de calidad de dato: no es un error, es contexto para leer bien el tablero. */
function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

export function ParadaKpis({ kpi, serie }: { kpi: ParadaKpi; serie: ParadaSerie }) {
  const sem = SEMAFOROS[kpi.semaforo]
  const signo = kpi.deltaP >= 0 ? "+" : ""

  return (
    <div className="space-y-4">
      {/* Avance: lo primero que se mira. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile titulo="Avance real" valor={pct(kpi.realP)} destacado />
        <Tile titulo="Avance esperado" valor={pct(kpi.esperadoP)} destacado />
        <Tile
          titulo="Desvío"
          valor={`${signo}${pct(kpi.deltaP)}`}
          destacado
          detalle={`Umbral ±${pct(0.03, 0)} por defecto`}
        />
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Estado</div>
          <div className={`mt-1 flex items-center gap-2 text-2xl font-semibold ${sem.clase}`}>
            <sem.Icono className="h-6 w-6 shrink-0" />
            <span>{sem.texto}</span>
          </div>
        </Card>
      </div>

      {/* Trabajo. El peso está en horas, por eso la unidad. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          titulo="Trabajo total"
          valor={horas(kpi.pesoTotal)}
          detalle={`${kpi.tareasTotal.toLocaleString("es-AR")} tareas`}
        />
        <Tile
          titulo="Trabajo hecho"
          valor={horas(kpi.pesoHecho)}
          detalle={`${kpi.tareasHechas.toLocaleString("es-AR")} tareas`}
        />
        <Tile
          titulo="Ritmo"
          valor={`${kpi.ritmoPorHora.toLocaleString("es-AR", { maximumFractionDigits: 2 })} h/h`}
          detalle="Trabajo cerrado por hora transcurrida"
        />
        <Tile
          titulo="Proyección al cierre"
          valor={kpi.prediccionP === null ? "—" : pct(kpi.prediccionP)}
          detalle={
            kpi.prediccionP === null
              ? "Todavía es temprano para proyectar"
              : "Manteniendo el rendimiento actual"
          }
        />
      </div>

      {/* Tiempo. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile titulo="Ventana" valor={horas(kpi.horasPlan)} detalle={fechaHora(kpi.inicio)} />
        <Tile
          titulo="Transcurrido"
          valor={horas(kpi.horasTranscurridas)}
          detalle={pct(kpi.porcTiempo, 0) + " de la ventana"}
        />
        <Tile titulo="Fin planificado" valor={fechaHora(kpi.finPlan)} />
        <Tile
          titulo="Fin proyectado"
          valor={fechaHora(kpi.finProyectado)}
          detalle={kpi.finProyectado ? "Al ritmo actual" : "Sin avance para proyectar"}
        />
      </div>

      {/* Contexto para leer los números de arriba. */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {kpi.modo === "Plan" ? (
              <>
                La curva esperada sale de las fechas planificadas reales (cobertura{" "}
                {pct(kpi.cobertura, 0)}).
              </>
            ) : (
              <>
                La curva esperada es el modelo teórico. Sólo el {pct(kpi.cobertura, 0)} del trabajo
                tiene fecha planificada; al superar el umbral configurado, la curva pasa a salir del
                plan real.
              </>
            )}
            {kpi.usarImpacto && " El peso incluye el multiplicador de criticidad."}
          </span>
        </div>

        {!kpi.pesosDiferenciados && (
          <Aviso>
            Todas las tareas pesan lo mismo, así que este avance es un conteo y no una ponderación.
            Cargá las horas base en el catálogo de tareas para que el dashboard refleje que no todo
            el trabajo cuesta igual.
          </Aviso>
        )}

        {serie.hechasSinFecha > 0 && (
          <Aviso>
            {serie.hechasSinFecha === 1
              ? "Hay 1 tarea cerrada sin fecha de finalización"
              : `Hay ${serie.hechasSinFecha} tareas cerradas sin fecha de finalización`}
            , imputadas al momento actual. El salto al final de la curva real es artificial.
          </Aviso>
        )}
      </div>
    </div>
  )
}
