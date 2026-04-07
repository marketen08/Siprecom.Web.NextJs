"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, Loader2, Search, X, FolderOpen } from "lucide-react"

import { useCreateUsuario } from "../api/use-create-usuario"
import { useGetProyectos } from "@/features/proyectos/api/use-get-proyectos"
import { apiClient } from "@/lib/api-client"

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

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(1, "Requerido"),
}).refine(d => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
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

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function NewUsuarioSheet({ open, onClose }: Props) {
  const create = useCreateUsuario()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [proyecto, setProyecto] = useState<{ id: string; nombre: string } | null>(null)
  const [errorProyecto, setErrorProyecto] = useState("")

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })

  async function onSubmit(values: FormValues) {
    if (!proyecto) {
      setErrorProyecto("Seleccioná un proyecto")
      return
    }
    setErrorProyecto("")

    const result = await create.mutateAsync({ email: values.email, password: values.password })
    const userId = (result as any)?.userId
    if (userId) {
      await apiClient.post(`/api/usuarios/${userId}/proyectos`, { proyectoId: proyecto.id })
    }

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
            Creá una cuenta nueva y asignale un proyecto.
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

          {/* Contraseña */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                {...form.register("password")}
                className="pr-10"
                disabled={create.isPending}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          {/* Confirmar */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repetí la contraseña"
                {...form.register("confirmPassword")}
                className="pr-10"
                disabled={create.isPending}
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

          {create.isError && (
            <p className="text-sm text-destructive">
              {(create.error as any)?.message ?? "Error al crear el usuario"}
            </p>
          )}

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
