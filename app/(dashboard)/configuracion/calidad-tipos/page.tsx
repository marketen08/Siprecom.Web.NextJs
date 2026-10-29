"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  useCreateNcTipo,
  useDeleteNcTipo,
  useGetNcTiposAbm,
  useUpdateNcTipo,
} from "@/features/no-conformidades/api/use-catalogos-abm"

import {
  AvisoCatalogoSoloLectura,
  useCatalogoSoloLectura,
} from "@/components/catalogo-solo-lectura"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

/** Lo que se edita en el sheet. `codigo` sólo se escribe en el alta. */
interface Formulario {
  mode: "new" | "edit"
  id?: string
  codigo: string
  nombre: string
  descripcion: string
  bloqueaCertificado: boolean
  orden: number
}

const VACIO: Formulario = {
  mode: "new",
  codigo: "",
  nombre: "",
  descripcion: "",
  bloqueaCertificado: false,
  orden: 0,
}

export default function CalidadTiposPage() {
  const { data, isLoading } = useGetNcTiposAbm()
  const create = useCreateNcTipo()
  const update = useUpdateNcTipo()
  const remove = useDeleteNcTipo()

  // Catálogo global: el Admin lo ve, lo administra AdminGlobal. Ver el componente.
  const { soloLectura, motivo } = useCatalogoSoloLectura()

  const items = data?.data ?? []
  const [sheet, setSheet] = useState<Formulario | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nombre: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const puedeGuardar =
    sheet !== null &&
    sheet.nombre.trim() !== "" &&
    (sheet.mode === "edit" || sheet.codigo.trim() !== "")

  async function guardar() {
    if (!sheet || !puedeGuardar) return
    setError(null)
    const payload = {
      codigo: sheet.codigo.trim().toUpperCase(),
      nombre: sheet.nombre.trim(),
      descripcion: sheet.descripcion.trim() || null,
      bloqueaCertificado: sheet.bloqueaCertificado,
      orden: Number.isFinite(sheet.orden) ? sheet.orden : 0,
    }
    try {
      if (sheet.mode === "new") await create.mutateAsync(payload)
      else await update.mutateAsync({ id: sheet.id!, ...payload })
      setSheet(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function eliminar() {
    if (!confirmDelete) return
    setError(null)
    try {
      await remove.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tipos de informe</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Las clases de informe que puede abrir el módulo de calidad: no conformidad,
            solicitud de acción correctiva, observación. El código es el prefijo del
            número de cada informe (NC-0007).
          </p>
        </div>
        <Button
          onClick={() => setSheet({ ...VACIO, orden: items.length })}
          disabled={soloLectura}
          title={motivo}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo tipo
        </Button>
      </div>

      <AvisoCatalogoSoloLectura
        que="los tipos de informe de calidad"
        porQue="Son las opciones que elige tu gente al abrir un informe."
      />

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24 font-semibold text-gray-700">Código</TableHead>
              <TableHead className="font-semibold text-gray-700">Nombre</TableHead>
              <TableHead className="font-semibold text-gray-700">Descripción</TableHead>
              <TableHead className="w-44 font-semibold text-gray-700">Certificado</TableHead>
              <TableHead className="w-20 font-semibold text-gray-700 text-right">Orden</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No hay tipos cargados.</TableCell></TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono font-medium">{t.codigo}</TableCell>
                  <TableCell className="font-medium">
                    {t.nombre}
                    {t.enUso && (
                      <span className="ml-2 text-xs text-muted-foreground">en uso</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.descripcion || "—"}
                  </TableCell>
                  <TableCell>
                    {t.bloqueaCertificado ? (
                      <Badge variant="destructive">Bloquea emisión</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">No bloquea</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.orden}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      disabled={soloLectura} title={motivo}
                      onClick={() => setSheet({
                        mode: "edit",
                        id: t.id,
                        codigo: t.codigo,
                        nombre: t.nombre,
                        descripcion: t.descripcion ?? "",
                        bloqueaCertificado: t.bloqueaCertificado,
                        orden: t.orden,
                      })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {/* En uso = hay informes vivos de este tipo. El backend lo rechaza
                        igual; apagar el botón evita el viaje y explica por qué. */}
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 text-red-600"
                      disabled={soloLectura || t.enUso}
                      title={
                        t.enUso
                          ? "Hay informes usando este tipo. Se puede eliminar cuando ninguno quede activo."
                          : motivo
                      }
                      onClick={() => setConfirmDelete({ id: t.id, nombre: t.nombre })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">{items.length} tipos</p>

      <Sheet open={sheet !== null} onOpenChange={(v) => !v && setSheet(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheet?.mode === "new" ? "Nuevo tipo" : "Editar tipo"}</SheetTitle>
            <SheetDescription>
              El tipo define cómo se numera el informe y si un informe abierto frena la
              emisión del certificado del subsistema.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Código</label>
              <Input
                value={sheet?.codigo ?? ""}
                onChange={(e) => setSheet(sheet ? { ...sheet, codigo: e.target.value } : sheet)}
                placeholder="Ej: NC"
                maxLength={10}
                disabled={sheet?.mode === "edit"}
                className="mt-1 font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {sheet?.mode === "edit"
                  ? "No se puede cambiar: está impreso en el número de los informes ya emitidos y en los PDF que circularon."
                  : "Prefijo del número de informe. Dos o tres letras."}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={sheet?.nombre ?? ""}
                onChange={(e) => setSheet(sheet ? { ...sheet, nombre: e.target.value } : sheet)}
                placeholder="Ej: No conformidad"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={sheet?.descripcion ?? ""}
                onChange={(e) => setSheet(sheet ? { ...sheet, descripcion: e.target.value } : sheet)}
                placeholder="Cuándo corresponde usar este tipo"
                rows={3}
                className="mt-1"
              />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600"
                checked={sheet?.bloqueaCertificado ?? false}
                onChange={(e) =>
                  setSheet(sheet ? { ...sheet, bloqueaCertificado: e.target.checked } : sheet)
                }
              />
              <span>
                Bloquea la emisión del certificado
                <span className="block text-xs text-muted-foreground">
                  Un informe abierto de este tipo impide certificar el subsistema donde está
                  el hallazgo.
                </span>
              </span>
            </label>
            <div>
              <label className="text-sm font-medium">Orden</label>
              <Input
                type="number"
                value={sheet?.orden ?? 0}
                onChange={(e) =>
                  setSheet(sheet ? { ...sheet, orden: Number(e.target.value) } : sheet)
                }
                className="mt-1 w-24"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Posición en el select del formulario. El más chico primero.
              </p>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={guardar}
                disabled={!puedeGuardar || create.isPending || update.isPending}
                className="flex-1"
              >
                {create.isPending || update.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" onClick={() => setSheet(null)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar el tipo <strong>{confirmDelete?.nombre}</strong>? Deja de ofrecerse
              al abrir un informe; los informes ya emitidos con este tipo no se tocan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => { e.preventDefault(); eliminar() }}
            >
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
