"use client"

import { useRef, useEffect, useState, Suspense } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Save, Plus, Trash2, ChevronUp, ChevronDown,
  Loader2, CheckCircle2, Settings, ShieldCheck, PenLine, X, AlertTriangle, RefreshCw,
  Users, CalendarRange, Box,
} from "lucide-react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useUpdateProyecto } from "@/features/proyectos/api/use-update-proyecto"
import { useUpdateProyectoFlag } from "@/features/proyectos/api/use-update-proyecto-flag"
import { useUpdateProyectoNivelMc } from "@/features/proyectos/api/use-update-proyecto-nivel-mc"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import {
  useGetFuncionalidadesProyecto,
  useSetFuncionalidadProyecto,
} from "@/features/proyectos/api/use-funcionalidades-proyecto"
import { useGetFirmasConfig } from "@/features/proyectos/api/use-get-firmas-config"
import { useSaveFirmasConfig } from "@/features/proyectos/api/use-save-firmas-config"
import { useGetFirmasPendientes } from "@/features/proyectos/api/use-get-firmas-pendientes"
import { useSincronizarFirmasProyecto } from "@/features/proyectos/api/use-sincronizar-firmas-proyecto"
import { useGetUsuariosRoles } from "@/features/proyectos/api/use-get-usuarios-roles"
import { useAsignarUsuarioRol } from "@/features/proyectos/api/use-asignar-usuario-rol"
import { useDeleteUsuarioRol } from "@/features/proyectos/api/use-delete-usuario-rol"
import { useGetFechaEstimadaFin } from "@/features/proyectos/api/use-fecha-estimada-fin"
import { ProyectoForm } from "@/features/proyectos/components/proyecto-form"
import { TabUsuariosProyecto } from "@/features/proyectos/components/tab-usuarios-proyecto"
import type { EstadoProyecto, FirmaConfigItem, Proyecto } from "@/features/proyectos/types"
import type { ProyectoFormValues } from "@/features/proyectos/schema"
import { useGetUsuarios } from "@/features/usuarios/api/use-get-usuarios"
import { PendientesAutorizacionSection } from "@/features/pendientes-autorizacion/components/pendientes-autorizacion-section"

import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "general" | "configuracion" | "usuarios" | "firmas" | "pendientes" | "modelo3d"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "general",       label: "Datos generales", icon: <Settings       className="h-4 w-4" /> },
  { id: "configuracion", label: "Configuración",   icon: <ShieldCheck    className="h-4 w-4" /> },
  { id: "usuarios",      label: "Usuarios",        icon: <Users          className="h-4 w-4" /> },
  { id: "firmas",        label: "Firmas",          icon: <PenLine        className="h-4 w-4" /> },
  { id: "pendientes",    label: "Pendientes",      icon: <AlertTriangle  className="h-4 w-4" /> },
  { id: "modelo3d",      label: "Modelo 3D",       icon: <Box            className="h-4 w-4" /> },
]

// ─── Página ───────────────────────────────────────────────────────────────────

function ProyectoDetailContent() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>("general")

  const { data: raw, isLoading } = useGetProyecto(id)
  const proyecto = raw?.data

  // Breadcrumb dinámico: Alcance → Proyectos (link) → {nombre del proyecto}
  useBreadcrumb(
    proyecto
      ? [
          { label: "Alcance" },
          { label: "Proyectos", href: "/alcance/proyectos" },
          { label: proyecto.nombre },
        ]
      : null
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
      </div>
    )
  }

  if (!proyecto) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        No se encontró el proyecto.
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Tabs — scrollables en horizontal cuando no entran (mobile). overflow-y-hidden
          evita el scroll vertical fantasma: poner overflow-x:auto fuerza overflow-y a
          'auto', y el -mb-px de los botones alcanza para disparar 1px de scroll. */}
      <div className="border-b border-gray-200 overflow-x-auto overflow-y-hidden">
        <nav className="flex gap-0 w-max min-w-full">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      <div>
        {tab === "general"       && <TabGeneral       proyecto={proyecto} />}
        {tab === "configuracion" && <TabConfiguracion proyecto={proyecto} />}
        {tab === "usuarios"      && <TabUsuarios      proyectoId={id} />}
        {tab === "firmas"        && <TabFirmas        proyectoId={id} />}
        {tab === "pendientes"    && <TabPendientes    proyectoId={id} />}
        {tab === "modelo3d"      && <TabModelo3D      proyecto={proyecto} />}
      </div>
    </div>
  )
}

