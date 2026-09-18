"use client"

import { useState } from "react"
import { AlertTriangle, Pencil, Plus, Trash2, Users } from "lucide-react"

import {
  useActualizarAmbito,
  useCrearAmbito,
  useEliminarAmbito,
  useGetPendientesAmbitos,
} from "@/features/pendientes-ambitos/api/use-pendientes-ambitos"
import { AudienciaAmbito, type PendienteAmbito } from "@/features/pendientes-ambitos/types"
import { COLORES_AMBITO, ICONOS_AMBITO, colorDeAmbito, iconoDeAmbito } from "@/features/pendientes-ambitos/presentacion"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"

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

interface FormState {
  mode: "new" | "edit"
  id?: string
  nombre: string
  descripcion: string
  audiencia: AudienciaAmbito
  orden: number
  esPrincipal: boolean
  icono: string | null
  color: string | null
  grupoIds: string[]
}

const VACIO: FormState = {
  mode: "new",
  nombre: "",
  descripcion: "",
  audiencia: AudienciaAmbito.SoloGrupos,
  orden: 10,
  esPrincipal: false,
  icono: null,
  color: "ambar",
  grupoIds: [],
}

export default function PendientesAmbitosPage() {
  const { data, isLoading } = useGetPendientesAmbitos()
  const { data: gruposResp } = useGetUsuariosGrupos("pendientes")
  const crear = useCrearAmbito()
  const actualizar = useActualizarAmbito()
  const eliminar = useEliminarAmbito()

  const ambitos = data?.data ?? []
  const grupos = gruposResp?.data ?? []
  const [form, setForm] = useState<FormState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<PendienteAmbito | null>(null)
  const [error, setError] = useState<string | null>(null)

  function abrirEdicion(a: PendienteAmbito) {
    setError(null)
    setForm({
      mode: "edit",
      id: a.id,
      nombre: a.nombre,
      descripcion: a.descripcion ?? "",
      audiencia: a.audiencia,
      orden: a.orden,
      esPrincipal: a.esPrincipal,
      icono: a.icono,
      color: a.color ?? "ambar",
      grupoIds: a.grupos.map((g) => g.grupoId),
    })
  }

  async function guardar() {
    if (!form || !form.nombre.trim()) return
    setError(null)
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      audiencia: form.audiencia,
      orden: form.orden,
      esPrincipal: form.esPrincipal,
      icono: form.icono,
      color: form.icono ? form.color : null,
      grupoIds: form.audiencia === AudienciaAmbito.SoloGrupos ? form.grupoIds : [],
    }
    try {
      if (form.mode === "new") await crear.mutateAsync(payload)
      else await actualizar.mutateAsync({ id: form.id!, payload })
      setForm(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function borrar() {
    if (!confirmDelete) return
    setError(null)
    try {
      await eliminar.mutateAsync(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function toggleGrupo(id: string) {
    setForm((prev) => {
      if (!prev) return prev
      const set = new Set(prev.grupoIds)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, grupoIds: Array.from(set) }
    })
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Ámbitos de pendientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Clasifican los pendientes y definen quién los ve. Son globales: valen para todos los
            proyectos. Lo que se configura por proyecto es qué puede hacer cada grupo dentro del
            ámbito.
          </p>
        </div>
        <Button onClick={() => { setError(null); setForm(VACIO) }} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo ámbito
        </Button>
      </div>

      {error && !form && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ámbito</TableHead>
              <TableHead>Audiencia</TableHead>
              <TableHead className="w-28 text-center">Orden</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground py-6">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && ambitos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground italic py-6">
                  No hay ámbitos cargados.
                </TableCell>
              </TableRow>
            )}
            {ambitos.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="align-top">
                  <div className="flex items-center gap-2">
                    {/* La marca real con la que se va a ver en los listados — no un
                        ícono decorativo. Sin ícono configurado no se muestra nada,
                        que es exactamente lo que va a pasar en el listado. */}
                    {(() => {
                      const Icon = iconoDeAmbito(a.icono)
                      return Icon ? (
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorDeAmbito(a.color).text}`} />
                      ) : null
                    })()}
                    <span className="font-medium">{a.nombre}</span>
                    {a.esPrincipal && (
                      <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-800 border border-blue-200 rounded px-1.5 py-0.5">
                        Principal
                      </span>
                    )}
                  </div>
                  {a.descripcion && (
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{a.descripcion}</p>
                  )}
                </TableCell>
                <TableCell className="align-top text-sm">
                  {a.audiencia === AudienciaAmbito.TodoElProyecto ? (
                    <span className="text-muted-foreground">Todos los del proyecto</span>
                  ) : a.grupos.length === 0 ? (
                    // Un ámbito restringido sin grupos no lo ve nadie. Se muestra con la
                    // advertencia en vez de esconderlo: un ámbito listado con la audiencia
                    // vacía se explica solo; uno que desaparece deja al admin sin pistas.
                    <span className="inline-flex items-start gap-1.5 text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="text-xs">
                        Sin grupos: no lo ve nadie y no se ofrece al crear pendientes.
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-start gap-1.5">
                      <Users className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="text-xs">
                        {a.grupos.map((g) => g.grupoNombre).join(", ")}
                      </span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top text-center tabular-nums text-sm">{a.orden}</TableCell>
                <TableCell className="align-top">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicion(a)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setError(null); setConfirmDelete(a) }}
                      disabled={a.esPrincipal}
                      title={a.esPrincipal ? "El ámbito principal no se puede eliminar" : "Eliminar"}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.mode === "new" ? "Nuevo ámbito" : "Editar ámbito"}</SheetTitle>
            <SheetDescription>
              La audiencia define quién ve los pendientes de este ámbito. Se combina con el acceso
              al proyecto: alguien que no está en el proyecto no ve nada, esté donde esté.
            </SheetDescription>
          </SheetHeader>

          {form && (
            <div className="px-4 pb-8 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej.: Directorio"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Se muestra en el selector al crear un pendiente."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Audiencia</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 rounded-md border bg-white px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      className="mt-1 accent-blue-900"
                      checked={form.audiencia === AudienciaAmbito.TodoElProyecto}
                      onChange={() => setForm({ ...form, audiencia: AudienciaAmbito.TodoElProyecto })}
                    />
                    <span>
                      <span className="text-sm font-medium">Todos los del proyecto</span>
                      <span className="block text-xs text-muted-foreground">
                        Sin lista que mantener: alcanza con tener acceso al proyecto.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 rounded-md border bg-white px-3 py-2 cursor-pointer">
                    <input
                      type="radio"
                      className="mt-1 accent-blue-900"
                      checked={form.audiencia === AudienciaAmbito.SoloGrupos}
                      onChange={() => setForm({ ...form, audiencia: AudienciaAmbito.SoloGrupos })}
                    />
                    <span>
                      <span className="text-sm font-medium">Solo estos grupos</span>
                      <span className="block text-xs text-muted-foreground">
                        Además del creador, el responsable y los roles Admin+, que siempre ven.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {form.audiencia === AudienciaAmbito.SoloGrupos && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Grupos de la audiencia</label>
                  {grupos.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No hay grupos declarados para uso en Pendientes.
                    </p>
                  ) : (
                    <div className="rounded-md border divide-y max-h-64 overflow-y-auto">
                      {grupos.map((g) => (
                        <label key={g.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-blue-900"
                            checked={form.grupoIds.includes(g.id)}
                            onChange={() => toggleGrupo(g.id)}
                          />
                          <span className="text-sm">{g.nombre}</span>
                          <span className="text-xs text-muted-foreground tabular-nums ml-auto">
                            {g.cantidadMiembros} miembro{g.cantidadMiembros !== 1 ? "s" : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {form.grupoIds.length === 0 && (
                    <p className="text-xs text-amber-700 flex items-start gap-1.5 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      Sin grupos, este ámbito no lo ve nadie y no se ofrece al crear pendientes.
                    </p>
                  )}
                </div>
              )}

              {/* Marca del ámbito en los listados. Sin ícono no se dibuja nada —
                  así el principal no mancha todas las filas, pero es decisión del
                  admin y no una regla clavada en el código. */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Marca en los listados</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, icono: null })}
                    className={`rounded-md border px-2.5 py-1.5 text-xs ${
                      !form.icono ? "border-blue-600 bg-blue-50 font-medium" : "bg-white"
                    }`}
                  >
                    Sin marca
                  </button>
                  {ICONOS_AMBITO.map(({ clave, label, Icon }) => (
                    <button
                      key={clave}
                      type="button"
                      title={label}
                      aria-label={label}
                      onClick={() => setForm({ ...form, icono: clave })}
                      className={`rounded-md border p-2 ${
                        form.icono === clave ? "border-blue-600 bg-blue-50" : "bg-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${colorDeAmbito(form.color).text}`} />
                    </button>
                  ))}
                </div>

                {form.icono && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground mr-1">Color:</span>
                    {COLORES_AMBITO.map((c) => (
                      <button
                        key={c.clave}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        onClick={() => setForm({ ...form, color: c.clave })}
                        className={`h-6 w-6 rounded-full ${c.swatch} ${
                          (form.color ?? "ambar") === c.clave
                            ? "ring-2 ring-offset-2 ring-blue-600"
                            : ""
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Orden</label>
                  <Input
                    type="number"
                    value={form.orden}
                    onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Principal</label>
                  <label className="flex items-center gap-2 h-9">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-900"
                      checked={form.esPrincipal}
                      disabled={form.mode === "edit" && form.esPrincipal}
                      onChange={(e) => setForm({ ...form, esPrincipal: e.target.checked })}
                    />
                    <span className="text-xs text-muted-foreground">
                      Ámbito por defecto al crear y en reportes.
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 whitespace-pre-line">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button onClick={guardar} disabled={crear.isPending || actualizar.isPending}>
                  Guardar
                </Button>
                <Button variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ámbito</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar <span className="font-medium">{confirmDelete?.nombre}</span>? No se puede
              si hay pendientes clasificados en él o si algún proyecto tiene autorizaciones
              configuradas para este ámbito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 whitespace-pre-line">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); borrar() }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
