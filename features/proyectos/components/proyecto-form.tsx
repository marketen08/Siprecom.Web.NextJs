"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { proyectoSchema, type ProyectoFormValues } from "../schema"
import { ESTADO_PROYECTO, type Proyecto } from "../types"
import { useGetClientesSelect } from "@/features/clientes/api/use-get-clientes-select"
import { useGetProyectosSelect } from "../api/use-get-proyectos-select"

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
  /** Si true, muestra la sección "Heredar de proyecto" + checkboxes. Default: false. */
  mostrarClonado?: boolean
}

export function ProyectoForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  mostrarClonado = false,
}: ProyectoFormProps) {
  const { data: clientesData, isLoading: loadingClientes } = useGetClientesSelect()
  const { data: proyectosData, isLoading: loadingProyectos } = useGetProyectosSelect()

  const form = useForm<ProyectoFormValues>({
    resolver: zodResolver(proyectoSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      clienteId: defaultValues?.clienteId ?? "",
      contratistaId: defaultValues?.contratistaId ?? "",
      estado: defaultValues?.estado ?? 1,
      observaciones: defaultValues?.observaciones ?? "",
      proyectoPlantillaId: "",
      clonar: {
        tareas: true,
        flags: true,
        firmas: true,
        acceso: true,
        estructura: false,
      },
    },
  })

  const plantillaId = form.watch("proyectoPlantillaId")
  const hayPlantilla = !!plantillaId && plantillaId.length > 0
  const proyectosLista = proyectosData?.data ?? []

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

        {mostrarClonado && (
          <>
            <Separator />
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Heredar configuración (opcional)
              </p>

              <FormField
                control={form.control}
                name="proyectoPlantillaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proyecto plantilla</FormLabel>
                    <Select
                      disabled={isPending || loadingProyectos}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Ninguno">
                            {field.value
                              ? proyectosLista.find((p) => p.id === field.value)?.nombre
                              : "Ninguno"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Ninguno</SelectItem>
                        {proyectosLista.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hayPlantilla && (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    Elegí qué se copia del proyecto plantilla al nuevo:
                  </p>
                  <ClonarCheckbox name="tareas" label="Tareas" form={form} disabled={isPending} />
                  <ClonarCheckbox name="flags" label="Configuración general (permisos, niveles secuenciales)" form={form} disabled={isPending} />
                  <ClonarCheckbox name="firmas" label="Configuración de firmas" form={form} disabled={isPending} />
                  <ClonarCheckbox name="acceso" label="Acceso de usuarios" form={form} disabled={isPending} />
                  <ClonarCheckbox name="estructura" label="Estructura (sistemas, subsistemas, elementos)" form={form} disabled={isPending} />
                </div>
              )}
            </div>
          </>
        )}

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

interface ClonarCheckboxProps {
  name: "tareas" | "flags" | "firmas" | "acceso" | "estructura"
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any
  disabled?: boolean
}

function ClonarCheckbox({ name, label, form, disabled }: ClonarCheckboxProps) {
  return (
    <FormField
      control={form.control}
      name={`clonar.${name}`}
      render={({ field }) => (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={field.value ?? false}
            onChange={(e) => field.onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>{label}</span>
        </label>
      )}
    />
  )
}
