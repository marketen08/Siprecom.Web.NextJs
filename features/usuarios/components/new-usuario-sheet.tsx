"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Search, X, FolderOpen, AlertTriangle, Mail, KeyRound } from "lucide-react"

import { useCreateUsuario } from "../api/use-create-usuario"
import { useGetProyectos } from "@/features/proyectos/api/use-get-proyectos"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
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

// ─── Combobox proyecto ────────────────────────────────────────────────────────

function ProyectoSelector({
  value, onChange, disabled,
}: {
  value: { id: string; nombre: string } | null
  onChange: (p: { id: string; nombre: string } | null) => void
  disabled?: boolean
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
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

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm font-medium truncate">{value.nombre}</span>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proyecto..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="pl-9"
          autoComplete="off"
          disabled={disabled}
        />
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
            <ul className="divide-y max-h-48 overflow-y-auto">
              {resultados.map((p: any) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                  onClick={() => { onChange({ id: p.id, nombre: p.nombre }); setSearch(""); setOpen(false) }}
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{p.nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
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
  const [proyecto, setProyecto] = useState<{ id: string; nombre: string } | null>(null)
  const [errorProyecto, setErrorProyecto] = useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", nombre: "", apellido: "", loginMethod: 0 },
  })

  const loginMethod = form.watch("loginMethod")

  async function onSubmit(values: FormValues) {
    if (!proyecto) {
      setErrorProyecto("Seleccioná un proyecto")
      return
    }
    setErrorProyecto("")

    // El backend crea el user (sin contraseña) + asigna el proyecto, y manda el
    // email de alta (invitación o bienvenida Microsoft) en una sola operación.
    await create.mutateAsync({
      email: values.email,
      loginMethod: values.loginMethod,
      nombre: values.nombre,
      apellido: values.apellido,
      proyectoId: proyecto.id,
    })

    form.reset()
    setProyecto(null)
    onClose()
  }

  function handleClose() {
    form.reset()
    setProyecto(null)
    setErrorProyecto("")
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
            <ProyectoSelector
              value={proyecto}
              onChange={setProyecto}
              disabled={create.isPending}
            />
            {errorProyecto && <p className="text-xs text-destructive">{errorProyecto}</p>}
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