// ─── Tab General ──────────────────────────────────────────────────────────────

function TabGeneral({ proyecto }: { proyecto: Proyecto }) {
  const update = useUpdateProyecto(proyecto.id)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(values: ProyectoFormValues) {
    await update.mutateAsync({ ...values, estado: values.estado as EstadoProyecto })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-lg space-y-6">
      {saved && (
        <div className="mb-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" /> Cambios guardados correctamente
        </div>
      )}
      <ProyectoForm
        defaultValues={proyecto}
        onSubmit={handleSubmit}
        isPending={update.isPending}
        onCancel={() => {}}
      />
      <FechaEstimadaFinSection proyectoId={proyecto.id} />
    </div>
  )
}

// ─── Sección: Fecha estimada de fin ───────────────────────────────────────────

function FechaEstimadaFinSection({ proyectoId }: { proyectoId: string }) {
  const { data, isLoading } = useGetFechaEstimadaFin(proyectoId)
  const resumen = data?.data

  function fmt(iso: string | null): string {
    if (!iso) return "—"
    return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        Fecha estimada de fin
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Calculando...
        </div>
      ) : !resumen || resumen.cantidadFilas === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Aún no hay planificación cargada. Cargá fechas por nivel en los subsistemas para ver una estimación.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Inicio estimado</p>
              <p className="font-medium">{fmt(resumen.fechaInicioEstimada)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fin estimado</p>
              <p className="font-medium text-blue-700">{fmt(resumen.fechaFinEstimada)}</p>
            </div>
          </div>

          {resumen.porNivel.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5 overflow-x-auto">
                <p className="text-xs font-medium text-gray-700">Por nivel</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="text-left font-medium py-1">Nivel</th>
                      <th className="text-left font-medium py-1">Inicio</th>
                      <th className="text-left font-medium py-1">Fin</th>
                      <th className="text-right font-medium py-1">Subsistemas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.porNivel.map((n) => (
                      <tr key={n.nivelId} className="border-t">
                        <td className="py-1.5">{n.nivelNombre}</td>
                        <td className="py-1.5">{fmt(n.fechaInicio)}</td>
                        <td className="py-1.5">{fmt(n.fechaFin)}</td>
                        <td className="py-1.5 text-right">{n.cantidadSubSistemas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Tab Configuración ────────────────────────────────────────────────────────

const FLAGS: {
  campo: string
  label: string
  descripcion: string
  /** Si está definido, el toggle queda deshabilitado mientras el flag indicado esté en false. */
  dependeDe?: string
}[] = [
  {
    campo: "PermitirRegistroDigital",
    label: "Registro digital",
    descripcion: "Permite completar registros con formularios digitales.",
  },
  {
    campo: "PermitirRegistroFisico",
    label: "Registro físico",
    descripcion: "Permite subir planillas escaneadas en PDF en lugar de completar el formulario digital.",
  },
  {
    campo: "RegistrosFisicosPreFirmados",
    label: "PDF físico pre-firmado",
    descripcion: "Si está activo, los PDFs físicos cargados se asumen firmados en papel: la tarea pasa directo a 'Firmado físico' sin generar slots de firma digital. Requiere 'Registro físico'.",
    dependeDe: "PermitirRegistroFisico",
  },
  {
    campo: "PermiteAdjuntos",
    label: "Adjuntar archivos",
    descripcion: "Permite a los usuarios adjuntar archivos (fotos, PDFs, etc.) a los registros del proyecto. Cada planilla puede vetar individualmente.",
  },
  {
    campo: "NivelesSecuenciales",
    label: "Niveles secuenciales",
    descripcion: "Si está activo, en la planificación por subsistema cada nivel debe iniciar después del fin del nivel anterior. Útil para flujos donde un nivel depende del anterior (precomisionado → comisionado → puesta en marcha).",
  },
  {
    campo: "PermitirAvanceSinRegistro",
    label: "Avance sin registro",
    descripcion: "Permite registrar avance de tareas sin completar un registro asociado.",
  },
  {
    campo: "PermitirDescargarProcedimientos",
    label: "Descarga de procedimientos",
    descripcion: "Habilita la descarga de documentos de procedimientos.",
  },
  // Nota: PermitirDescargarPlanillas, PermitirDescargarRegistros y PermitirTestFuncional
  // existen en la entidad/DTO pero no gatean ningún comportamiento todavía, así que no se
  // muestran acá. La columna se conserva en la DB por si se reactivan.
]

const FLAG_KEY_MAP: Record<string, keyof Proyecto> = {
  PermitirRegistroFisico:          "permitirRegistroFisico",
  PermitirRegistroDigital:         "permitirRegistroDigital",
  RegistrosFisicosPreFirmados:     "registrosFisicosPreFirmados",
  PermiteAdjuntos:                 "permiteAdjuntos",
  NivelesSecuenciales:             "nivelesSecuenciales",
  PermitirAvanceSinRegistro:       "permitirAvanceSinRegistro",
  PermitirDescargarProcedimientos: "permitirDescargarProcedimientos",
}

function TabConfiguracion({ proyecto }: { proyecto: Proyecto }) {
  const updateFlag = useUpdateProyectoFlag(proyecto.id)
  const [saving, setSaving] = useState<string | null>(null)
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>(
    () => Object.fromEntries(
      FLAGS.map(f => [f.campo, proyecto[FLAG_KEY_MAP[f.campo]] as boolean])
    )
  )

  async function handleToggle(campo: string, valor: boolean) {
    setSaving(campo)
    setLocalFlags(prev => {
      const next = { ...prev, [campo]: valor }
      // Si desactivamos un flag del que dependen otros, también los apagamos localmente
      // para que el backend (que hace lo mismo) y la UI queden alineados.
      if (!valor) {
        for (const child of FLAGS) {
          if (child.dependeDe === campo) next[child.campo] = false
        }
      }
      return next
    })
    try {
      await updateFlag.mutateAsync({ campo, valor })
    } catch {
      // revert on error
      setLocalFlags(prev => ({ ...prev, [campo]: !valor }))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-3 max-w-lg">
      {FLAGS.map((flag) => {
        const parentOn = flag.dependeDe ? !!localFlags[flag.dependeDe] : true
        const disabled = saving !== null || !parentOn
        return (
          <div
            key={flag.campo}
            className={`flex items-center justify-between gap-4 rounded-lg border bg-white p-4 ${!parentOn ? "opacity-60" : ""}`}
          >
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-gray-900">{flag.label}</p>
              <p className="text-xs text-muted-foreground">{flag.descripcion}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {saving === flag.campo && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              )}
              <Toggle
                checked={localFlags[flag.campo]}
                onChange={(v) => handleToggle(flag.campo, v)}
                disabled={disabled}
              />
            </div>
          </div>
        )
      })}

      <NivelMcSelector proyecto={proyecto} />

      <FuncionalidadesProyecto proyectoId={proyecto.id} />
    </div>
  )
}

// ─── Nivel MC (Mechanical Completion) ─────────────────────────────────────────

const NIVEL_MC_NONE = "__none__"

function NivelMcSelector({ proyecto }: { proyecto: Proyecto }) {
  const { data: nivelesRaw, isLoading } = useGetNivelesSelect()
  const update = useUpdateProyectoNivelMc(proyecto.id)
  const [saving, setSaving] = useState(false)

  const niveles = (nivelesRaw?.data ?? []).slice().sort((a, b) => a.posicion - b.posicion)
  const currentId = proyecto.nivelMcId ?? NIVEL_MC_NONE

  async function handleChange(v: string | null) {
    const nivelMcId = !v || v === NIVEL_MC_NONE ? null : v
    setSaving(true)
    try {
      await update.mutateAsync({ nivelMcId })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-900">Nivel para MC (Mechanical Completion)</p>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      </div>
      <p className="text-xs text-muted-foreground">
        Elegí el Nivel del catálogo que representa "Mechanical Completion" en este proyecto.
        El certificado MC del subsistema se calcula contra las tareas cuyo Nivel coincide.
        Si dejás "Sin configurar", MC queda en "no aplica" en el reporte de certificados.
      </p>
      <Select
        value={currentId}
        onValueChange={handleChange}
        disabled={isLoading || saving}
      >
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Sin configurar">
            {currentId === NIVEL_MC_NONE
              ? "Sin configurar"
              : niveles.find((n) => n.id === currentId)?.nombre ?? proyecto.nivelMcNombre ?? "—"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NIVEL_MC_NONE}>Sin configurar</SelectItem>
          {niveles.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              {n.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ─── Funcionalidades (feature flags por proyecto) ─────────────────────────────

function FuncionalidadesProyecto({ proyectoId }: { proyectoId: string }) {
  const { data, isLoading } = useGetFuncionalidadesProyecto(proyectoId)
  const setFuncionalidad = useSetFuncionalidadProyecto(proyectoId)
  const [saving, setSaving] = useState<string | null>(null)

  async function handleToggle(clave: string, habilitada: boolean) {
    setSaving(clave)
    try {
      await setFuncionalidad.mutateAsync({ clave, habilitada })
    } finally {
      setSaving(null)
    }
  }

  if (isLoading || !data || data.length === 0) return null

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Funcionalidades</p>
      {data.map((f) => {
        // Si el SuperAdmin la apagó globalmente, no se puede activar por proyecto.
        const bloqueadaGlobal = !f.habilitadaGlobal
        const disabled = saving !== null || bloqueadaGlobal
        return (
          <div
            key={f.clave}
            className={`flex items-center justify-between gap-4 rounded-lg border bg-white p-4 ${bloqueadaGlobal ? "opacity-60" : ""}`}
          >
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-gray-900">{f.nombre}</p>
              <p className="text-xs text-muted-foreground">{f.descripcion}</p>
              {bloqueadaGlobal && (
                <p className="text-xs text-amber-600">
                  Deshabilitada globalmente por el administrador del sistema.
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {saving === f.clave && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              <Toggle
                checked={f.habilitadaProyecto}
                onChange={(v) => handleToggle(f.clave, v)}
                disabled={disabled}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab Usuarios ──────────────────────────────────────────────────────────────
// Split-panel con asignados + disponibles filtrables por empresa y grupo.
// Lógica en features/proyectos/components/tab-usuarios-proyecto.

function TabUsuarios({ proyectoId }: { proyectoId: string }) {
  return <TabUsuariosProyecto proyectoId={proyectoId} />
}


// ─── Tab Firmas ───────────────────────────────────────────────────────────────

function TabFirmas({ proyectoId }: { proyectoId: string }) {
  const { data: raw, isLoading } = useGetFirmasConfig(proyectoId)
  const save = useSaveFirmasConfig(proyectoId)
  const { data: pendientesRaw, refetch: refetchPendientes } = useGetFirmasPendientes(proyectoId)
  const sincronizar = useSincronizarFirmasProyecto(proyectoId)
  const { data: asignacionesRaw } = useGetUsuariosRoles(proyectoId)
  const asignar = useAsignarUsuarioRol(proyectoId)
  const eliminarRol = useDeleteUsuarioRol(proyectoId)
  // isLocked: false → excluye usuarios dados de baja: no deben poder asignarse a un rol de firma.
  const { data: usuariosRaw } = useGetUsuarios({ pageSize: 200, isLocked: false })

  const asignaciones = asignacionesRaw?.data ?? []
  const usuarios = usuariosRaw?.data ?? []
  const registrosPendientes = pendientesRaw?.data ?? 0

  const [slots, setSlots] = useState<FirmaConfigItem[]>([])
  const [initialized, setInitialized] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sincronizado, setSincronizado] = useState<{ procesados: number; slots: number } | null>(null)

  // Inicializar desde la respuesta del servidor
  if (!initialized && raw) {
    const items = (raw.data ?? []).map((s, i) => ({ ...s, orden: i + 1 }))
    setSlots(items.length > 0 ? items : [])
    setInitialized(true)
  }

  function addSlot() {
    setSlots(prev => [
      ...prev,
      { orden: prev.length + 1, rolNombre: "", descripcion: "", esObligatorio: true },
    ])
  }

  function removeSlot(index: number) {
    setSlots(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, orden: i + 1 })))
  }

  function updateSlot(index: number, field: keyof FirmaConfigItem, value: string | boolean | number) {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function moveUp(index: number) {
    if (index === 0) return
    setSlots(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((s, i) => ({ ...s, orden: i + 1 }))
    })
  }

  function moveDown(index: number) {
    if (index === slots.length - 1) return
    setSlots(prev => {
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((s, i) => ({ ...s, orden: i + 1 }))
    })
  }

  async function handleSave() {
    const validos = slots.filter(s => s.rolNombre.trim())
    await save.mutateAsync(validos.map((s, i) => ({ ...s, orden: i + 1 })))
    setSaved(true)
    setSincronizado(null)
    setTimeout(() => setSaved(false), 2500)
    refetchPendientes()
  }

  async function handleSincronizar() {
    const result = await sincronizar.mutateAsync()
    const data = (result as any)?.data
    setSincronizado({ procesados: data?.registrosProcesados ?? 0, slots: data?.slotsSincronizados ?? 0 })
    refetchPendientes()
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando configuración...
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Definí los roles que deben firmar digitalmente cada registro completado, en el orden en que deben hacerlo.
        Si no configurás firmas, los registros quedarán en estado Completado sin requerir firma.
      </p>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" /> Configuración de firmas guardada
        </div>
      )}

      {sincronizado && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" />
          Sincronización completada: {sincronizado.procesados} registro(s) actualizados, {sincronizado.slots} slot(s) creados
        </div>
      )}

      {/* Advertencia: registros completados con firmas no sincronizadas */}
      {registrosPendientes > 0 && !sincronizado && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-800">
              Hay <strong>{registrosPendientes}</strong> registro{registrosPendientes !== 1 ? "s" : ""} completado{registrosPendientes !== 1 ? "s" : ""} con slots de firma desactualizados.
              La nueva configuración no se aplicará a esos registros hasta que los sincronices.
            </p>
          </div>
          <ConfirmActionDialog
            trigger={
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Aplicar a registros
              </>
            }
            triggerClassName="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-yellow-400 bg-white px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 transition-colors"
            title="¿Sincronizar firmas en registros existentes?"
            description={
              <>
                Esto actualizará los slots de firma de <strong>{registrosPendientes} registro{registrosPendientes !== 1 ? "s" : ""}</strong> en estado Completado,
                aplicando la configuración actual. Las firmas ya registradas no se modificarán.
              </>
            }
            confirmText="Sincronizar"
            pendingText="Sincronizando..."
            onConfirm={handleSincronizar}
          />
        </div>
      )}

      {/* Lista de slots */}
      <div className="space-y-2">
        {slots.length === 0 && (
          <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center text-sm text-muted-foreground">
            Sin firmas configuradas. Agregá al menos un rol para requerir firma en los registros.
          </div>
        )}

        {slots.map((slot, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border bg-white p-3">
            {/* Orden + mover */}
            <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
              <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
              <button
                type="button"
                onClick={() => moveUp(i)}
                disabled={i === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
                aria-label="Subir"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveDown(i)}
                disabled={i === slots.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-0 transition-colors"
                aria-label="Bajar"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Campos */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Rol *</label>
                <Input
                  value={slot.rolNombre}
                  onChange={(e) => updateSlot(i, "rolNombre", e.target.value)}
                  placeholder="Ej: Supervisor, Cliente, Inspector"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Descripción</label>
                <Input
                  value={slot.descripcion}
                  onChange={(e) => updateSlot(i, "descripcion", e.target.value)}
                  placeholder="Ej: Supervisor de obra"
                  className="h-8 text-sm"
                />
              </div>

              {/* Obligatorio */}
              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={slot.esObligatorio}
                    onChange={(v) => updateSlot(i, "esObligatorio", v)}
                  />
                  <span className="text-xs text-gray-600">
                    {slot.esObligatorio ? "Obligatorio" : "Opcional"}
                    <span className="text-gray-400 ml-1">
                      {slot.esObligatorio
                        ? "— el registro no puede avanzar sin esta firma"
                        : "— puede quedar sin firma"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Eliminar */}
            <button
              type="button"
              onClick={() => removeSlot(i)}
              className="text-gray-300 hover:text-red-500 transition-colors pt-1 shrink-0"
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addSlot}>
          <Plus className="h-4 w-4" /> Agregar rol
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleSave}
          disabled={save.isPending}
        >
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {save.isPending ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>

      {save.isError && (
        <p className="text-sm text-red-600">
          {(save.error as Error)?.message ?? "Error al guardar"}
        </p>
      )}

      {/* Asignación de usuarios por rol */}
      {slots.length > 0 && (
        <>
          <Separator />
          <UsuariosRolesSection
            slots={slots}
            asignaciones={asignaciones}
            usuarios={usuarios}
            onAsignar={(userId, rolNombre) => asignar.mutate({ userId, rolNombre })}
            onEliminar={(id) => eliminarRol.mutate(id)}
            isAsignando={asignar.isPending}
          />
        </>
      )}
    </div>
  )
}

// ─── Sección usuarios por rol ─────────────────────────────────────────────────

import type { ProyectoUsuarioRol } from "@/features/proyectos/types"
import type { Usuario } from "@/features/usuarios/types"
import type { FirmaConfigItem as SlotItem } from "@/features/proyectos/types"

function UsuariosRolesSection({
  slots,
  asignaciones,
  usuarios,
  onAsignar,
  onEliminar,
  isAsignando,
}: {
  slots: SlotItem[]
  asignaciones: ProyectoUsuarioRol[]
  usuarios: Usuario[]
  onAsignar: (userId: string, rolNombre: string) => void
  onEliminar: (id: string) => void
  isAsignando: boolean
}) {
  const [rolSeleccionado, setRolSeleccionado] = useState<string>("")
  const [userSeleccionado, setUserSeleccionado] = useState<string>("")

  const roles = slots.map((s) => s.rolNombre).filter(Boolean)

  function handleAsignar() {
    if (!rolSeleccionado || !userSeleccionado) return
    onAsignar(userSeleccionado, rolSeleccionado)
    setUserSeleccionado("")
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800">Usuarios por rol</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Asigná qué usuarios pueden firmar como cada rol. Solo los usuarios asignados podrán firmar ese rol.
        </p>
      </div>

      {/* Asignaciones existentes agrupadas por rol */}
      <div className="space-y-2">
        {roles.map((rol) => {
          const asigs = asignaciones.filter((a) => a.rolNombre === rol)
          return (
            <div key={rol} className="rounded-lg border bg-white p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">{rol}</p>
              {asigs.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Sin usuarios asignados — cualquier usuario puede firmar</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {asigs.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                    >
                      {a.userName}
                      <button
                        type="button"
                        onClick={() => onEliminar(a.id)}
                        className="hover:text-red-500 transition-colors"
                        aria-label="Quitar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Formulario para agregar asignación. En mobile se apila a ancho completo;
          en desktop queda en fila. Los <select> nativos llevan w-full + min-w-0
          para no desbordar la pantalla cuando un nombre de usuario es largo. */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="space-y-2 w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600">Rol</label>
          <select
            value={rolSeleccionado}
            onChange={(e) => setRolSeleccionado(e.target.value)}
            className="h-8 w-full sm:w-44 min-w-0 rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar rol...</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="space-y-2 w-full sm:w-auto">
          <label className="block text-xs font-medium text-gray-600">Usuario</label>
          <select
            value={userSeleccionado}
            onChange={(e) => setUserSeleccionado(e.target.value)}
            className="h-8 w-full sm:w-52 min-w-0 rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar usuario...</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.userName}</option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 w-full sm:w-auto sm:self-end"
          onClick={handleAsignar}
          disabled={!rolSeleccionado || !userSeleccionado || isAsignando}
        >
          {isAsignando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Asignar
        </Button>
      </div>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}

// ─── Tab Modelo 3D: descripción + link al visor ───────────────────────────────

function TabModelo3D({ proyecto }: { proyecto: Proyecto }) {
  const habilitado = proyecto.funcionalidadesEfectivas?.MAQUETA_3D !== false

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-blue-50 border border-blue-100 p-2 shrink-0">
            <Box className="h-6 w-6 text-blue-700" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Maqueta 3D del proyecto</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Visualizador interactivo de los modelos 3D del proyecto (IFC / NWD). Permite
              recorrer la instalación, filtrar entidades por sistema, subsistema o
              especialidad, y ver el estado de avance de cada elemento pintado sobre el modelo.
            </p>
          </div>
        </div>

        <ul className="text-sm text-muted-foreground space-y-1.5 pl-2">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <span>Cargar archivos 3D (IFC, NWD) desde la sección de gestión de modelos.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <span>Vincular entidades del modelo con elementos del alcance por TAG.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <span>Pintar el modelo por estado de la tarea, especialidad o avance físico.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <span>Aislar / filtrar sub-conjuntos del modelo por sistema o subsistema.</span>
          </li>
        </ul>

        {habilitado ? (
          <div className="flex items-center justify-end pt-2">
            <Link
              href={`/alcance/proyectos/${proyecto.id}/modelo-3d`}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Box className="h-4 w-4" />
              Abrir Modelo 3D
            </Link>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Modelo 3D deshabilitado para este proyecto.</p>
              <p className="text-xs mt-0.5">
                Activá la funcionalidad <span className="font-medium">MAQUETA_3D</span> en la pestaña
                Configuración para poder usar el visor.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab Pendientes: matriz acción × grupos ───────────────────────────────────

function TabPendientes({ proyectoId }: { proyectoId: string }) {
  return <PendientesAutorizacionSection proyectoId={proyectoId} />
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ProyectoDetailPage() {
  return (
    <Suspense>
      <ProyectoDetailContent />
    </Suspense>
  )
}
