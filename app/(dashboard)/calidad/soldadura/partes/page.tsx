"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import {
  intervenciones as apiInt, partes as apiPartes, useIntervenciones, usePartes, useRolesFirma, useTareasCatalogo,
} from "@/features/soldadura/api/use-cierre"
import { ROL_PARTE_LABEL, RolParte, type Intervencion, type Parte } from "@/features/soldadura/types-cierre"
import { CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia, numero, texto, usePermisosSoldadura } from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FormParte { id?: string; nombre: string; rol: RolParte; rolFirma: string }
interface FormInt { id?: string; tareaId: string; parteId: string; codigo: string; obligatoria: boolean; horas: string }

const CODIGOS = ["HP", "W", "RD", "IV", "SPOT"]

/**
 * Quién interviene en el control —QC de la contratista, QA del cliente, inspección de
 * tercera parte— y en qué tareas del PIE. Un punto de espera (obligatorio) suma la firma
 * de esa parte al registro de la tarea; los demás solo la ponen en la agenda.
 */
export default function PartesPage() {
  const partes = usePartes()
  const ints = useIntervenciones()
  const tareas = useTareasCatalogo()
  const roles = useRolesFirma()
  const crearParte = apiPartes.useCreate()
  const editarParte = apiPartes.useUpdate()
  const borrarParte = apiPartes.useDelete()
  const crearInt = apiInt.useCreate()
  const editarInt = apiInt.useUpdate()
  const borrarInt = apiInt.useDelete()
  const { parametros } = usePermisosSoldadura()

  const [fp, setFp] = useState<FormParte | null>(null)
  const [fi, setFi] = useState<FormInt | null>(null)
  const [borrarP, setBorrarP] = useState<Parte | null>(null)
  const [borrarI, setBorrarI] = useState<Intervencion | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardarParte() {
    if (!fp) return
    setError(null)
    const d = { nombre: fp.nombre.trim(), rol: fp.rol, rolFirma: fp.rolFirma.trim() }
    try {
      if (fp.id) await editarParte.mutateAsync({ id: fp.id, ...d })
      else await crearParte.mutateAsync(d)
      setFp(null)
    } catch (e) { setError((e as Error).message) }
  }

  async function guardarInt() {
    if (!fi) return
    setError(null)
    const d = { tareaId: fi.tareaId, parteId: fi.parteId, codigo: fi.codigo.trim(), obligatoria: fi.obligatoria, horasAvisoPrevio: numero(fi.horas) }
    try {
      if (fi.id) await editarInt.mutateAsync({ id: fi.id, ...d })
      else await crearInt.mutateAsync(d)
      setFi(null)
    } catch (e) { setError((e as Error).message) }
  }

  const pendiente = crearParte.isPending || editarParte.isPending || crearInt.isPending || editarInt.isPending

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Partes e intervenciones"
        descripcion="Las partes que intervienen en el control y su participación en cada tarea del PIE. Un punto de espera hace obligatoria la firma de la parte en el registro de la tarea; las demás intervenciones la avisan en la agenda de puntos de inspección."
      />

      {/* ── Partes ──────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Partes</h2>
          <Button size="sm" className="gap-2" disabled={!parametros} onClick={() => { setError(null); setFp({ nombre: "", rol: RolParte.QaCliente, rolFirma: "" }) }}>
            <Plus className="h-4 w-4" /> Nueva parte
          </Button>
        </div>
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Parte</TableHead>
                <TableHead className="font-semibold text-gray-700">Rol</TableHead>
                <TableHead className="font-semibold text-gray-700">Firma como</TableHead>
                <TableHead className="w-32 font-semibold text-gray-700 text-right">Intervenciones</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partes.isLoading || (partes.data ?? []).length === 0 ? (
                <FilaVacia columnas={5} cargando={partes.isLoading} vacio="No hay partes cargadas." />
              ) : (partes.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-sm">{ROL_PARTE_LABEL[p.rol]}</TableCell>
                  <TableCell className="text-sm">{p.rolFirma}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.intervenciones}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} title="Editar"
                      onClick={() => { setError(null); setFp({ id: p.id, nombre: p.nombre, rol: p.rol, rolFirma: p.rolFirma }) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros || p.intervenciones > 0}
                      title={p.intervenciones > 0 ? "La parte interviene en tareas." : "Eliminar"} onClick={() => { setError(null); setBorrarP(p) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Intervenciones ──────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Intervenciones por tarea</h2>
          <Button size="sm" className="gap-2" disabled={!parametros || (partes.data ?? []).length === 0}
            onClick={() => { setError(null); setFi({ tareaId: "", parteId: partes.data?.[0]?.id ?? "", codigo: "HP", obligatoria: true, horas: "24" }) }}>
            <Plus className="h-4 w-4" /> Nueva intervención
          </Button>
        </div>
        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-gray-700">Tarea</TableHead>
                <TableHead className="font-semibold text-gray-700">Parte</TableHead>
                <TableHead className="w-24 font-semibold text-gray-700">Código</TableHead>
                <TableHead className="w-40 font-semibold text-gray-700">Efecto</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700 text-right">Aviso previo</TableHead>
                <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ints.isLoading || (ints.data ?? []).length === 0 ? (
                <FilaVacia columnas={6} cargando={ints.isLoading} vacio="No hay intervenciones cargadas." />
              ) : (ints.data ?? []).map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-1.5">{i.tareaCodigo}</span>{i.tareaNombre}</TableCell>
                  <TableCell className="text-sm">{i.parteNombre}</TableCell>
                  <TableCell className="font-mono font-medium">{i.codigo}</TableCell>
                  <TableCell className="text-sm">{i.obligatoria ? <span className="text-red-700">Punto de espera: firma obligatoria</span> : "Aviso"}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{i.horasAvisoPrevio != null ? `${i.horasAvisoPrevio} h` : "—"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} title="Editar"
                      onClick={() => { setError(null); setFi({ id: i.id, tareaId: i.tareaId, parteId: i.parteId, codigo: i.codigo, obligatoria: i.obligatoria, horas: texto(i.horasAvisoPrevio) }) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros} title="Eliminar" onClick={() => { setError(null); setBorrarI(i) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* ── Sheet de parte ──────────────────────────────────────────── */}
      <Sheet open={fp !== null} onOpenChange={(v) => !v && setFp(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fp?.id ? "Editar parte" : "Nueva parte"}</SheetTitle>
            <SheetDescription>El rol de firma es el nombre con el que esta parte firma los registros del proyecto.</SheetDescription>
          </SheetHeader>
          {fp && (
            <div className="mt-6 px-4 space-y-3">
              <Campo label="Nombre"><Input value={fp.nombre} onChange={(e) => setFp({ ...fp, nombre: e.target.value })} placeholder="Inspección OPS" /></Campo>
              <Campo label="Rol">
                <select value={fp.rol} onChange={(e) => setFp({ ...fp, rol: Number(e.target.value) as RolParte })} className={CLASE_SELECT}>
                  {Object.entries(ROL_PARTE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Campo>
              <Campo label="Firma como" ayuda={(roles.data ?? []).length > 0 ? "Los roles que ya usan las firmas del proyecto aparecen como sugerencia." : "El proyecto todavía no tiene roles de firma configurados."}>
                <Input value={fp.rolFirma} onChange={(e) => setFp({ ...fp, rolFirma: e.target.value })} list="roles-firma" />
                <datalist id="roles-firma">{(roles.data ?? []).map((r) => <option key={r} value={r} />)}</datalist>
              </Campo>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardarParte} disabled={!fp.nombre.trim() || !fp.rolFirma.trim() || pendiente}>{pendiente ? "Guardando..." : "Guardar"}</Button>
                <Button variant="outline" className="flex-1" onClick={() => setFp(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Sheet de intervención ───────────────────────────────────── */}
      <Sheet open={fi !== null} onOpenChange={(v) => !v && setFi(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{fi?.id ? "Editar intervención" : "Nueva intervención"}</SheetTitle>
            <SheetDescription>Una por parte y tarea. El código es libre: se usan los del PIE del cliente.</SheetDescription>
          </SheetHeader>
          {fi && (
            <div className="mt-6 px-4 space-y-3">
              <Campo label="Tarea del catálogo">
                <select value={fi.tareaId} onChange={(e) => setFi({ ...fi, tareaId: e.target.value })} className={CLASE_SELECT}>
                  <option value="">Elegí…</option>
                  {(tareas.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.codigo} — {t.nombre}{t.elementoTipo ? ` (${t.elementoTipo})` : ""}</option>)}
                </select>
              </Campo>
              <Campo label="Parte">
                <select value={fi.parteId} onChange={(e) => setFi({ ...fi, parteId: e.target.value })} className={CLASE_SELECT}>
                  {(partes.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Código">
                  <Input value={fi.codigo} onChange={(e) => setFi({ ...fi, codigo: e.target.value })} list="codigos-intervencion" className="font-mono uppercase" />
                  <datalist id="codigos-intervencion">{CODIGOS.map((c) => <option key={c} value={c} />)}</datalist>
                </Campo>
                <Campo label="Aviso previo (horas)"><Input value={fi.horas} onChange={(e) => setFi({ ...fi, horas: e.target.value })} inputMode="numeric" /></Campo>
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 mt-0.5 accent-blue-600" checked={fi.obligatoria} onChange={(e) => setFi({ ...fi, obligatoria: e.target.checked })} />
                <span>Punto de espera: la tarea no queda firmada sin la firma de esta parte.</span>
              </label>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardarInt} disabled={!fi.tareaId || !fi.parteId || !fi.codigo.trim() || pendiente}>{pendiente ? "Guardando..." : "Guardar"}</Button>
                <Button variant="outline" className="flex-1" onClick={() => setFi(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmarBorrado
        abierto={borrarP !== null}
        titulo="Eliminar parte"
        descripcion={<>¿Eliminar la parte <strong>{borrarP?.nombre}</strong>?</>}
        pendiente={borrarParte.isPending}
        error={error}
        onCancelar={() => setBorrarP(null)}
        onConfirmar={async () => { try { await borrarParte.mutateAsync(borrarP!.id); setBorrarP(null) } catch (e) { setError((e as Error).message) } }}
      />
      <ConfirmarBorrado
        abierto={borrarI !== null}
        titulo="Eliminar intervención"
        descripcion={<>¿Quitar a <strong>{borrarI?.parteNombre}</strong> de <strong>{borrarI?.tareaNombre}</strong>? Los registros que ya tienen su firma la conservan.</>}
        pendiente={borrarInt.isPending}
        error={error}
        onCancelar={() => setBorrarI(null)}
        onConfirmar={async () => { try { await borrarInt.mutateAsync(borrarI!.id); setBorrarI(null) } catch (e) { setError((e as Error).message) } }}
      />
    </div>
  )
}
