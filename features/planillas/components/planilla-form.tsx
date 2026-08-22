"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { Info } from "lucide-react"

import { planillaSchema, type PlanillaFormValues } from "../schema"
import type { Planilla } from "../types"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import {
  applyServerErrorsToForm,
  PLANILLA_FIELD_MAP,
  type ServerValidationError,
} from "../lib/apply-server-errors"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

/** Valor sentinela para "Sin especialidad" en el Select — no se puede usar "" con shadcn/Base UI Select. */
const SIN_ESPECIALIDAD = "__none__"

interface PlanillaFormProps {
  defaultValues?: Partial<Planilla>
  onSubmit: (values: PlanillaFormValues) => void
  isPending: boolean
  onCancel: () => void
  /**
   * Errores de validación del backend (`field` en PascalCase + mensajes). Se mapean
   * al field del form y se muestran inline; lo que no matchee sale como banner.
   * Ver `PLANILLA_FIELD_MAP`.
   */
  serverErrors?: ServerValidationError[]
}

export function PlanillaForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  serverErrors,
}: PlanillaFormProps) {
  const form = useForm<PlanillaFormValues>({
    resolver: zodResolver(planillaSchema),
    defaultValues: {
      codigo: defaultValues?.codigo ?? "",
      nombre: defaultValues?.nombre ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      observaciones: defaultValues?.observaciones ?? "",
      version: defaultValues?.version ?? "1.0",
      requiereFirma: defaultValues?.requiereFirma ?? true,
      permiteAdjuntos: defaultValues?.permiteAdjuntos ?? true,
      // El checkbox se quitó del UI porque el flag no tiene efecto (dead code),
      // pero mantenemos el valor en el form para NO pisar el persistido a false
      // durante un update — el bool no nullable del DTO destino mapea el default
      // de C# (false) si no lo mandamos. Ver plan de cleanup futuro para eliminarlo.
      generaPdfFinal: defaultValues?.generaPdfFinal ?? true,
      orientacionPdf: defaultValues?.orientacionPdf ?? 0,
      modoCompacto: defaultValues?.modoCompacto ?? false,
      margenPagina: defaultValues?.margenPagina ?? 0,
      especialidadId: defaultValues?.especialidadId ?? null,
      esEncabezadoTG: defaultValues?.esEncabezadoTG ?? false,
    },
  })

  // Aplica los errores de validación del backend a los fields. El caso típico es
  // el código duplicado al crear: el mensaje aparece bajo "Código".
  useEffect(() => {
    applyServerErrorsToForm(form, serverErrors, PLANILLA_FIELD_MAP)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverErrors])

  const { data: especialidadesRaw } = useGetEspecialidades()
  const especialidades = especialidadesRaw?.data ?? []

  // Encabezado TG: la planilla no firma ni genera PDF propio — el PDF del pack
  // sale del certificado del TG (RFC/RFSU/AOC). Deshabilitamos los flags relacionados
  // y ocultamos el bloque de ajustes de PDF. El backend además hace guard.
  const esEncabezadoTG = !!form.watch("esEncabezadoTG")

  // Al guardar, si es encabezado forzamos los flags dependientes a false — el
  // backend hace el mismo guard, pero mandarlo consistente evita "el checkbox
  // decía true y quedó false" post-save.
  const handleSubmit = form.handleSubmit((values) => {
    if (values.esEncabezadoTG) {
      values.requiereFirma = false
      values.generaPdfFinal = false
      values.permiteAdjuntos = false
    }
    onSubmit(values)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PLA-001"
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
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versión</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1.0"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Inspección de transformador"
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
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descripción de la planilla..."
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
                    rows={2}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="especialidadId"
            render={({ field }) => {
              const currentValue = field.value ?? SIN_ESPECIALIDAD
              const especialidadSel = especialidades.find((e) => e.id === field.value)
              return (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <Select
                    value={currentValue}
                    onValueChange={(v) => field.onChange(v === SIN_ESPECIALIDAD ? null : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value
                            ? (especialidadSel?.nombre ?? "—")
                            : "Sin especialidad (aplica a todas)"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={SIN_ESPECIALIDAD}>
                        Sin especialidad (aplica a todas)
                      </SelectItem>
                      {especialidades.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )
            }}
          />

          <TooltipProvider delay={200}>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-1">
                Opciones
              </p>
              {/* Va primero: los demás flags dependen de este. */}
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    {...form.register("esEncabezadoTG")}
                    disabled={isPending}
                  />
                  Es planilla de encabezado (Test Pack)
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    Marca esta planilla como candidata al select "Planilla del
                    encabezado" del tipo de elemento sintético. Al activarlo se
                    deshabilitan Requiere firma, Permite adjuntos y las opciones
                    de PDF — el pack firma y emite PDF vía el certificado
                    (RFC/RFSU/AOC), y los adjuntos viven en las tareas del pack.
                  </TooltipContent>
                </Tooltip>
              </div>
              {esEncabezadoTG && (
                <p className="text-xs text-muted-foreground pl-6 -mt-1 mb-1">
                  El encabezado no firma, no acepta adjuntos ni genera PDF propio
                  — esos flags se ignoran mientras esté activo.
                </p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <label className={`flex items-center gap-2 ${esEncabezadoTG ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    {...form.register("requiereFirma")}
                    disabled={isPending || esEncabezadoTG}
                    checked={esEncabezadoTG ? false : undefined}
                  />
                  Requiere firma
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    Cuando está activo, los registros completados con esta planilla generan
                    slots de firma según la configuración del proyecto (o de la tarea, si
                    tiene override). Desactivalo para planillas que no requieran firma
                    incluso si el proyecto la exige — ej. checklists informales o de
                    seguimiento interno.
                  </TooltipContent>
                </Tooltip>
              </div>
              {/* "Permite adjuntos" removido de la UI — los adjuntos son ahora
                  aceptados siempre en cualquier planilla/proyecto. El campo del
                  form se mantiene registrado en el schema para no romper payloads
                  viejos pero no se muestra ni edita. */}

              {/* Opciones de PDF sólo si NO es encabezado — el pack emite PDF por el certificado. */}
              {!esEncabezadoTG && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={form.watch("orientacionPdf") === 1}
                      onChange={(e) => form.setValue("orientacionPdf", e.target.checked ? 1 : 0)}
                      disabled={isPending}
                    />
                    PDF horizontal (apaisado)
                  </label>

                  <div className="flex flex-col gap-2 pt-1">
                    <label className="flex items-start gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 mt-0.5"
                        checked={!!form.watch("modoCompacto")}
                        onChange={(e) => form.setValue("modoCompacto", e.target.checked)}
                        disabled={isPending}
                      />
                      <span>
                        Modo compacto
                        <span className="block text-xs text-muted-foreground">
                          Reduce paddings verticales, títulos de sección y sub-labels. Usá
                          cuando la planilla queda a pocos milímetros de entrar en 1 hoja.
                        </span>
                      </span>
                    </label>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm">Margen de página</label>
                      <select
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm max-w-xs"
                        value={form.watch("margenPagina") ?? 0}
                        onChange={(e) => form.setValue("margenPagina", Number(e.target.value) as 0 | 1 | 2)}
                        disabled={isPending}
                      >
                        <option value={0}>Normal (2 cm arriba, 1 cm abajo, 1.2 cm lados)</option>
                        <option value={1}>Estrecho (~1 cm arriba/lados, 0.7 cm abajo)</option>
                        <option value={2}>Ultra estrecho (~0.5 cm — al borde imprimible)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TooltipProvider>
        </div>

        {/* Errores del backend que no matchean ningún field conocido. Sin esto un
            error nuevo del servidor quedaría invisible. */}
        {form.formState.errors.root?.message && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {form.formState.errors.root.message}
          </div>
        )}

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
