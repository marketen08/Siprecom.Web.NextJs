"use client"

import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Eye, FileImage, Layers,
  Loader2, PenLine, Tag, UserRound, X,
} from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import {
  useFirmarLote,
  useGetFirmaMasivaContexto,
  useGetFirmaMasivaOpciones,
  useGetFirmaMasivaPendientes,
  usePreviewFirmaMasiva,
} from "@/features/firma-masiva/api/use-firma-masiva"
import type {
  FirmaMasivaFiltro, FirmaMasivaOpcion, FirmaMasivaResultado,
} from "@/features/firma-masiva/types"
import { Button } from "@/components/ui/button"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const ALL = "__all__"

/**
 * Firma en lote.
 *
 * Pantalla aparte de la cola de a uno (`/ejecucion/firmas`), que queda igual que
 * siempre. Acá se arma un lote homogéneo —mismo subsistema, misma tarea, misma
 * planilla— y se firma de una vez.
 *
 * Dos decisiones de UX que vienen del plan y conviene no deshacer sin pensarlas:
 *
 *  1. **La página es del tamaño del tope.** Con `pageSize = topeLote` lo que se ve
 *     ES lo máximo que se puede firmar de una, así que "seleccionar todo" no tiene
 *     ninguna ambigüedad: no hay filas tildadas fuera de la vista. Después de firmar,
 *     la lista se rellena sola con la tanda siguiente.
 *  2. **No se exige abrir los PDF.** El preview está a un click y queda registrado
 *     qué abrió (`RegistroFirma.RevisadaEnLote`), pero el botón de firmar no lo pide.
 *     Lo que hace defendible el lote es que sea homogéneo y acotado, no un requisito
 *     que se cumple haciendo tres clicks sin leer. Ver Docs/PLAN-FIRMA-MASIVA.md.
 */
// El default export envuelve en <Suspense> — obligatorio en Next 16 cuando el
// componente usa useSearchParams (client-side bailout en el pre-render estático).
export default function FirmaEnLotePage() {
  return (
    <Suspense>
      <FirmaEnLotePageContent />
    </Suspense>
  )
}

