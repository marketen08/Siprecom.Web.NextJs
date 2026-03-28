"use client"

import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { elementoSchema, type ElementoFormValues } from "../schema"
import { PRIORIDAD, type Elemento } from "../types"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"

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

interface ElementoFormProps {
  defaultValues?: Partial<Elemento>
  onSubmit: (values: ElementoFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function ElementoForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: ElementoFormProps) {
  const { data: sistemasData, isLoading: loadingSistemas } = useGetSistemasSelect()
  const { data: subSistemasData, isLoading: loadingSubSistemas } = useGetSubSistemasSelect()
  const { data: tiposData, isLoading: loadingTipos } = useGetElementosTiposSelect()

  const form = useForm<ElementoFormValues>({
    resolver: zodResolver(elementoSchema),
    defaultValues: {
      tag: defaultValues?.tag ?? "",
      nombre: defaultValues?.nombre ?? "",
      elementoTipoId: defaultValues?.elementoTipoId ?? "",
      prioridad: defaultValues?.prioridad ?? 2,
      sistemaId: defaultValues?.sistemaId ?? "",
      subSistemaId: defaultValues?.subSistemaId ?? "",
      horasAdicionales: defaultValues?.horasAdicionales ?? 0,
      impactoFactor: defaultValues?.impactoFactor ?? 1,
      pid: defaultValues?.pid ?? "",
      testpack: defaultValues?.testpack ?? "",
      observaciones: defaultValues?.observaciones ?? "",
    },
  })

  const selectedSistemaId = useWatch({ control: form.control, name: "sistemaId" })

  const subSistemasFiltrados = subSistemasData?.data.filter(
    (ss) => !selectedSistemaId || ss.sistemaId === selectedSistemaId
  ) ?? []

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Clasificación */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Clasificación
          </p>

          <FormField
            control={form.control}
            name="sistemaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sistema</FormLabel>
                <Select
                  disabled={isPending || loadingSistemas}
                  onValueChange={(v) => {
                    if (v) {
                      field.onChange(v)
                      form.setValue("subSistemaId", "")
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSistemas ? "Cargando..." : "Seleccioná un sistema"}>
                        {sistemasData?.data.find((s) => s.id === field.value)?.nombre
                          ?? (loadingSistemas ? "Cargando..." : "Seleccioná un sistema")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sistemasData?.data.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.codigo} — {s.nombre}
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
            name="subSistemaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subsistema</FormLabel>
                <Select
                  disabled={isPending || loadingSubSistemas || !selectedSistemaId}
                  onValueChange={(v) => v && field.onChange(v)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedSistemaId ? "Seleccioná un sistema primero" : "Seleccioná un subsistema"}>
                        {subSistemasData?.data.find((s) => s.id === field.value)?.nombre
                          ?? (!selectedSistemaId ? "Seleccioná un sistema primero" : "Seleccioná un subsistema")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subSistemasFiltrados.map((ss) => (
                      <SelectItem key={ss.id} value={ss.id}>
                        {ss.codigo} — {ss.nombre}
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
            name="elementoTipoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de elemento</FormLabel>
                <Select
                  disabled={isPending || loadingTipos}
                  onValueChange={(v) => v && field.onChange(v)}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingTipos ? "Cargando..." : "Seleccioná un tipo"}>
                        {tiposData?.data.find((t) => t.id === field.value)?.nombre
                          ?? (loadingTipos ? "Cargando..." : "Seleccioná un tipo")}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {tiposData?.data.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nombre}
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
            name="prioridad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select
                  disabled={isPending}
                  onValueChange={(v) => v && field.onChange(parseInt(v, 10))}
                  value={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una prioridad">
                        {PRIORIDAD[field.value as keyof typeof PRIORIDAD] ?? "Seleccioná una prioridad"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(PRIORIDAD).map(([key, label]) => (
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
        </div>

        <Separator />

        {/* Identificación */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Identificación
          </p>

          <FormField
            control={form.control}
            name="tag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TAG</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: V-1001" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Válvula de control" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PID</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: P&ID-001" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="testpack"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Testpack</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: TP-001" disabled={isPending} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Parámetros */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Parámetros
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="horasAdicionales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horas adicionales</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      disabled={isPending}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="impactoFactor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Factor de impacto</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      disabled={isPending}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="observaciones"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observaciones</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas o comentarios..."
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
