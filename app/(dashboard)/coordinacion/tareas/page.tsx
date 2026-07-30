"use client"

import { useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ListChecks, Sparkles } from "lucide-react"

import { TareasExistentesTab } from "@/features/tareas/components/tareas-existentes-tab"
import { TareasFaltantesTab } from "@/features/tareas/components/tareas-faltantes-tab"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"

type Tab = "existentes" | "faltantes"

export default function CoordinacionTareasPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Estado del tab activo — sincronizado con ?tab= para permitir deep-link
  // (el redirect desde /alcance/tareas/generacion pega directo en ?tab=faltantes).
  const tabParam = (searchParams.get("tab") as Tab) ?? "existentes"
  const [tab, setTab] = useState<Tab>(tabParam === "faltantes" ? "faltantes" : "existentes")

  // El tab "Faltantes" tiene sentido siempre — hoy generar puede hacer falta
  // tanto en proyectos con flag manual (para materializar) como con flag off
  // (para reconciliar imports viejos / cambios de tipo). Lo mostramos siempre.
  const { data: misProyectos } = useGetMisProyectos()
  const proyectoActivo = misProyectos?.find((p) => p.esActivo)
  const generacionManualActiva = proyectoActivo?.generacionTareasManual === true

  const cambiarTab = (nuevo: Tab) => {
    setTab(nuevo)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", nuevo)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Coordinación de tareas</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná las ElementoTareas del proyecto: eliminá, cancelá o reasigná responsables.
          El tab &quot;Faltantes&quot; te permite generar las que todavía no fueron propagadas.
        </p>
      </div>

      {/* Tabs manuales (no hay componente Tabs instalado). */}
      <div className="flex gap-1 border-b">
        <TabButton active={tab === "existentes"} onClick={() => cambiarTab("existentes")}>
          <ListChecks className="h-4 w-4" />
          Existentes
        </TabButton>
        <TabButton active={tab === "faltantes"} onClick={() => cambiarTab("faltantes")}>
          <Sparkles className="h-4 w-4" />
          Faltantes
          {generacionManualActiva && (
            <span className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800">
              modo manual
            </span>
          )}
        </TabButton>
      </div>

      <div className="pt-2">
        {tab === "existentes" ? <TareasExistentesTab /> : <TareasFaltantesTab />}
      </div>
    </div>
  )
}

function TabButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer transition-colors " +
        (active
          ? "border-blue-700 text-blue-800"
          : "border-transparent text-muted-foreground hover:text-foreground hover:bg-gray-50")
      }
    >
      {children}
    </button>
  )
}
