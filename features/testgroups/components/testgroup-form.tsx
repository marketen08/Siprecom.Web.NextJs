"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import {
  testGroupCreateSchema,
  testGroupUpdateSchema,
  type TestGroupCreateFormValues,
  type TestGroupUpdateFormValues,
} from "../schema"
import type { TestGroup } from "../types"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { TIPO_CERTIFICADO_LABEL } from "@/features/certificados/types"

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

interface Props {
  mode: "create" | "edit"
  defaultValues?: Partial<TestGroup>
  onSubmit: (
    values: TestGroupCreateFormValues | TestGroupUpdateFormValues,
  ) => void
  isPending: boolean
  onCancel: () => void
}

export function TestGroupForm({
  mode,
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: Props) {
  const { data: subSistemasData, isLoading: loadingSub } = useGetSubSistemasSelect()
  const { data: tiposData, isLoading: loadingTipos } = useGetElementosTiposSelect()

  const schema = mode === "create" ? testGroupCreateSchema : testGroupUpdateSchema

  const form = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      ...(mode === "create"
        ? { elementoTipoSinteticoId: defaultValues?.elementoTipoSinteticoId ?? "" }
        : {}),
      subSistemaId: defaultValues?.subSistemaId ?? "",
      codigo: defaultValues?.codigo ?? "",
      nombre: defaultValues?.nombre ?? "",
      descripcion: defaultValues?.descripcion ?? "",
    },
  })

  const tiposSinteticos = (tiposData?.data ?? []).filter((t) => t.esSintetico)

  // Tipo elegido — se usa para mostrar el aviso de "va a crear registro
  // de encabezado" cuando la planilla está configurada en el tipo sintético.
  const tipoElegidoId: string = form.watch("elementoTipoSinteticoId") ?? ""
  const tipoElegido = tiposSinteticos.find((t) => t.id === tipoElegidoId)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general
          </p>

          {mode === "create" && (
            <FormField
              control={form.control}
              name="elementoTipoSinteticoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo sintético del pack</FormLabel>
                  <Select
                    disabled={isPending || loadingTipos}
                    value={field.value ?? ""}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingTipos ? "Cargando..." : "Seleccioná el tipo"
                          }
                        >
                          {tipoElegido
                            ? `${tipoElegido.nombre}${
                                tipoElegido.certificadoQueAlimenta
                                  ? ` · ${TIPO_CERTIFICADO_LABEL[tipoElegido.certificadoQueAlimenta]}`
                                  : ""
                              }`
                            : loadingTipos
                              ? "Cargando..."
                              : "Seleccioná el tipo"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiposSinteticos.length === 0 && !loadingTipos && (
                        <SelectItem value="__empty__" disabled>
                          No hay tipos sintéticos cargados. Creá uno en
                          Configuración → Tipos de elemento.
                        </SelectItem>
                      )}
                      {tiposSinteticos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nombre}
                          {t.certificadoQueAlimenta
                            ? ` · ${TIPO_CERTIFICADO_LABEL[t.certificadoQueAlimenta]}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="subSistemaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subsistema</FormLabel>
                <Select
                  disabled={isPending || loadingSub}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingSub ? "Cargando..." : "Seleccioná un subsistema"
                        }
                      >
                        {(() => {
                          const s = subSistemasData?.data.find((x) => x.id === field.value)
                          return s
                            ? `${s.codigo} — ${s.nombre}`
                            : loadingSub
                              ? "Cargando..."
                              : "Seleccioná un subsistema"
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subSistemasData?.data.map((s) => (
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

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: TP-001" disabled={isPending} {...field} />
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
                    <Input placeholder="Nombre descriptivo" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas"
                    disabled={isPending}
                    rows={2}
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {tipoElegido?.planillaEncabezadoId && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
            Al guardar, este pack va a crear un registro de encabezado usando la
            planilla asignada al tipo. Después vas a poder completarlo desde la
            vista del pack.
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-900 hover:bg-blue-800"
          >
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
