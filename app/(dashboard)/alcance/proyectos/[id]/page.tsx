"use client"

import { useState, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Plus, Trash2, ChevronUp, ChevronDown,
  Loader2, CheckCircle2, Settings, ShieldCheck, PenLine,
} from "lucide-react"

import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useUpdateProyecto } from "@/features/proyectos/api/use-update-proyecto"
import { useUpdateProyectoFlag } from "@/features/proyectos/api/use-update-proyecto-flag"
import { useGetFirmasConfig } from "@/features/proyectos/api/use-get-firmas-config"
import { useSaveFirmasConfig } from "@/features/proyectos/api/use-save-firmas-config"
import { ProyectoForm } from "@/features/proyectos/components/proyecto-form"
import type { FirmaConfigItem, Proyecto } from "@/features/proyectos/types"
import { ESTADO_PROYECTO } from "@/features/proyectos/types"
import type { ProyectoFormValues } from "@/features/proyectos/schema"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "general" | "permisos" | "firmas"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "general",  label: "Datos generales",  icon: <Settings  className="h-4 w-4" /> },
  { id: "permisos", label: "Permisos",          icon: <ShieldCheck className="h-4 w-4" /> },
  { id: "firmas",   label: "Firmas",            icon: <PenLine   className="h-4 w-4" /> },
]

// ─── Página ───────────────────────────────────────────────────────────────────

function ProyectoDetailContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("general")

  const { data: raw, isLoading } = useGetProyecto(id)
  const proyecto = raw?.data

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

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/alcance/proyectos")}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            <ArrowLeft className="h-4 w-4" /> Proyectos
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{proyecto.nombre}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {ESTADO_PROYECTO[proyecto.estado]} · Creado por {proyecto.createdByNombre}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
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
        {tab === "general"  && <TabGeneral  proyecto={proyecto} />}
        {tab === "permisos" && <TabPermisos proyecto={proyecto} />}
        {tab === "firmas"   && <TabFirmas   proyectoId={id} />}
      </div>
    </div>
  )
}

// ─── Tab General ──────────────────────────────────────────────────────────────

function TabGeneral({ proyecto }: { proyecto: Proyecto }) {
  const update = useUpdateProyecto(proyecto.id)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(values: ProyectoFormValues) {
    await update.mutateAsync(values)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-lg">
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
    </div>
  )
}

// ─── Tab Permisos ─────────────────────────────────────────────────────────────

const FLAGS: { campo: string; label: string; descripcion: string }[] = [
  {
    campo: "PermitirRegistroFisico",
    label: "Registro físico",
    descripcion: "Permite subir planillas escaneadas en PDF en lugar de completar el formulario digital.",
  },
  {
    campo: "PermitirAvanceSinRegistro",
    label: "Avance sin registro",
    descripcion: "Permite registrar avance de tareas sin completar un registro asociado.",
  },
  {
    campo: "PermitirDescargarPlanillas",
    label: "Descarga de planillas",
    descripcion: "Habilita la descarga de planillas en blanco en formato PDF.",
  },
  {
    campo: "PermitirDescargarProcedimientos",
    label: "Descarga de procedimientos",
    descripcion: "Habilita la descarga de documentos de procedimientos.",
  },
  {
    campo: "PermitirDescargarRegistros",
    label: "Descarga de registros",
    descripcion: "Permite descargar los registros completados en PDF.",
  },
  {
    campo: "PermitirTestFuncional",
    label: "Test funcional",
    descripcion: "Habilita la funcionalidad de test funcional para el proyecto.",
  },
]

const FLAG_KEY_MAP: Record<string, keyof Proyecto> = {
  PermitirRegistroFisico:          "permitirRegistroFisico",
  PermitirAvanceSinRegistro:       "permitirAvanceSinRegistro",
  PermitirDescargarPlanillas:      "permitirDescargarPlanillas",
  PermitirDescargarProcedimientos: "permitirDescargarProcedimientos",
  PermitirDescargarRegistros:      "permitirDescargarRegistros",
  PermitirTestFuncional:           "permitirTestFuncional",
}

function TabPermisos({ proyecto }: { proyecto: Proyecto }) {
  const updateFlag = useUpdateProyectoFlag(proyecto.id)
  const [saving, setSaving] = useState<string | null>(null)
  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>(
    () => Object.fromEntries(
      FLAGS.map(f => [f.campo, proyecto[FLAG_KEY_MAP[f.campo]] as boolean])
    )
  )

  async function handleToggle(campo: string, valor: boolean) {
    setSaving(campo)
    setLocalFlags(prev => ({ ...prev, [campo]: valor }))
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
      {FLAGS.map((flag) => (
        <div
          key={flag.campo}
          className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4"
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
              disabled={saving !== null}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tab Firmas ───────────────────────────────────────────────────────────────

function TabFirmas({ proyectoId }: { proyectoId: string }) {
  const { data: raw, isLoading } = useGetFirmasConfig(proyectoId)
  const save = useSaveFirmasConfig(proyectoId)

  const [slots, setSlots] = useState<FirmaConfigItem[]>([])
  const [initialized, setInitialized] = useState(false)
  const [saved, setSaved] = useState(false)

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
    setTimeout(() => setSaved(false), 2500)
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
            <div className="flex-1 grid grid-cols-2 gap-2">
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
              <div className="col-span-2 flex items-center justify-between pt-1">
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

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ProyectoDetailPage() {
  return (
    <Suspense>
      <ProyectoDetailContent />
    </Suspense>
  )
}
