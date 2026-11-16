"use client"

import { CheckCircle2, CircleDashed, CircleDot, Lock, MinusCircle, PenLine } from "lucide-react"

import { useMeetsRole } from "@/lib/use-roles"
import { CODIGO_TIPO, EstadoPunto, ESTADO_PUNTO_LABEL, TipoPunto, TIPOS_PUNTO } from "@/features/qaqc/types"

export {
  Encabezado, Campo, ErrorTexto, FilaVacia, ConfirmarBorrado, CLASE_SELECT, opcional,
} from "@/features/soldadura/components/comunes"

/**
 * Quién puede hacer qué, igual que el backend:
 *   • `gestion`  — ajustar la estructura del PIE del proyecto, N/A: Supervisor o más.
 *   • `carga`    — registros y documentos de los puntos: User o más.
 *   • `catalogo` — plantillas y procedimientos: Admin.
 * Firmar no depende de estos roles sino del rol de firma de la parte en el proyecto
 * (`misPartes` en el detalle del PIE).
 */
export function usePermisosQaqc() {
  return {
    gestion: useMeetsRole("Supervisor"),
    carga: useMeetsRole("User"),
    catalogo: useMeetsRole("Admin"),
  }
}

const ESTILO_TIPO: Record<TipoPunto, string> = {
  [TipoPunto.RD]: "bg-sky-50 text-sky-800 border-sky-200",
  [TipoPunto.IV]: "bg-slate-50 text-slate-700 border-slate-200",
  [TipoPunto.W]: "bg-amber-50 text-amber-800 border-amber-200",
  [TipoPunto.HP]: "bg-red-50 text-red-700 border-red-200",
}

/** Código del tipo de punto (RD, IV, W, HP) con su significado al pasar el mouse. */
export function TipoBadge({ tipo }: { tipo: TipoPunto | null | undefined }) {
  if (tipo == null) return <span className="text-muted-foreground">—</span>
  const def = TIPOS_PUNTO.find((t) => t.valor === tipo)
  return (
    <span title={`${def?.nombre}: ${def?.ayuda}`} className={`inline-flex min-w-8 cursor-help justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${ESTILO_TIPO[tipo]}`}>
      {CODIGO_TIPO[tipo]}
    </span>
  )
}

const ESTILO_ESTADO: Record<EstadoPunto, [string, typeof CheckCircle2]> = {
  [EstadoPunto.Pendiente]: ["text-slate-500", CircleDashed],
  [EstadoPunto.EnCurso]: ["text-amber-700", CircleDot],
  [EstadoPunto.ListoParaFirmar]: ["text-blue-700", PenLine],
  [EstadoPunto.Firmado]: ["text-green-700", CheckCircle2],
  [EstadoPunto.NoAplica]: ["text-slate-400", MinusCircle],
}

export function EstadoPuntoBadge({ estado, bloqueado }: { estado: EstadoPunto; bloqueado?: boolean }) {
  if (bloqueado && estado !== EstadoPunto.Firmado && estado !== EstadoPunto.NoAplica)
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 whitespace-nowrap"><Lock className="h-3.5 w-3.5" />Bloqueado por HP</span>
  const [clase, Icono] = ESTILO_ESTADO[estado]
  return <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${clase}`}><Icono className="h-3.5 w-3.5" />{ESTADO_PUNTO_LABEL[estado]}</span>
}

/** Barra de avance con el porcentaje. El color acompaña lo cerca que está del 100%. */
export function BarraAvance({ porcentaje, alto = "h-2", conTexto = true }: { porcentaje: number; alto?: string; conTexto?: boolean }) {
  const p = Math.max(0, Math.min(100, porcentaje))
  const color = p >= 100 ? "bg-green-600" : p >= 50 ? "bg-blue-600" : "bg-amber-500"
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`relative flex-1 overflow-hidden rounded-full bg-slate-100 ${alto}`}>
        <div className={`absolute inset-y-0 left-0 rounded-full ${color}`} style={{ width: `${p}%` }} />
      </div>
      {conTexto && <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">{p.toLocaleString("es-AR", { maximumFractionDigits: 1 })}%</span>}
    </div>
  )
}

export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/** "PIE Nº 05 · Puesta a tierra" o solo el nombre si la hoja no tiene número. */
export function nombreHoja(h: { numero: string | null; nombre: string }) {
  return h.numero ? `PIE Nº ${h.numero} · ${h.nombre}` : h.nombre
}

export function tamanio(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
