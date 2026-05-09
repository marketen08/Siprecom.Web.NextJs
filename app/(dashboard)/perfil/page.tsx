"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyRound, User, FolderKey, Eye, EyeOff, CheckCircle2, Loader2, Save, PenLine, Trash2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { SignaturePad, type SignaturePadHandle } from "@/components/ui/signature-pad"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useUpdatePerfil } from "@/features/auth/api/use-update-perfil"
import { useChangePassword } from "@/features/auth/api/use-change-password"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { useGetMisFirmaRoles } from "@/features/auth/api/use-get-mis-firma-roles"
import { useGetMiFirma, useUploadMiFirma, useDeleteMiFirma } from "@/features/usuarios/api/use-mi-firma"

// ─── Schemas ─────────────────────────────────────────────────────────────────

const datosSchema = z.object({
  nombre: z.string().optional(),
  apellido: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Requerido"),
  newPassword: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(1, "Requerido"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type DatosForm = z.infer<typeof datosSchema>
type PasswordForm = z.infer<typeof passwordSchema>

// ─── Tabs config ─────────────────────────────────────────────────────────────

type Tab = "datos" | "seguridad" | "firma" | "accesos"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "datos",     label: "Datos personales", icon: <User      className="h-4 w-4" /> },
  { id: "seguridad", label: "Seguridad",         icon: <KeyRound  className="h-4 w-4" /> },
  { id: "firma",     label: "Firma",             icon: <PenLine   className="h-4 w-4" /> },
  { id: "accesos",   label: "Mis accesos",       icon: <FolderKey className="h-4 w-4" /> },
]

// ─── Tab Datos ────────────────────────────────────────────────────────────────

function TabDatos() {
  const { data: perfil } = useGetPerfil()
  const update = useUpdatePerfil()
  const [guardado, setGuardado] = useState(false)

  const form = useForm<DatosForm>({
    resolver: zodResolver(datosSchema),
    values: { nombre: perfil?.nombre ?? "", apellido: perfil?.apellido ?? "" },
  })

  async function onSubmit(values: DatosForm) {
    await update.mutateAsync(values)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Datos personales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {guardado && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4" /> Guardado correctamente
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={perfil?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Usuario</Label>
            <Input value={perfil?.userName ?? ""} disabled />
          </div>
        </div>
        <Separator />
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" {...form.register("nombre")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido">Apellido</Label>
              <Input id="apellido" {...form.register("apellido")} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={update.isPending} className="gap-1.5">
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {update.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
            {update.isError && <span className="text-sm text-destructive">Error al guardar</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Tab Seguridad ────────────────────────────────────────────────────────────

function TabSeguridad() {
  const changePassword = useChangePassword()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  })

  async function onSubmit(values: PasswordForm) {
    await changePassword.mutateAsync({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    })
    form.reset()
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cambiar contraseña</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
          {guardado && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4" /> Contraseña actualizada
            </div>
          )}

          {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => {
            const labels = { currentPassword: "Contraseña actual", newPassword: "Nueva contraseña", confirmPassword: "Confirmar contraseña" }
            const shows = { currentPassword: showCurrent, newPassword: showNew, confirmPassword: showConfirm }
            const toggles = { currentPassword: () => setShowCurrent(v => !v), newPassword: () => setShowNew(v => !v), confirmPassword: () => setShowConfirm(v => !v) }
            return (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field}>{labels[field]}</Label>
                <div className="relative">
                  <Input
                    id={field}
                    type={shows[field] ? "text" : "password"}
                    {...form.register(field)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                    onClick={toggles[field]}
                  >
                    {shows[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.formState.errors[field] && (
                  <p className="text-xs text-destructive">{form.formState.errors[field]?.message}</p>
                )}
              </div>
            )
          })}

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={changePassword.isPending} className="gap-1.5">
              {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {changePassword.isPending ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
            {changePassword.isError && (
              <span className="text-sm text-destructive">Contraseña actual incorrecta</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Tab Accesos ──────────────────────────────────────────────────────────────

function TabAccesos() {
  const { data: proyectos, isLoading: loadingProyectos } = useGetMisProyectos()
  const { data: firmaRoles, isLoading: loadingFirmas } = useGetMisFirmaRoles()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proyectos asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProyectos ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : !proyectos?.length ? (
            <p className="text-sm text-muted-foreground">No tenés proyectos asignados.</p>
          ) : (
            <ul className="space-y-2">
              {proyectos.map(p => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{p.nombre}</span>
                  {p.esActivo && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Activo
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles de firma asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFirmas ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : !firmaRoles?.length ? (
            <p className="text-sm text-muted-foreground">No tenés roles de firma asignados en ningún proyecto.</p>
          ) : (
            <ul className="space-y-3">
              {firmaRoles.map(item => (
                <li key={item.proyectoId}>
                  <p className="text-sm font-medium mb-1.5">{item.proyectoNombre}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.roles.map(rol => (
                      <Badge key={rol} variant="secondary" className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-100">
                        {rol}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab Firma ────────────────────────────────────────────────────────────────

function TabFirma() {
  const { data: miFirma, isLoading } = useGetMiFirma()
  const upload = useUploadMiFirma()
  const remove = useDeleteMiFirma()
  const [padIsEmpty, setPadIsEmpty] = useState(true)
  const padRef = useRef<SignaturePadHandle | null>(null)

  const firmaUrl = miFirma?.data?.url ?? null

  async function handleGuardar() {
    const dataUrl = padRef.current?.getDataUrl()
    if (!dataUrl) return
    await upload.mutateAsync(dataUrl)
    padRef.current?.clear()
    setPadIsEmpty(true)
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar tu firma guardada? Tendrás que dibujarla la próxima vez que firmes.")) return
    await remove.mutateAsync()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="h-5 w-5" />
          Mi firma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Guardá tu firma para que se aplique automáticamente cada vez que firmes un registro.
          Podés cambiarla cuando quieras — los registros ya firmados conservan la firma original.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...
          </div>
        ) : firmaUrl ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Firma actual</Label>
              <div className="mt-1.5 rounded-md border bg-white p-3 max-w-sm">
                <img src={firmaUrl} alt="Mi firma" className="max-h-32 max-w-full object-contain mx-auto" />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs">Reemplazar firma</Label>
              <div className="mt-1.5 space-y-2">
                <SignaturePad ref={padRef} height={160} onChange={(empty) => setPadIsEmpty(empty)} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleGuardar}
                    disabled={padIsEmpty || upload.isPending}
                    className="gap-1.5"
                  >
                    {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Reemplazar firma
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEliminar}
                    disabled={remove.isPending}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Eliminar firma
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs">Dibujá tu firma</Label>
            <SignaturePad ref={padRef} height={160} onChange={(empty) => setPadIsEmpty(empty)} />
            <Button
              size="sm"
              onClick={handleGuardar}
              disabled={padIsEmpty || upload.isPending}
              className="gap-1.5"
            >
              {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar firma
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const [tab, setTab] = useState<Tab>("datos")

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Gestioná tus datos personales y configuración de cuenta</p>
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

      <div>
        {tab === "datos"     && <TabDatos />}
        {tab === "seguridad" && <TabSeguridad />}
        {tab === "firma"     && <TabFirma />}
        {tab === "accesos"   && <TabAccesos />}
      </div>
    </div>
  )
}
