"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { campoSchema, type CampoFormValues } from "../schema"
import type { Campo } from "../types"
import { CAMPO_TIPO_DATO, type CampoTipoDato } from "@/features/planillas/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
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

interface CampoFormProps {
  defaultValues?: Partial<Campo>
  /**
   * Cantidad de planillas que usan este campo. Si > 0, se bloquea código y tipo de dato
   * porque cambiarlos rompe registros existentes / integraciones.
   */
  usoCount?: number
  onSubmit: (values: CampoFormValues) => void
  onCancel: () => void
  isPending: boolean
}

export function CampoForm({
  defaultValues,
  usoCount = 0,
  onSubmit,
  onCancel,
  isPending,
}: CampoFormProps) {
  const enUso = usoCount > 0

  const form = useForm<CampoFormValues>({
    resolver: zodResolver(campoSchema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? "",
      etiqueta: defaultValues?.etiqueta ?? "",
      tipoDato: (defaultValues?.tipoDato ?? 1) as CampoTipoDato,
      unidad: defaultValues?.unidad ?? "",
      descripcion: defaultValues?.descripcion ?? "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {enUso && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Este campo está usado en <strong>{usoCount}</strong> planilla{usoCount !== 1 ? "s" : ""}.
            No se puede cambiar <strong>código</strong> ni <strong>tipo de dato</strong> mientras esté en uso.
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="TEMP_ACEITE"
                    disabled={isPending || enUso}
                    className="font-mono"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Identificador técnico único. Usado en integraciones.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tipoDato"
            render={({ field }) => (
              <FormItem className="min-w-[180px]">
                <FormLabel>Tipo de dato *</FormLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v) as CampoTipoDato)}
                  disabled={isPending || enUso}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue>
                        {CAMPO_TIPO_DATO[field.value as CampoTipoDato] ?? ""}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(CAMPO_TIPO_DATO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="etiqueta"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiqueta *</FormLabel>
              <FormControl>
                <Input placeholder="Temperatura del aceite" disabled={isPending} {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                Texto que ve el usuario en formularios y PDF.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unidad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidad</FormLabel>
              <FormControl>
                <Input placeholder="°C" disabled={isPending} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas / ayuda para quien complete el campo"
                  rows={3}
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1 bg-blue-900 hover:bg-blue-800">
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
