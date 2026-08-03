"use client"

import { use, useState, useMemo, Suspense } from "react"
import {
  Save, Check, X, Search, FolderOpen,
  Loader2, CheckCircle2, Shield, User, Briefcase, Eye, EyeOff, KeyRound, Star,
  UserX, UserCheck, AlertTriangle, Mail, ArrowLeft, ArrowRight, Link as LinkIcon, Copy,
} from "lucide-react"
import { useEffect } from "react"

import { useBreadcrumb } from "@/components/breadcrumb-context"
import { useGetUsuario } from "@/features/usuarios/api/use-get-usuario"
import { useGetUsuarioProyectos } from "@/features/usuarios/api/use-get-usuario-proyectos"
import { useRemoveProyectoUsuario } from "@/features/usuarios/api/use-remove-proyecto-usuario"
import { useBulkAssignProyectosUsuario, useBulkUnassignProyectosUsuario } from "@/features/usuarios/api/use-bulk-proyectos-usuario"
import { useGetUsuarioRol } from "@/features/usuarios/api/use-get-usuario-rol"
import { useSetUsuarioRol } from "@/features/usuarios/api/use-set-usuario-rol"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useRoles } from "@/lib/use-roles"
import { puedeAsignarRol, puedeEditarRolesDe } from "@/lib/roles"
import { useUpdateUsuarioAdmin } from "@/features/usuarios/api/use-update-usuario-admin"
import { useResetPasswordAdmin } from "@/features/usuarios/api/use-reset-password-admin"
import { useGetPasswordLink } from "@/features/usuarios/api/use-get-password-link"
import { useResendInvite } from "@/features/usuarios/api/use-resend-invite"
import { useCambiarLoginMethod } from "@/features/usuarios/api/use-cambiar-login-method"
import { useSetProyectoActivoAdmin } from "@/features/usuarios/api/use-set-proyecto-activo-admin"
import { useDeactivateUsuario } from "@/features/usuarios/api/use-deactivate-usuario"
import { useDeactivateUsuarioPermanent } from "@/features/usuarios/api/use-deactivate-usuario-permanent"
import { useReactivateUsuario } from "@/features/usuarios/api/use-reactivate-usuario"
import { useGetProyectos } from "@/features/proyectos/api/use-get-proyectos"
import type { Proyecto } from "@/features/proyectos/types"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Combobox } from "@/components/ui/combobox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  FiltersTrigger, FiltersChips, FiltersSheet, FilterField, type FilterChip,
} from "@/components/ui/filters-bar"
import {
  Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

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
    // Sin max-w global: TabDatos/TabRol se auto-limitan con max-w local; TabProyectos
    // (split view con filtros) aprovecha todo el ancho disponible.
    <div className="space-y-6">

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
  const passwordLink = useGetPasswordLink(usuario.id)
  const resendInvite = useResendInvite(usuario.id)
  const [nombre, setNombre]   = useState(usuario.nombre ?? "")
  const [apellido, setApellido] = useState(usuario.apellido ?? "")
  const [clienteId, setClienteId] = useState<string>(usuario.clienteId ?? "")
  const [saved, setSaved] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const esMicrosoft = (usuario.loginMethod ?? 0) === 1
  const linkUrl = passwordLink.data?.url ?? null

  async function handleCopyLink() {
    if (!linkUrl) return
    try {
      await navigator.clipboard.writeText(linkUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {
      // Si clipboard falla (permiso/http), el usuario igual puede copiar del input.
    }
  }

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
    <div className="max-w-5xl grid gap-4 lg:grid-cols-2 items-start">
      {/* ── Columna izquierda: Perfil ─────────────────────────────────────── */}

      {/* Datos personales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Datos personales
          </CardTitle>
          <CardDescription>Nombre visible del usuario en el sistema y en los PDFs firmados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Método de ingreso (Microsoft ↔ mail+contraseña) */}
      <MetodoIngresoSection usuario={usuario} />

      {/* ── Columna derecha: Acceso ────────────────────────────────────────── */}

      {/* Restablecer contraseña + link para definir (misma card, mismo tema) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Contraseña
          </CardTitle>
          <CardDescription>Restablecé la contraseña del usuario o generá un link para que la defina.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            {/* Honeypot: Chrome/Firefox hacen un "reverse scan" desde cada <input
                type="password"> para adivinar el campo de usuario y autofillearlo.
                Al no encontrar un input marcado como username, elegían el Combobox
                de Empresa (que tiene un input de texto interno). Estos dos inputs
                ocultos son el señuelo: los toman como par username/password del
                autofill y dejan tranquilos a los reales. `tabIndex={-1}` +
                `aria-hidden` los sacan del foco y de screen readers. */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value=""
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
            />
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value=""
              readOnly
              tabIndex={-1}
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                disabled={resetPassword.isPending}
                autoComplete="new-password"
                name={`nueva-password-${usuario.id}`}
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

          <Separator />

          {/* Link para definir contraseña (compartir manual, útil si el email no llega) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-gray-700">Link para definir contraseña</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Generá un link y compartíselo al usuario (por WhatsApp, chat, etc.) para que defina su
              contraseña. Sirve cuando el email de invitación no llega.
            </p>

            {esMicrosoft ? (
              <p className="text-xs text-amber-600">
                El usuario ingresa con Microsoft. Cambialo a mail + contraseña para poder generar el link.
              </p>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => passwordLink.mutate()}
                  disabled={passwordLink.isPending}
                >
                  {passwordLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                  {passwordLink.isPending ? "Generando..." : "Generar link"}
                </Button>

                {linkUrl && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={linkUrl}
                        className="text-xs font-mono"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleCopyLink}>
                        {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        {linkCopied ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      El link vence en ~1 día. Si expira, generá uno nuevo.
                    </p>
                  </div>
                )}

                {passwordLink.isError && (
                  <p className="text-sm text-red-600">{(passwordLink.error as Error)?.message ?? "No se pudo generar el link"}</p>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reenviar email de alta (invitación / bienvenida Microsoft) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Email de alta
          </CardTitle>
          <CardDescription>Reenvía el email de activación (invitación o bienvenida Microsoft).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {resendInvite.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4" /> Email reenviado
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => resendInvite.mutate()}
            disabled={resendInvite.isPending}
          >
            {resendInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {resendInvite.isPending ? "Enviando..." : "Reenviar email de alta"}
          </Button>
          {resendInvite.isError && (
            <p className="text-sm text-red-600">{(resendInvite.error as Error)?.message ?? "Error al reenviar"}</p>
          )}
        </CardContent>
      </Card>

      {/* Estado del usuario — baja / reactivación (acción sensible, ancho completo) */}
      <div className="lg:col-span-2">
        <EstadoUsuarioSection usuario={usuario} />
      </div>
    </div>
  )
}

// ─── Método de ingreso (Microsoft ↔ mail+contraseña) ─────────────────────────

function MetodoIngresoSection({ usuario }: { usuario: any }) {
  const cambiar = useCambiarLoginMethod(usuario.id)
  const [confirming, setConfirming] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  // 0 = mail+contraseña, 1 = Microsoft
  const esMicrosoft = (usuario.loginMethod ?? 0) === 1
  const destino = esMicrosoft ? 0 : 1

  async function handleConfirm() {
    setMensaje(null)
    const resp = (await cambiar.mutateAsync(destino)) as any
    setMensaje(resp?.message ?? "Método de ingreso actualizado.")
    setConfirming(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {esMicrosoft
            ? <Mail className="h-4 w-4 text-muted-foreground" />
            : <KeyRound className="h-4 w-4 text-muted-foreground" />}
          Método de ingreso
        </CardTitle>
        <CardDescription>Elegí cómo el usuario accede al sistema: SSO de Microsoft o mail + contraseña.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${esMicrosoft ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
            {esMicrosoft ? "Microsoft (SSO)" : "Mail + contraseña"}
          </span>
          <span className="text-xs text-muted-foreground">método actual</span>
        </div>

        {mensaje && (
          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>{mensaje}</span>
          </div>
        )}

        {!confirming ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { setConfirming(true); setMensaje(null) }}
            disabled={cambiar.isPending}
          >
            {esMicrosoft ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {esMicrosoft ? "Cambiar a mail + contraseña" : "Cambiar a Microsoft"}
          </Button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
              <p className="text-sm">
                {esMicrosoft
                  ? "El usuario pasará a ingresar con mail y contraseña. Le vamos a enviar un email para que defina su contraseña, y dejará de poder entrar con Microsoft."
                  : "El usuario pasará a ingresar con su cuenta de Microsoft (SSO). Se le quitará la contraseña local: ya no podrá entrar con mail y contraseña."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={handleConfirm} disabled={cambiar.isPending}>
                {cambiar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {cambiar.isPending ? "Cambiando..." : "Sí, cambiar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={cambiar.isPending}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {cambiar.isError && (
          <p className="text-sm text-red-600">{(cambiar.error as Error)?.message ?? "Error al cambiar el método"}</p>
        )}
      </CardContent>
    </Card>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-muted-foreground" />
            Baja definitiva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Este usuario fue dado de baja definitivamente — su email original fue liberado.
            Permanece solo para preservar trazabilidad histórica (firmas, registros).
            Si la persona vuelve, hay que crear un usuario nuevo.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isLocked
            ? <UserCheck className="h-4 w-4 text-muted-foreground" />
            : <UserX className="h-4 w-4 text-muted-foreground" />}
          {isLocked ? "Reactivar o liberar email" : "Dar de baja"}
        </CardTitle>
        <CardDescription>
          {isLocked
            ? "El usuario está dado de baja. Reactivalo si vuelve a la organización, o liberá el email (baja definitiva) si el puesto va a re-asignarse a otra persona."
            : "Da de baja al usuario impidiéndole iniciar sesión. El email se mantiene reservado y podés reactivarlo más adelante si vuelve."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">

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
      </CardContent>
    </Card>
  )
}

// ─── Tab Proyectos ────────────────────────────────────────────────────────────
//
// Layout tipo "elementos a área" en versión compacta: dos columnas (Disponibles /
// Asignados) con filtro por cliente + búsqueda por nombre. Multi-check + bulk
// asignar/quitar. Se mantienen los shortcuts individuales (★ activo, X quitar).
// No paginamos: cargamos hasta 500 proyectos accesibles por request; para un
// tenant con más volumen habría que sumar paginación server-side.

const CLIENTE_ALL = "__all__"
const CONTRATISTA_ALL = "__all__"
const ESTADO_ABIERTOS = "__abiertos__"
const ESTADO_ALL = "__all__"

// "Abiertos" = todos los estados que NO son terminales (Cancelado 5, Cerrado 7).
// Incluye Pausado por default — si un cliente quiere excluirlo, puede usar el
// select individual del estado. Ver EstadoProyecto.cs para los IDs.
const ESTADOS_ABIERTOS: number[] = [1, 2, 3, 4, 6]

// Opciones individuales del select: {value, label}. Para "abiertos" y "todos"
// usamos strings sentinel para distinguirlos de los IDs numéricos del enum.
const ESTADO_OPCIONES: { value: string; label: string }[] = [
  { value: ESTADO_ABIERTOS, label: "Todos los abiertos" },
  { value: ESTADO_ALL,      label: "Todos" },
  { value: "1", label: "Preparación" },
  { value: "2", label: "En curso" },
  { value: "3", label: "Pausado" },
  { value: "4", label: "Completado" },
  { value: "5", label: "Cancelado" },
  { value: "6", label: "En cierre" },
  { value: "7", label: "Cerrado" },
]

function TabProyectos({ usuarioId }: { usuarioId: string }) {
  const { data: asignadosData, isLoading: loadingAsignados } = useGetUsuarioProyectos(usuarioId)
  const { data: proyectosData, isLoading: loadingProyectos } = useGetProyectos({ pageSize: 500 })
  const removeMutation   = useRemoveProyectoUsuario(usuarioId)
  const setActivoMutation = useSetProyectoActivoAdmin(usuarioId)
  const bulkAdd    = useBulkAssignProyectosUsuario(usuarioId)
  const bulkRemove = useBulkUnassignProyectosUsuario(usuarioId)

  const asignados = Array.isArray(asignadosData) ? asignadosData : []
  const asignadosIds = new Set(asignados.map((p) => p.proyectoId))
  const proyectosAccesibles: Proyecto[] = (proyectosData as any)?.data ?? []

  // Filtros de la columna izquierda (Disponibles) y derecha (Asignados) son
  // simétricos: comparten todos los filtros para ver el mismo scope en ambos.
  const [clienteFilter, setClienteFilter] = useState<string>(CLIENTE_ALL)
  const [contratistaFilter, setContratistaFilter] = useState<string>(CONTRATISTA_ALL)
  const [estadoFilter, setEstadoFilter] = useState<string>(ESTADO_ABIERTOS)
  const [search, setSearch] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Selecciones bulk (Sets separados por columna).
  const [selectedDisp, setSelectedDisp] = useState<Set<string>>(new Set())
  const [selectedAsig, setSelectedAsig] = useState<Set<string>>(new Set())

  // Reset de selecciones al cambiar filtros — evita "asignar" ítems que ya no
  // están visibles bajo los filtros nuevos.
  useEffect(() => {
    setSelectedDisp(new Set())
    setSelectedAsig(new Set())
  }, [clienteFilter, contratistaFilter, estadoFilter, search])

  // Sets de clientes/contratistas que aparecen en proyectos accesibles — así los
  // dropdowns solo ofrecen empresas con al menos un proyecto visible.
  const clientesOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of proyectosAccesibles) {
      if (p.clienteId && p.clienteNombre) map.set(p.clienteId, p.clienteNombre)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, nombre]) => ({ id, nombre }))
  }, [proyectosAccesibles])

  const contratistasOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of proyectosAccesibles) {
      if (p.contratistaId && p.contratistaNombre) map.set(p.contratistaId, p.contratistaNombre)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, nombre]) => ({ id, nombre }))
  }, [proyectosAccesibles])

  // Índice por ID para enriquecer los asignados (que solo traen proyectoId+nombre)
  // con el clienteNombre — lo necesitamos para el filtro por cliente en Asignados.
  const proyectoIndex = useMemo(() => {
    const m = new Map<string, Proyecto>()
    for (const p of proyectosAccesibles) m.set(p.id, p)
    return m
  }, [proyectosAccesibles])

  const matchFilters = (proyectoId: string, nombre: string): boolean => {
    if (search && !nombre.toLowerCase().includes(search.toLowerCase())) return false
    const p = proyectoIndex.get(proyectoId)
    if (clienteFilter !== CLIENTE_ALL && p?.clienteId !== clienteFilter) return false
    if (contratistaFilter !== CONTRATISTA_ALL && p?.contratistaId !== contratistaFilter) return false
    if (estadoFilter !== ESTADO_ALL) {
      // "Abiertos" es un conjunto; los estados individuales vienen como string
      // numérico del enum EstadoProyecto.
      if (estadoFilter === ESTADO_ABIERTOS) {
        if (p == null || !ESTADOS_ABIERTOS.includes(p.estado as number)) return false
      } else {
        if (p == null || String(p.estado) !== estadoFilter) return false
      }
    }
    return true
  }

  const disponibles = useMemo(() => {
    return proyectosAccesibles
      .filter((p) => !asignadosIds.has(p.id))
      .filter((p) => matchFilters(p.id, p.nombre))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectosAccesibles, asignadosData, clienteFilter, contratistaFilter, estadoFilter, search])

  const asignadosFiltrados = useMemo(() => {
    return asignados
      .filter((p) => matchFilters(p.proyectoId, p.proyectoNombre))
      .sort((a, b) => a.proyectoNombre.localeCompare(b.proyectoNombre))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asignados, clienteFilter, contratistaFilter, estadoFilter, search])

  const toggleDisp = (id: string) => {
    setSelectedDisp((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAsig = (id: string) => {
    setSelectedAsig((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleAsignarBulk = async () => {
    if (selectedDisp.size === 0) return
    await bulkAdd.mutateAsync(Array.from(selectedDisp))
    setSelectedDisp(new Set())
  }
  const handleQuitarBulk = async () => {
    if (selectedAsig.size === 0) return
    await bulkRemove.mutateAsync(Array.from(selectedAsig))
    setSelectedAsig(new Set())
  }

  const isLoading = loadingAsignados || loadingProyectos
  const busy = bulkAdd.isPending || bulkRemove.isPending || removeMutation.isPending

  // Chips de filtros activos. La búsqueda es independiente (input siempre visible),
  // así que NO genera chip — se limpia desde su propio input.
  const activeFilters: FilterChip[] = []
  if (clienteFilter !== CLIENTE_ALL) {
    activeFilters.push({
      id: "cliente",
      label: `Cliente: ${clientesOptions.find((c) => c.id === clienteFilter)?.nombre ?? "—"}`,
      onRemove: () => setClienteFilter(CLIENTE_ALL),
    })
  }
  if (contratistaFilter !== CONTRATISTA_ALL) {
    activeFilters.push({
      id: "contratista",
      label: `Contratista: ${contratistasOptions.find((c) => c.id === contratistaFilter)?.nombre ?? "—"}`,
      onRemove: () => setContratistaFilter(CONTRATISTA_ALL),
    })
  }
  if (estadoFilter !== ESTADO_ABIERTOS) {
    activeFilters.push({
      id: "estado",
      label: `Estado: ${ESTADO_OPCIONES.find((o) => o.value === estadoFilter)?.label ?? "—"}`,
      onRemove: () => setEstadoFilter(ESTADO_ABIERTOS),
    })
  }

  function handleClearFiltros() {
    setClienteFilter(CLIENTE_ALL)
    setContratistaFilter(CONTRATISTA_ALL)
    setEstadoFilter(ESTADO_ABIERTOS)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-3xl">
        Proyectos a los que tiene acceso este usuario. El proyecto activo determina
        qué datos ve al iniciar sesión — usá la <Star className="h-3 w-3 inline mb-0.5" /> para
        cambiarlo. Filtrá por cliente para acotar y usá los checkboxes para asignar
        o quitar varios de una.
      </p>

      {/* Barra compacta: buscador a la izquierda + botón filtros a la derecha */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="pl-9"
          />
        </div>
        <FiltersTrigger
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          activeCount={activeFilters.length}
        />
      </div>

      {/* Chips de filtros activos (línea propia, solo si hay alguno) */}
      <FiltersChips activeFilters={activeFilters} onClearAll={handleClearFiltros} />

      {/* Sheet lateral con los controles */}
      <FiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        onClearAll={handleClearFiltros}
        hasActiveFilters={activeFilters.length > 0}
      >
        <FilterField label="Cliente">
          <UiSelect value={clienteFilter} onValueChange={(v) => setClienteFilter(v ?? CLIENTE_ALL)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {clienteFilter === CLIENTE_ALL
                  ? "Todos los clientes"
                  : clientesOptions.find((c) => c.id === clienteFilter)?.nombre ?? "—"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLIENTE_ALL}>Todos los clientes</SelectItem>
              {clientesOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </UiSelect>
        </FilterField>

        <FilterField label="Contratista">
          <UiSelect value={contratistaFilter} onValueChange={(v) => setContratistaFilter(v ?? CONTRATISTA_ALL)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {contratistaFilter === CONTRATISTA_ALL
                  ? "Todos los contratistas"
                  : contratistasOptions.find((c) => c.id === contratistaFilter)?.nombre ?? "—"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CONTRATISTA_ALL}>Todos los contratistas</SelectItem>
              {contratistasOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </UiSelect>
        </FilterField>

        <FilterField label="Estado del proyecto">
          <UiSelect value={estadoFilter} onValueChange={(v) => setEstadoFilter(v ?? ESTADO_ABIERTOS)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {ESTADO_OPCIONES.find((o) => o.value === estadoFilter)?.label ?? "—"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ESTADO_OPCIONES.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </UiSelect>
        </FilterField>
      </FiltersSheet>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        {/* Disponibles */}
        <ListaBulk
          titulo="Disponibles"
          vacio={isLoading ? "Cargando..." : "Sin proyectos disponibles que coincidan con los filtros."}
          items={disponibles.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            clienteNombre: p.clienteNombre ?? null,
          }))}
          selected={selectedDisp}
          onToggle={toggleDisp}
          onReplace={setSelectedDisp}
          isLoading={isLoading}
        />

        {/* Botones bulk (aparecen verticales en desktop, entre las columnas) */}
        <div className="hidden lg:flex flex-col justify-center items-center gap-2 self-center px-1">
          <Button
            size="sm"
            className="w-9 h-9 p-0"
            onClick={handleAsignarBulk}
            disabled={selectedDisp.size === 0 || busy}
            title={selectedDisp.size > 0 ? `Asignar ${selectedDisp.size}` : "Elegí items de la izquierda"}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-9 h-9 p-0"
            onClick={handleQuitarBulk}
            disabled={selectedAsig.size === 0 || busy}
            title={selectedAsig.size > 0 ? `Quitar ${selectedAsig.size}` : "Elegí items de la derecha"}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Asignados */}
        <ListaBulk
          titulo="Asignados"
          vacio={isLoading ? "Cargando..." : "Sin proyectos asignados. Marcá items de Disponibles y usá →."}
          items={asignadosFiltrados.map((p) => ({
            id: p.proyectoId,
            nombre: p.proyectoNombre,
            clienteNombre: proyectoIndex.get(p.proyectoId)?.clienteNombre ?? null,
            esActivo: p.esActivo,
            onSetActivo: p.esActivo ? undefined : () => setActivoMutation.mutate(p.proyectoId),
            onRemoveIndividual: () => removeMutation.mutate(p.proyectoId),
          }))}
          selected={selectedAsig}
          onToggle={toggleAsig}
          onReplace={setSelectedAsig}
          isLoading={isLoading}
        />

        {/* Botones bulk en mobile — abajo de todo, horizontales */}
        <div className="lg:hidden col-span-full flex justify-center gap-2">
          <Button
            size="sm"
            onClick={handleAsignarBulk}
            disabled={selectedDisp.size === 0 || busy}
            className="gap-1"
          >
            <ArrowRight className="h-4 w-4" /> Asignar ({selectedDisp.size})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleQuitarBulk}
            disabled={selectedAsig.size === 0 || busy}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Quitar ({selectedAsig.size})
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ItemBulk {
  id: string
  nombre: string
  clienteNombre: string | null
  esActivo?: boolean
  onSetActivo?: () => void
  onRemoveIndividual?: () => void
}

function ListaBulk({
  titulo, vacio, items, selected, onToggle, onReplace, isLoading,
}: {
  titulo: string
  vacio: string
  items: ItemBulk[]
  selected: Set<string>
  onToggle: (id: string) => void
  onReplace: (ids: Set<string>) => void
  isLoading: boolean
}) {
  // Los proyectos activos quedan protegidos: no se pueden marcar en el checkbox
  // ni quitar con el ✕ individual. El backend replica el guard (fail-closed).
  const itemsSeleccionables = items.filter((x) => !x.esActivo)
  const seleccionadosVisibles = itemsSeleccionables.reduce(
    (acc, x) => acc + (selected.has(x.id) ? 1 : 0), 0,
  )
  const hayItems = items.length > 0
  const haySeleccionables = itemsSeleccionables.length > 0
  const todosSeleccionados = haySeleccionables && seleccionadosVisibles === itemsSeleccionables.length

  function toggleAll() {
    if (todosSeleccionados) {
      onReplace(new Set())
    } else {
      // Nunca marcamos el proyecto activo — queda excluido del bulk remove.
      onReplace(new Set(itemsSeleccionables.map((x) => x.id)))
    }
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden flex flex-col min-h-64">
      {/* Header con contador y "seleccionar todos" */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="checkbox"
            checked={todosSeleccionados}
            onChange={toggleAll}
            disabled={!haySeleccionables}
            className="h-3.5 w-3.5 shrink-0"
            aria-label={`Seleccionar todos los ${titulo.toLowerCase()}`}
            title={!haySeleccionables && hayItems ? "El proyecto activo no se puede quitar; cambiá el activo (★) primero." : undefined}
          />
          <span className="text-sm font-semibold text-gray-800 truncate">{titulo}</span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {seleccionadosVisibles > 0
            ? `${seleccionadosVisibles} / ${items.length}`
            : items.length}
        </span>
      </div>

      {/* Lista scrolleable */}
      <div className="flex-1 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
          </div>
        ) : !hayItems ? (
          <p className="text-xs text-muted-foreground italic p-4 text-center">{vacio}</p>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={!it.esActivo && selected.has(it.id)}
                  onChange={() => onToggle(it.id)}
                  disabled={it.esActivo}
                  className="h-3.5 w-3.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={`Seleccionar ${it.nombre}`}
                  title={it.esActivo ? "El proyecto activo no se puede quitar; cambiá el activo (★) primero." : undefined}
                />
                <FolderOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{it.nombre}</span>
                    {it.esActivo && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-700 bg-blue-50 px-1 py-0 rounded shrink-0">
                        <Check className="h-2.5 w-2.5" /> Activo
                      </span>
                    )}
                  </div>
                  {it.clienteNombre && (
                    <p className="text-[11px] text-muted-foreground truncate">{it.clienteNombre}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {it.onSetActivo && (
                    <button
                      type="button"
                      onClick={it.onSetActivo}
                      className="text-gray-300 hover:text-blue-500 transition-colors p-0.5"
                      title="Establecer como proyecto activo"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {it.onRemoveIndividual && !it.esActivo && (
                    <button
                      type="button"
                      onClick={it.onRemoveIndividual}
                      className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                      title="Quitar solo este"
                      aria-label="Quitar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Tab Rol ──────────────────────────────────────────────────────────────────

const ROLES = [
  { value: "AdminGlobal", label: "Administrador global", descripcion: "Como Administrador pero con acceso a TODOS los proyectos (no solo los asignados). Administrador corporativo." },
  { value: "Admin",       label: "Administrador",        descripcion: "Acceso completo a los proyectos donde está asignado: gestiona usuarios, configuración, alcance y todos los datos de esos proyectos." },
  { value: "Supervisor",  label: "Supervisor",           descripcion: "Acceso intermedio: gestiona usuarios y proyectos a los que tiene acceso, pero no la configuración global del sistema." },
  { value: "Coordinador", label: "Coordinador",          descripcion: "Coordinación de tareas del proyecto (asignación masiva, cambios de fecha, cancelaciones, generación de faltantes)." },
  { value: "User",        label: "Usuario",              descripcion: "Acceso operativo: puede registrar avances, completar tareas y firmar registros." },
  { value: "Auditor",     label: "Auditor",              descripcion: "Solo lectura: ve todo el proyecto (avance, planillas, registros, pendientes, certificados, 3D) más el Control de cambios. No puede modificar nada." },
  { value: "Consultor",   label: "Consultor",            descripcion: "Solo lectura: ve todo el proyecto (avance, planillas, registros, pendientes, certificados, 3D). No puede modificar nada ni acceder al Control de cambios." },
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
  const { data: perfil } = useGetPerfil()
  const setRol = useSetUsuarioRol(usuarioId)
  const [saved, setSaved] = useState(false)

  const rolActual = data?.roles?.[0] ?? ""
  const [rolSeleccionado, setRolSeleccionado] = useState<string | null>(null)

  // ── Gates de escalada (espejan AuthController.SetUserRol) ────────────────
  // 1) No podés editarte a vos mismo.
  // 2) No podés editar un peer/superior.
  // 3) Sólo podés asignar roles ESTRICTAMENTE inferiores al tuyo.
  const callerRoles = useRoles()
  const targetRoles = data?.roles ?? []
  const esSelf = !!perfil?.id && perfil.id === usuarioId
  const puedeEditar = !esSelf && puedeEditarRolesDe(callerRoles, targetRoles)

  // Cuando puede editar, mostramos SOLO los roles asignables por el caller.
  // Si el user destino ya tiene un rol que el caller no puede asignar (ej. el
  // caller es Admin y el target es SuperAdmin) el bloqueo del gate se ocupa;
  // igual mostramos ese rol arriba para que se vea el estado actual.
  const rolesAsignables = ROLES.filter((r) => puedeAsignarRol(callerRoles, r.value))
  const rolesVisibles = (() => {
    if (!rolActual) return rolesAsignables
    // Si el rol actual no está en la lista de asignables (ej. SuperAdmin, o un
    // rol superior al del caller), lo agregamos arriba para verlo pero se rendera
    // deshabilitado por el gate.
    if (rolActual === "SuperAdmin" && !rolesAsignables.some((r) => r.value === "SuperAdmin")) {
      return [ROL_SUPERADMIN, ...rolesAsignables]
    }
    if (!rolesAsignables.some((r) => r.value === rolActual)) {
      const rolFuera = ROLES.find((r) => r.value === rolActual)
        ?? (rolActual === "SuperAdmin" ? ROL_SUPERADMIN : null)
      if (rolFuera) return [rolFuera, ...rolesAsignables]
    }
    return rolesAsignables
  })()

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

      {esSelf && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            No podés editar tu propio rol. Pedile a otro administrador que lo haga.
          </span>
        </div>
      )}
      {!esSelf && !puedeEditar && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            No podés editar el rol de este usuario porque tiene un rol igual o superior al tuyo.
          </span>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4" /> Rol actualizado correctamente
        </div>
      )}

      <div className="space-y-2">
        {rolesVisibles.map((r) => {
          const asignable = puedeEditar && puedeAsignarRol(callerRoles, r.value)
          const activo = rolSeleccionado === r.value
          const readonly = !asignable
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => { if (asignable) setRolSeleccionado(r.value) }}
              disabled={readonly}
              className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                activo
                  ? "border-blue-500 bg-blue-50"
                  : readonly
                    ? "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
                    : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
              title={readonly ? "No podés asignar este rol." : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{r.label}</span>
                {activo && <Check className="h-4 w-4 text-blue-600" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{r.descripcion}</p>
            </button>
          )
        })}
      </div>

      <Button
        size="sm"
        className="gap-1.5"
        onClick={handleSave}
        disabled={
          setRol.isPending
          || rolSeleccionado === rolActual
          || !puedeEditar
          || !rolSeleccionado
          || !puedeAsignarRol(callerRoles, rolSeleccionado)
        }
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
