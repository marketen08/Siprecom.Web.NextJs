"use client"

import { use, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Save, Check, X, Search, FolderOpen,
  Loader2, CheckCircle2, Shield, User, Briefcase,
} from "lucide-react"
import { useRef, useEffect } from "react"

import { useGetUsuario } from "@/features/usuarios/api/use-get-usuario"
import { useGetUsuarioProyectos } from "@/features/usuarios/api/use-get-usuario-proyectos"
import { useAddProyectoUsuario } from "@/features/usuarios/api/use-add-proyecto-usuario"
import { useRemoveProyectoUsuario } from "@/features/usuarios/api/use-remove-proyecto-usuario"
import { useGetUsuarioRol } from "@/features/usuarios/api/use-get-usuario-rol"
import { useSetUsuarioRol } from "@/features/usuarios/api/use-set-usuario-rol"
import { useUpdateUsuarioAdmin } from "@/features/usuarios/api/use-update-usuario-admin"
import { useGetProyectos } from "@/features/proyectos/api/use-get-proyectos"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "datos" | "proyectos" | "rol"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "datos",     label: "Datos generales", icon: <User      className="h-4 w-4" /> },
  { id: "proyectos", label: "Proyectos",        icon: <Briefcase className="h-4 w-4" /> },
  { id: "rol",       label: "Rol",              icon: <Shield    className="h-4 w-4" /> },
]

// ─── Página ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

function UsuarioDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("datos")

  const { data: result, isLoading } = useGetUsuario(id)
  const usuario = (result as any)?.data?.[0] ?? null
  const fullName = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ")

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
      </div>
    )
  }

  if (!usuario) {
    return <div className="py-10 text-center text-muted-foreground">No se encontró el usuario.</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/configuracion/usuarios")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
        >
          <ArrowLeft className="h-4 w-4" /> Usuarios
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{fullName || usuario.userName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{usuario.email}</p>
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
        {tab === "datos"     && <TabDatos     usuario={usuario} />}
        {tab === "proyectos" && <TabProyectos usuarioId={id} />}
        {tab === "rol"       && <TabRol       usuarioId={id} />}
      </div>
    </div>
  )
}

// ─── Tab Datos ────────────────────────────────────────────────────────────────

function TabDatos({ usuario }: { usuario: any }) {
  const update = useUpdateUsuarioAdmin(usuario.id)
  const [nombre, setNombre]   = useState(usuario.nombre ?? "")
  const [apellido, setApellido] = useState(usuario.apellido ?? "")
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    await update.mutateAsync({ nombre, apellido })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-sm">
      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" /> Cambios guardados
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <p className="text-sm text-muted-foreground bg-gray-50 rounded-md px-3 py-2 border">
            {usuario.email}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Usuario</label>
          <p className="text-sm text-muted-foreground bg-gray-50 rounded-md px-3 py-2 border font-mono">
            {usuario.userName}
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Nombre</label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan"
              disabled={update.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Apellido</label>
            <Input
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              placeholder="Pérez"
              disabled={update.isPending}
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={update.isPending}
        size="sm"
        className="gap-1.5"
      >
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {update.isPending ? "Guardando..." : "Guardar"}
      </Button>

      {update.isError && (
        <p className="text-sm text-red-600">{(update.error as Error)?.message ?? "Error al guardar"}</p>
      )}
    </div>
  )
}

// ─── Tab Proyectos ────────────────────────────────────────────────────────────

function TabProyectos({ usuarioId }: { usuarioId: string }) {
  const { data: asignadosData, isLoading } = useGetUsuarioProyectos(usuarioId)
  const addMutation    = useAddProyectoUsuario(usuarioId)
  const removeMutation = useRemoveProyectoUsuario(usuarioId)

  const asignados = Array.isArray(asignadosData) ? asignadosData : []
  const asignadosIds = new Set(asignados.map((p) => p.proyectoId))

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Proyectos a los que tiene acceso este usuario. El proyecto activo determina qué datos ve al iniciar sesión.
      </p>

      {/* Buscador para agregar */}
      <ProyectoCombobox
        asignadosIds={asignadosIds}
        onAdd={(proyectoId) => addMutation.mutate(proyectoId)}
        isPending={addMutation.isPending}
      />

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
        </div>
      ) : asignados.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-6 text-center text-sm text-muted-foreground">
          Sin proyectos asignados. Usá el buscador para agregar.
        </div>
      ) : (
        <div className="space-y-1.5">
          {asignados.map((p) => (
            <div
              key={p.proyectoId}
              className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-sm font-medium truncate">{p.proyectoNombre}</span>
                {p.esActivo && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                    <Check className="h-3 w-3" /> Activo
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeMutation.mutate(p.proyectoId)}
                disabled={removeMutation.isPending}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                aria-label="Quitar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Combobox de proyectos ────────────────────────────────────────────────────

function ProyectoCombobox({
  asignadosIds, onAdd, isPending,
}: {
  asignadosIds: Set<string>
  onAdd: (id: string) => void
  isPending: boolean
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen]     = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useGetProyectos({ nombre: search || undefined, pageSize: 10, page: 1 })
  const resultados = (data as any)?.data ?? []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proyecto para agregar..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="pl-9"
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
          {isFetching && resultados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Buscando...</p>
          ) : resultados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? "Sin resultados." : "Escribí para buscar proyectos."}
            </p>
          ) : (
            <ul className="divide-y max-h-56 overflow-y-auto">
              {resultados.map((p: any) => {
                const yaAsignado = asignadosIds.has(p.id)
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{p.nombre}</span>
                    </div>
                    {yaAsignado ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded shrink-0">
                        <Check className="h-3 w-3" /> Asignado
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs shrink-0"
                        disabled={isPending}
                        onClick={() => { onAdd(p.id); setOpen(false); setSearch("") }}
                      >
                        Agregar
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab Rol ──────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "Admin", label: "Administrador", descripcion: "Acceso completo: puede gestionar usuarios, configuración, proyectos y todos los datos." },
  { value: "User",  label: "Usuario",       descripcion: "Acceso operativo: puede registrar avances, completar tareas y firmar registros." },
]

function TabRol({ usuarioId }: { usuarioId: string }) {
  const { data, isLoading } = useGetUsuarioRol(usuarioId)
  const setRol = useSetUsuarioRol(usuarioId)
  const [saved, setSaved] = useState(false)

  const rolActual = data?.roles?.[0] ?? ""
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null)

  // Inicializar selección cuando llegan los datos
  if (rolActual && rolSeleccionado === null) {
    setRolSeleccionado(rolActual)
  }

  async function handleSave() {
    if (!rolSeleccionado) return
    await setRol.mutateAsync(rolSeleccionado)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        El rol determina los permisos del usuario en todo el sistema.
      </p>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" /> Rol actualizado correctamente
        </div>
      )}

      <div className="space-y-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRolSeleccionado(r.value)}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
              rolSeleccionado === r.value
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">{r.label}</span>
              {rolSeleccionado === r.value && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{r.descripcion}</p>
          </button>
        ))}
      </div>

      <Button
        size="sm"
        className="gap-1.5"
        onClick={handleSave}
        disabled={setRol.isPending || rolSeleccionado === rolActual}
      >
        {setRol.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {setRol.isPending ? "Guardando..." : "Guardar rol"}
      </Button>

      {setRol.isError && (
        <p className="text-sm text-red-600">{(setRol.error as Error)?.message ?? "Error al guardar"}</p>
      )}
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function UsuarioDetailPage({ params }: PageProps) {
  const { id } = use(params)
  return (
    <Suspense>
      <UsuarioDetailContent id={id} />
    </Suspense>
  )
}
