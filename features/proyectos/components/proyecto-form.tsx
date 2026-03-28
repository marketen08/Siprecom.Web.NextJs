"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { proyectoSchema, type ProyectoFormValues } from "../schema"
import { ESTADO_PROYECTO, type Proyecto } from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  const form = useForm<ProyectoFormValues>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      clienteId: defaultValues?.clienteId ?? "",
      contratistaId: defaultValues?.contratistaId ?? "",
      estado: defaultValues?.estado ?? 1,
      observaciones: defaultValues?.observaciones ?? "",
      proyectoPlantillaId: defaultValues?.id ? undefined : "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del proyecto" disabled={isPending} {...field} />
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
                    <SelectValue placeholder="Seleccioná un estado" />
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
          name="clienteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Cliente</FormLabel>
              <FormControl>
                <Input placeholder="ID del cliente" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contratistaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID Contratista</FormLabel>
              <FormControl>
                <Input placeholder="ID del contratista" disabled={isPending} {...field} />
              </FormControl>
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
                  placeholder="Observaciones del proyecto"
                  disabled={isPending}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  )
}
