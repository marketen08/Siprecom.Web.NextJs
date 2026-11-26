"use client"

import { use, useDeferredValue, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Boxes, Loader2, Lock, Plus, Search } from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useAgregarAlcancePie, useAlcancePie, useEjecucion } from "@/features/qaqc/api/use-qaqc"
import { CLASE_SELECT, Encabezado, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import { AlcancePunto, nombreItems, type AlcancePuntoPie } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Alcance del PIE en bloque: se eligen elementos (o test packs) del proyecto y los puntos
 * por elemento a los que se suman, todo de una vez. Los elementos no se crean acá: entran
 * solo por la importación de datos del proyecto (sin sistema quedan en «Sin asignar»).
 */
export default function AlcancePiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: pie } = useEjecucion(id)
  const { carga } = usePermisosQaqc()

  // Qué alcances tiene el PIE (elementos, test packs o los dos).
  const alcances = useMemo(() => {
    const s = new Set<AlcancePunto>()
    pie?.hojasDetalle.forEach((h) => h.etapas.forEach((e) => e.puntos.forEach((p) => { if (p.alcance !== AlcancePunto.Unico) s.add(p.alcance) })))
    return [...s].sort()
  }, [pie])
  const [alcanceSel, setAlcanceSel] = useState<AlcancePunto | null>(null)
  const alcance = alcanceSel ?? alcances[0] ?? AlcancePunto.PorElemento
  const porElemento = alcance === AlcancePunto.PorElemento

  const [buscar, setBuscar] = useState("")
  const [tipo, setTipo] = useState("")
  const [subsistemaId, setSubsistemaId] = useState("")
  const [ocultarIncluidos, setOcultarIncluidos] = useState(false)
  const buscarDiferido = useDeferredValue(buscar)
  const { data, isFetching, error } = useAlcancePie(id, { alcance, buscar: buscarDiferido, tipo, subsistemaId })

  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [puntosSel, setPuntosSel] = useState<Set<string>>(new Set())
  const [aviso, setAviso] = useState<string | null>(null)
  const [errorAlta, setErrorAlta] = useState<string | null>(null)
  const agregar = useAgregarAlcancePie()

  useBreadcrumb(pie ? [
    { label: "Calidad" },
    { label: "Avance por PIE", href: "/calidad/qaqc" },
    { label: pie.disciplina ?? pie.codigo, href: `/calidad/qaqc/pie/${id}` },
    { label: "Alcance" },
  ] : null)

  const puntos = data?.puntos ?? []
  const puntosElegibles = puntos.filter((p) => !p.bloqueado)
  const puntoNumero = new Map(puntos.map((p) => [p.id, p.numero ?? "?"]))

  // "Ya incluido" = ya está en todos los puntos elegidos (si no hay puntos elegidos, en todos los del PIE).
  const referencia = puntosSel.size > 0 ? [...puntosSel] : puntosElegibles.map((p) => p.id)
  const candidatos = (data?.candidatos ?? []).filter((c) =>
    !ocultarIncluidos || referencia.length === 0 || !referencia.every((pid) => c.puntoIds.includes(pid)))

  // Vínculos nuevos que crearía el botón (elemento × punto, sin contar los que ya están).
  const elegidosData = (data?.candidatos ?? []).filter((c) => elegidos.has(c.id))
  const nuevos = [...puntosSel].reduce((n, pid) => n + elegidos.size - elegidosData.filter((c) => c.puntoIds.includes(pid)).length, 0)

  const porHoja = new Map<string, { titulo: string; numero: string | null; puntos: AlcancePuntoPie[] }>()
  for (const p of puntos) {
    if (!porHoja.has(p.hojaId)) porHoja.set(p.hojaId, { titulo: p.hojaTitulo, numero: p.hojaNumero, puntos: [] })
    porHoja.get(p.hojaId)!.puntos.push(p)
  }
  const hojas = [...porHoja.values()]

  function alternar(v: string, set: (f: (s: Set<string>) => Set<string>) => void) {
    set((s) => {
      const n = new Set(s)
      if (n.has(v)) n.delete(v); else n.add(v)
      return n
    })
  }

  function cambiarAlcance(a: AlcancePunto) {
    setAlcanceSel(a)
    setElegidos(new Set()); setPuntosSel(new Set()); setTipo(""); setSubsistemaId(""); setAviso(null); setErrorAlta(null)
  }

  const visiblesIds = candidatos.map((c) => c.id)
  const todosVisiblesElegidos = visiblesIds.length > 0 && visiblesIds.every((x) => elegidos.has(x))

  async function confirmar() {
    setAviso(null); setErrorAlta(null)
    try {
      const ids = [...elegidos]
      const r = await agregar.mutateAsync({
        pieId: id, puntoIds: [...puntosSel],
        ...(porElemento ? { elementoIds: ids } : { testGroupIds: ids }),
      })
      setAviso(r.message)
      setElegidos(new Set())
    } catch (e) { setErrorAlta((e as Error).message) }
  }

  const sinNada = data && data.total === 0 && !buscar && !tipo && !subsistemaId

  return (
    <div className="space-y-5">
      <Encabezado
        titulo={`Alcance${pie ? ` · ${pie.codigo}` : ""}`}
        descripcion={<>Elegí los {porElemento ? "elementos" : "test packs"} y los puntos a los que se suman. Los {porElemento ? "elementos" : "test packs"} tienen que estar cargados en el proyecto; si falta alguno, se carga desde <Link className="underline" href="/alcance/importacion">Importar datos del proyecto</Link> (sin sistema ni subsistema quedan en «Sin asignar»).</>}
      >
        <Button asChild variant="outline"><Link href={`/calidad/qaqc/pie/${id}`}><ArrowLeft className="h-4 w-4" /> Volver al PIE</Link></Button>
      </Encabezado>

      {alcances.length > 1 && (
        <div className="inline-flex rounded-md border bg-white p-0.5 text-sm">
          {alcances.map((a) => (
            <button key={a} type="button" onClick={() => cambiarAlcance(a)}
              className={`rounded px-3 py-1 ${a === alcance ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {a === AlcancePunto.PorElemento ? "Elementos" : "Test packs"}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}
      {pie && alcances.length === 0 && (
        <div className="rounded-lg border bg-white p-10 text-center">
          <Boxes className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium">Este PIE no tiene puntos por elemento ni por grupo</p>
          <p className="mt-1 text-sm text-muted-foreground">El alcance de cada punto se define en la estructura del PIE (Configuración).</p>
        </div>
      )}

      {data && alcances.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* ── Elementos ── */}
          <section className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-56 flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder={porElemento ? "Buscar tag o descripción" : "Buscar código o nombre del test pack"}
                  value={buscar} onChange={(e) => setBuscar(e.target.value)} />
              </div>
              {porElemento && data.tipos.length > 0 && (
                <div className="w-52"><select className={CLASE_SELECT} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  {data.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></div>
              )}
              {data.subsistemas.length > 0 && (
                <div className="w-56"><select className={CLASE_SELECT} value={subsistemaId} onChange={(e) => setSubsistemaId(e.target.value)}>
                  <option value="">Todos los subsistemas</option>
                  {data.subsistemas.map((s) => (
                    <option key={s.id} value={s.id}>{s.sinAsignar ? "Sin asignar" : `${s.sistema ? `${s.sistema} › ` : ""}${s.codigo}`}</option>
                  ))}
                </select></div>
              )}
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={ocultarIncluidos} onChange={(e) => setOcultarIncluidos(e.target.checked)} />
                Ocultar los que ya están
              </label>
            </div>

            {sinNada ? (
              <div className="rounded-lg border bg-white p-10 text-center">
                <Boxes className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 font-medium">{porElemento ? "El proyecto no tiene elementos cargados" : "El proyecto no tiene test packs"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Se cargan desde <Link className="underline" href="/alcance/importacion">Alcance › Importar datos del proyecto</Link>. Sistema y subsistema pueden quedar vacíos.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-white">
                <div className="max-h-[calc(100vh-300px)] min-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="w-9 px-3 py-2 text-left">
                          <input type="checkbox" aria-label="Elegir todos los visibles" checked={todosVisiblesElegidos} disabled={!carga || visiblesIds.length === 0}
                            onChange={() => {
                              const n = new Set(elegidos)
                              if (todosVisiblesElegidos) visiblesIds.forEach((x) => n.delete(x)); else visiblesIds.forEach((x) => n.add(x))
                              setElegidos(n)
                            }} />
                        </th>
                        <th className="px-2 py-2 text-left font-medium">{porElemento ? "Elemento" : "Test pack"}</th>
                        <th className="px-2 py-2 text-left font-medium">{porElemento ? "Tipo" : ""}</th>
                        <th className="px-2 py-2 text-left font-medium">Subsistema</th>
                        <th className="px-2 py-2 text-left font-medium">Ya está en</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {candidatos.map((c) => (
                        <tr key={c.id} className={`cursor-pointer hover:bg-slate-50 ${elegidos.has(c.id) ? "bg-blue-50/60" : ""}`}
                          onClick={() => carga && alternar(c.id, setElegidos)}>
                          <td className="px-3 py-1.5"><input type="checkbox" checked={elegidos.has(c.id)} disabled={!carga} readOnly /></td>
                          <td className="px-2 py-1.5">
                            <div className="font-medium">{c.etiqueta}</div>
                            {c.nombre && <div className="text-xs text-muted-foreground">{c.nombre}</div>}
                          </td>
                          <td className="px-2 py-1.5 text-xs text-muted-foreground">{porElemento ? c.tipo : ""}</td>
                          <td className="px-2 py-1.5 text-xs">
                            {c.subsistema?.toUpperCase() === "SIN-ASIGNAR" ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">Sin asignar</span> : c.subsistema}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex flex-wrap gap-1">
                              {c.puntoIds.map((pid) => (
                                <span key={pid} className={`rounded border px-1.5 py-0.5 text-xs ${puntosSel.has(pid) ? "border-green-300 bg-green-50 text-green-800" : "border-slate-200 text-slate-600"}`}>
                                  {puntoNumero.get(pid)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {candidatos.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">No hay {porElemento ? "elementos" : "test packs"} que coincidan.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-1.5 text-xs text-muted-foreground">
                  <span>
                    {data.total > data.candidatos.length ? `Se muestran ${data.candidatos.length} de ${data.total}: afiná la búsqueda.` : `${data.total} en el proyecto con estos filtros.`}
                    {isFetching && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
                  </span>
                  <span>{elegidos.size} elegido{elegidos.size === 1 ? "" : "s"}{elegidos.size > 0 && <> · <button type="button" className="underline" onClick={() => setElegidos(new Set())}>limpiar</button></>}</span>
                </div>
              </div>
            )}
          </section>

          {/* ── Puntos ── */}
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-lg border bg-white">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <h2 className="text-sm font-semibold">Puntos {porElemento ? "por elemento" : "por grupo"}</h2>
                {puntosElegibles.length > 1 && (
                  <button type="button" className="text-xs underline text-muted-foreground"
                    onClick={() => setPuntosSel(puntosSel.size === puntosElegibles.length ? new Set() : new Set(puntosElegibles.map((p) => p.id)))}>
                    {puntosSel.size === puntosElegibles.length ? "Ninguno" : "Todos"}
                  </button>
                )}
              </div>
              <div className="max-h-[calc(100vh-420px)] min-h-40 overflow-y-auto">
                {hojas.map((h) => (
                  <div key={h.titulo + h.numero}>
                    <div className="bg-slate-50 px-3 py-1 text-xs font-medium text-muted-foreground">{h.numero ? `PIE Nº ${h.numero} · ${h.titulo}` : h.titulo}</div>
                    {h.puntos.map((p) => (
                      <label key={p.id} title={p.bloqueado ?? undefined}
                        className={`flex gap-2 border-t px-3 py-2 text-sm ${p.bloqueado ? "text-muted-foreground" : "cursor-pointer hover:bg-slate-50"} ${puntosSel.has(p.id) ? "bg-blue-50/60" : ""}`}>
                        {p.bloqueado
                          ? <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          : <input type="checkbox" className="mt-0.5" checked={puntosSel.has(p.id)} disabled={!carga} onChange={() => alternar(p.id, setPuntosSel)} />}
                        <span className="min-w-0">
                          <span className="font-medium">{p.numero}</span> {p.actividad}
                          <span className="block text-xs text-muted-foreground">
                            {p.items} {nombreItems(p.alcance, p.items)}{p.alcanceDescripcion ? ` · ${p.alcanceDescripcion}` : ""}{p.bloqueado ? ` · ${p.bloqueado}` : ""}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {carga && (
              <div className="space-y-2 rounded-lg border bg-white p-3">
                <p className="text-sm">
                  {elegidos.size === 0 || puntosSel.size === 0
                    ? <span className="text-muted-foreground">Elegí {porElemento ? "elementos" : "test packs"} a la izquierda y al menos un punto.</span>
                    : <>Se suman <b>{elegidos.size}</b> {nombreItems(alcance, elegidos.size)} a <b>{puntosSel.size}</b> punto{puntosSel.size === 1 ? "" : "s"}: <b>{nuevos}</b> nuevo{nuevos === 1 ? "" : "s"}{nuevos < elegidos.size * puntosSel.size && <> ({elegidos.size * puntosSel.size - nuevos} ya estaban)</>}.</>}
                </p>
                <Button className="w-full" disabled={elegidos.size === 0 || puntosSel.size === 0 || agregar.isPending} onClick={confirmar}>
                  {agregar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Agregar al alcance
                </Button>
                <p className="text-xs text-muted-foreground">Si un punto ya estaba firmado, queda con ampliación pendiente hasta que vuelvan a firmar.</p>
                {aviso && <p className="text-sm text-green-700">{aviso}</p>}
                {errorAlta && <p className="whitespace-pre-line text-sm text-red-600">{errorAlta}</p>}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
