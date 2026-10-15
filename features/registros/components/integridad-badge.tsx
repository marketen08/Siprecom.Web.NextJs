"use client"

import { useState } from "react"
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { useVerificarIntegridad } from "@/features/registros/api/use-verificar-integridad"
import type { ApiError } from "@/lib/api-client"

interface Props {
  registroId: string
  /**
   * Si false, el badge no se renderiza. Útil para no mostrarlo en estados
   * BORRADOR/EN_PROCESO/COMPLETADO donde no hay firmas que verificar.
   */
  enabled?: boolean
}

/**
 * Badge de integridad criptográfica. Muestra si los valores del registro
 * fueron alterados después de la firma. Recalcula el hash de cada firma en
 * el backend y compara con el persistido.
 *
 * Comportamiento:
 *  - Loading inicial: spinner sutil + "Verificando integridad..."
 *  - Integro = true:  badge verde "Integridad verificada"
 *  - Integro = false: badge rojo "Alterado post-firma" + detalle expandible
 *  - 403 / no permitido: oculto (silenciosamente — el user normal no necesita ver esto)
 *  - 0 firmas:          oculto
 *  - Otro error:        oculto (no se contamina la UI)
 */
export function IntegridadBadge({ registroId, enabled = true }: Props) {
  const { data, isLoading, isError, error } = useVerificarIntegridad(registroId, enabled)
  const [expanded, setExpanded] = useState(false)

  if (!enabled) return null

  // Errores: 403 (no es admin) o cualquier otro → render silencioso
  if (isError) {
    const apiErr = error as ApiError | undefined
    if (apiErr?.status === 403) return null
    // Otros errores: opcional mostrar como warning. Por ahora silencioso.
    return null
  }

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Verificando integridad...
      </div>
    )
  }

  const integridad = data?.data
  if (!integridad || integridad.firmasVerificadas === 0) return null

  const colorClasses = integridad.integro
    ? "bg-green-50 border-green-300 text-green-800"
    : "bg-red-50 border-red-300 text-red-800"

  const Icon = integridad.integro ? ShieldCheck : ShieldAlert

  return (
    <div className={`inline-flex flex-col rounded-lg border ${colorClasses}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
        aria-expanded={expanded}
        title={
          integridad.integro
            ? "El contenido del registro coincide con lo firmado. Click para ver detalle."
            : "Los valores del registro fueron modificados después de la firma. Click para ver qué firmas fallaron."
        }
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {integridad.integro ? "Integridad verificada" : "Alterado post-firma"}
        {expanded
          ? <ChevronUp className="h-3 w-3 ml-0.5" />
          : <ChevronDown className="h-3 w-3 ml-0.5" />}
      </button>

      {expanded && (
        <div className="border-t border-current/20 px-2.5 py-2 space-y-1.5">
          <p className="text-[11px] opacity-80">
            {(() => {
              const digitales = integridad.firmas.filter((f) => !f.esFirmaEnPapel).length
              const enPapel = integridad.firmas.filter((f) => f.esFirmaEnPapel).length
              const partes: string[] = []
              if (digitales > 0)
                partes.push(`${digitales} firma(s) digital(es) verificada(s) contra hash SHA-256`)
              if (enPapel > 0)
                partes.push(`${enPapel} firma(s) en papel (evidencia en el escaneo, no aplica hash)`)
              return partes.join(" · ") + "."
            })()}
          </p>
          <ul className="space-y-1">
            {integridad.firmas.map((f) => (
              <li key={f.firmaId} className="flex items-start gap-1.5 text-[11px]">
                {f.integro
                  ? <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0 text-green-700" />
                  : <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0 text-red-700" />}
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{f.nombreFirmante}</span>
                  <span className="opacity-70"> · {f.rolFirmante}</span>
                  <span className="opacity-60"> · {new Date(f.fechaFirma).toLocaleString("es-AR")}</span>
                  {f.esFirmaEnPapel ? (
                    <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-medium">
                      En papel
                    </span>
                  ) : null}
                  {!f.integro && (
                    <p className="text-red-700 mt-0.5">
                      Hash no coincide — los datos fueron modificados después de esta firma.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
