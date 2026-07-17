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
import { useGetElementosTiposSelect } from "../api/use-get-elementostipos-select"

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
  const { data: tiposData } = useGetElementosTiposSelect()
  // Candidatos para el multi-select: todos los tipos físicos (no sintéticos)
  // con PermiteAgrupar=true. Excluye a este mismo tipo si es edit.
  const candidatosFisicos = (tiposData?.data ?? []).filter(
    (t) => !t.esSintetico && t.permiteAgrupar && t.id !== defaultValues?.id,
  )
  const especialidadOpts = (especialidadesData?.data ?? []).map((e) => ({
    value: e.id,
    label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre,
  }))

  const form = useForm<any>({
    resolver: zodResolver(elementoTipoSchema as any),
    defaultValues: {
      nombre: defaultValues?.nombre ?? "",
      especialidadId: defaultValues?.especialidadId ?? "",
      horasAdicionalesDefault: defaultValues?.horasAdicionalesDefault ?? 0,
      impactoFactorDefault: defaultValues?.impactoFactorDefault ?? 1,
      esSintetico: defaultValues?.esSintetico ?? false,
      certificadoQueAlimenta: defaultValues?.certificadoQueAlimenta ?? null,
      familiaMetadataTG: defaultValues?.familiaMetadataTG ?? FAMILIA_METADATA_TG.NINGUNA,
      permiteAgrupar: defaultValues?.permiteAgrupar ?? false,
      tiposFisicosPermitidosIds: defaultValues?.tiposFisicosPermitidosIds ?? [],
    },
  })

  const esSintetico = form.watch("esSintetico")
  const permiteAgrupar = form.watch("permiteAgrupar")

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

        {/* Agrupabilidad en TestGroups — sólo relevante para tipos físicos */}
        {!esSintetico && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Agrupabilidad en Test Packs
            </p>
            <p className="text-xs text-muted-foreground">
              Los Elementos de este tipo van a poder asignarse a un TestGroup
              (activá si son válvulas, bridas, spools, motores…).
            </p>

            <FormField
              control={form.control}
              name="permiteAgrupar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Los elementos de este tipo pueden formar parte de un pack?</FormLabel>
                  <Select
                    disabled={isPending}
                    value={field.value ? "true" : "false"}
                    onValueChange={(v) => {
                      const activo = v === "true"
                      field.onChange(activo)
                      // Excluyente: si prendo agrupar, apago sintético y sus campos derivados.
                      if (activo && form.getValues("esSintetico")) {
                        form.setValue("esSintetico", false)
                        form.setValue("certificadoQueAlimenta", null)
                        form.setValue("familiaMetadataTG", FAMILIA_METADATA_TG.NINGUNA)
                        form.setValue("tiposFisicosPermitidosIds", [])
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
          </div>
        )}

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
                <FormLabel>
                  ¿Es tipo sintético de TestGroup?
                  {permiteAgrupar && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      (bloqueado: el tipo está marcado como agrupable)
                    </span>
                  )}
                </FormLabel>
                <Select
                  disabled={isPending || permiteAgrupar}
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
                      form.setValue("tiposFisicosPermitidosIds", [])
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

          {esSintetico && (
            <FormField
              control={form.control}
              name="tiposFisicosPermitidosIds"
              render={({ field }) => {
                const selected: string[] = field.value ?? []
                const toggle = (id: string) => {
                  if (selected.includes(id)) {
                    field.onChange(selected.filter((x) => x !== id))
                  } else {
                    field.onChange([...selected, id])
                  }
                }
                return (
                  <FormItem>
                    <FormLabel>Tipos físicos permitidos</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Elegí qué tipos de elemento físico pueden entrar a un pack de este
                      tipo sintético. Dejar vacío = aceptar cualquier tipo con
                      &quot;Permite agrupar&quot; activo.
                    </p>
                    {candidatosFisicos.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No hay tipos físicos con &quot;Permite agrupar&quot; activo.
                        Marcá ese flag en cada tipo (Configuración → Tipos de elemento) para verlos acá.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-md p-3">
                        {candidatosFisicos.map((t) => {
                          const checked = selected.includes(t.id)
                          return (
                            <label
                              key={t.id}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                disabled={isPending}
                                checked={checked}
                                onChange={() => toggle(t.id)}
                                className="h-4 w-4"
                              />
                              <span>{t.nombre}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
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
