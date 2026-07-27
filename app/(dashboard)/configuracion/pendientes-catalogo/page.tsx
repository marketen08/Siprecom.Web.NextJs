"use client"

import { useMemo, useState } from "react"
import { FileSpreadsheet, Pencil, Plus, Trash2, Search } from "lucide-react"

import {
  useCreatePendienteCatalogo,
  useDeletePendienteCatalogo,
  useGetPendienteCatalogo,
  useUpdatePendienteCatalogo,
} from "@/features/pendientes/api/use-catalogo-maestro"
import { ImportCatalogoDialog } from "@/features/pendientes/components/import-catalogo-dialog"
import {
  useGetPendienteAcciones,
  useGetPendienteCategorias,
  useGetPendienteMotivos,
  useGetPendienteTipos,
} from "@/features/pendientes/api/use-catalogos"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"

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

interface SheetState {
  mode: "new" | "edit"
  id?: string
  nivelId: string
  especialidadId: string
  tipoId: string
  accionId: string
  motivoId: string
  categoriaId: string
  descripcion: string
}

const EMPTY_SHEET: Omit<SheetState, "mode"> = {
  nivelId: "", especialidadId: "", tipoId: "", accionId: "", motivoId: "",
  categoriaId: "", descripcion: "",
}

export default function PendientesCatalogoPage() {
  const { data, isLoading } = useGetPendienteCatalogo()
  const { data: nivelesRaw } = useGetNivelesSelect()
  const { data: especialidadesRaw } = useGetEspecialidades()
  const { data: tiposRaw } = useGetPendienteTipos()
  const { data: accionesRaw } = useGetPendienteAcciones()
  const { data: motivosRaw } = useGetPendienteMotivos()
  const { data: categoriasRaw } = useGetPendienteCategorias()

  const niveles = nivelesRaw?.data ?? []
  const especialidades = especialidadesRaw?.data ?? []
  const tipos = tiposRaw?.data ?? []
  const acciones = accionesRaw?.data ?? []
  const motivos = motivosRaw?.data ?? []
  const categorias = categoriasRaw?.data ?? []

  const create = useCreatePendienteCatalogo()
  const update = useUpdatePendienteCatalogo()
  const remove = useDeletePendienteCatalogo()

  const items = data?.data ?? []
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      const linea = [
        it.nivelNombre, it.especialidadNombre, it.tipoNombre,
        it.accionNombre, it.motivoNombre, it.categoriaNombre, it.descripcion,
      ].filter(Boolean).join(" ").toLowerCase()
      return linea.includes(q)
    })
  }, [items, search])

  const puedeGuardar = sheet
    && sheet.nivelId && sheet.especialidadId && sheet.tipoId
    && sheet.accionId && sheet.motivoId && sheet.categoriaId
    && sheet.descripcion.trim()

  async function guardar() {
    if (!puedeGuardar || !sheet) return
    setError(null)
    const payload = {
      nivelId: sheet.nivelId,
      especialidadId: sheet.especialidadId,
      tipoId: sheet.tipoId,
      accionId: sheet.accionId,
      motivoId: sheet.motivoId,
      categoriaId: sheet.categoriaId,
      descripcion: sheet.descripcion.trim(),
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Catálogo maestro de pendientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Combinaciones de Nivel + Especialidad + Tipo + Acción + Motivo que alimentan
            automáticamente la Descripción y Categoría del pendiente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2 whitespace-nowrap"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Importar Excel
          </Button>
          <Button
            onClick={() => setSheet({ mode: "new", ...EMPTY_SHEET })}
            className="gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Nueva entrada
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre de dimensión, categoría o descripción..."
          className="h-9"
        />
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Nivel</TableHead>
              <TableHead className="font-semibold text-gray-700">Especialidad</TableHead>
              <TableHead className="font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="font-semibold text-gray-700">Acción</TableHead>
              <TableHead className="font-semibold text-gray-700">Motivo</TableHead>
              <TableHead className="font-semibold text-gray-700">Categoría</TableHead>
              <TableHead className="font-semibold text-gray-700 min-w-[260px]">Descripción</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  {items.length === 0
                    ? "No hay entradas en el catálogo. Creá la primera para que el wizard autopoble descripciones."
                    : "Sin resultados para tu búsqueda."}
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="text-sm">{it.nivelNombre}</TableCell>
                  <TableCell className="text-sm">{it.especialidadNombre}</TableCell>
                  <TableCell className="text-sm">{it.tipoNombre}</TableCell>
                  <TableCell className="text-sm">{it.accionNombre}</TableCell>
                  <TableCell className="text-sm">{it.motivoNombre}</TableCell>
                  <TableCell className="text-sm font-medium">{it.categoriaNombre}</TableCell>
                  <TableCell className="text-sm">
                    <span className="line-clamp-2 max-w-md">{it.descripcion}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        setSheet({
                          mode: "edit",
                          id: it.id,
                          nivelId: it.nivelId,
                          especialidadId: it.especialidadId,
                          tipoId: it.tipoId,
                          accionId: it.accionId,
                          motivoId: it.motivoId,
                          categoriaId: it.categoriaId,
                          descripcion: it.descripcion,
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-600"
                      onClick={() => setConfirmDelete({
                        id: it.id,
                        label: `${it.nivelNombre} · ${it.especialidadNombre} · ${it.tipoNombre} · ${it.accionNombre} · ${it.motivoNombre}`,
                      })}
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

      <p className="text-sm text-muted-foreground">
        {filtrados.length} de {items.length} entradas
      </p>

      <Sheet open={sheet !== null} onOpenChange={(v) => !v && setSheet(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheet?.mode === "new" ? "Nueva entrada del catálogo" : "Editar entrada"}</SheetTitle>
            <SheetDescription>
              Cargá una combinación única de las 5 dimensiones + la Descripción y Categoría
              que deben autopoblarse cuando el operador la elige en el wizard.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 px-4 space-y-3">
            <SelectRow label="Nivel *" value={sheet?.nivelId ?? ""} onChange={(v) => setSheet(sheet ? { ...sheet, nivelId: v } : sheet)}
              options={niveles.map((n) => ({ id: n.id, label: n.nombre }))} placeholder="Elegí nivel" />

            <SelectRow label="Especialidad *" value={sheet?.especialidadId ?? ""} onChange={(v) => setSheet(sheet ? { ...sheet, especialidadId: v } : sheet)}
              options={especialidades.map((e) => ({ id: e.id, label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre }))} placeholder="Elegí especialidad" />

            <SelectRow label="Tipo *" value={sheet?.tipoId ?? ""} onChange={(v) => setSheet(sheet ? { ...sheet, tipoId: v } : sheet)}
              options={tipos.map((t) => ({ id: t.id, label: t.tipo }))} placeholder="Elegí tipo" />

            <SelectRow label="Acción *" value={sheet?.accionId ?? ""} onChange={(v) => setSheet(sheet ? { ...sheet, accionId: v } : sheet)}
              options={acciones.map((a) => ({ id: a.id, label: a.nombre }))} placeholder="Elegí acción" />

            <SelectRow label="Motivo *" value={sheet?.motivoId ?? ""} onChange={(v) => setSheet(sheet ? { ...sheet, motivoId: v } : sheet)}
              options={motivos.map((m) => ({ id: m.id, label: m.nombre }))} placeholder="Elegí motivo" />

            <div className="border-t pt-3">
              <SelectRow label="Categoría *" value={sheet?.categoriaId ?? ""} onChange={(v) => setSheet(sheet ? { ...sheet, categoriaId: v } : sheet)}
                options={categorias.map((c) => ({ id: c.id, label: c.nombre }))} placeholder="Elegí categoría" />

              <div className="mt-3">
                <label className="text-sm font-medium">Descripción *</label>
                <Textarea
                  value={sheet?.descripcion ?? ""}
                  onChange={(e) => setSheet(sheet ? { ...sheet, descripcion: e.target.value } : sheet)}
                  placeholder="Texto que se autopoblará en el pendiente cuando matchee esta combinación..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={guardar}
                disabled={!puedeGuardar || create.isPending || update.isPending}
                className="flex-1"
              >
                {create.isPending || update.isPending ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" onClick={() => setSheet(null)} className="flex-1">Cancelar</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrada del catálogo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar <strong>{confirmDelete?.label}</strong>?
              Los pendientes ya creados con esta combinación no se ven afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={remove.isPending} onClick={(e) => { e.preventDefault(); eliminar() }}>
              {remove.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportCatalogoDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}

// ── Helper: fila select uniforme ───────────────────────────────────────
interface SelectRowProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { id: string; label: string }[]
  placeholder: string
}
function SelectRow({ label, value, onChange, options, placeholder }: SelectRowProps) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-input bg-white px-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
