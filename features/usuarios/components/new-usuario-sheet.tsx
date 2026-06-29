"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, AlertTriangle, Mail, KeyRound } from "lucide-react"

import { useCreateUsuario } from "../api/use-create-usuario"
import { useGetProyectosSelect } from "@/features/proyectos/api/use-get-proyectos-select"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// LoginMethod: 0 = Mail+contraseña (invitación), 1 = Microsoft.
const schema = z.object({
  email: z.string().email("Email inválido"),
  nombre: z.string().min(1, "Requerido").max(100),
  apellido: z.string().min(1, "Requerido").max(100),
  loginMethod: z.number().int().min(0).max(1),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

// ─── Selector de método de login ──────────────────────────────────────────────

function MetodoLoginSelector({
  value, onChange, disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const opciones = [
    { v: 0, label: "Mail + contraseña", desc: "Recibe una invitación para definir su contraseña", icon: KeyRound },
    { v: 1, label: "Microsoft", desc: "Ingresa con su cuenta de Microsoft (SSO)", icon: Mail },
  ]
  return (
    <div className="grid grid-cols-1 gap-2">
      {opciones.map((o) => {
        const Icon = o.icon
        const activo = value === o.v
        return (
          <button
            key={o.v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.v)}
            className={cn(
              "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors disabled:opacity-60",
              activo ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50",
            )}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", activo ? "text-blue-600" : "text-gray-400")} />
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", activo ? "text-blue-700" : "text-gray-700")}>{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function NewUsuarioSheet({ open, onClose }: Props) {
  const create = useCreateUsuario()
  const [proyectoId, setProyectoId] = useState("")
  const [errorProyecto, setErrorProyecto] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [errorEmpresa, setErrorEmpresa] = useState("")

  // Proyecto: todos los proyectos como opciones del combobox (búsqueda client-side).
  const { data: proyectosData, isLoading: proyectosLoading } = useGetProyectosSelect()
  const proyectoOptions = ((proyectosData as any)?.data ?? []).map(
    (p: { id: string; nombre: string }) => ({ value: p.id, label: p.nombre }),
  )

  // Empresa (cliente o contratista) a la que pertenece el usuario. Obligatorio.
  // Mismo patrón que la edición admin: contratistas con badge en el label.
  const { data: empresasData, isLoading: empresasLoading } = useGetClientesSelect()
  const empresaOptions = [
    ...(empresasData?.contratistas ?? []).map((c) => ({ value: c.id, label: `${c.nombre} (contratista)` })),
    ...(empresasData?.clientes ?? []).map((c) => ({ value: c.id, label: c.nombre })),
  ]

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", nombre: "", apellido: "", loginMethod: 0 },
  })

  const loginMethod = form.watch("loginMethod")

  async function onSubmit(values: FormValues) {
    // Validamos los selectores propios (proyecto + empresa) todos juntos, no por
    // pasos: react-hook-form ya valida email/nombre/apellido a la vez, así que el
    // usuario ve todos los faltantes de una.
    const faltaProyecto = !proyectoId
    const faltaEmpresa = !clienteId
    setErrorProyecto(faltaProyecto ? "Seleccioná un proyecto" : "")
    setErrorEmpresa(faltaEmpresa ? "Seleccioná la empresa" : "")
    if (faltaProyecto || faltaEmpresa) return

    // El backend crea el user (sin contraseña) + asigna el proyecto, y manda el
    // email de alta (invitación o bienvenida Microsoft) en una sola operación.
    await create.mutateAsync({
      email: values.email,
      loginMethod: values.loginMethod,
      nombre: values.nombre,
      apellido: values.apellido,
      proyectoId,
      clienteId,
    })

    form.reset()
    setProyectoId("")
    setClienteId("")
    onClose()
  }

  function handleClose() {
    form.reset()
    setProyectoId("")
    setErrorProyecto("")
    setClienteId("")
    setErrorEmpresa("")
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo usuario</SheetTitle>
          <SheetDescription>
            Creá la cuenta y asignale un proyecto. El usuario recibe un email para activarla.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 px-4 pb-6 space-y-4">

          {/* Proyecto */}
          <div className="space-y-1.5">
            <Label>Proyecto</Label>
            <Combobox
              options={proyectoOptions}
              value={proyectoId}
              onChange={(v) => { setProyectoId(v); setErrorProyecto("") }}
              placeholder={proyectosLoading ? "Cargando proyectos..." : "Seleccionar proyecto..."}
              searchPlaceholder="Buscar proyecto..."
              emptyMessage="Sin proyectos"
              disabled={create.isPending || proyectosLoading}
            />
            {errorProyecto && <p className="text-xs text-destructive">{errorProyecto}</p>}
          </div>

          {/* Empresa (cliente o contratista) */}
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Combobox
              options={empresaOptions}
              value={clienteId}
              onChange={(v) => { setClienteId(v); setErrorEmpresa("") }}
              placeholder={empresasLoading ? "Cargando empresas..." : "Seleccionar empresa..."}
              searchPlaceholder="Buscar empresa..."
              emptyMessage="Sin empresas"
              disabled={create.isPending || empresasLoading}
            />
            {errorEmpresa && <p className="text-xs text-destructive">{errorEmpresa}</p>}
          </div>

          <Separator />

          {/* Nombre y apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                placeholder="Juan"
                {...form.register("nombre")}
                disabled={create.isPending}
              />
              {form.formState.errors.nombre && (
                <p className="text-xs text-destructive">{form.formState.errors.nombre.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                placeholder="Pérez"
                {...form.register("apellido")}
                disabled={create.isPending}
              />
              {form.formState.errors.apellido && (
                <p className="text-xs text-destructive">{form.formState.errors.apellido.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              {...form.register("email")}
              disabled={create.isPending}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Método de login */}
          <div className="space-y-1.5">
            <Label>Método de ingreso</Label>
            <MetodoLoginSelector
              value={loginMethod}
              onChange={(v) => form.setValue("loginMethod", v)}
              disabled={create.isPending}
            />
          </div>

          {create.isError && (() => {
            const err = create.error as any
            // 409 Conflict del backend: el email pertenece a un user dado de baja.
            const conflict = err?.status === 409 && err?.body?.existingUserId
            if (conflict) {
              return (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
                    <p className="text-sm">
                      El email pertenece a <strong>{err.body.nombre} {err.body.apellido}</strong>,
                      que fue dado de baja. Para usar este email tenés que reactivarlo
                      o liberarlo (baja definitiva) desde su pantalla.
                    </p>
                  </div>
                  <Link
                    href={`/configuracion/usuarios/${err.body.existingUserId}`}
                    className="inline-flex items-center text-sm text-amber-800 underline hover:text-amber-900"
                    onClick={onClose}
                  >
                    Ir al usuario existente →
                  </Link>
                </div>
              )
            }
            return (
              <p className="text-sm text-destructive">
                {err?.message ?? "Error al crear el usuario"}
              </p>
            )
          })()}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={create.isPending} className="gap-1.5">
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {create.isPending ? "Creando..." : "Crear usuario"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose} disabled={create.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
