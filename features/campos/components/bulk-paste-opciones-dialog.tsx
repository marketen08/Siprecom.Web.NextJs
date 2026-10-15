"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { slugifyCodigoCampo } from "../lib/slugify-codigo"

type Modo = "append" | "replace"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Valores ya presentes (para detectar colisiones en modo "append").
   * Comparación case-insensitive vs el `valor` generado.
   */
  existingValores: string[]
  /**
   * Si `true`, muestra la opción "Reemplazar todas". Para el editor persisted
   * lo dejamos en `false` — más simple y evita bulk delete parcial.
   */
  allowReplace?: boolean
  /**
   * Callback con las opciones a insertar (ya deduplicadas contra existentes)
   * y el modo elegido. El caller decide cómo aplicar (append vs replace).
   */
  onConfirm: (
    nuevas: Array<{ valor: string; etiqueta: string }>,
    modo: Modo,
  ) => Promise<void> | void
  isPending?: boolean
}

/**
 * Diálogo para pegar opciones en lote a un campo Lista o Checklist.
 * Una línea por opción; el `valor` se autogenera con `slugifyCodigoCampo`
 * (max 30 chars). Muestra preview con estado por línea antes de confirmar.
 */
export function BulkPasteOpcionesDialog({
  open,
  onOpenChange,
  existingValores,
  allowReplace = false,
  onConfirm,
  isPending = false,
}: Props) {
  const [texto, setTexto] = useState("")
  const [modo, setModo] = useState<Modo>("append")

  // Reset al abrir para no cargar texto de una sesión anterior.
  useEffect(() => {
    if (open) {
      setTexto("")
      setModo("append")
    }
  }, [open])

  const existentes = useMemo(
    () => new Set(existingValores.map((v) => v.toUpperCase())),
    [existingValores],
  )

  const parsed = useMemo(() => {
    const lineas = texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    const vistas = new Set<string>()
    // En modo "replace" arrancamos con set vacío: los existentes van a
    // ser borrados al confirmar, entonces no colisionan.
    const seed = modo === "replace" ? new Set<string>() : new Set(existentes)

    return lineas.map((etiqueta) => {
      // Fallback si slugify vuelve vacío (ej. sólo símbolos).
      const valor =
        slugifyCodigoCampo(etiqueta, 30) || etiqueta.toUpperCase().slice(0, 30)
      const dupInterno = vistas.has(valor)
      const colision = !dupInterno && seed.has(valor)
      vistas.add(valor)
      return { valor, etiqueta, dupInterno, colision }
    })
  }, [texto, modo, existentes])

  const aInsertar = parsed.filter((i) => !i.dupInterno && !i.colision)
  const descartadas = parsed.length - aInsertar.length

  const handleConfirm = async () => {
    if (aInsertar.length === 0) return
    await onConfirm(
      aInsertar.map(({ valor, etiqueta }) => ({ valor, etiqueta })),
      modo,
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {/* Override del max-w-sm por defecto: el preview necesita más ancho. */}
      <AlertDialogContent className="sm:max-w-2xl!">
        <AlertDialogHeader>
          <AlertDialogTitle>Pegar opciones en lote</AlertDialogTitle>
          <AlertDialogDescription>
            Una opción por línea. El código técnico se genera automáticamente
            desde la etiqueta.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"Sí\nNo\nNo aplica"}
            rows={7}
            className="font-sans text-sm"
            disabled={isPending}
            autoFocus
          />

          {allowReplace && (
            <div className="flex flex-col gap-1.5 rounded-md border bg-gray-50/60 px-3 py-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="bulk-paste-modo"
                  value="append"
                  checked={modo === "append"}
                  onChange={() => setModo("append")}
                  disabled={isPending}
                  className="h-3.5 w-3.5"
                />
                <span>
                  Agregar al final{" "}
                  <span className="text-muted-foreground">
                    ({existingValores.length} existente{existingValores.length !== 1 ? "s" : ""})
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="bulk-paste-modo"
                  value="replace"
                  checked={modo === "replace"}
                  onChange={() => setModo("replace")}
                  disabled={isPending}
                  className="h-3.5 w-3.5"
                />
                <span className="text-amber-800">
                  Reemplazar todas las opciones existentes
                </span>
              </label>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="rounded-md border max-h-64 overflow-y-auto bg-white">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="border-b">
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600 w-40">
                      Código
                    </th>
                    <th className="text-left px-2 py-1.5 font-medium text-gray-600">
                      Etiqueta
                    </th>
                    <th className="text-right px-2 py-1.5 font-medium text-gray-600 w-24">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((it, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-t",
                        (it.dupInterno || it.colision) && "bg-amber-50/50",
                      )}
                    >
                      <td className="px-2 py-1 font-mono text-gray-700">
                        {it.valor}
                      </td>
                      <td className="px-2 py-1">{it.etiqueta}</td>
                      <td className="px-2 py-1 text-right">
                        {it.dupInterno ? (
                          <span className="text-amber-700 text-[10px] uppercase font-semibold">
                            duplicado
                          </span>
                        ) : it.colision ? (
                          <span className="text-amber-700 text-[10px] uppercase font-semibold">
                            ya existe
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[10px] uppercase font-semibold">
                            ok
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {descartadas > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {descartadas} línea{descartadas !== 1 ? "s" : ""} se descartan por
              duplicado interno o colisión con opciones existentes.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={aInsertar.length === 0 || isPending}
          >
            {isPending
              ? "Aplicando..."
              : `Aplicar ${aInsertar.length} ${aInsertar.length === 1 ? "opción" : "opciones"}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
