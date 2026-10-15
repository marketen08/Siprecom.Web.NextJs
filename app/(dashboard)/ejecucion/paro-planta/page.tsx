"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, Settings2 } from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useMeetsRole } from "@/lib/use-roles"
import { useGetParadaConfig, useGetParadaDashboard } from "@/features/paro-planta/api/use-parada"
import { ParadaChart } from "@/features/paro-planta/components/parada-chart"
import { ParadaConfigForm } from "@/features/paro-planta/components/parada-config-form"
import { ParadaKpis } from "@/features/paro-planta/components/parada-kpis"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

const ETIQUETA_ESTADO: Record<string, string> = {
  SIN_CONFIGURAR: "Sin configurar",
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
  CERRADA: "Cerrada",
}

export default function ParoPlantaPage() {
  const { data: perfil } = useGetPerfil()
  const proyectoId = perfil?.proyectoId ?? null
  const puedeConfigurar = useMeetsRole("Supervisor")

  const [configAbierta, setConfigAbierta] = useState(false)

  const { data: configRes, isLoading: cargandoConfig } = useGetParadaConfig(proyectoId)
  const config = configRes?.data

  const sinVentana = config?.estado === "SIN_CONFIGURAR"

  // No pedimos el dashboard mientras no haya ventana: el backend responde un error
  // de validación y no aporta nada mostrarlo como si fuera una falla.
  const { data: dashRes, isLoading: cargandoDash, error: errorDash } = useGetParadaDashboard(
    sinVentana ? null : proyectoId,
  )
  const dash = dashRes?.data

  if (cargandoConfig) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando parada...
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {dash?.kpi.titulo ?? perfil?.proyectoNombre ?? "Paro de planta"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {config ? ETIQUETA_ESTADO[config.estado] ?? config.estado : "—"}
            {config?.horasPlan
              ? ` · ventana de ${config.horasPlan.toLocaleString("es-AR", { maximumFractionDigits: 0 })} h`
              : ""}
          </p>
        </div>

        {puedeConfigurar && (
          <Button variant="outline" onClick={() => setConfigAbierta(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Configurar
          </Button>
        )}
      </header>

      {sinVentana && (
        <Card className="flex items-start gap-3 p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-medium">La parada todavía no tiene ventana configurada.</p>
            <p className="text-sm text-muted-foreground">
              {puedeConfigurar
                ? "Cargá el inicio y el fin planificado para que el dashboard pueda medir el avance contra lo esperado."
                : "Pedile a un administrador que cargue el inicio y el fin planificado."}
            </p>
          </div>
        </Card>
      )}

      {!sinVentana && cargandoDash && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando...
        </div>
      )}

      {!sinVentana && errorDash && (
        <Card className="flex items-start gap-3 p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">No se pudo calcular el dashboard.</p>
            <p className="text-sm text-muted-foreground">{(errorDash as Error).message}</p>
          </div>
        </Card>
      )}

      {dash && (
        <>
          <ParadaKpis kpi={dash.kpi} serie={dash.serie} />

          <Card className="p-4">
            <div className="mb-3">
              <h2 className="font-medium">Avance real contra esperado</h2>
              <p className="text-xs text-muted-foreground">
                Acumulado
                {dash.serie.pasoHoras > 1
                  ? ` cada ${dash.serie.pasoHoras} horas`
                  : " por hora"}
                . La línea real se corta en el momento actual: a la derecha todavía no hay dato.
              </p>
            </div>

            <ParadaChart
              serie={dash.serie}
              ahora={dash.kpi.ahora}
              finPlan={dash.kpi.finPlan}
            />
          </Card>
        </>
      )}

      <Sheet open={configAbierta} onOpenChange={setConfigAbierta}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Configuración de la parada</SheetTitle>
            <SheetDescription>
              La ventana define contra qué se mide el avance. El resto son parámetros del cálculo.
            </SheetDescription>
          </SheetHeader>

          {proyectoId && config && (
            <div className="px-4 pb-6">
              <ParadaConfigForm
                proyectoId={proyectoId}
                config={config}
                onGuardado={() => setConfigAbierta(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
