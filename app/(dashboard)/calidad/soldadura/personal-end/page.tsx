"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { personalEnd as api } from "@/features/soldadura/api/use-soldadura"
import { METODOS_END, NIVELES_END, fechaCorta, soloFecha, type PersonalEnd } from "@/features/soldadura/types"
import {
  BotonArchivo, CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, EstadoBadge, FilaVacia,
  opcional, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Form {
  id?: string
  nombre: string
  documento: string
  empresa: string
  metodo: string
  nivel: string
  normaCertificacion: string
  numeroCertificado: string
  vence: string
}

const VACIO: Form = {
  nombre: "", documento: "", empresa: "", metodo: "RT", nivel: "II",
  normaCertificacion: "ISO 9712", numeroCertificado: "", vence: "",
}

/**
 * Personal calificado para hacer o evaluar ensayos no destructivos. Es un punto de
 * espera del PIE ("Revisión de Calificación de END"). Es por proyecto: suele ser el
 * personal del laboratorio contratado para la obra. Una misma persona aparece una vez
 * por cada método en que está certificada.
 */
export default function PersonalEndPage() {
  const { data, isLoading } = api.useList()
  const crear = api.useCreate()
  const actualizar = api.useUpdate()
  const borrar = api.useDelete()
  const { padron } = usePermisosSoldadura()

  const [form, setForm] = useState<Form | null>(null)
  const [aBorrar, setABorrar] = useState<PersonalEnd | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lista = data ?? []

  async function guardar() {
    if (!form) return
    setError(null)
    const payload = {
      nombre: form.nombre.trim(),
      documento: opcional(form.documento),
      empresa: opcional(form.empresa),
      metodo: form.metodo,
      nivel: form.nivel,
      normaCertificacion: opcional(form.normaCertificacion),
      numeroCertificado: opcional(form.numeroCertificado),
      vence: form.vence || null,
    }
    try {
      if (form.id) await actualizar.mutateAsync({ id: form.id, ...payload })
      else await crear.mutateAsync(payload)
      setForm(null)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Personal de END"
        descripcion="Personas certificadas para ejecutar o evaluar ensayos no destructivos en el proyecto, con su método, nivel y vencimiento. Los vencidos aparecen en el tablero de control de soldadura."
      >
        <Button className="gap-2" disabled={!padron} onClick={() => { setError(null); setForm({ ...VACIO }) }}>
          <Plus className="h-4 w-4" /> Nueva persona
        </Button>
      </Encabezado>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 font-semibold text-gray-700">Método</TableHead>
              <TableHead className="w-16 font-semibold text-gray-700">Nivel</TableHead>
              <TableHead className="font-semibold text-gray-700">Persona</TableHead>
              <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
              <TableHead className="font-semibold text-gray-700">Certificación</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Vence</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Estado</TableHead>
              <TableHead className="w-40 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || lista.length === 0 ? (
              <FilaVacia columnas={8} cargando={isLoading} vacio="No hay personal de END cargado." />
            ) : (
              lista.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-medium">{p.metodo}</TableCell>
                  <TableCell>{p.nivel}</TableCell>
                  <TableCell className="font-medium">
                    {p.nombre}
                    {p.documento && <span className="block text-xs text-muted-foreground">Doc. {p.documento}</span>}
                  </TableCell>
                  <TableCell className="text-sm">{p.empresa || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {p.normaCertificacion || "—"}
                    {p.numeroCertificado && <span className="block text-xs text-muted-foreground">{p.numeroCertificado}</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{fechaCorta(p.vence)}</TableCell>
                  <TableCell>{p.vence ? <EstadoBadge estado={p.estado} /> : <span className="text-xs text-muted-foreground">Sin vencimiento</span>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <BotonArchivo tipo="PersonalEnd" id={p.id} tieneArchivo={p.tieneArchivo} nombre={p.archivoNombre} puedeSubir={padron} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron} title="Editar"
                      onClick={() => {
                        setError(null)
                        setForm({
                          id: p.id, nombre: p.nombre, documento: p.documento ?? "", empresa: p.empresa ?? "",
                          metodo: p.metodo, nivel: p.nivel, normaCertificacion: p.normaCertificacion ?? "",
                          numeroCertificado: p.numeroCertificado ?? "", vence: soloFecha(p.vence),
                        })
                      }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!padron} title="Eliminar"
                      onClick={() => { setError(null); setABorrar(p) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Editar persona" : "Nueva persona de END"}</SheetTitle>
            <SheetDescription>El PDF del certificado se sube desde la lista, una vez guardada.</SheetDescription>
          </SheetHeader>
          {form && (
            <div className="mt-6 px-4 space-y-3">
              <Campo label="Apellido y nombre"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Documento"><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></Campo>
                <Campo label="Laboratorio / empresa"><Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></Campo>
                <Campo label="Método">
                  <select value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })} className={CLASE_SELECT}>
                    {METODOS_END.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Campo>
                <Campo label="Nivel">
                  <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} className={CLASE_SELECT}>
                    {NIVELES_END.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Campo>
                <Campo label="Esquema de certificación"><Input value={form.normaCertificacion} onChange={(e) => setForm({ ...form, normaCertificacion: e.target.value })} placeholder="ISO 9712" /></Campo>
                <Campo label="N° de certificado"><Input value={form.numeroCertificado} onChange={(e) => setForm({ ...form, numeroCertificado: e.target.value })} /></Campo>
                <Campo label="Vence"><Input type="date" value={form.vence} onChange={(e) => setForm({ ...form, vence: e.target.value })} /></Campo>
              </div>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardar} disabled={!form.nombre.trim() || crear.isPending || actualizar.isPending}>
                  {crear.isPending || actualizar.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setForm(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Eliminar persona"
        descripcion={<>¿Eliminar a <strong>{aBorrar?.nombre}</strong> ({aBorrar?.metodo} nivel {aBorrar?.nivel})?</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) }
        }}
      />
    </div>
  )
}
