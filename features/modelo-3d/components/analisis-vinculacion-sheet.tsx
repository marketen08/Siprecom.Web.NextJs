"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, RefreshCw, Search } from "lucide-react"

import { useGetAnalisisVinculacion, setApsTagProperties } from "../api/use-aps-codificaciones"
import { useProcesarIfcArchivo } from "../api/use-ifc-entidades"
import type { ApsAnalisisElementoAnalisis, ApsAnalisisVinculacion } from "../types"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onClose: () => void
  proyectoId: string
  archivoId: string | null
  archivoNombre?: string
}

/**
 * Análisis de vinculación — acción manual sobre una maqueta.
 *
 * Contesta la pregunta que antes había que resolver a mano con consultas sueltas:
 * de los Elementos que quedaron sin pieza, ¿alguno tiene su TAG en una property
 * del modelo que no estamos leyendo, o realmente no están en la maqueta?
 *
 * A diferencia del analizador de codificaciones, acá se revisan TODAS las
 * properties del modelo, no solo las que por nombre parecen llevar un TAG.
 *
 * Y si hay properties que aportan, deja armar la cadena acá mismo: las nuevas se
 * appendean al final de la que ya existe y se puede guardar + re-procesar sin
 * pasar por la pantalla de configuración.
 */
export function AnalisisVinculacionSheet({ open, onClose, proyectoId, archivoId, archivoNombre }: Props) {
  const query = useGetAnalisisVinculacion(archivoId, open)
  const data = query.data?.data ?? null
  const error = query.error as Error | null
  const procesar = useProcesarIfcArchivo(proyectoId)

  // null = todavía no tocó nada, vale la pre-selección derivada de los datos. Se
  // deriva en vez de sembrarla con un efecto para no re-renderizar en cascada cada
  // vez que llega la respuesta.
  const [seleccionManual, setSeleccionManual] = useState<Set<string> | null>(null)
  const [copiado, setCopiado] = useState(false)

  // Pre-selección: las que el greedy del backend marcó con aporte propio. Las que
  // aportan 0 (ya configuradas, o totalmente solapadas) quedan destildadas — sumarlas
  // alarga la cadena sin vincular nada.
  const seleccion = useMemo(
    () => seleccionManual ?? new Set(
      (data?.porProperty ?? []).filter((p) => p.elementosNuevos > 0).map((p) => p.property),
    ),
    [seleccionManual, data],
  )

  const toggle = (prop: string) => {
    const next = new Set(seleccion)
    if (next.has(prop)) next.delete(prop)
    else next.add(prop)
    setSeleccionManual(next)
  }

  // Al cerrar se descarta la selección: la próxima corrida trae datos nuevos y una
  // selección vieja tildaría properties que quizá ya no aportan.
  const cerrar = () => {
    setSeleccionManual(null)
    onClose()
  }

  // Aporte real de la selección: la UNIÓN de los elementos cubiertos, no la suma de
  // los conteos. Un mismo elemento suele aparecer en varias properties, así que
  // sumar filas siempre exagera. Si el backend acotó la cobertura por volumen, se
  // cae al aporte marginal del orden greedy, que es válido mientras no se destilde
  // nada del medio.
  const cubiertos = useMemo(() => {
    if (!data) return 0
    const elegidas = data.porProperty.filter((p) => seleccion.has(p.property))
    if (!data.coberturaDetallada)
      return elegidas.reduce((acc, p) => acc + p.elementosNuevos, 0)
    const union = new Set<number>()
    for (const p of elegidas) for (const i of p.cobertura) union.add(i)
    return union.size
  }, [data, seleccion])

  // La cadena resultante: lo que ya está, VERBATIM y en orden (preserva los `~regex`),
  // y las nuevas al final. El orden importa — una property nueva adelante puede
  // pisarle el TAG a objetos que hoy vinculan bien.
  const cadenaNueva = useMemo(() => {
    if (!data) return ""
    const nuevas = data.porProperty
      .filter((p) => seleccion.has(p.property) && !p.yaConfigurada)
      .map((p) => p.property)
    return [...data.cadenaActual, ...nuevas].join(",")
  }, [data, seleccion])

  const hayCambios = !!data && cadenaNueva !== data.cadenaActual.join(",")

  const copiar = async () => {
    await navigator.clipboard.writeText(cadenaNueva)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  async function aplicarYReprocesar() {
    if (!hayCambios || !archivoId) return
    await setApsTagProperties(proyectoId, cadenaNueva)
    await procesar.mutateAsync(archivoId)
    cerrar()
  }

  const conCoincidencia = (data?.elementos ?? []).filter((e) => e.properties.length > 0)
  const sinCoincidencia = (data?.elementos ?? []).filter((e) => e.properties.length === 0)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && cerrar()}>
      <SheetContent className="w-full sm:max-w-xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Análisis de vinculación
          </SheetTitle>
          <SheetDescription>
            Busca el TAG de cada Elemento <b>sin pieza</b> en todas las properties de{" "}
            <b>{archivoNombre ?? "la maqueta"}</b>, para distinguir «está pero con otra
            property» de «no está en el modelo».
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-3 sm:px-4 pb-6 space-y-3">
          {query.isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Analizando…
            </div>
          )}

          {error && !query.isFetching && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {error.message}
            </div>
          )}

          {data && !query.isFetching && (
            <>
              <div
                className={`rounded-md border p-3 text-sm flex items-start gap-2 ${
                  data.conCoincidencia > 0
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
                }`}
              >
                {data.conCoincidencia > 0
                  ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  : <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
                <span className="leading-snug">{data.mensaje}</span>
              </div>

              {data.porProperty.length > 0 && (
                <SelectorProperties
                  data={data}
                  seleccion={seleccion}
                  onToggle={toggle}
                  cubiertos={cubiertos}
                />
              )}

              {hayCambios && (
                <div className="space-y-2">
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Cadena resultante
                      </span>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={copiar}>
                        {copiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiado ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <code className="block text-[11px] text-gray-700 wrap-break-word">{cadenaNueva}</code>
                    <p className="text-[11px] text-muted-foreground">
                      Las nuevas van <b>al final</b>: adelante pueden pisarle el TAG a objetos
                      que hoy vinculan bien.
                    </p>
                  </div>

                  <ConfirmActionDialog
                    trigger={<><RefreshCw className="h-4 w-4" /> Guardar y re-procesar</>}
                    triggerClassName="inline-flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-blue-900 bg-blue-900 px-3 text-sm font-medium text-white hover:bg-blue-800"
                    title="¿Guardar esta cadena y re-procesar?"
                    description={
                      <>
                        Se guarda como <b>Property names</b> del proyecto y se vuelve a leer el
                        modelo con ella, re-vinculando contra los Elementos que ya existen.
                        <b> No crea ni borra Sistemas, SubSistemas ni Elementos.</b> En modelos
                        grandes el re-procesado tarda varios minutos.
                        <br />
                        <span className="text-xs text-muted-foreground">
                          Estimado: {cubiertos} de {data.elementosSinPieza} Elementos sin pieza
                          deberían quedar vinculados.
                        </span>
                      </>
                    }
                    confirmText="Guardar y re-procesar"
                    pendingText="Encolando…"
                    onConfirm={aplicarYReprocesar}
                  />
                </div>
              )}

              {data.elementosNombreCoincide > 0 && (
                <BucketNombre
                  total={data.elementosNombreCoincide}
                  items={data.porNombre}
                />
              )}

              {conCoincidencia.length > 0 && (
                <Detalle titulo="Elementos que sí están en el modelo" items={conCoincidencia} />
              )}
              {sinCoincidencia.length > 0 && (
                <Detalle
                  titulo="Sin rastro en ninguna property"
                  items={sinCoincidencia}
                  nota="Su TAG no figura en el modelo con ningún nombre de property. No es un problema de configuración."
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Lista de properties con checkbox. El número que se destaca es el aporte
 * marginal, no el total: el total cuenta también los elementos que ya trae otra
 * property, así que sumar las filas siempre da de más.
 */
function SelectorProperties({
  data, seleccion, onToggle, cubiertos,
}: {
  data: ApsAnalisisVinculacion
  seleccion: Set<string>
  onToggle: (prop: string) => void
  cubiertos: number
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Properties donde aparecen
        </h3>
        <span className="text-xs text-gray-600 tabular-nums">
          <b>{cubiertos}</b> elem. con lo tildado
        </span>
      </div>
      <ul className="space-y-1">
        {data.porProperty.map((p) => (
          <li key={p.property}>
            <label className="flex items-start gap-2 rounded-md border border-gray-200 px-2.5 py-1.5 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={seleccion.has(p.property)}
                onChange={() => onToggle(p.property)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <code className="text-[11px] text-blue-700 wrap-break-word">{p.property}</code>
                  <span className="shrink-0 text-xs text-gray-700 tabular-nums">
                    {p.elementosNuevos > 0 ? <b>+{p.elementosNuevos}</b> : "+0"}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  contiene el TAG de {p.elementos} elem.
                  {p.yaConfigurada && (
                    // Que esté configurada y el elemento siga sin pieza no es un
                    // empate: significa que en esos objetos gana una property
                    // anterior de la cadena. Re-agregarla no cambia nada.
                    <span className="ml-1.5 text-emerald-700">
                      · ya configurada — le gana una anterior de la cadena
                    </span>
                  )}
                </span>
              </div>
            </label>
          </li>
        ))}
      </ul>
      {!data.coberturaDetallada && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Son demasiados elementos para recalcular el aporte al destildar: los «+N» valen
          para la selección sugerida.
        </p>
      )}
    </div>
  )
}

/**
 * Coincidencias por Nombre. Van aparte y con la advertencia explícita porque NO se
 * arreglan con Property names: el matcher compara `TagDetectado` contra
 * `Elemento.Tag`, nunca contra el Nombre. Mezclarlas con las otras haría agregar
 * properties que no van a mover el número.
 */
function BucketNombre({ total, items }: { total: number; items: ApsAnalisisElementoAnalisis[] }) {
  return (
    <div className="rounded-md border border-orange-200 bg-orange-50/60 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-orange-900 mb-1">
        Coinciden por Nombre, no por TAG ({total})
      </h3>
      <p className="text-[11px] text-orange-900/80 mb-2">
        El valor está en el modelo pero es el <b>Nombre</b> del Elemento, no su TAG. La
        vinculación compara siempre contra el TAG, así que agregar esa property{" "}
        <b>no los va a vincular</b>: hay que corregir el TAG del Elemento o esperar la
        tabla de alias.
      </p>
      <ul className="space-y-1 max-h-56 overflow-y-auto">
        {items.map((e) => (
          <li key={e.elementoId} className="rounded-md border border-orange-200 bg-white px-2.5 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs font-medium text-gray-800">{e.tag}</span>
              <span className="text-[11px] text-muted-foreground truncate">{e.nombre}</span>
            </div>
            <code className="text-[10px] text-blue-700 wrap-break-word">{e.properties.join(" · ")}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Detalle({
  titulo, items, nota,
}: {
  titulo: string
  items: ApsAnalisisElementoAnalisis[]
  nota?: string
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {titulo} ({items.length})
      </h3>
      {nota && <p className="text-[11px] text-muted-foreground mb-1.5">{nota}</p>}
      <ul className="space-y-1 max-h-72 overflow-y-auto">
        {items.map((e) => (
          <li key={e.elementoId} className="rounded-md border border-gray-200 px-2.5 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-xs font-medium text-gray-800">{e.tag}</span>
              {e.nombre && e.nombre !== e.tag && (
                <span className="text-[11px] text-muted-foreground truncate">{e.nombre}</span>
              )}
            </div>
            {e.properties.length > 0 && (
              <code className="text-[10px] text-blue-700 wrap-break-word">
                {e.properties.join(" · ")}
              </code>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
