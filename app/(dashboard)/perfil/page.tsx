"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyRound, User, FolderKey, Eye, EyeOff, Badge } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useUpdatePerfil } from "@/features/auth/api/use-update-perfil"
import { useChangePassword } from "@/features/auth/api/use-change-password"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { useGetMisFirmaRoles } from "@/features/auth/api/use-get-mis-firma-roles"

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
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
            {guardado && <span className="text-sm text-green-600">Guardado correctamente</span>}
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
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Contraseña actual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                {...form.register("currentPassword")}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                onClick={() => setShowCurrent(v => !v)}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.currentPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                {...form.register("newPassword")}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                onClick={() => setShowNew(v => !v)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.newPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                {...form.register("confirmPassword")}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                onClick={() => setShowConfirm(v => !v)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
            {guardado && <span className="text-sm text-green-600">Contraseña actualizada</span>}
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
      {/* Proyectos asignados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proyectos asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProyectos ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : !proyectos?.length ? (
            <p className="text-sm text-muted-foreground">No tenés proyectos asignados.</p>
          ) : (
            <ul className="space-y-2">
              {proyectos.map(p => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{p.nombre}</span>
                  {p.esActivo && (
                    <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                      Activo
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Roles de firma */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles de firma asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingFirmas ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : !firmaRoles?.length ? (
            <p className="text-sm text-muted-foreground">No tenés roles de firma asignados en ningún proyecto.</p>
          ) : (
            <ul className="space-y-3">
              {firmaRoles.map(item => (
                <li key={item.proyectoId}>
                  <p className="text-sm font-medium mb-1">{item.proyectoNombre}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.roles.map(rol => (
                      <span
                        key={rol}
                        className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 rounded px-2 py-0.5"
                      >
                        <Badge className="h-3 w-3" />
                        {rol}
                      </span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Gestioná tus datos personales y configuración de cuenta</p>
      </div>

      <Tabs defaultValue="datos">
        <TabsList>
          <TabsTrigger value="datos" className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Datos personales
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="flex items-center gap-1.5">
            <KeyRound className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="accesos" className="flex items-center gap-1.5">
            <FolderKey className="h-4 w-4" />
            Mis accesos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="datos" className="mt-4">
          <TabDatos />
        </TabsContent>
        <TabsContent value="seguridad" className="mt-4">
          <TabSeguridad />
        </TabsContent>
        <TabsContent value="accesos" className="mt-4">
          <TabAccesos />
        </TabsContent>
      </Tabs>
    </div>
  )
}