function FirmaEnLotePageContent() {
  const searchParams = useSearchParams()
  const { data: perfil } = useGetPerfil()
  const proyectoId = perfil?.proyectoId

  const { data: ctxResp, isLoading: cargandoCtx } = useGetFirmaMasivaContexto(proyectoId)
  const contexto = ctxResp?.data

  const [rolNombre, setRolNombre] = useState("")
  const [subSistemaId, setSubSistemaId] = useState("")
  const [tareaId, setTareaId] = useState("")
  const [especialidadId, setEspecialidadId] = useState("")
  const [planillaId, setPlanillaId] = useState("")
  const [excluirPropios, setExcluirPropios] = useState(false)
  // Entrar desde el tab "De mis tareas" abre el lote ya acotado a lo propio: si no,
  // el botón de ese tab llevaría a un lote con toda la obra, que es lo contrario de
  // lo que el usuario estaba mirando.
  const [soloMisTareas, setSoloMisTareas] = useState(searchParams.get("mias") === "1")
  const [page, setPage] = useState(1)

  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [revisados, setRevisados] = useState<Set<string>>(new Set())
  const [viendo, setViendo] = useState<string | null>(null)
  const [observaciones, setObservaciones] = useState("")
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<FirmaMasivaResultado | null>(null)

  const tope = contexto?.topeLote ?? 50

  // El rol se deriva en vez de sincronizarse con un effect: el primero habilitado
  // hasta que el usuario elija otro. Con uno solo, no hay nada que elegir.
  const rolEfectivo = rolNombre || contexto?.roles?.[0]?.rolNombre || ""

  const filtro: FirmaMasivaFiltro | null = useMemo(
    () =>
      proyectoId && rolEfectivo
        ? {
            proyectoId, rolNombre: rolEfectivo, subSistemaId, tareaId,
            especialidadId, planillaId, excluirPropios, soloMisTareas,
          }
        : null,
    [proyectoId, rolEfectivo, subSistemaId, tareaId, especialidadId, planillaId,
     excluirPropios, soloMisTareas],
  )

  const { data: opcResp } = useGetFirmaMasivaOpciones(filtro)
  const opciones = opcResp?.data

  const { data: pendResp, isLoading, isFetching } = useGetFirmaMasivaPendientes(filtro, page, tope)
  const filas = pendResp?.data?.data ?? []
  const total = pendResp?.data?.total ?? 0

  const preview = usePreviewFirmaMasiva()
  const firmar = useFirmarLote()

  /**
   * Todo cambio de criterio pasa por acá. Dejar tildes de un filtro anterior sería
   * firmar algo que ya no se está viendo, así que la selección se limpia junto con
   * el filtro — en el handler y no en un effect, que es lo que lo hace evidente.
   */
  function cambiarCriterio(aplicar: () => void) {
    aplicar()
    setElegidos(new Set())
    setViendo(null)
    setPage(1)
  }

  function toggle(id: string) {
    setElegidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const todosTildados = filas.length > 0 && filas.every((f) => elegidos.has(f.registroId))

  function toggleTodos() {
    setElegidos(todosTildados ? new Set() : new Set(filas.map((f) => f.registroId)))
  }

  function verRegistro(id: string) {
    setViendo(id)
    // Abrirlo es lo que queda registrado como revisado. No se exige, se anota.
    setRevisados((prev) => new Set(prev).add(id))
  }

  const propiosVisibles = filas.filter((f) => f.esPropio).length

  async function abrirConfirmacion() {
    setResultado(null)
    setConfirmando(true)
    if (filtro) {
      await preview
        .mutateAsync({ filtro, registroIds: Array.from(elegidos) })
        .catch(() => undefined)
    }
  }

  async function confirmarFirma() {
    if (!filtro) return
    const r = await firmar.mutateAsync({
      filtro,
      registroIds: Array.from(elegidos),
      registrosRevisados: Array.from(revisados),
      observaciones: observaciones.trim() || undefined,
    })
    setResultado(r.data)
    setElegidos(new Set())
    setRevisados(new Set())
    setObservaciones("")
    setViendo(null)
  }

  // ── Estados de borde ───────────────────────────────────────────────────────

  if (!proyectoId) {
    return (
      <Encabezado>
        <Aviso>No tenés un proyecto activo asignado.</Aviso>
      </Encabezado>
    )
  }

  if (cargandoCtx) {
    return (
      <Encabezado>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      </Encabezado>
    )
  }

  if (!contexto?.habilitada) {
    const faltaFirma = contexto?.requiereFirmaGuardada && !contexto?.tieneFirmaGuardada
    return (
      <Encabezado>
        <div className="rounded-lg border bg-white p-10 text-center space-y-3 max-w-xl">
          <PenLine className="h-10 w-10 text-gray-400 mx-auto" />
          <p className="font-medium text-gray-700">
            {contexto?.motivoNoDisponible ?? "La firma en lote no está disponible."}
          </p>
          {faltaFirma ? (
            <>
              <p className="text-sm text-muted-foreground">
                Guardala una vez y queda para todos los lotes. Podés dibujarla al firmar
                cualquier registro desde la cola.
              </p>
              <Link
                href="/ejecucion/firmas"
                className="inline-flex text-sm underline hover:text-gray-700"
              >
                Ir a la cola de firmas
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Los registros se siguen firmando de a uno desde la cola de firmas.
            </p>
          )}
        </div>
      </Encabezado>
    )
  }

  // ── Pantalla ───────────────────────────────────────────────────────────────

  return (
    <Encabezado>
      {/* Rol: sólo si hay más de uno con el que firmar en lote */}
      {contexto.roles.length > 1 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Firmo como
          </p>
          <div className="inline-flex gap-1 p-1 rounded-lg bg-gray-100 flex-wrap">
            {contexto.roles.map((r) => (
              <button
                key={r.rolNombre}
                onClick={() => cambiarCriterio(() => setRolNombre(r.rolNombre))}
                className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${
                  rolEfectivo === r.rolNombre
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {r.rolNombre}
                <span className="ml-1.5 text-xs text-muted-foreground">{r.pendientes}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtros: los grupos con los que se arma un lote homogéneo, con su conteo */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FiltroGrupo
          etiqueta="Subsistema"
          opciones={opciones?.subSistemas}
          value={subSistemaId}
          onChange={(v) => cambiarCriterio(() => setSubSistemaId(v))}
        />
        <FiltroGrupo
          etiqueta="Tarea"
          opciones={opciones?.tareas}
          value={tareaId}
          onChange={(v) => cambiarCriterio(() => setTareaId(v))}
        />
        <FiltroGrupo
          etiqueta="Especialidad"
          opciones={opciones?.especialidades}
          value={especialidadId}
          onChange={(v) => cambiarCriterio(() => setEspecialidadId(v))}
        />
        <FiltroGrupo
          etiqueta="Planilla"
          opciones={opciones?.planillas}
          value={planillaId}
          onChange={(v) => cambiarCriterio(() => setPlanillaId(v))}
        />
      </div>

      {/* Alcance. "Mis tareas" y "lo cargué yo" son preguntas distintas y se suman:
          de quién es la tarea sale de los asignados, quién cargó el registro sale
          del registro. Un supervisor puede tener la tarea y no haber cargado nada. */}
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={soloMisTareas}
          onChange={(e) => cambiarCriterio(() => setSoloMisTareas(e.target.checked))}
          className="h-4 w-4 cursor-pointer"
        />
        <span className="text-gray-700">Sólo tareas asignadas a mí</span>
      </label>

      {/* Separación de funciones: hoy nada impide firmar lo propio, pero por lo menos
          se ve y se puede sacar con un click. */}
      {propiosVisibles > 0 && !excluirPropios && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="text-amber-800">
              {propiosVisibles === 1
                ? "1 de los registros que ves lo cargaste vos."
                : `${propiosVisibles} de los registros que ves los cargaste vos.`}
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2 text-amber-900"
              onClick={() => cambiarCriterio(() => setExcluirPropios(true))}
            >
              Sacarlos del lote
            </Button>
          </div>
        </div>
      )}

      {excluirPropios && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Se están excluyendo los registros que cargaste vos.</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={() => cambiarCriterio(() => setExcluirPropios(false))}
          >
            Volver a incluirlos
          </Button>
        </div>
      )}

      {/* Resultado del último lote */}
      {resultado && (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="font-medium text-gray-800">
              Se firmaron {resultado.firmados} registro{resultado.firmados !== 1 ? "s" : ""}.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 px-2"
              onClick={() => setResultado(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {resultado.omitidos > 0 && (
            <div className="space-y-1">
              <p className="text-sm text-amber-700">
                {resultado.omitidos} quedaron sin firmar:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5 pl-1">
                {resultado.omisiones.map((o) => (
                  <li key={o.registroId}>
                    <span className="font-medium text-gray-700">{o.elementoTag}</span> — {o.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tabla + visor */}
      <div className={viendo ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]" : ""}>
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            {total} registro{total !== 1 ? "s" : ""} esperando tu firma como{" "}
            <span className="font-medium text-gray-700">{rolEfectivo}</span>
            {total > tope && <> · se firman de a {tope}</>}
            {isFetching && !isLoading && <span className="ml-2 text-xs">(actualizando...)</span>}
          </p>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
            </div>
          ) : filas.length === 0 ? (
            <Aviso>
              {soloMisTareas ? (
                <>
                  Nada de tus tareas esperando firma con este criterio.
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => cambiarCriterio(() => setSoloMisTareas(false))}
                  >
                    Ver todo lo que podés firmar
                  </Button>
                </>
              ) : (
                "No hay registros esperando tu firma con este criterio."
              )}
            </Aviso>
          ) : (
            <>
              <div className="rounded-lg border bg-white overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={todosTildados}
                          onChange={toggleTodos}
                          aria-label="Seleccionar todos los de esta tanda"
                          className="h-4 w-4 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead>TAG</TableHead>
                      <TableHead>Elemento</TableHead>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Subsistema</TableHead>
                      <TableHead>Completado</TableHead>
                      <TableHead>Cargado por</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((f) => {
                      const tildado = elegidos.has(f.registroId)
                      return (
                        <TableRow
                          key={f.registroId}
                          className={`${tildado ? "bg-blue-50/50" : ""} ${
                            viendo === f.registroId ? "ring-1 ring-inset ring-blue-300" : ""
                          }`}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={tildado}
                              onChange={() => toggle(f.registroId)}
                              aria-label={`Seleccionar ${f.elementoTag}`}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Tag className="h-3 w-3 text-gray-400" />
                              {f.elementoTag}
                              {revisados.has(f.registroId) && (
                                <span title="Lo abriste antes de firmar">
                                  <Eye className="h-3 w-3 text-blue-500" />
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[14rem] truncate" title={f.elementoNombre}>
                            {f.elementoNombre}
                            {f.esFisico && (
                              <span title="Registro físico">
                                <FileImage className="inline h-3 w-3 ml-1 text-orange-500" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[12rem] truncate" title={f.tareaNombre}>
                            <span className="inline-flex items-center gap-1.5">
                              {(f.especialidadCodigo || f.especialidadNombre) && (
                                <span
                                  className="text-[10px] border rounded px-1 font-medium shrink-0"
                                  style={{
                                    color: f.especialidadColor ?? undefined,
                                    borderColor: f.especialidadColor ?? undefined,
                                  }}
                                  title={f.especialidadNombre ?? undefined}
                                >
                                  {f.especialidadCodigo ?? f.especialidadNombre}
                                </span>
                              )}
                              {f.tareaNombre}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Layers className="h-3 w-3" />
                              {f.subSistemaNombre}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {f.fechaTerminado
                              ? new Date(f.fechaTerminado).toLocaleDateString("es-AR")
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                f.esPropio ? "text-amber-700 font-medium" : "text-muted-foreground"
                              }`}
                            >
                              <UserRound className="h-3 w-3" />
                              {f.esPropio ? "Vos" : f.cargadoPorNombre}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => verRegistro(f.registroId)}
                              title="Ver el PDF del registro"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Barra de acción */}
              <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-lg border bg-white/95 backdrop-blur px-4 py-3">
                <span className="text-sm text-gray-700">
                  {elegidos.size === 0
                    ? "Ninguno seleccionado"
                    : `${elegidos.size} seleccionado${elegidos.size !== 1 ? "s" : ""}`}
                </span>
                {elegidos.size > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => setElegidos(new Set())}
                  >
                    Limpiar
                  </Button>
                )}
                <div className="ml-auto">
                  <Button
                    size="sm"
                    disabled={elegidos.size === 0}
                    onClick={abrirConfirmacion}
                    className="gap-1.5"
                  >
                    <PenLine className="h-4 w-4" />
                    Firmar {elegidos.size > 0 ? elegidos.size : ""}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Visor del PDF: revisar por muestreo sin salir de la pantalla ni perder
            la selección. */}
        {viendo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">
                {filas.find((f) => f.registroId === viendo)?.elementoTag ?? "Registro"}
              </p>
              <div className="flex items-center gap-1">
                <a
                  href={`/api/registros/${viendo}/pdf/preview`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline text-muted-foreground hover:text-gray-700"
                >
                  Abrir aparte
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setViendo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* iframe y no pdfjs por la misma razón que el detalle del registro: el
                visor del navegador ya trae zoom, búsqueda e impresión. Depende de que
                la ruta salga con frame-ancestors 'self' (RUTAS_EMBEBIDAS en
                next.config.ts); ya está, porque es la misma ruta del detalle. */}
            <iframe
              key={viendo}
              src={`/api/registros/${viendo}/pdf/preview`}
              title="Registro en PDF"
              className="w-full h-[calc(100vh-20rem)] min-h-[28rem] rounded-lg border bg-white"
            />
          </div>
        )}
      </div>

      {/* Confirmación: el conteo lo dice el servidor, no la pantalla */}
      <ConfirmActionDialog
        open={confirmando}
        onOpenChange={(o) => {
          setConfirmando(o)
          if (!o) preview.reset()
        }}
        title={`¿Firmar ${preview.data?.data.aFirmar ?? elegidos.size} registro(s) como ${rolEfectivo}?`}
        description={
          <div className="space-y-3 text-left">
            {preview.isPending ? (
              <p className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Verificando el lote...
              </p>
            ) : (
              <>
                {preview.data && preview.data.data.aFirmar !== elegidos.size && (
                  <p className="text-sm text-amber-700">
                    Seleccionaste {elegidos.size} pero quedan {preview.data.data.aFirmar} por
                    firmar — alguno se firmó o cambió de estado mientras mirabas.
                  </p>
                )}
                {!!preview.data?.data.propios && (
                  <p className="text-sm text-amber-700">
                    {preview.data.data.propios} de estos registros los cargaste vos.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Al firmar declarás haber revisado los registros del lote. Cada firma
                  queda con tu rol, la fecha y el hash del documento, igual que al firmar
                  de a uno, y se registra que se hizo en lote.
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    Observación (opcional — aplica a todas)
                  </label>
                  <Textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="Queda en las firmas de todo el lote"
                  />
                </div>
              </>
            )}
          </div>
        }
        confirmText="Firmar el lote"
        pendingText="Firmando..."
        onConfirm={confirmarFirma}
      />
    </Encabezado>
  )
}

function Encabezado({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link
          href="/ejecucion/firmas"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a la cola de firmas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Firma en lote</h1>
        <p className="text-sm text-muted-foreground">
          Armá un lote parejo —mismo subsistema, misma tarea, misma planilla— y firmalo
          de una vez.
        </p>
      </div>
      {children}
    </div>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-gray-50 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

/** Un filtro de grupo, con el conteo de cada opción al lado del nombre. */
function FiltroGrupo({
  etiqueta,
  opciones,
  value,
  onChange,
}: {
  etiqueta: string
  opciones: FirmaMasivaOpcion[] | undefined
  value: string
  onChange: (v: string) => void
}) {
  const items: ComboboxOption[] = [
    { value: ALL, label: `Todas` },
    ...(opciones ?? []).map((o) => ({
      value: o.id,
      label: `${o.nombre} (${o.cantidad})`,
    })),
  ]

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {etiqueta}
      </label>
      <Combobox
        options={items}
        value={value || ALL}
        onChange={(v) => onChange(v === ALL ? "" : v)}
        placeholder={`Todos los ${etiqueta.toLowerCase()}s`}
        searchPlaceholder={`Buscar ${etiqueta.toLowerCase()}...`}
      />
    </div>
  )
}
