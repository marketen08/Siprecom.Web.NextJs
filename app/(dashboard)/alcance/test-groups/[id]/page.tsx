"use client"

import { use, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Award, BookOpen, CheckCircle2, ClipboardList, Download, FileDown, FileText, FileUp,
  Info, Layers, ListChecks, Loader2, MoreHorizontal, Play, RotateCcw, XCircle,
} from "lucide-react"

import { useGetTestGroup } from "@/features/testgroups/api/use-get-testgroup"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useGetElementosAsignados } from "@/features/testgroups/api/use-get-elementos-asignados"
import { useDesasignarElemento } from "@/features/testgroups/api/use-desasignar-elemento"
import { TestGroupActionsMenu } from "@/features/testgroups/components/testgroup-actions-menu"
import { EditTestGroupSheet } from "@/features/testgroups/components/edit-testgroup-sheet"
import {
  useGetTareasPack, ESTADO_TAREA, ESTADO_TAREA_LABEL, type EstadoTarea, type TestGroupTareaItem,
} from "@/features/testgroups/api/use-get-tareas-pack"
import { useCambiarEstadoTarea } from "@/features/testgroups/api/use-cambiar-estado-tarea"
import { useIniciarRegistroTarea } from "@/features/testgroups/api/use-iniciar-registro-tarea"
import { useReiniciarTareaPack } from "@/features/testgroups/api/use-reiniciar-tarea-pack"
import { useExcluirTareaPack } from "@/features/testgroups/api/use-excluir-tarea-pack"
import { useReincorporarTareaPack } from "@/features/testgroups/api/use-reincorporar-tarea-pack"
import { useGetTareasExcluidasPack } from "@/features/testgroups/api/use-get-tareas-excluidas-pack"
import { ESTADO_TEST_GROUP, TIPO_TEST_GROUP, METODO_PRUEBA, TIPO_PRUEBA_FUNCIONAL } from "@/features/testgroups/types"
import { useCanWrite } from "@/lib/use-roles"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

type Tab = "info" | "elementos" | "tareas" | "progreso"

// ─── Página ───────────────────────────────────────────────────────────────

