"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Download, FileSpreadsheet, GitBranch, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react"

import {
  descargar, useAplicarImportacion, useCrearPlantilla, useDuplicarPlantilla, useEliminarPie, useEstadoPlantilla, useNuevaRevision,
  usePlantillas, usePreviewImportacion,
} from "@/features/qaqc/api/use-qaqc"
import { Campo, ConfirmarBorrado, Encabezado, ErrorTexto, FilaVacia, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import { EstadoPlantilla, ESTADO_PLANTILLA_LABEL, type ImportPreview } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const ESTILO_ESTADO: Record<EstadoPlantilla, string> = {
  [EstadoPlantilla.Borrador]: "bg-amber-50 text-amber-800 border-amber-200",
  [EstadoPlantilla.Vigente]: "bg-green-50 text-green-700 border-green-200",
  [EstadoPlantilla.Obsoleta]: "bg-slate-50 text-slate-500 border-slate-200",
}

/**
 * Catálogo global de plantillas de PIE. Se arman a mano o se importan de Excel (plantilla
 * → preview → aplicar). Los proyectos copian una plantilla vigente; una revisión nueva
 * arranca en borrador y no toca los proyectos que ya tienen su copia.
 */
export default function PlantillasPiePage() {
  const router = useRouter()
  const { data, isLoading } = usePlantillas()
  const { catalogo } = usePermisosQaqc()
  const crear = useCrearPlantilla()
  const estado = useEstadoPlantilla()
  const revision = useNuevaRevision()
  const duplicar = useDuplicarPlantilla()
  const eliminar = useEliminarPie()
  const [nueva, setNueva] = useState<{ codigo: string; nombre: string; disciplina: string } | null>(null)
  const [importar, setImportar] = useState(false)
  const [borrar, setBorrar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function crearNueva() {
    if (!nueva) return
    setError(null)
    try {
      const r = await crear.mutateAsync({ codigo: nueva.codigo.trim(), nombre: nueva.nombre.trim(), disciplina: nueva.disciplina.trim() || null, revision: "0", obra: null, area: null, codigoDatabook: null, observaciones: null, abreviaturas: null })
      router.push(`/configuracion/qaqc/plantillas/${r.data.id}`)
    } catch (e) { setError((e as Error).message) }
  }

  async function accion(f: () => Promise<unknown>) {
    setError(null)
    try { await f() } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Plantillas de PIE"
        descripcion="Planes de Inspección y Ensayo reutilizables entre proyectos y clientes. Al crear un proyecto se eligen las plantillas vigentes que va a usar."
      >
        {catalogo && (
          <>
            <Button variant="outline" onClick={() => setImportar(true)}><FileSpreadsheet className="h-4 w-4" /> Importar Excel</Button>
            <Button onClick={() => { setError(null); setNueva({ codigo: "", nombre: "", disciplina: "" }) }}><Plus className="h-4 w-4" /> Nueva plantilla</Button>
          </>
        )}
      </Encabezado>
      <ErrorTexto error={error} />

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Plantilla</TableHead>
              <TableHead>Rev.</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Hojas</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
              <TableHead className="text-right">Proyectos</TableHead>
              <TableHead className="w-64" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && <FilaVacia columnas={8} cargando={isLoading} vacio="No hay plantillas. Importá un Excel o creá una nueva." />}
            {(data ?? []).map((p) => (
              <TableRow key={p.id} className={p.estado === EstadoPlantilla.Obsoleta ? "text-muted-foreground" : ""}>
                <TableCell className="font-medium">{p.codigo}</TableCell>
                <TableCell><Link href={`/configuracion/qaqc/plantillas/${p.id}`} className="hover:underline">{p.nombre}</Link><div className="text-xs text-muted-foreground">{p.disciplina}</div></TableCell>
                <TableCell>{p.revision}</TableCell>
                <TableCell>
                  {catalogo ? (
                    <select
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ESTILO_ESTADO[p.estado]}`}
                      value={p.estado}
                      onChange={(e) => accion(() => estado.mutateAsync({ id: p.id, estado: Number(e.target.value) as EstadoPlantilla }))}
                    >
                      {[EstadoPlantilla.Borrador, EstadoPlantilla.Vigente, EstadoPlantilla.Obsoleta].map((s) => <option key={s} value={s}>{ESTADO_PLANTILLA_LABEL[s]}</option>)}
                    </select>
                  ) : <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ESTILO_ESTADO[p.estado]}`}>{ESTADO_PLANTILLA_LABEL[p.estado]}</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.hojas}</TableCell>
                <TableCell className="text-right tabular-nums">{p.puntos}</TableCell>
                <TableCell className="text-right tabular-nums">{p.proyectos}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon-sm" variant="ghost" title="Editar" asChild><Link href={`/configuracion/qaqc/plantillas/${p.id}`}><Pencil className="h-4 w-4" /></Link></Button>
                  <Button size="icon-sm" variant="ghost" title="Exportar a Excel" onClick={() => accion(() => descargar(`pies/${p.id}/excel`, `${p.codigo}.xlsx`))}><Download className="h-4 w-4" /></Button>
                  {catalogo && (
                    <>
                      <Button size="icon-sm" variant="ghost" title="Nueva revisión" onClick={() => accion(async () => { const r = await revision.mutateAsync(p.id); router.push(`/configuracion/qaqc/plantillas/${r.data.id}`) })}><GitBranch className="h-4 w-4" /></Button>
                      <Button size="icon-sm" variant="ghost" title="Duplicar" onClick={() => accion(() => duplicar.mutateAsync(p.id))}><Copy className="h-4 w-4" /></Button>
                      <Button size="icon-sm" variant="ghost" title="Eliminar" onClick={() => { setError(null); setBorrar(p.id) }}><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={nueva !== null} onOpenChange={(v) => !v && setNueva(null)}>
        <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
          <SheetHeader><SheetTitle>Nueva plantilla</SheetTitle><SheetDescription>Arranca en borrador con las dos partes de siempre; después se cargan hojas, etapas y puntos.</SheetDescription></SheetHeader>
          {nueva && (
            <div className="space-y-3 px-4">
              <Campo label="Código"><Input value={nueva.codigo} onChange={(e) => setNueva({ ...nueva, codigo: e.target.value })} placeholder="QAQC-PIE-PIP" /></Campo>
              <Campo label="Nombre"><Input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Plan de Inspección y Ensayos — Piping" /></Campo>
              <Campo label="Disciplina"><Input value={nueva.disciplina} onChange={(e) => setNueva({ ...nueva, disciplina: e.target.value })} placeholder="Piping" /></Campo>
              <ErrorTexto error={error} />
              <Button className="w-full" onClick={crearNueva} disabled={!nueva.codigo.trim() || !nueva.nombre.trim() || crear.isPending}>Crear y editar</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Importador abierto={importar} onCerrar={() => setImportar(false)} onImportada={(id) => router.push(`/configuracion/qaqc/plantillas/${id}`)} />

      <ConfirmarBorrado
        abierto={borrar !== null}
        titulo="Eliminar plantilla"
        descripcion="Los proyectos que ya la copiaron conservan su PIE. La plantilla deja de estar en el catálogo."
        pendiente={eliminar.isPending}
        error={error}
        onCancelar={() => setBorrar(null)}
        onConfirmar={() => eliminar.mutateAsync(borrar!).then(() => setBorrar(null)).catch((e) => setError(e.message))}
      />
    </div>
  )
}

function Importador({ abierto, onCerrar, onImportada }: { abierto: boolean; onCerrar: () => void; onImportada: (id: string) => void }) {
  const preview = usePreviewImportacion()
  const aplicar = useAplicarImportacion()
  const input = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [resultado, setResultado] = useState<ImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  function cerrar() {
    setArchivo(null); setResultado(null); setError(null)
    if (input.current) input.current.value = ""
    onCerrar()
  }

  async function elegir(f: File | undefined) {
    if (!f) return
    setArchivo(f); setResultado(null); setError(null)
    try { setResultado((await preview.mutateAsync(f)).data) } catch (e) { setError((e as Error).message) }
  }

  async function confirmar() {
    if (!archivo) return
    setError(null)
    try { const r = await aplicar.mutateAsync(archivo); cerrar(); onImportada(r.data.id) }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <Sheet open={abierto} onOpenChange={(v) => !v && cerrar()}>
      <SheetContent className="w-full sm:max-w-xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar plantilla de PIE</SheetTitle>
          <SheetDescription>Bajá la plantilla, completala (una fila por punto, una columna “PD …” por parte) y subila. Primero se muestra lo que se va a crear.</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8">
          <Button variant="outline" onClick={() => descargar("plantillas/importacion/plantilla", "plantilla-pie.xlsx").catch((e) => setError(e.message))}>
            <Download className="h-4 w-4" /> Bajar plantilla Excel
          </Button>
          <div>
            <input ref={input} type="file" accept=".xlsx" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
            <Button onClick={() => input.current?.click()} disabled={preview.isPending}>
              {preview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {archivo ? "Elegir otro archivo" : "Elegir archivo"}
            </Button>
            {archivo && <span className="ml-2 text-sm text-muted-foreground">{archivo.name}</span>}
          </div>

          {resultado && (
            <div className="space-y-3 rounded-md border p-3 text-sm">
              <div>
                <div className="font-semibold">{resultado.codigo} · {resultado.nombre}</div>
                <div className="text-xs text-muted-foreground">{resultado.disciplina} · rev. {resultado.revision} · partes: {resultado.partes.join(", ")}</div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[["Hojas", resultado.hojas.length], ["Etapas", resultado.etapas], ["Puntos", resultado.puntos], ["Secciones", resultado.secciones]].map(([l, v]) => (
                  <div key={l as string} className="rounded border p-2"><div className="text-lg font-semibold tabular-nums">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
                ))}
              </div>
              <ul className="text-xs">
                {resultado.hojas.map((h, i) => <li key={i}>{h.numero ? `Nº ${h.numero} · ` : ""}{h.nombre}: {h.etapas} etapas, {h.puntos} puntos</li>)}
              </ul>
              {resultado.errores.length > 0 && (
                <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                  <div className="font-semibold">Errores (corregí el Excel y volvé a subirlo)</div>
                  <ul className="mt-1 list-disc pl-4">{resultado.errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              {resultado.advertencias.length > 0 && (
                <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                  <div className="font-semibold">Advertencias</div>
                  <ul className="mt-1 list-disc pl-4">{resultado.advertencias.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              <Button className="w-full" onClick={confirmar} disabled={!resultado.valido || aplicar.isPending}>
                {aplicar.isPending ? "Importando..." : "Crear plantilla (en borrador)"}
              </Button>
            </div>
          )}
          <ErrorTexto error={error} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
