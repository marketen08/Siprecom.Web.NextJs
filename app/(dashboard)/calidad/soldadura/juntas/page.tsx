"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react"

import { descargarTrazabilidad, lineas as apiLineas, useDeleteJunta, useJuntas } from "@/features/soldadura/api/use-juntas"
import { fechaCorta } from "@/features/soldadura/types"
import {
  EstadoJunta, OrigenWps, PasadaJunta, ResultadoHabilitacion, UbicacionJunta, type Junta,
} from "@/features/soldadura/types-juntas"
import { CLASE_SELECT, ConfirmarBorrado, Encabezado, FilaVacia, usePermisosSoldadura } from "@/features/soldadura/components/comunes"
import { JuntaSheet, formDeJunta } from "@/features/soldadura/components/junta-sheet"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const COLOR_HAB: Record<ResultadoHabilitacion, string> = {
  [ResultadoHabilitacion.Habilitado]: "text-green-700",
  [ResultadoHabilitacion.ConAdvertencia]: "text-amber-700",
  [ResultadoHabilitacion.NoHabilitado]: "text-red-700 font-semibold",
}

/**
 * Juntas de una línea. La línea elegida va en la URL (?linea=) para que el link desde
 * la pantalla de líneas abra directo y para que se pueda compartir.
 */
export default function JuntasPage() {
  // useSearchParams pide un límite de Suspense en el render estático.
  return (
    <Suspense fallback={null}>
      <Juntas />
    </Suspense>
  )
}

