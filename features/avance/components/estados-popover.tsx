import type { AvanceDTO } from "@/features/avance/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function EstadosPopover({ avance }: { avance: AvanceDTO }) {
  const filas = [
    { label: "Pendiente",      value: avance.pendiente,   color: "bg-gray-100 text-gray-700" },
    { label: "En proceso",     value: avance.enProceso,   color: "bg-blue-100 text-blue-700" },
    { label: "Completado",     value: avance.completado,  color: "bg-yellow-100 text-yellow-700" },
    { label: "Firmado",        value: avance.firmado,     color: "bg-emerald-100 text-emerald-700" },
    { label: "Firmado físico", value: avance.aprobado,    color: "bg-teal-100 text-teal-700" },
    { label: "Rechazado",      value: avance.rechazado,   color: "bg-red-100 text-red-700" },
    { label: "Cancelado",      value: avance.cancelado,   color: "bg-gray-50 text-gray-400" },
  ].filter((f) => f.value > 0)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 cursor-default"
        >
          {avance.totalTareas}
        </span>
      </TooltipTrigger>
      <TooltipContent side="left" className="p-0">
        <div className="min-w-40 py-2 px-1">
          <p className="text-xs font-semibold text-gray-500 px-2 pb-1">Desglose de estados</p>
          {filas.length === 0 ? (
            <p className="text-xs text-gray-400 px-2">Sin tareas</p>
          ) : (
            filas.map((f) => (
              <div key={f.label} className="flex items-center justify-between gap-3 px-2 py-0.5">
                <span className="text-xs text-gray-600">{f.label}</span>
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${f.color}`}>
                  {f.value}
                </span>
              </div>
            ))
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
