"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { elementoTipoSchema, type ElementoTipoFormValues } from "../schema"
import {
  FAMILIA_METADATA_TG,
  FAMILIA_METADATA_TG_LABEL,
  type ElementoTipo,
} from "../types"
import {
  TIPO_CERTIFICADO,
  TIPO_CERTIFICADO_LABEL,
  type TipoCertificado,
} from "@/features/certificados/types"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"

import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
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

interface ElementoTipoFormProps {
  defaultValues?: Partial<ElementoTipo>
  onSubmit: (values: ElementoTipoFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function ElementoTipoForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: ElementoTipoFormProps) {
  const { data: especialidadesData, isLoading: cargandoEsp } = useGetEspecialidades()
  const especialidadOpts = (especialidadesData?.data ?? []).map((e) => ({
    value: e.id,
    label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre,
  }))

  const form = useForm<ElementoTipoFormValues>({
    resolver: zodResolver(elementoTipoSchema),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      especialidadId: defaultValues?.especialidadId ?? "",
      horasAdicionalesDefault: defaultValues?.horasAdicionalesDefault ?? 0,
      impactoFactorDefault: defaultValues?.impactoFactorDefault ?? 1,
      permiteAgruparEnTestPack: defaultValues?.permiteAgruparEnTestPack ?? false,
      permiteAgruparEnBasicFunction: defaultValues?.permiteAgruparEnBasicFunction ?? false,
      esSintetico: defaultValues?.esSintetico ?? false,
      certificadoQueAlimenta: defaultValues?.certificadoQueAlimenta ?? null,
      familiaMetadataTG: defaultValues?.familiaMetadataTG ?? FAMILIA_METADATA_TG.NINGUNA,
    },
  })

  const esSintetico = form.watch("esSintetico")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* Información general */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

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
            name="especialidadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialidad</FormLabel>
                <FormControl>
                  <Combobox
                    options={especialidadOpts}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder={cargandoEsp ? "Cargando..." : "Seleccionar especialidad"}
                    searchPlaceholder="Buscar..."
                    emptyMessage="No hay especialidades. Cárgalas en Configuración → Especialidades."
                    disabled={isPending || cargandoEsp}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Valores por defecto */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Valores por defecto
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="horasAdicionalesDefault"
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
              name="impactoFactorDefault"
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
        </div>

        <Separator />

        {/* Agrupamiento por defecto (paquetes de prueba) */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agrupamiento por defecto (paquetes de prueba)
          </p>
          <p className="text-xs text-muted-foreground">
            Cada elemento de este tipo hereda estos flags. Se puede sobreescribir por elemento en su form.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="permiteAgruparEnTestPack"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agrupable en Pressure Test Pack</FormLabel>
                  <Select
                    disabled={isPending}
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => field.onChange(v === "true")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{field.value ? "Sí" : "No"}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permiteAgruparEnBasicFunction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agrupable en Basic Function</FormLabel>
                  <Select
                    disabled={isPending}
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => field.onChange(v === "true")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{field.value ? "Sí" : "No"}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Sí</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Test Groups — elemento sintético (rediseño 2026-07) */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Test Groups — elemento sintético
          </p>
          <p className="text-xs text-muted-foreground">
            Marcá este tipo como sintético si su rol es portar las tareas de un
            paquete de pruebas (no se instancia sobre elementos físicos). Un
            TestGroup elige uno de estos tipos al crearse.
          </p>

          <FormField
            control={form.control}
            name="esSintetico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Es tipo sintético de TestGroup?</FormLabel>
                <Select
                  disabled={isPending}
                  value={field.value ? "true" : "false"}
                  onValueChange={(v) => {
                    const activo = v === "true"
                    field.onChange(activo)
                    if (!activo) {
                      // Al apagar sintético, blanqueamos los campos dependientes
                      // para no dejar valores contradictorios guardados.
                      form.setValue("certificadoQueAlimenta", null)
                      form.setValue(
                        "familiaMetadataTG",
                        FAMILIA_METADATA_TG.NINGUNA,
                      )
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue>{field.value ? "Sí" : "No"}</SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Sí</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {esSintetico && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="certificadoQueAlimenta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificado que alimenta</FormLabel>
                    <Select
                      disabled={isPending}
                      value={
                        field.value == null ? "" : String(field.value)
                      }
                      onValueChange={(v) =>
                        field.onChange(
                          v === "" ? null : (Number(v) as TipoCertificado),
                        )
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {field.value == null
                              ? "Seleccionar..."
                              : TIPO_CERTIFICADO_LABEL[field.value]}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={String(TIPO_CERTIFICADO.RFC)}>
                          RFC
                        </SelectItem>
                        <SelectItem value={String(TIPO_CERTIFICADO.RFSU)}>
                          RFSU
                        </SelectItem>
                        <SelectItem value={String(TIPO_CERTIFICADO.AOC)}>
                          AOC
                        </SelectItem>
                        <SelectItem value={String(TIPO_CERTIFICADO.MC)}>
                          MC
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="familiaMetadataTG"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Familia de metadata del encabezado</FormLabel>
                    <Select
                      disabled={isPending}
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            {FAMILIA_METADATA_TG_LABEL[field.value]}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem
                          value={String(FAMILIA_METADATA_TG.NINGUNA)}
                        >
                          Ninguna
                        </SelectItem>
                        <SelectItem
                          value={String(FAMILIA_METADATA_TG.PRESSURE)}
                        >
                          Pressure (presión / fluido / P&amp;ID)
                        </SelectItem>
                        <SelectItem
                          value={String(FAMILIA_METADATA_TG.BASIC_FUNCTION)}
                        >
                          Basic Function (FTS / OTS / alcance)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
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