function Juntas() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const lineas = apiLineas.useList()
  const listaLineas = useMemo(() => lineas.data ?? [], [lineas.data])
  const lineaId = params.get("linea") ?? ""
  const linea = listaLineas.find((l) => l.id === lineaId) ?? null

  // Sin línea elegida, la primera: la pantalla nunca queda vacía si hay líneas.
  useEffect(() => {
    if (!lineaId && listaLineas.length > 0) router.replace(`${pathname}?linea=${listaLineas[0].id}`)
  }, [lineaId, listaLineas, pathname, router])

  const juntas = useJuntas(linea?.id ?? null)
  const borrar = useDeleteJunta()
  const { padron } = usePermisosSoldadura()
  const [editando, setEditando] = useState<ReturnType<typeof formDeJunta> | null>(null)
  const [aBorrar, setABorrar] = useState<Junta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buscar, setBuscar] = useState("")

  const todas = useMemo(() => (linea ? juntas.data ?? [] : []), [juntas.data, linea])
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return todas.filter((j) => !q || [j.identificacion, j.numero, ...j.soldadores.map((s) => s.cuno ?? "")].some((v) => v.toLowerCase().includes(q)))
  }, [todas, buscar])

  const resumen = useMemo(() => ({
    total: todas.length,
    soldadas: todas.filter((j) => j.estado === EstadoJunta.Soldada).length,
    sinWps: todas.filter((j) => !j.wpsId).length,
    difieren: todas.filter((j) => j.wpsDifiereDeMatriz).length,
    noHabilitadas: todas.filter((j) => j.habilitacion === ResultadoHabilitacion.NoHabilitado).length,
  }), [todas])

  if (!lineas.isLoading && listaLineas.length === 0) {
    return (
      <div className="space-y-4">
        <Encabezado titulo="Juntas" descripcion="Todavía no hay líneas. Las juntas se cargan dentro de una línea." />
        <p className="text-sm">
          Creá la primera en <Link href="/calidad/soldadura/lineas" className="text-blue-700 underline">Líneas</Link>{" "}
          o cargá todo junto desde <Link href="/calidad/soldadura/importar-juntas" className="text-blue-700 underline">Importar juntas</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Juntas"
        descripcion="Las juntas de la línea con su WPS, sus soldadores por pasada y su material. El WPS sale de la matriz y cada soldador se valida contra sus calificaciones a la fecha de soldadura."
      >
        {linea && (
          <>
            <Button variant="outline" className="gap-2" onClick={() => descargarTrazabilidad(linea.id)}>
              <FileSpreadsheet className="h-4 w-4" /> Trazabilidad
            </Button>
            <Button className="gap-2" disabled={!padron} onClick={() => setEditando(formDeJunta(linea))}>
              <Plus className="h-4 w-4" /> Nueva junta
            </Button>
          </>
        )}
      </Encabezado>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Línea</label>
          <select value={lineaId} onChange={(e) => router.replace(`${pathname}?linea=${e.target.value}`)} className={`${CLASE_SELECT} mt-0.5 w-72`}>
            {listaLineas.map((l) => <option key={l.id} value={l.id}>{l.codigo}{l.claseCodigo ? ` · ${l.claseCodigo}` : ""}</option>)}
          </select>
        </div>
        <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar junta o cuño" className="max-w-xs" />
      </div>

      {linea && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span><strong className="tabular-nums">{resumen.soldadas}</strong> de <strong className="tabular-nums">{resumen.total}</strong> soldadas</span>
          {resumen.sinWps > 0 && <span className="text-amber-700">{resumen.sinWps} sin WPS</span>}
          {resumen.difieren > 0 && <span className="text-amber-700">{resumen.difieren} con WPS distinto de la matriz</span>}
          {resumen.noHabilitadas > 0 && <span className="text-red-700">{resumen.noHabilitadas} con soldador no habilitado</span>}
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Junta</TableHead>
              <TableHead className="w-20 font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Ø / esp.</TableHead>
              <TableHead className="font-semibold text-gray-700">WPS</TableHead>
              <TableHead className="font-semibold text-gray-700">Raíz</TableHead>
              <TableHead className="font-semibold text-gray-700">Relleno / term.</TableHead>
              <TableHead className="font-semibold text-gray-700">Material</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Soldada</TableHead>
              <TableHead className="w-24 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {juntas.isLoading || lista.length === 0 ? (
              <FilaVacia columnas={9} cargando={juntas.isLoading} vacio={todas.length ? "Ninguna junta coincide." : "La línea no tiene juntas."} />
            ) : lista.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-mono font-medium">
                  {j.identificacion}
                  <span className="block font-sans text-xs text-muted-foreground">
                    {j.ubicacion === UbicacionJunta.Prefabricado ? "Prefabricado" : "Obra"}{j.claseCodigo ? ` · ${j.claseCodigo}` : ""}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{j.tipoJunta ?? "—"}</TableCell>
                <TableCell className="text-sm tabular-nums">{j.diametro != null ? `${j.diametro}"` : "—"}{j.espesor != null ? ` · ${j.espesor} mm` : ""}</TableCell>
                <TableCell className="text-sm">
                  {j.wpsTexto ?? <span className="text-amber-700">Sin WPS</span>}
                  {j.origenWps === OrigenWps.Manual && <span className="block text-xs text-muted-foreground">elegido a mano</span>}
                  {(j.wpsDifiereDeMatriz || (!j.wpsId && j.wpsObservacion)) && <span className="block text-xs text-amber-700" title={j.wpsObservacion ?? undefined}>{j.wpsDifiereDeMatriz ? "distinto de la matriz" : "ver motivo"}</span>}
                </TableCell>
                <TableCell className="text-sm"><Cunos j={j} pasadas={[PasadaJunta.Raiz, PasadaJunta.Completa]} /></TableCell>
                <TableCell className="text-sm"><Cunos j={j} pasadas={[PasadaJunta.RellenoTerminacion, PasadaJunta.Completa]} /></TableCell>
                <TableCell className="text-xs">
                  {[j.piezaACodigo, j.piezaBCodigo].filter(Boolean).join(" + ") || "—"}
                  {j.lotes.length > 0 && <span className="block text-muted-foreground">{j.lotes.map((l) => l.texto).join(", ")}</span>}
                </TableCell>
                <TableCell className="tabular-nums text-sm">
                  {j.estado === EstadoJunta.Soldada ? fechaCorta(j.fechaSoldadura) : <span className="text-muted-foreground">Registrada</span>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron || !linea} title="Editar"
                    onClick={() => linea && setEditando(formDeJunta(linea, j))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!padron} title="Eliminar"
                    onClick={() => { setError(null); setABorrar(j) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{lista.length} juntas</p>

      {linea && editando && <JuntaSheet linea={linea} inicial={editando} onCerrar={() => setEditando(null)} />}

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Eliminar junta"
        descripcion={<>¿Eliminar la junta <strong>{aBorrar?.identificacion}</strong>? Sus soldaduras dejan de contar para la continuidad de los soldadores.</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => { try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) } }}
      />
    </div>
  )
}

/** Cuños de las pasadas pedidas, coloreados por el resultado de la habilitación. */
function Cunos({ j, pasadas }: { j: Junta; pasadas: PasadaJunta[] }) {
  const s = j.soldadores.filter((x) => pasadas.includes(x.pasada))
  if (s.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-x-2">
      {s.map((x) => (
        <span key={x.id} className={`font-mono ${COLOR_HAB[x.resultado]}`} title={`${x.nombre ?? ""}${x.proceso ? ` · ${x.proceso}` : ""}\n${x.detalle ?? ""}${x.forzar ? `\nForzado: ${x.motivoForzado ?? ""}` : ""}`}>
          {x.cuno}{x.forzar ? "*" : ""}
        </span>
      ))}
    </span>
  )
}
