"use client"

import { use, useState, Suspense } from "react"
import {
  Save, Check, X, Search, FolderOpen,
  Loader2, CheckCircle2, Shield, User, Briefcase, Eye, EyeOff, KeyRound, Star,
  UserX, UserCheck, AlertTriangle, Mail,
} from "lucide-react"
import { useRef, useEffect } from "react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetUsuario } from "@/features/usuarios/api/use-get-usuario"
import { useGetUsuarioProyectos } from "@/features/usuarios/api/use-get-usuario-proyectos"
import { useAddProyectoUsuario } from "@/features/usuarios/api/use-add-proyecto-usuario"
import { useRemoveProyectoUsuario } from "@/features/usuarios/api/use-remove-proyecto-usuario"
import { useGetUsuarioRol } from "@/features/usuarios/api/use-get-usuario-rol"
import { useSetUsuarioRol } from "@/features/usuarios/api/use-set-usuario-rol"
import { useUpdateUsuarioAdmin } from "@/features/usuarios/api/use-update-usuario-admin"
import { useResetPasswordAdmin } from "@/features/usuarios/api/use-reset-password-admin"
import { useSetProyectoActivoAdmin } from "@/features/usuarios/api/use-set-proyecto-activo-admin"
import { useDeactivateUsuario } from "@/features/usuarios/api/use-deactivate-usuario"
import { useDeactivateUsuarioPermanent } from "@/features/usuarios/api/use-deactivate-usuario-permanent"
import { useReactivateUsuario } from "@/features/usuarios/api/use-reactivate-usuario"
import { useGetProyectos } from "@/features/proyectos/api/use-get-proyectos"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Combobox } from "@/components/ui/combobox"

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
  const [tab, setTab] = useState<Tab>("datos")

  const { data: result, isLoading } = useGetUsuario(id)
  const usuario = (result as any)?.data?.[0] ?? null
  const fullName = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ")

  // Breadcrumb dinámico: Configuración → Usuarios (link) → {nombre del usuario}
  useBreadcrumb(
    usuario
      ? [
          { label: "Configuración" },
          { label: "Usuarios", href: "/configuracion/usuarios" },
          { label: fullName || usuario.userName },
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

  if (!usuario) {
    return <div className="py-10 text-center text-muted-foreground">No se encontró el usuario.</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Email — siempre visible (no editable), independiente de la tab activa. */}
      <div className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 shrink-0">
          <Mail className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Email</p>
          <p className="text-sm font-medium text-gray-800 truncate">{usuario.email}</p>
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
  const resetPassword = useResetPasswordAdmin(usuario.id)
  const [nombre, setNombre]   = useState(usuario.nombre ?? "")
  const [apellido, setApellido] = useState(usuario.apellido ?? "")
  const [clienteId, setClienteId] = useState<string>(usuario.clienteId ?? "")
  const [saved, setSaved] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Opciones de empresa: clientes + contratistas, con badge de rol en el label.
  // El backend admite "" para desasignar (lo interpretamos en el handleSave).
  const { data: empresasData, isLoading: empresasLoading } = useGetClientesSelect()
  const empresaOptions = [
    { value: "", label: "— Sin empresa —" },
    ...(empresasData?.contratistas ?? []).map((c) => ({ value: c.id, label: `${c.nombre} (contratista)` })),
    ...(empresasData?.clientes ?? []).map((c) => ({ value: c.id, label: c.nombre })),
  ]

  async function handleSave() {
    await update.mutateAsync({ nombre, apellido, clienteId })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleResetPassword() {
    if (!newPassword) return
    await resetPassword.mutateAsync(newPassword)
    setNewPassword("")
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2500)
  }

  return (
    <div className="space-y-6 max-w-sm">
      {/* Datos básicos */}
      <div className="space-y-4">
        {saved && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Cambios guardados
          </div>
        )}

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

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Empresa</label>
          <Combobox
            options={empresaOptions}
            value={clienteId}
            onChange={setClienteId}
            placeholder={empresasLoading ? "Cargando empresas..." : "Seleccionar empresa..."}
            searchPlaceholder="Buscar empresa..."
            emptyMessage="Sin empresas"
            disabled={update.isPending || empresasLoading}
          />
          <p className="text-xs text-muted-foreground">
            Se muestra en el PDF de los registros que firme el usuario.
          </p>
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

      {/* Restablecer contraseña */}
      <div className="space-y-3">
        <Separator />
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-gray-700">Restablecer contraseña</h3>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Usuario</label>
          <p className="text-sm text-muted-foreground bg-gray-50 rounded-md px-3 py-2 border font-mono">
            {usuario.userName}
          </p>
        </div>

        {passwordSaved && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Contraseña restablecida
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Nueva contraseña</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="pr-10"
              disabled={resetPassword.isPending}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleResetPassword}
          disabled={resetPassword.isPending || newPassword.length < 6}
        >
          {resetPassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {resetPassword.isPending ? "Restableciendo..." : "Restablecer contraseña"}
        </Button>

        {resetPassword.isError && (
          <p className="text-sm text-red-600">{(resetPassword.error as Error)?.message ?? "Error al restablecer"}</p>
        )}
      </div>

      <Separator />

      {/* Estado del usuario — baja / reactivación */}
      <EstadoUsuarioSection usuario={usuario} />
    </div>
  )
}

// ─── Estado de usuario (baja simple / definitiva / reactivar) ────────────────

type EstadoAction = "deactivate" | "permanent" | "reactivate" | null

function EstadoUsuarioSection({ usuario }: { usuario: any }) {
  const isLocked = usuario.isLocked === true
  // Heurística: si el email tiene formato `deleted-...@siprecom.invalid`, el
  // user fue dado de baja DEFINITIVAMENTE (email anonimizado, no reactivable).
  const isPermanentlyDeactivated = isLocked && typeof usuario.email === "string"
    && usuario.email.startsWith("deleted-") && usuario.email.endsWith("@siprecom.invalid")

  const deactivate = useDeactivateUsuario(usuario.id)
  const permanent = useDeactivateUsuarioPermanent(usuario.id)
  const reactivate = useReactivateUsuario(usuario.id)
  const [confirming, setConfirming] = useState<EstadoAction>(null)

  const mutationFor = (a: EstadoAction) => {
    if (a === "deactivate") return deactivate
    if (a === "permanent")  return permanent
    if (a === "reactivate") return reactivate
    return null
  }
  const activeMutation = mutationFor(confirming)
  const isPending = !!activeMutation?.isPending

  async function handleConfirm() {
    if (!activeMutation) return
    await activeMutation.mutateAsync()
    setConfirming(null)
  }

  // Si está anonimizado, ya no hay nada que hacer — el user es permanente histórico.
  if (isPermanentlyDeactivated) {
    return (
      <div className="space-y-2 rounded-lg border bg-gray-50 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-gray-700">Baja definitiva</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Este usuario fue dado de baja definitivamente — su email original fue liberado.
          Permanece solo para preservar trazabilidad histórica (firmas, registros).
          Si la persona vuelve, hay que crear un usuario nuevo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isLocked
          ? <UserCheck className="h-4 w-4 text-muted-foreground" />
          : <UserX     className="h-4 w-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold text-gray-700">
          {isLocked ? "Reactivar o liberar email" : "Dar de baja"}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        {isLocked
          ? "El usuario está dado de baja. Reactivalo si vuelve a la organización, o liberá el email (baja definitiva) si el puesto va a re-asignarse a otra persona."
          : "Da de baja al usuario impidiéndole iniciar sesión. El email se mantiene reservado y podés reactivarlo más adelante si vuelve."}
      </p>

      {!confirming && !isLocked && (
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          onClick={() => setConfirming("deactivate")}
          disabled={isPending}
        >
          <UserX className="h-4 w-4" />
          Dar de baja
        </Button>
      )}

      {!confirming && isLocked && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => setConfirming("reactivate")}
            disabled={isPending}
          >
            <UserCheck className="h-4 w-4" />
            Reactivar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => setConfirming("permanent")}
            disabled={isPending}
          >
            <UserX className="h-4 w-4" />
            Liberar email (irreversible)
          </Button>
        </div>
      )}

      {confirming && (
        <div className={`rounded-lg border px-3 py-2.5 space-y-2 ${
          confirming === "reactivate" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
              confirming === "reactivate" ? "text-green-700" : "text-red-700"
            }`} />
            <p className="text-sm">
              {confirming === "reactivate" &&
                "¿Reactivar este usuario? Recuperará acceso al sistema con sus permisos previos."}
              {confirming === "deactivate" &&
                "¿Confirmás la baja simple? El usuario pierde acceso (los JWTs activos expiran en unos minutos) pero el email se mantiene y podés reactivarlo después."}
              {confirming === "permanent" &&
                "¿Confirmás la BAJA DEFINITIVA? El email se va a liberar (anonimizado) y un usuario nuevo va a poder usarlo. La trazabilidad histórica (firmas, registros) se mantiene. ESTA ACCIÓN NO ES REVERSIBLE."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={confirming === "reactivate" ? "default" : "destructive"}
              size="sm"
              className="gap-1.5"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Procesando..." : "Sí, confirmar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {activeMutation?.isError && (
        <p className="text-sm text-red-600">
          {(activeMutation.error as Error)?.message ?? "Error al cambiar el estado"}
        </p>
      )}
    </div>
  )
}

// ─── Tab Proyectos ────────────────────────────────────────────────────────────

function TabProyectos({ usuarioId }: { usuarioId: string }) {
  const { data: asignadosData, isLoading } = useGetUsuarioProyectos(usuarioId)
  const addMutation    = useAddProyectoUsuario(usuarioId)
  const removeMutation = useRemoveProyectoUsuario(usuarioId)
  const setActivoMutation = useSetProyectoActivoAdmin(usuarioId)

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
              <div className="flex items-center gap-1 shrink-0">
                {!p.esActivo && (
                  <button
                    type="button"
                    onClick={() => setActivoMutation.mutate(p.proyectoId)}
                    disabled={setActivoMutation.isPending}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                    title="Establecer como proyecto activo"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(p.proyectoId)}
                  disabled={removeMutation.isPending}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Quitar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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
  { value: "Admin",      label: "Administrador", descripcion: "Acceso completo: puede gestionar usuarios, configuración, proyectos y todos los datos." },
  { value: "Supervisor", label: "Supervisor",    descripcion: "Acceso intermedio: gestiona usuarios y proyectos a los que tiene acceso, pero no la configuración global del sistema." },
  { value: "User",       label: "Usuario",       descripcion: "Acceso operativo: puede registrar avances, completar tareas y firmar registros." },
]

// SuperAdmin es un rol del proveedor: no se ofrece como asignación normal, pero
// si el usuario ya lo tiene lo mostramos (si no, la tab quedaba sin nada marcado).
const ROL_SUPERADMIN = {
  value: "SuperAdmin",
  label: "Super Admin",
  descripcion: "Acceso total del proveedor: licenciamiento, migraciones, datos de muestra y toda la administración del sistema.",
}

function TabRol({ usuarioId }: { usuarioId: string }) {
  const { data, isLoading } = useGetUsuarioRol(usuarioId)
  const setRol = useSetUsuarioRol(usuarioId)
  const [saved, setSaved] = useState(false)

  const rolActual = data?.roles?.[0] ?? ""
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null)

  // Si el usuario es SuperAdmin, mostramos esa card además de las asignables.
  const rolesVisibles = rolActual === "SuperAdmin" ? [ROL_SUPERADMIN, ...ROLES] : ROLES

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
        {rolesVisibles.map((r) => (
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
