"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { proyectoSchema, type ProyectoFormValues } from "../schema"
import { ESTADO_PROYECTO, type Proyecto } from "../types"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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

interface ProyectoFormProps {
  defaultValues?: Partial<Proyecto>
  onSubmit: (values: ProyectoFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function ProyectoForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: ProyectoFormProps) {
  const { data: clientesData, isLoading: loadingClientes } = useGetClientesSelect()

  const form = useForm<ProyectoFormValues>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      clienteId: defaultValues?.clienteId ?? "",
      contratistaId: defaultValues?.contratistaId ?? "",
      estado: defaultValues?.estado ?? 1,
      observaciones: defaultValues?.observaciones ?? "",
      proyectoPlantillaId: "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Sección: Información general */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del proyecto</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Proyecto Sur 2025"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select
                  disabled={isPending}
                  onValueChange={(v) => v && field.onChange(parseInt(v, 10))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná un estado">
                        {ESTADO_PROYECTO[field.value as keyof typeof ESTADO_PROYECTO] ?? "Seleccioná un estado"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ESTADO_PROYECTO).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas o comentarios del proyecto..."
                    disabled={isPending}
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Sección: Partes involucradas */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Partes involucradas
          </p>

          <FormField
            control={form.control}
            name="clienteId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  disabled={isPending || loadingClientes}
                  onValueChange={(v) => v && field.onChange(v)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingClientes ? "Cargando clientes..." : "Seleccioná un cliente"}>
                        {clientesData?.clientes.find((c) => c.id === field.value)?.nombre
                          ?? (loadingClientes ? "Cargando clientes..." : "Seleccioná un cliente")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientesData?.clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contratistaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contratista</FormLabel>
                <Select
                  disabled={isPending || loadingClientes}
                  onValueChange={(v) => v && field.onChange(v)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingClientes ? "Cargando contratistas..." : "Seleccioná un contratista"}>
                        {clientesData?.contratistas.find((c) => c.id === field.value)?.nombre
                          ?? (loadingClientes ? "Cargando contratistas..." : "Seleccioná un contratista")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientesData?.contratistas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1 bg-blue-900 hover:bg-blue-800">
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>

      </form>
    </Form>
  )
}
