"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Pencil, Plus, Search, Trash2, XCircle } from "lucide-react"

import { clases as apiClases, matriz as apiMatriz, useResolverMatriz, wps as apiWps } from "@/features/soldadura/api/use-soldadura"
import { EstadoWps, rango, type FilaMatriz, type ResultadoMatriz } from "@/features/soldadura/types"
import {
  CLASE_SELECT, Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia,
  numero, opcional, texto, usePermisosSoldadura,
} from "@/features/soldadura/components/comunes"
import { DescargaRegistro } from "@/features/soldadura/components/descarga-registro"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Form {
  id?: string
  claseId: string
  material: string
  tipoJunta: string
  diametroMin: string
  diametroMax: string
  espesorMin: string
  espesorMax: string
  wpsId: string
  observaciones: string
}

const TIPOS_JUNTA = ["BW", "FW", "SW"]

/**
 * Matriz de soldadura: qué WPS corresponde a cada combinación de clase, material,
 * tipo de junta, diámetro y espesor. Un campo vacío es "cualquiera". La matriz no
 * admite dos filas que puedan responder a la misma junta: tiene que leerse fila por
 * fila, porque es un documento que el cliente revisa y firma.
 */
export default function MatrizPage() {
  const filas = apiMatriz.useList()
  const clases = apiClases.useList()
  const wps = apiWps.useList()
  const crear = apiMatriz.useCreate()
  const actualizar = apiMatriz.useUpdate()
  const borrar = apiMatriz.useDelete()
  const resolver = useResolverMatriz()
  const { parametros } = usePermisosSoldadura()

  const [form, setForm] = useState<Form | null>(null)
  const [aBorrar, setABorrar] = useState<FilaMatriz | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtroClase, setFiltroClase] = useState("")
  const [prueba, setPrueba] = useState({ claseId: "", material: "", tipoJunta: "", diametro: "", espesor: "" })
  const [resultado, setResultado] = useState<ResultadoMatriz | null>(null)

  const listaClases = clases.data ?? []
  // Un WPS obsoleto no se puede asignar: el backend lo rechaza, así que ni se ofrece.
  const wpsAsignables = (wps.data ?? []).filter((w) => w.estado !== EstadoWps.Obsoleto)
  const lista = useMemo(
    () => (filas.data ?? []).filter((f) => !filtroClase || f.claseId === filtroClase),
    [filas.data, filtroClase],
  )

  function editar(f?: FilaMatriz) {
    setError(null)
    setForm(f ? {
      id: f.id, claseId: f.claseId, material: f.material ?? "", tipoJunta: f.tipoJunta ?? "",
      diametroMin: texto(f.diametroMin), diametroMax: texto(f.diametroMax),
      espesorMin: texto(f.espesorMin), espesorMax: texto(f.espesorMax),
      wpsId: f.wpsId, observaciones: f.observaciones ?? "",
    } : {
      claseId: filtroClase || listaClases[0]?.id || "", material: "", tipoJunta: "", diametroMin: "", diametroMax: "",
      espesorMin: "", espesorMax: "", wpsId: wpsAsignables[0]?.id ?? "", observaciones: "",
    })
  }

  async function guardar() {
    if (!form) return
    setError(null)
    const payload = {
      claseId: form.claseId,
      material: opcional(form.material),
      tipoJunta: opcional(form.tipoJunta),
      diametroMin: numero(form.diametroMin), diametroMax: numero(form.diametroMax),
      espesorMin: numero(form.espesorMin), espesorMax: numero(form.espesorMax),
      wpsId: form.wpsId,
      observaciones: opcional(form.observaciones),
    }
    try {
      if (form.id) await actualizar.mutateAsync({ id: form.id, ...payload })
      else await crear.mutateAsync(payload)
      setForm(null)
      setResultado(null)
    } catch (e) { setError((e as Error).message) }
  }

  async function probar() {
    setResultado(null)
    try {
      setResultado(await resolver.mutateAsync({
        claseId: prueba.claseId,
        material: opcional(prueba.material),
        tipoJunta: opcional(prueba.tipoJunta),
        diametro: numero(prueba.diametro),
        espesor: numero(prueba.espesor),
      }))
    } catch (e) {
      setResultado({ encontrado: false, motivo: (e as Error).message, matrizId: null, wpsId: null, wpsCodigo: null, wpsRevision: null })
    }
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Matriz de soldadura"
        descripcion="Qué procedimiento corresponde a cada combinación de clase, material, tipo de junta, diámetro y espesor. Un campo vacío significa “cualquiera”. Dos filas de la misma clase que pudieran responder a la misma junta no se aceptan: la matriz tiene que dar una sola respuesta."
      >
        <DescargaRegistro ruta="matriz/registro" titulo="Matriz de soldadura" />
        <Button className="gap-2" disabled={!parametros || listaClases.length === 0 || wpsAsignables.length === 0}
          title={listaClases.length === 0 ? "Primero cargá las clases." : wpsAsignables.length === 0 ? "Primero cargá los WPS." : undefined}
          onClick={() => editar()}>
          <Plus className="h-4 w-4" /> Nueva fila
        </Button>
      </Encabezado>

      {/* ── Probar la matriz ───────────────────────────────────────────── */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <p className="text-sm font-medium">Probar la matriz</p>
        <div className="flex flex-wrap items-end gap-3">
          <Campo label="Clase" className="w-36">
            <select value={prueba.claseId} onChange={(e) => setPrueba({ ...prueba, claseId: e.target.value })} className={CLASE_SELECT}>
              <option value="">Elegí…</option>
              {listaClases.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
            </select>
          </Campo>
          <Campo label="Material" className="w-44"><Input value={prueba.material} onChange={(e) => setPrueba({ ...prueba, material: e.target.value })} placeholder="A106 Gr.B" /></Campo>
          <Campo label="Tipo" className="w-24">
            <select value={prueba.tipoJunta} onChange={(e) => setPrueba({ ...prueba, tipoJunta: e.target.value })} className={CLASE_SELECT}>
              <option value="">—</option>
              {TIPOS_JUNTA.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo label="Ø (pulg)" className="w-24"><Input inputMode="decimal" value={prueba.diametro} onChange={(e) => setPrueba({ ...prueba, diametro: e.target.value })} /></Campo>
          <Campo label="Espesor (mm)" className="w-28"><Input inputMode="decimal" value={prueba.espesor} onChange={(e) => setPrueba({ ...prueba, espesor: e.target.value })} /></Campo>
          <Button variant="outline" className="gap-2" disabled={!prueba.claseId || resolver.isPending} onClick={probar}>
            <Search className="h-4 w-4" /> Qué WPS le toca
          </Button>
        </div>
        {resultado && (
          resultado.encontrado ? (
            <p className="flex items-center gap-1.5 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> Le corresponde <strong className="font-mono">{resultado.wpsCodigo}</strong> rev. {resultado.wpsRevision}.
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-red-700"><XCircle className="h-4 w-4" /> {resultado.motivo}</p>
          )
        )}
      </div>

      <div className="flex items-end gap-3">
        <Campo label="Filtrar por clase" className="w-48">
          <select value={filtroClase} onChange={(e) => setFiltroClase(e.target.value)} className={CLASE_SELECT}>
            <option value="">Todas</option>
            {listaClases.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
          </select>
        </Campo>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24 font-semibold text-gray-700">Clase</TableHead>
              <TableHead className="font-semibold text-gray-700">Material</TableHead>
              <TableHead className="w-24 font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="font-semibold text-gray-700">Diámetro (pulg)</TableHead>
              <TableHead className="font-semibold text-gray-700">Espesor (mm)</TableHead>
              <TableHead className="w-36 font-semibold text-gray-700">WPS</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.isLoading || lista.length === 0 ? (
              <FilaVacia columnas={7} cargando={filas.isLoading} vacio="La matriz no tiene filas." />
            ) : lista.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono font-medium">{f.claseCodigo}</TableCell>
                <TableCell className="text-sm">{f.material || <span className="text-muted-foreground">cualquiera</span>}</TableCell>
                <TableCell className="text-sm">{f.tipoJunta || <span className="text-muted-foreground">cualquiera</span>}</TableCell>
                <TableCell className="text-sm tabular-nums">{rango(f.diametroMin, f.diametroMax)}</TableCell>
                <TableCell className="text-sm tabular-nums">{rango(f.espesorMin, f.espesorMax)}</TableCell>
                <TableCell className="font-mono text-sm">
                  {f.wpsCodigo}<span className="font-sans text-xs text-muted-foreground"> rev. {f.wpsRevision}</span>
                  {f.observaciones && <span className="block font-sans text-xs text-muted-foreground">{f.observaciones}</span>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!parametros} onClick={() => editar(f)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!parametros} title="Eliminar"
                    onClick={() => { setError(null); setABorrar(f) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{lista.length} filas</p>

      <Sheet open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Editar fila" : "Nueva fila de la matriz"}</SheetTitle>
            <SheetDescription>Dejá vacío lo que no acota. Los rangos incluyen los extremos.</SheetDescription>
          </SheetHeader>
          {form && (
            <div className="mt-6 px-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Clase">
                  <select value={form.claseId} onChange={(e) => setForm({ ...form, claseId: e.target.value })} className={CLASE_SELECT}>
                    {listaClases.map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                  </select>
                </Campo>
                <Campo label="Tipo de junta">
                  <select value={form.tipoJunta} onChange={(e) => setForm({ ...form, tipoJunta: e.target.value })} className={CLASE_SELECT}>
                    <option value="">Cualquiera</option>
                    {TIPOS_JUNTA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Campo>
                <Campo label="Material o P-number" className="col-span-2"><Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="Vacío = cualquiera" /></Campo>
                <Campo label="Diámetro desde (pulg)"><Input inputMode="decimal" value={form.diametroMin} onChange={(e) => setForm({ ...form, diametroMin: e.target.value })} /></Campo>
                <Campo label="Diámetro hasta (pulg)"><Input inputMode="decimal" value={form.diametroMax} onChange={(e) => setForm({ ...form, diametroMax: e.target.value })} /></Campo>
                <Campo label="Espesor desde (mm)"><Input inputMode="decimal" value={form.espesorMin} onChange={(e) => setForm({ ...form, espesorMin: e.target.value })} /></Campo>
                <Campo label="Espesor hasta (mm)"><Input inputMode="decimal" value={form.espesorMax} onChange={(e) => setForm({ ...form, espesorMax: e.target.value })} /></Campo>
                <Campo label="WPS" className="col-span-2">
                  <select value={form.wpsId} onChange={(e) => setForm({ ...form, wpsId: e.target.value })} className={CLASE_SELECT}>
                    {wpsAsignables.map((w) => <option key={w.id} value={w.id}>{w.codigo} rev. {w.revision}{w.estado === EstadoWps.Borrador ? " (borrador)" : ""}</option>)}
                  </select>
                </Campo>
                <Campo label="Observaciones" className="col-span-2"><Input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Campo>
              </div>
              <ErrorTexto error={error} />
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={guardar} disabled={!form.claseId || !form.wpsId || crear.isPending || actualizar.isPending}>
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
        titulo="Eliminar fila"
        descripcion={<>¿Eliminar la fila de <strong>{aBorrar?.claseCodigo}</strong> que asigna <strong>{aBorrar?.wpsCodigo}</strong>?</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => {
          try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null); setResultado(null) } catch (e) { setError((e as Error).message) }
        }}
      />
    </div>
  )
}