export default function TestGroupDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("info")
  const pathname = usePathname()

  // Este detalle se monta tanto en /alcance como en /ejecucion (re-export en la
  // ruta espejo). El botón "Volver" apunta al listado por el que el user entró.
  const backHref = pathname?.startsWith("/ejecucion")
    ? "/ejecucion/test-groups"
    : "/alcance/test-groups"

  // Modo derivado de la URL:
  //   - "ejecucion": tab Tareas muestra acciones operativas (iniciar/completar/
  //     cargar físico/reiniciar/rechazar). Tab Elementos es solo lectura.
  //   - "alcance": tab Tareas muestra acciones de config (excluir/reincorporar).
  //     Tab Elementos permite agregar/quitar. Sin acciones operativas.
  // Un mismo componente sirve a las dos rutas; los subcomponentes lo consumen
  // para gate el UI.
  const modo: "alcance" | "ejecucion" = pathname?.startsWith("/ejecucion")
    ? "ejecucion"
    : "alcance"

  const { data, isLoading } = useGetTestGroup(id)
  const tg = data?.data
  const canWrite = useCanWrite()

  if (isLoading) {
    return <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</div>
  }
  if (!tg) {
    return <div className="p-6 text-destructive">No se pudo cargar el paquete.</div>
  }

  const isPressure = tg.tipo === TIPO_TEST_GROUP.PRESSURE

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight font-mono">{tg.codigo}</h1>
          <p className="text-sm text-muted-foreground">{tg.nombre || "(sin nombre)"} · {tg.tipoTexto}</p>
        </div>
        <div className="flex items-center gap-2">
          <EstadoBadge estado={tg.estado} texto={tg.estadoTexto} />
          <Button asChild variant="outline" size="sm" className="gap-2">
            {/* Enlace directo al proxy — el browser dispara la descarga.
                Con `download` forzamos "guardar como" en vez de abrir inline. */}
            <a href={`/api/testgroups/${tg.id}/pdf`} download={`${tg.codigo}.pdf`}>
              <Download className="h-4 w-4" />
              PDF
            </a>
          </Button>
          {canWrite && (
            <TestGroupActionsMenu
              tg={{ id: tg.id, codigo: tg.codigo, estado: tg.estado }}
              variant="labeled"
              onAfterDelete={() => router.push(backHref)}
            />
          )}
        </div>
      </div>
      {/* Sheet de edición controlado por useOpenTestGroup — se abre al elegir "Editar"
          desde el menú de acciones del header. Solo se monta si hay rol de escritura. */}
      {canWrite && <EditTestGroupSheet />}

      {/* Banner de certificado activo (F6.2). Cuando este pack forma parte de un RFC/RFSU/AOC
          emitido, todos los cambios están bloqueados hasta que se revoque desde /reporte/certificados. */}
      {tg.tieneCertificadoActivo && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 flex items-start gap-2 text-sm text-amber-900">
          <Award className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
          <div className="flex-1">
            <div className="font-medium">
              Este paquete forma parte del {tg.certificadoActivoTipoTexto} del subsistema
              {tg.certificadoActivoEmitidoEn && (
                <> · emitido el {new Date(tg.certificadoActivoEmitidoEn).toLocaleDateString("es-AR")}</>
              )}
              {tg.certificadoActivoEmitidoPorNombre && <> por {tg.certificadoActivoEmitidoPorNombre}</>}
            </div>
            <div className="text-xs mt-0.5">
              Los cambios en composición, tareas y estado están bloqueados. Para modificarlo,
              revocá el certificado desde <Link href="/reporte/certificados" className="underline">Reporte · Certificados</Link>.
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b flex items-center gap-1 overflow-x-auto">
        <TabButton current={tab} value="info" onClick={setTab} icon={Info}>Info</TabButton>
        <TabButton current={tab} value="elementos" onClick={setTab} icon={Layers}>
          Elementos ({tg.cantidadElementos})
        </TabButton>
        <TabButton current={tab} value="tareas" onClick={setTab} icon={ClipboardList}>
          Tareas ({tg.cantidadTareas})
        </TabButton>
        <TabButton current={tab} value="progreso" onClick={setTab} icon={ListChecks}>Progreso</TabButton>
      </div>

      {/* Contenido — para Consultor/Auditor forzamos `bloqueado` para ocultar todas
          las acciones de mutación (asignar/desasignar elementos, cambiar estado de
          tarea, cargar planilla física). El backend igual devolvería 403; esto
          evita mostrar botones que no van a funcionar. */}
      {tab === "info" && <TabInfo tg={tg} isPressure={isPressure} />}
      {tab === "elementos" && <TabElementos testGroupId={tg.id} bloqueado={!canWrite || tg.estado === ESTADO_TEST_GROUP.CERRADO || !!tg.tieneCertificadoActivo} modo={modo} />}
      {tab === "tareas" && <TabTareas testGroupId={tg.id} proyectoId={tg.proyectoId} bloqueado={!canWrite || tg.estado === ESTADO_TEST_GROUP.CERRADO || tg.estado === ESTADO_TEST_GROUP.BORRADOR || !!tg.tieneCertificadoActivo} modo={modo} />}
      {tab === "progreso" && <TabProgreso testGroupId={tg.id} />}
    </div>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────────────────

function TabButton({
  current, value, onClick, children, icon: Icon,
}: {
  current: Tab; value: Tab; onClick: (v: Tab) => void; children: React.ReactNode; icon: React.ComponentType<{ className?: string }>
}) {
  const active = current === value
  return (
    <button
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
        active
          ? "border-blue-700 text-blue-700 font-medium"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}

function EstadoBadge({ estado, texto }: { estado: number; texto: string }) {
  const cls =
    estado === ESTADO_TEST_GROUP.BORRADOR ? "border-gray-300 text-gray-700 bg-gray-50" :
    estado === ESTADO_TEST_GROUP.ACTIVO ? "border-blue-300 text-blue-700 bg-blue-50" :
    estado === ESTADO_TEST_GROUP.COMPLETADO ? "border-green-300 text-green-700 bg-green-50" :
    "border-slate-400 text-slate-700 bg-slate-100"
  return <Badge variant="outline" className={cls}>{texto}</Badge>
}

// ─── TAB: Info ────────────────────────────────────────────────────────────

function TabInfo({ tg, isPressure }: { tg: any; isPressure: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">General</p>
        <InfoRow label="Código" value={<span className="font-mono">{tg.codigo}</span>} />
        <InfoRow label="Nombre" value={tg.nombre || "—"} />
        <InfoRow label="Tipo" value={tg.tipoTexto} />
        <InfoRow label="Estado" value={<EstadoBadge estado={tg.estado} texto={tg.estadoTexto} />} />
        <InfoRow label="Subsistema" value={tg.subSistemaCodigo ? `${tg.subSistemaCodigo} — ${tg.subSistemaNombre}` : "—"} />
        <InfoRow label="Descripción" value={tg.descripcion || "—"} />
      </Card>

      {isPressure ? (
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pressure Test Pack</p>
          <InfoRow label="Presión (bar)" value={tg.presion ?? "—"} />
          <InfoRow label="Método" value={
            tg.metodoPrueba === METODO_PRUEBA.HIDROSTATICA ? "Hidrostática" :
            tg.metodoPrueba === METODO_PRUEBA.NEUMATICA ? "Neumática" :
            tg.metodoPrueba === METODO_PRUEBA.VACIO ? "Vacío" : "—"
          } />
          <InfoRow label="Fluido" value={tg.fluido || "—"} />
          <InfoRow label="P&ID referencia" value={tg.pidReferencia || "—"} />
          <InfoRow label="Límites de batería" value={tg.limitesBateria || "—"} />
        </Card>
      ) : (
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Function</p>
          <InfoRow label="Tipo de prueba" value={
            tg.tipoPruebaFuncional === TIPO_PRUEBA_FUNCIONAL.FTS ? "FTS" :
            tg.tipoPruebaFuncional === TIPO_PRUEBA_FUNCIONAL.OTS ? "OTS" : "—"
          } />
          <InfoRow label="Alcance funcional" value={tg.alcanceFuncional || "—"} />
        </Card>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}

// ─── TAB: Elementos ───────────────────────────────────────────────────────

function TabElementos({
  testGroupId, bloqueado, modo,
}: {
  testGroupId: string
  bloqueado: boolean
  modo: "alcance" | "ejecucion"
}) {
  // Detalle del pack: mostramos todos los asignados de una — pageSize=500 es el tope
  // duro del backend. Si algún pack supera eso, hay que paginar acá también.
  const { data, isLoading } = useGetElementosAsignados({ testGroupId, pageSize: 500 })
  const desasignar = useDesasignarElemento()
  const elementos = data?.data?.data ?? []
  // Quitar elementos = decisión de config. Sólo Alcance. En Ejecución es solo lectura.
  const esAlcance = modo === "alcance"

  // Columna "Acciones" solo tiene sentido en Alcance (config del pack). En
  // Ejecución el operador no quita elementos → la columna se oculta directo.
  const mostrarAcciones = esAlcance
  const colspan = mostrarAcciones ? 6 : 5

  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">TAG</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Especialidad</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Subsistema</TableHead>
            {mostrarAcciones && <TableHead className="w-24 text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={colspan} className="text-center py-8 text-muted-foreground">Cargando…</TableCell></TableRow>
          ) : elementos.length === 0 ? (
            <TableRow><TableCell colSpan={colspan} className="text-center py-8 text-muted-foreground">Sin elementos asignados.</TableCell></TableRow>
          ) : (
            elementos.map((el) => (
              <TableRow key={el.id}>
                <TableCell className="font-mono text-xs">{el.tag}</TableCell>
                <TableCell className="text-sm">{el.nombre}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{el.especialidadNombre || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{el.elementoTipoNombre || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {el.subSistemaCodigo
                    ? el.subSistemaNombre
                      ? `${el.subSistemaCodigo} · ${el.subSistemaNombre}`
                      : el.subSistemaCodigo
                    : "—"}
                </TableCell>
                {mostrarAcciones && (
                  <TableCell className="text-right">
                    {!bloqueado && (
                      <ConfirmActionDialog
                        trigger={<XCircle className="h-4 w-4" />}
                        triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-destructive hover:bg-accent transition-colors"
                        title="¿Quitar elemento?"
                        description={<>Se quitará <strong>{el.tag}</strong> del paquete.</>}
                        confirmText="Quitar"
                        pendingText="Quitando..."
                        variant="destructive"
                        onConfirm={() =>
                          desasignar.mutateAsync({ testGroupId, elementoId: el.id })
                        }
                      />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

// ─── TAB: Tareas (ejecución) ──────────────────────────────────────────────

function TabTareas({
  testGroupId, proyectoId, bloqueado, modo,
}: {
  testGroupId: string
  proyectoId: string
  bloqueado: boolean
  modo: "alcance" | "ejecucion"
}) {
  const { data, isLoading } = useGetTareasPack(testGroupId)
  const tareas = data?.data ?? []

  // Panel de tareas EXCLUIDAS — solo relevante en Alcance (config del pack).
  // En Ejecución no lo mostramos: el operador ejecuta lo que aplica, no le
  // interesa ver las excluidas.
  const excluidasEnabled = modo === "alcance"
  const { data: excluidasRaw } = useGetTareasExcluidasPack(excluidasEnabled ? testGroupId : null)
  const excluidas = excluidasEnabled ? (excluidasRaw?.data ?? []) : []
  const reincorporar = useReincorporarTareaPack()

  // Flags del proyecto — mismos que usa el sheet de detalle de elemento en /ejecucion.
  const { data: proyectoRaw } = useGetProyecto(proyectoId)
  const proyecto = proyectoRaw?.data
  const permitirFisico = proyecto?.permitirRegistroFisico ?? false
  const preFirmado = proyecto?.registrosFisicosPreFirmados ?? false
  const permitirDescargarProcedimientos = proyecto?.funcionalidadesEfectivas?.DESCARGAR_PROCEDIMIENTOS ?? false

  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo elemento</TableHead>
            <TableHead className="w-32">Estado</TableHead>
            <TableHead className="w-32">Iniciada</TableHead>
            <TableHead className="w-32">Finalizada</TableHead>
            <TableHead className="w-72 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando…</TableCell></TableRow>
          ) : tareas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                {bloqueado
                  ? "El paquete está en BORRADOR — activá para instanciar tareas."
                  : "No hay tareas instanciadas. ¿Definiste Tareas con TipoAsignacion coincidente al tipo del pack?"}
              </TableCell>
            </TableRow>
          ) : (
            tareas.map((t) => (
              <TareaRow
                key={t.id}
                tarea={t}
                testGroupId={testGroupId}
                bloqueado={bloqueado}
                permitirFisico={permitirFisico}
                preFirmado={preFirmado}
                permitirDescargarProcedimientos={permitirDescargarProcedimientos}
                modo={modo}
              />
            ))
          )}
        </TableBody>
      </Table>

      {/* Panel de excluidas — sólo Alcance. Se muestra si hay al menos 1. */}
      {excluidasEnabled && excluidas.length > 0 && (
        <div className="border-t bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <XCircle className="h-3.5 w-3.5" /> Tareas excluidas del pack ({excluidas.length})
          </div>
          <p className="text-xs text-muted-foreground">
            No aplican a este pack — no cuentan para el conteo de avance.
            Se pueden reincorporar cuando corresponda.
          </p>
          <div className="divide-y">
            {excluidas.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.tareaCodigo}</span>
                  <span>{t.tareaNombre}</span>
                  {t.tareaElementoTipoNombre && (
                    <span className="text-xs text-muted-foreground">· {t.tareaElementoTipoNombre}</span>
                  )}
                </div>
                {!bloqueado && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => reincorporar.mutateAsync({ testGroupId, tareaId: t.id })}
                    disabled={reincorporar.isPending}
                  >
                    {reincorporar.isPending && reincorporar.variables?.tareaId === t.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <RotateCcw className="h-3 w-3" />}
                    Reincorporar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function TareaRow({
  tarea, testGroupId, bloqueado, permitirFisico, preFirmado, permitirDescargarProcedimientos, modo,
}: {
  tarea: TestGroupTareaItem
  testGroupId: string
  bloqueado: boolean
  permitirFisico: boolean
  preFirmado: boolean
  permitirDescargarProcedimientos: boolean
  modo: "alcance" | "ejecucion"
}) {
  const cambiar = useCambiarEstadoTarea()
  const iniciarRegistro = useIniciarRegistroTarea()
  const reiniciar = useReiniciarTareaPack()
  const excluir = useExcluirTareaPack()
  const router = useRouter()

  // Modo determina qué acciones aparecen — ver split de Ejecución vs Alcance
  // en Program.cs / nav-menu. Alcance = config, Ejecución = trabajo operativo.
  const esEjecucion = modo === "ejecucion"
  const esAlcance = modo === "alcance"

  // Estados de los dialogs — controlados afuera del DropdownMenu porque Radix
  // tiene un race condition entre "DropdownMenu cerrandose" y "AlertDialog
  // abriendose" que interpreta el evento como click-outside del dialog y lo
  // cierra inmediatamente. El fix oficial de Radix: separar Trigger de Content
  // via state controlado.
  const [reiniciarOpen, setReiniciarOpen] = useState(false)
  const [excluirOpen, setExcluirOpen] = useState(false)

  const tienePlanilla = !!tarea.tareaPlanillaId
  const tieneRegistro = !!tarea.registroId

  const canIniciar = tarea.estado === ESTADO_TAREA.PENDIENTE
  const canCompletar = tarea.estado === ESTADO_TAREA.EN_PROCESO
  const canRechazar =
    tarea.estado === ESTADO_TAREA.PENDIENTE ||
    tarea.estado === ESTADO_TAREA.EN_PROCESO ||
    tarea.estado === ESTADO_TAREA.COMPLETADO
  const canRevertir =
    tarea.estado === ESTADO_TAREA.EN_PROCESO ||
    tarea.estado === ESTADO_TAREA.COMPLETADO ||
    tarea.estado === ESTADO_TAREA.RECHAZADO ||
    tarea.estado === ESTADO_TAREA.CANCELADO

  const runChange = (estado: EstadoTarea, motivoRechazo?: string) =>
    cambiar.mutateAsync({ testGroupId, tareaId: tarea.id, estado, motivoRechazo })

  // Abre (o crea+abre) el registro de la planilla en el editor. Volver acá al terminar.
  const returnTo = `/ejecucion/test-groups/${testGroupId}`
  const irAPlanilla = async () => {
    if (tieneRegistro) {
      router.push(`/ejecucion/registros/${tarea.registroId}?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }
    const res = await iniciarRegistro.mutateAsync({ testGroupId, tareaId: tarea.id })
    const registroId = res?.data?.registroId
    if (registroId) {
      router.push(`/ejecucion/registros/${registroId}?returnTo=${encodeURIComponent(returnTo)}`)
    }
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{tarea.tareaCodigo}</TableCell>
      <TableCell className="text-sm font-medium">{tarea.tareaNombre}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{tarea.tareaElementoTipoNombre || "—"}</TableCell>
      <TableCell><EstadoTareaBadge estado={tarea.estado} /></TableCell>
      <TableCell className="text-xs text-muted-foreground">{fmtFecha(tarea.fechaInicio)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{fmtFecha(tarea.fechaFinalizacion)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          {/* Con planilla: un botón único que crea/reanuda el registro y navega al editor.
              Solo Ejecución — Alcance no ejecuta trabajo. Label sigue el mismo criterio
              que TareaCard del elemento: "Ver y firmar" cuando quedó COMPLETADO (espera
              firmas), "Ver registro" en terminales de firma, y wording de flujo cuando
              está en curso. Al navegar, la página de registros renderiza la FirmasSection
              (misma que ve el elemento) — ahí se firma. */}
          {esEjecucion && !bloqueado && tienePlanilla && tarea.estado !== ESTADO_TAREA.RECHAZADO && tarea.estado !== ESTADO_TAREA.CANCELADO && (
            <Button
              size="sm"
              className={`h-7 gap-1 text-xs ${tarea.estado === ESTADO_TAREA.PENDIENTE || tarea.estado === ESTADO_TAREA.EN_PROCESO ? "bg-blue-700 hover:bg-blue-600" : ""}`}
              variant={tarea.estado === ESTADO_TAREA.PENDIENTE || tarea.estado === ESTADO_TAREA.EN_PROCESO ? "default" : "outline"}
              onClick={irAPlanilla}
              disabled={iniciarRegistro.isPending}
            >
              {iniciarRegistro.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <FileText className="h-3 w-3" />}
              {tarea.estado === ESTADO_TAREA.COMPLETADO
                ? "Ver y firmar"
                : tarea.estado === ESTADO_TAREA.APROBADO || tarea.estado === ESTADO_TAREA.FIRMADO
                  ? "Ver registro"
                  : tieneRegistro
                    ? "Continuar planilla"
                    : "Completar planilla"}
            </Button>
          )}
          {/* Sin planilla: flujo legacy de estados sin registro. Solo Ejecución. */}
          {esEjecucion && !bloqueado && !tienePlanilla && canIniciar && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
              onClick={() => runChange(ESTADO_TAREA.EN_PROCESO)}
              disabled={cambiar.isPending}
            >
              <Play className="h-3 w-3" /> Iniciar
            </Button>
          )}
          {esEjecucion && !bloqueado && !tienePlanilla && canCompletar && (
            <Button size="sm" className="h-7 gap-1 text-xs bg-green-700 hover:bg-green-600"
              onClick={() => runChange(ESTADO_TAREA.COMPLETADO)}
              disabled={cambiar.isPending}
            >
              <CheckCircle2 className="h-3 w-3" /> Completar
            </Button>
          )}
          {esEjecucion && !bloqueado && canRechazar && (
            <ConfirmActionDialog
              trigger={<span className="inline-flex items-center gap-1 text-xs text-red-700"><XCircle className="h-3 w-3" /> Rechazar</span>}
              triggerClassName="inline-flex items-center h-7 px-2 rounded-md hover:bg-red-50 transition-colors"
              title="¿Rechazar tarea?"
              description={<>La tarea quedará marcada como RECHAZADO (terminal).</>}
              confirmText="Rechazar"
              pendingText="Rechazando..."
              variant="destructive"
              onConfirm={() => runChange(ESTADO_TAREA.RECHAZADO, "Rechazada desde detalle")}
            />
          )}
          {esEjecucion && !bloqueado && canRevertir && (
            <ConfirmActionDialog
              trigger={<span className="inline-flex items-center gap-1 text-xs text-gray-700"><RotateCcw className="h-3 w-3" /> Revertir</span>}
              triggerClassName="inline-flex items-center h-7 px-2 rounded-md hover:bg-accent transition-colors"
              title="¿Revertir a PENDIENTE?"
              description={<>Se pierden las fechas y el avance.</>}
              confirmText="Revertir"
              pendingText="Revirtiendo..."
              onConfirm={() => runChange(ESTADO_TAREA.PENDIENTE)}
            />
          )}

          {/* Menú compacto con las acciones secundarias — dependen del modo:
              Ejecución muestra operacionales (reiniciar / cargar físico);
              Alcance muestra config (excluir). Descargas están en ambos. */}
          {(() => {
            // Cargar registro firmado: sólo Ejecución.
            const puedeCargarFisico =
              esEjecucion && !bloqueado && permitirFisico && tienePlanilla &&
              (tarea.estado === ESTADO_TAREA.PENDIENTE
                || tarea.estado === ESTADO_TAREA.EN_PROCESO
                || tarea.estado === ESTADO_TAREA.RECHAZADO)
            const puedeDescargarProcedimiento =
              permitirDescargarProcedimientos && tarea.tareaProcedimientoTieneArchivo
            // Reiniciar: mismo criterio que ElementoTareaService.ReiniciarTareaAsync —
            // solo tareas con avance. Sólo Ejecución.
            const puedeReiniciar =
              esEjecucion && !bloqueado && (
                tarea.estado === ESTADO_TAREA.EN_PROCESO
                || tarea.estado === ESTADO_TAREA.COMPLETADO
                || tarea.estado === ESTADO_TAREA.RECHAZADO
                || tarea.estado === ESTADO_TAREA.APROBADO
                || tarea.estado === ESTADO_TAREA.FIRMADO
              )
            // Excluir del pack: sólo Alcance. El backend rechaza si hay Registro
            // asociado — el UI lo replica para no ofrecer una acción que va a fallar.
            const puedeExcluir =
              esAlcance && !bloqueado && !tieneRegistro
            const hayAlgo = tienePlanilla || tieneRegistro || puedeCargarFisico
              || puedeDescargarProcedimiento || puedeReiniciar || puedeExcluir

            if (!hayAlgo) return null

            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Más acciones">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-56">
                  {tienePlanilla && (
                    <DropdownMenuItem onClick={() => triggerDownload(
                      `/api/planillas/${tarea.tareaPlanillaId}/pdf/blanco/testgroup/${tarea.id}`
                    )}>
                      <Download className="h-4 w-4" />
                      Descargar planilla en blanco
                    </DropdownMenuItem>
                  )}
                  {puedeCargarFisico && (
                    <DropdownMenuItem
                      render={
                        <a href={`/checklist/testgroup/${tarea.tareaPlanillaId}/${testGroupId}/${tarea.id}`} />
                      }
                    >
                      <FileUp className="h-4 w-4" />
                      {preFirmado ? "Cargar registro firmado" : "Cargar planilla física"}
                    </DropdownMenuItem>
                  )}
                  {tieneRegistro && (
                    <DropdownMenuItem onClick={() => triggerDownload(
                      `/api/registros/${tarea.registroId}/pdf`
                    )}>
                      <FileDown className="h-4 w-4" />
                      Descargar PDF del registro
                    </DropdownMenuItem>
                  )}
                  {puedeDescargarProcedimiento && (
                    <DropdownMenuItem onClick={() => triggerDownload(
                      `/api/procedimientos/${tarea.tareaProcedimientoId}/download`
                    )}>
                      <BookOpen className="h-4 w-4" />
                      Descargar procedimiento
                    </DropdownMenuItem>
                  )}
                  {puedeReiniciar && (
                    <DropdownMenuItem
                      onClick={() => setReiniciarOpen(true)}
                      className="text-red-700 focus:text-red-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reiniciar tarea
                    </DropdownMenuItem>
                  )}
                  {puedeExcluir && (
                    <DropdownMenuItem
                      onClick={() => setExcluirOpen(true)}
                      className="text-red-700 focus:text-red-700"
                    >
                      <XCircle className="h-4 w-4" />
                      Excluir del pack
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })()}
        </div>

        {/* Dialogs controlados — fuera del DropdownMenu para evitar el race
            condition de Radix (ver comentario en el useState de arriba). */}
        <ConfirmActionDialog
          open={reiniciarOpen}
          onOpenChange={setReiniciarOpen}
          title="¿Reiniciar tarea?"
          description={
            <>
              Se elimina el Registro asociado (planilla, archivos, firmas)
              y la tarea vuelve a <strong>PENDIENTE</strong>. Esta acción
              no se puede deshacer.
            </>
          }
          confirmText="Reiniciar"
          pendingText="Reiniciando..."
          variant="destructive"
          onConfirm={() =>
            reiniciar.mutateAsync({ testGroupId, tareaId: tarea.id })
          }
        />
        <ConfirmActionDialog
          open={excluirOpen}
          onOpenChange={setExcluirOpen}
          title="¿Excluir del pack?"
          description={
            <>
              La tarea no aplicará a este paquete de prueba. No cuenta
              para el conteo de avance. Se puede reincorporar después
              desde el panel <strong>Tareas excluidas</strong>.
            </>
          }
          confirmText="Excluir"
          pendingText="Excluyendo..."
          variant="destructive"
          onConfirm={() =>
            excluir.mutateAsync({ testGroupId, tareaId: tarea.id })
          }
        />
      </TableCell>
    </TableRow>
  )
}

// Fuerza la descarga programáticamente. El browser respeta el Content-Disposition
// del backend (filename) sin cambiar de pestaña.
function triggerDownload(url: string) {
  const a = document.createElement("a")
  a.href = url
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function EstadoTareaBadge({ estado }: { estado: EstadoTarea }) {
  const cls =
    estado === ESTADO_TAREA.PENDIENTE ? "border-gray-300 text-gray-700 bg-gray-50" :
    estado === ESTADO_TAREA.EN_PROCESO ? "border-blue-300 text-blue-700 bg-blue-50" :
    estado === ESTADO_TAREA.COMPLETADO ? "border-green-300 text-green-700 bg-green-50" :
    estado === ESTADO_TAREA.FIRMADO ? "border-purple-300 text-purple-700 bg-purple-50" :
    estado === ESTADO_TAREA.APROBADO ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
    estado === ESTADO_TAREA.RECHAZADO ? "border-red-300 text-red-700 bg-red-50" :
    "border-slate-300 text-slate-700 bg-slate-50"
  return <Badge variant="outline" className={cls}>{ESTADO_TAREA_LABEL[estado]}</Badge>
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })
  } catch { return "—" }
}

// ─── TAB: Progreso ────────────────────────────────────────────────────────

function TabProgreso({ testGroupId }: { testGroupId: string }) {
  const { data, isLoading } = useGetTareasPack(testGroupId)
  const tareas = data?.data ?? []

  const total = tareas.length
  // Desglose por estado, mismo criterio que las cards del dashboard del elemento:
  //   Firmadas   = FIRMADO (electrónica) + APROBADO (firmada en papel)
  //   Completadas = COMPLETADO (esperando firmas)
  //   En Proceso = EN_PROCESO
  //   Pendientes = PENDIENTE
  //   Rechazadas / Canceladas se muestran solo si count > 0 — mantiene el card
  //     limpio en el caso normal y explicíta cuando pasa.
  const firmadas = tareas.filter(
    (t) => t.estado === ESTADO_TAREA.FIRMADO || t.estado === ESTADO_TAREA.APROBADO,
  ).length
  const completadas = tareas.filter((t) => t.estado === ESTADO_TAREA.COMPLETADO).length
  const enProceso = tareas.filter((t) => t.estado === ESTADO_TAREA.EN_PROCESO).length
  const pendientes = tareas.filter((t) => t.estado === ESTADO_TAREA.PENDIENTE).length
  const rechazadas = tareas.filter((t) => t.estado === ESTADO_TAREA.RECHAZADO).length
  const canceladas = tareas.filter((t) => t.estado === ESTADO_TAREA.CANCELADO).length

  // Numerador del % de progreso: mismo criterio que AvanceService.AplicarConteos.
  // Tareas cerradas (Firmadas + Completadas) sobre el total.
  const cerradas = firmadas + completadas
  const porcentaje = total > 0 ? Math.round((cerradas / total) * 100) : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-6 flex flex-col items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progreso</p>
        <div className="text-5xl font-bold tabular-nums text-blue-700">
          {isLoading ? "…" : `${porcentaje}%`}
        </div>
        <p className="text-xs text-muted-foreground">
          {cerradas} / {total} tareas cerradas
        </p>
        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${porcentaje}%` }} />
        </div>
      </Card>

      <Card className="p-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Desglose</p>
        <BreakdownRow label="Firmadas" count={firmadas} total={total} colorClass="bg-emerald-600" />
        <BreakdownRow label="Completadas" count={completadas} total={total} colorClass="bg-green-600" />
        <BreakdownRow label="En Proceso" count={enProceso} total={total} colorClass="bg-blue-600" />
        <BreakdownRow label="Pendientes" count={pendientes} total={total} colorClass="bg-gray-500" />
        {rechazadas > 0 && (
          <BreakdownRow label="Rechazadas" count={rechazadas} total={total} colorClass="bg-red-600" />
        )}
        {canceladas > 0 && (
          <BreakdownRow label="Canceladas" count={canceladas} total={total} colorClass="bg-gray-400" />
        )}
      </Card>
    </div>
  )
}

function BreakdownRow({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">{count} <span className="text-muted-foreground text-xs">({pct}%)</span></span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
