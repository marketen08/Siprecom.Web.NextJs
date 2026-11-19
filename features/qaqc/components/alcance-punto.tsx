"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, MinusCircle, Plus, Search, Trash2, Undo2, Unlock, X } from "lucide-react"

import {
  useAgregarItems, useCandidatos, useCrearRegistro, useItemNoAplica, useItemQuitarNoAplica, useQuitarItem,
} from "@/features/qaqc/api/use-qaqc"
import { CLASE_SELECT, EstadoItemBadge, usePermisosQaqc } from "@/features/qaqc/components/comunes"
import { DialogoTexto } from "@/features/qaqc/components/dialogo-texto"
import { AlcancePunto, EstadoItem, nombreItems, type PieItem, type PiePunto } from "@/features/qaqc/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Alcance de un punto por elemento o por grupo. Cada ítem (un elemento, un test pack) se
 * cubre con registros del punto; un registro puede cubrir varios, así que se eligen los
 * ítems y después la planilla. Si el punto anterior es un HP, solo se pueden registrar
 * los ítems que ese HP ya liberó uno por uno.
 */
export function AlcancePuntoSeccion({ punto, cerrado }: { punto: PiePunto; cerrado: boolean }) {
  const router = useRouter()
  const { carga, gestion } = usePermisosQaqc()
  const crearRegistro = useCrearRegistro()
  const quitar = useQuitarItem()
  const noAplica = useItemNoAplica()
  const quitarNa = useItemQuitarNoAplica()

  const [filtro, setFiltro] = useState("")
  const [soloPendientes, setSoloPendientes] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [agregando, setAgregando] = useState(false)
  const [itemNa, setItemNa] = useState<PieItem | null>(null)
  const [errorNa, setErrorNa] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const plural = nombreItems(punto.alcance, 2)
  const aplican = punto.itemsTotal - punto.itemsNoAplica
  const esHp = punto.itemsLiberadosHp != null

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return punto.items.filter((i) =>
      (!q || `${i.etiqueta} ${i.nombre} ${i.tipo}`.toLowerCase().includes(q))
      && (!soloPendientes || (i.estado !== EstadoItem.Cubierto && i.estado !== EstadoItem.NoAplica)))
  }, [punto.items, filtro, soloPendientes])

  const seleccionable = (i: PieItem) => !i.noAplica && !i.bloqueadoPor && !cerrado
  const elegidos = punto.items.filter((i) => seleccion.has(i.id) && seleccionable(i))

  function alternar(id: string) {
    const s = new Set(seleccion)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSeleccion(s)
  }

  function alternarVisibles() {
    const disponibles = visibles.filter(seleccionable).map((i) => i.id)
    const todos = disponibles.every((id) => seleccion.has(id))
    const s = new Set(seleccion)
    for (const id of disponibles) { if (todos) s.delete(id); else s.add(id) }
    setSeleccion(s)
  }

  async function nuevoRegistro(planillaId: string) {
    setError(null)
    try {
      const r = await crearRegistro.mutateAsync({ puntoId: punto.id, planillaId, itemIds: elegidos.map((i) => i.id) })
      router.push(`/ejecucion/registros/${r.data.registroId}`)
    } catch (e) { setError((e as Error).message) }
  }

  async function confirmarNa(motivo: string) {
    if (!itemNa) return
    setErrorNa(null)
    try { await noAplica.mutateAsync({ id: itemNa.id, motivo }); setItemNa(null) }
    catch (e) { setErrorNa((e as Error).message) }
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Alcance <span className="font-normal text-muted-foreground">· {punto.itemsCubiertos}/{aplican} {nombreItems(punto.alcance, aplican)} cubiertos
            {punto.itemsNoAplica > 0 && ` · ${punto.itemsNoAplica} N/A`}
            {esHp && ` · ${punto.itemsLiberadosHp} liberados por el HP`}</span>
        </h3>
        {carga && !cerrado && (
          <Button size="sm" variant={agregando ? "secondary" : "outline"} onClick={() => setAgregando(!agregando)}>
            {agregando ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />} {agregando ? "Cerrar" : `Agregar ${plural}`}
          </Button>
        )}
      </div>
      {punto.alcanceDescripcion && <p className="text-xs text-muted-foreground">Se chequea {punto.alcanceDescripcion}.</p>}
      {esHp && (
        <p className="text-xs text-muted-foreground">
          Es un HP: cada {nombreItems(punto.alcance, 1)} se libera para el punto siguiente cuando su registro lo firma la parte del HP.
        </p>
      )}

      {agregando && <AgregarItems punto={punto} onListo={() => setAgregando(false)} />}

      {punto.items.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Todavía no se cargó qué {plural} se chequean. Agregalos acá o en bloque desde Excel (botón “Alcance” en el PIE).
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-40 flex-1">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="h-8 pl-7 text-sm" placeholder="Buscar tag o descripción" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            </div>
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} /> Solo pendientes
            </label>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-1.5 text-left">
                    {carga && !cerrado && <input type="checkbox" aria-label="Elegir todos" onChange={alternarVisibles}
                      checked={visibles.some(seleccionable) && visibles.filter(seleccionable).every((i) => seleccion.has(i.id))} />}
                  </th>
                  <th className="px-2 py-1.5 text-left font-medium">{punto.alcance === AlcancePunto.PorGrupo ? "Test pack" : "Tag"}</th>
                  <th className="px-2 py-1.5 text-left font-medium">Estado</th>
                  <th className="w-20 px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibles.map((i) => (
                  <tr key={i.id} className={i.noAplica ? "text-muted-foreground" : ""}>
                    <td className="px-2 py-1.5 align-top">
                      {carga && !cerrado && (
                        <input type="checkbox" disabled={!seleccionable(i)} checked={seleccion.has(i.id) && seleccionable(i)}
                          onChange={() => alternar(i.id)} aria-label={`Elegir ${i.etiqueta}`} />
                      )}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <div className="font-medium">{i.etiqueta}</div>
                      <div className="text-xs text-muted-foreground">{[i.nombre, i.tipo].filter(Boolean).join(" · ")}</div>
                      {i.noAplica && i.noAplicaMotivo && <div className="text-xs">N/A: {i.noAplicaMotivo}</div>}
                      {i.bloqueadoPor && <div className="text-xs text-red-700">{i.bloqueadoPor}</div>}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <EstadoItemBadge estado={i.estado} bloqueado={!!i.bloqueadoPor} />
                      {i.liberadoHp && !i.noAplica && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-green-700"><Unlock className="h-3 w-3" />Liberado</div>
                      )}
                      {i.registroIds.length > 0 && <div className="text-xs text-muted-foreground">{i.registroIds.length} registro{i.registroIds.length > 1 ? "s" : ""}</div>}
                    </td>
                    <td className="px-1 py-1 text-right align-top whitespace-nowrap">
                      {!cerrado && gestion && (i.noAplica
                        ? <Button size="icon" variant="ghost" title="Vuelve a aplicar" onClick={() => quitarNa.mutateAsync(i.id).catch((e) => setError(e.message))}><Undo2 className="h-3.5 w-3.5" /></Button>
                        : i.registroIds.length === 0 && <Button size="icon" variant="ghost" title="No aplica" onClick={() => { setErrorNa(null); setItemNa(i) }}><MinusCircle className="h-3.5 w-3.5" /></Button>)}
                      {!cerrado && carga && i.registroIds.length === 0 && (
                        <Button size="icon" variant="ghost" title="Quitar del alcance" onClick={() => quitar.mutateAsync(i.id).catch((e) => setError(e.message))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
                {visibles.length === 0 && <tr><td colSpan={4} className="px-3 py-3 text-center text-xs text-muted-foreground">Nada coincide con el filtro.</td></tr>}
              </tbody>
            </table>
          </div>

          {carga && !cerrado && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-2">
              <span className="text-xs text-muted-foreground">
                {elegidos.length === 0 ? `Elegí los ${plural} que cubre el registro.` : `${elegidos.length} elegido${elegidos.length > 1 ? "s" : ""}:`}
              </span>
              {punto.planillas.map((pl) => (
                <Button key={pl.planillaId} size="sm" variant="outline" disabled={elegidos.length === 0 || crearRegistro.isPending} onClick={() => nuevoRegistro(pl.planillaId)}>
                  {crearRegistro.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Nuevo {pl.codigo ?? pl.nombre}
                </Button>
              ))}
              {punto.planillas.length === 0 && <span className="text-xs text-amber-700">El punto no tiene planillas asignadas.</span>}
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}

      <DialogoTexto
        abierto={itemNa !== null}
        titulo={`${itemNa?.etiqueta ?? ""} no aplica`}
        descripcion="Se descuenta del alcance del punto y del avance. Queda el motivo en el anexo del PIE."
        etiqueta="Motivo"
        obligatorio
        accion="Marcar No aplica"
        pendiente={noAplica.isPending}
        error={errorNa}
        onCancelar={() => setItemNa(null)}
        onConfirmar={confirmarNa}
      />
    </section>
  )
}

/** Busca elementos (o test packs) del proyecto y los suma al alcance. */
function AgregarItems({ punto, onListo }: { punto: PiePunto; onListo: () => void }) {
  const [buscar, setBuscar] = useState("")
  const [tipo, setTipo] = useState("")
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const { data, isFetching } = useCandidatos(punto.id, buscar, tipo)
  const agregar = useAgregarItems()
  const porElemento = punto.alcance === AlcancePunto.PorElemento

  const disponibles = (data?.items ?? []).filter((c) => !c.yaIncluido)

  function alternar(id: string) {
    const s = new Set(elegidos)
    if (s.has(id)) s.delete(id); else s.add(id)
    setElegidos(s)
  }

  async function confirmar() {
    setError(null)
    const ids = [...elegidos]
    try {
      const r = await agregar.mutateAsync(porElemento ? { puntoId: punto.id, elementoIds: ids } : { puntoId: punto.id, testGroupIds: ids })
      setElegidos(new Set())
      setAviso(r.message)
      if (punto.firmas.some((f) => f.vigente) && r.data.agregados > 0) setAviso(`${r.message} El punto ya estaba firmado: queda con ampliación pendiente.`)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/40 p-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 bg-white pl-7 text-sm" autoFocus placeholder={porElemento ? "Buscar tag o nombre del elemento" : "Buscar código del test pack"}
            value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>
        {porElemento && (data?.tipos.length ?? 0) > 0 && (
          <select className={`${CLASE_SELECT} h-8 max-w-48 bg-white text-sm`} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {data!.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>
      <div className="max-h-56 overflow-y-auto rounded border bg-white">
        {isFetching && !data && <p className="p-2 text-xs text-muted-foreground">Buscando…</p>}
        {data && data.items.length === 0 && (
          <p className="p-2 text-xs text-muted-foreground">
            {porElemento ? "No hay elementos que coincidan. Si falta alguno, primero hay que darlo de alta en el proyecto." : "No hay test packs que coincidan."}
          </p>
        )}
        <ul className="divide-y text-sm">
          {data?.items.map((c) => (
            <li key={c.id}>
              <label className={`flex items-center gap-2 px-2 py-1 ${c.yaIncluido ? "text-muted-foreground" : "cursor-pointer hover:bg-slate-50"}`}>
                {c.yaIncluido ? <Check className="h-3.5 w-3.5 text-green-700" /> : <input type="checkbox" checked={elegidos.has(c.id)} onChange={() => alternar(c.id)} />}
                <span className="font-medium">{c.etiqueta}</span>
                <span className="truncate text-xs text-muted-foreground">{[c.nombre, c.tipo, c.subsistema].filter(Boolean).join(" · ")}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {data && (data.total > data.items.length ? `Se muestran ${data.items.length} de ${data.total}: afiná la búsqueda.` : `${data.total} en el proyecto.`)}
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={disponibles.length === 0}
            onClick={() => setElegidos(new Set(disponibles.map((c) => c.id)))}>Elegir los {disponibles.length} visibles</Button>
          <Button size="sm" disabled={elegidos.size === 0 || agregar.isPending} onClick={confirmar}>
            {agregar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Agregar {elegidos.size || ""}
          </Button>
          <Button size="sm" variant="outline" onClick={onListo}>Listo</Button>
        </div>
      </div>
      {aviso && <p className="text-xs text-green-700">{aviso}</p>}
      {error && <p className="text-xs text-red-600 whitespace-pre-line">{error}</p>}
    </div>
  )
}
