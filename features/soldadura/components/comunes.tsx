"use client"

import { useRef, useState, type ReactNode } from "react"
import { FileText, Loader2, Upload } from "lucide-react"

import { abrirArchivo, useSubirArchivo } from "@/features/soldadura/api/use-soldadura"
import { EstadoVencimiento, type TipoArchivo } from "@/features/soldadura/types"
import { useMeetsRole } from "@/lib/use-roles"

import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/**
 * Piezas compartidas por las pantallas de soldadura. Siguen el estilo de las
 * pantallas de configuración de Calidad: tabla en tarjeta blanca, edición en un
 * sheet lateral y borrado con confirmación.
 */

/**
 * Quién puede tocar qué, igual que el backend:
 *   • `parametros` —normas, clases, matriz, procedimientos, importación—: Supervisor o más.
 *   • `padron` —soldadores, calificaciones, personal de END—: User o más.
 * Consultor y Auditor ven todo y no editan nada.
 */
export function usePermisosSoldadura() {
  return {
    parametros: useMeetsRole("Supervisor"),
    padron: useMeetsRole("User"),
  }
}

export function Encabezado({ titulo, descripcion, children }: { titulo: string; descripcion: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{descripcion}</p>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}

export function Campo({ label, ayuda, children, className }: { label: string; ayuda?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {ayuda && <p className="text-xs text-muted-foreground mt-1">{ayuda}</p>}
    </div>
  )
}

export const CLASE_SELECT = "h-9 w-full rounded-md border border-input bg-white px-2 text-sm"

/** Texto de un input numérico → número o null. Acepta coma decimal. */
export function numero(texto: string): number | null {
  const t = texto.trim().replace(",", ".")
  if (t === "") return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Número → texto para un input. */
export function texto(n: number | null | undefined): string {
  return n == null ? "" : String(n)
}

/** Texto vacío → null, para no mandar strings vacíos al backend. */
export function opcional(s: string): string | null {
  const t = s.trim()
  return t === "" ? null : t
}

export function EstadoBadge({ estado }: { estado: EstadoVencimiento }) {
  const estilos: Record<EstadoVencimiento, [string, string]> = {
    [EstadoVencimiento.Vigente]: ["Vigente", "bg-green-50 text-green-700 border-green-200"],
    [EstadoVencimiento.PorVencer]: ["Por vencer", "bg-amber-50 text-amber-800 border-amber-200"],
    [EstadoVencimiento.Vencida]: ["Vencida", "bg-red-50 text-red-700 border-red-200"],
  }
  const [label, clase] = estilos[estado]
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${clase}`}>{label}</span>
}

export function ErrorTexto({ error }: { error: string | null }) {
  if (!error) return null
  return <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>
}

export function FilaVacia({ columnas, cargando, vacio }: { columnas: number; cargando: boolean; vacio: string }) {
  return (
    <tr>
      <td colSpan={columnas} className="py-10 text-center text-sm text-muted-foreground">
        {cargando ? "Cargando..." : vacio}
      </td>
    </tr>
  )
}

/** Confirmación de borrado con el error del backend a la vista (por ejemplo, "en uso"). */
export function ConfirmarBorrado({
  abierto, titulo, descripcion, pendiente, error, onCancelar, onConfirmar,
}: {
  abierto: boolean
  titulo: string
  descripcion: ReactNode
  pendiente: boolean
  error: string | null
  onCancelar: () => void
  onConfirmar: () => void
}) {
  return (
    <AlertDialog open={abierto} onOpenChange={(v) => !v && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorTexto error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pendiente}
            onClick={(e) => { e.preventDefault(); onConfirmar() }}
          >
            {pendiente ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * El PDF de un registro: abrirlo si hay, subir uno (o reemplazarlo) si se puede.
 * Subir otro no borra el anterior en el servidor; solo deja de mostrarse.
 */
export function BotonArchivo({
  tipo, id, tieneArchivo, nombre, puedeSubir,
}: {
  tipo: TipoArchivo
  id: string
  tieneArchivo: boolean
  nombre: string | null
  puedeSubir: boolean
}) {
  const subir = useSubirArchivo()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = ""
    if (!archivo) return
    setError(null)
    try {
      await subir.mutateAsync({ tipo, id, archivo })
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function abrir() {
    setError(null)
    try { await abrirArchivo(tipo, id) } catch (err) { setError((err as Error).message) }
  }

  return (
    <span className="inline-flex items-center gap-1" title={error ?? undefined}>
      {tieneArchivo && (
        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-700" onClick={abrir} title={nombre ?? "Ver PDF"}>
          <FileText className="h-4 w-4" />
        </Button>
      )}
      {puedeSubir && (
        <>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onArchivo} />
          <Button
            size="icon" variant="ghost" className="h-8 w-8"
            disabled={subir.isPending}
            onClick={() => input.current?.click()}
            title={tieneArchivo ? "Reemplazar el PDF" : "Subir el PDF"}
          >
            {subir.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
        </>
      )}
      {error && <span className="text-xs text-red-600 max-w-40 truncate">{error}</span>}
    </span>
  )
}
