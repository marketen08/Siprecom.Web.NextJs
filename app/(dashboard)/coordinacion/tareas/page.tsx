"use client"

import { Suspense, useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ListChecks, ShieldAlert, Sparkles, Target } from "lucide-react"

import { TareasExistentesTab } from "@/features/tareas/components/tareas-existentes-tab"
import { TareasFaltantesTab } from "@/features/tareas/components/tareas-faltantes-tab"
import { TareasPuntualesTab } from "@/features/tareas/components/tareas-puntuales-tab"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { useMeetsRole } from "@/lib/use-roles"

type Tab = "existentes" | "faltantes" | "puntuales"

// El default export envuelve en <Suspense> — obligatorio en Next 16 cuando el
// componente usa useSearchParams (client-side bailout en el pre-render estático).
export default function CoordinacionTareasPage() {
  return (
    <Suspense>
      <CoordinacionTareasPageContent />
    </Suspense>
  )
}

function CoordinacionTareasPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Guard de rol: Coordinador+ (User/Consultor/Auditor no entran). El link del
  // menú ya se oculta con el mismo criterio, esto tapa el acceso por URL directa.
  const puedeVer = useMeetsRole("Coordinador")

  // Estado del tab activo — sincronizado con ?tab= para permitir deep-link
  // (el redirect desde /alcance/tareas/generacion pega directo en ?tab=faltantes).
  const tabParam = (searchParams.get("tab") as Tab) ?? "existentes"
  const [tab, setTab] = useState<Tab>(
    tabParam === "faltantes" || tabParam === "puntuales" ? tabParam : "existentes",
  )

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

  if (!puedeVer) {
    return (
      <div className="mx-auto max-w-md mt-16 rounded-lg border bg-white p-6 text-center space-y-3">
        <ShieldAlert className="mx-auto h-8 w-8 text-amber-600" />
        <h1 className="text-lg font-semibold">Sin permisos</h1>
        <p className="text-sm text-muted-foreground">
          La coordinación de tareas es exclusiva para Coordinador o superiores.
          Contactá a un supervisor si necesitás acceso.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Coordinación de tareas</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná las tareas del proyecto: eliminá, cancelá o reasigná responsables.
          El tab &quot;Faltantes&quot; permite generar las que todavía no fueron propagadas
          y &quot;Puntuales&quot; asigna trabajos sueltos a elementos elegidos a mano.
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
        <TabButton active={tab === "puntuales"} onClick={() => cambiarTab("puntuales")}>
          <Target className="h-4 w-4" />
          Puntuales
        </TabButton>
      </div>

      <div className="pt-2">
        {tab === "existentes" && <TareasExistentesTab />}
        {tab === "faltantes" && <TareasFaltantesTab />}
        {tab === "puntuales" && <TareasPuntualesTab />}
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
