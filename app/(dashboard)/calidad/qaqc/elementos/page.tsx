"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Boxes, Search } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useAvanceElementos, usePiesProyecto } from "@/features/qaqc/api/use-qaqc"
import { BarraAvance, CLASE_SELECT, Encabezado } from "@/features/qaqc/components/comunes"
import { EstadoItem, ESTADO_ITEM_LABEL, type ElementoPunto } from "@/features/qaqc/types"

import { Input } from "@/components/ui/input"

const ESTILO_CHIP: Record<EstadoItem, string> = {
  [EstadoItem.Pendiente]: "border-slate-200 bg-slate-50 text-slate-600",
  [EstadoItem.EnCurso]: "border-amber-200 bg-amber-50 text-amber-800",
  [EstadoItem.Cubierto]: "border-green-200 bg-green-50 text-green-800",
  [EstadoItem.NoAplica]: "border-slate-200 bg-white text-slate-400 line-through",
}

/**
 * Avance de calidad por elemento: por cada elemento (o test pack) que está en el alcance
 * de algún punto, en qué puntos figura y cómo va en cada uno. Es lo que más adelante se
 * pinta sobre la maqueta 3D.
 */
export default function AvancePorElementoPage() {
  const [pieId, setPieId] = useState("")
  const [buscar, setBuscar] = useState("")
  const [soloIncompletos, setSoloIncompletos] = useState(false)
  const pies = usePiesProyecto()
  const { data, isLoading, error } = useAvanceElementos(pieId || null)

  useBreadcrumb([{ label: "Calidad" }, { label: "Avance por PIE", href: "/calidad/qaqc" }, { label: "Por elemento" }])

  const filas = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return (data ?? []).filter((e) =>
      (!q || `${e.etiqueta} ${e.nombre} ${e.tipo}`.toLowerCase().includes(q))
      && (!soloIncompletos || e.porcentaje < 100))
  }, [data, buscar, soloIncompletos])

  const completos = (data ?? []).filter((e) => e.porcentaje >= 100).length

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Avance por elemento"
        descripcion="Cada elemento o test pack que está en el alcance de algún punto del PIE, con su estado en cada punto. Un elemento está completo cuando lo cubrieron todos sus puntos."
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={`${CLASE_SELECT} w-64`} value={pieId} onChange={(e) => setPieId(e.target.value)}>
          <option value="">Todos los PIE</option>
          {(pies.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.disciplina ?? p.nombre}</option>)}
        </select>
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar tag, descripción o tipo" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={soloIncompletos} onChange={(e) => setSoloIncompletos(e.target.checked)} /> Solo incompletos
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {data && data.length === 0 && (
        <div className="rounded-lg border bg-white p-10 text-center">
          <Boxes className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium">Ningún punto tiene elementos cargados</p>
          <p className="mt-1 text-sm text-muted-foreground">Los puntos por elemento o por grupo se marcan en la estructura del PIE; su alcance se carga desde el punto o con el botón “Alcance”.</p>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{completos} de {data.length} completos · se muestran {filas.length}</p>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="w-48 px-3 py-2 text-left font-medium">Elemento</th>
                  <th className="w-44 px-3 py-2 text-left font-medium">Avance</th>
                  <th className="px-3 py-2 text-left font-medium">Puntos</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filas.map((e) => (
                  <tr key={e.elementoId ?? e.testGroupId} className="align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium">{e.etiqueta}</div>
                      <div className="text-xs text-muted-foreground">{[e.nombre, e.tipo].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-3 py-2">
                      <BarraAvance porcentaje={e.porcentaje} />
                      <div className="text-xs text-muted-foreground">{e.cubiertos}/{e.total - e.noAplica} puntos</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {e.puntos.map((p) => <Chip key={p.puntoId} p={p} />)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Chip({ p }: { p: ElementoPunto }) {
  const bloqueado = !!p.bloqueadoPor
  return (
    <Link
      href={`/calidad/qaqc/pie/${p.pieId}`}
      title={`${p.pieCodigo}${p.hojaNumero ? ` · PIE Nº ${p.hojaNumero}` : ""} · ${p.puntoNumero} ${p.actividad}\n${ESTADO_ITEM_LABEL[p.estado]}${p.bloqueadoPor ? `\n${p.bloqueadoPor}` : ""}`}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] hover:opacity-80 ${bloqueado ? "border-red-200 bg-red-50 text-red-700" : ESTILO_CHIP[p.estado]}`}
    >
      {p.hojaNumero && <span className="text-muted-foreground">{p.hojaNumero}·</span>}
      <span className="font-semibold">{p.puntoNumero}</span>
      {p.esHp && <span className="font-semibold">HP</span>}
    </Link>
  )
}
