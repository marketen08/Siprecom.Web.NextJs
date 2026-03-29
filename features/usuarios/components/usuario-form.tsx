"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { usuarioSchema, type UsuarioFormValues } from "../schema"
import type { Usuario } from "../types"

import { useGetProyectosSelect } from "@/features/proyectos/api/use-get-proyectos-select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

interface UsuarioFormProps {
  defaultValues?: Partial<Usuario>
  onSubmit: (values: UsuarioFormValues) => void
  isPending: boolean
  onCancel: () => void
}

const NONE = "__none__"

export function UsuarioForm({ defaultValues, onSubmit, isPending, onCancel }: UsuarioFormProps) {
  const { data: proyectosData, isLoading: loadingProyectos } = useGetProyectosSelect()
  const proyectos = (proyectosData as any)?.data ?? []

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      apellido: defaultValues?.apellido ?? "",
      proyectoId: defaultValues?.proyectoId ?? "",
    },
  })

  const handleSubmit = (values: UsuarioFormValues) => {
    onSubmit({
      ...values,
      proyectoId: values.proyectoId === NONE ? undefined : values.proyectoId || undefined,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">

        {/* Datos personales */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Datos personales
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apellido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Pérez" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Asignaciones */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Asignaciones
          </p>

          <FormField
            control={form.control}
            name="proyectoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proyecto activo</FormLabel>
                <Select
                  disabled={isPending || loadingProyectos}
                  value={field.value || NONE}
                  onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin proyecto">
                        {proyectos.find((p: any) => p.id === field.value)?.nombre ?? "Sin proyecto"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin proyecto</SelectItem>
                    {proyectos.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1 bg-blue-900 hover:bg-blue-800">
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">
            Cancelar
          </Button>
        </div>

      </form>
    </Form>
  )
}
