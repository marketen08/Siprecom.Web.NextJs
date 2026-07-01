"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { testGroupCreateSchema, testGroupUpdateSchema, type TestGroupCreateFormValues, type TestGroupUpdateFormValues } from "../schema"
import { METODO_PRUEBA, TIPO_PRUEBA_FUNCIONAL, TIPO_TEST_GROUP, type TestGroup, type TipoTestGroup } from "../types"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface Props {
  mode: "create" | "edit"
  tipo: TipoTestGroup
  defaultValues?: Partial<TestGroup>
  onSubmit: (values: TestGroupCreateFormValues | TestGroupUpdateFormValues) => void
  isPending: boolean
  onCancel: () => void
}

export function TestGroupForm({ mode, tipo, defaultValues, onSubmit, isPending, onCancel }: Props) {
  const { data: subSistemasData, isLoading: loadingSub } = useGetSubSistemasSelect()

  const schema = mode === "create" ? testGroupCreateSchema : testGroupUpdateSchema

  // React Hook Form quiere el mismo tipo para todo el ciclo. Usamos "any" acotado.
  const form = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      ...(mode === "create" ? { tipo } : {}),
      subSistemaId: defaultValues?.subSistemaId ?? "",
      codigo: defaultValues?.codigo ?? "",
      nombre: defaultValues?.nombre ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      presion: defaultValues?.presion ?? null,
      fluido: defaultValues?.fluido ?? "",
      pidReferencia: defaultValues?.pidReferencia ?? "",
      metodoPrueba: defaultValues?.metodoPrueba ?? null,
      limitesBateria: defaultValues?.limitesBateria ?? "",
      tipoPruebaFuncional: defaultValues?.tipoPruebaFuncional ?? null,
      alcanceFuncional: defaultValues?.alcanceFuncional ?? "",
    },
  })

  const isPressure = tipo === TIPO_TEST_GROUP.PRESSURE

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información general — {isPressure ? "Pressure Test Pack" : "Basic Function"}
          </p>

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
                      <SelectValue placeholder={loadingSub ? "Cargando..." : "Seleccioná un subsistema"}>
                        {(() => {
                          const s = subSistemasData?.data.find((x) => x.id === field.value)
                          return s ? `${s.codigo} — ${s.nombre}` : (loadingSub ? "Cargando..." : "Seleccioná un subsistema")
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subSistemasData?.data.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
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
                    <Input placeholder={isPressure ? "Ej: TP-001" : "Ej: BF-001"} disabled={isPending} {...field} />
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
                  <Textarea placeholder="Notas" disabled={isPending} rows={2} {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {isPressure ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Parámetros de prueba (Pressure)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="presion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presión (bar)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step={0.1}
                        min={0}
                        disabled={isPending}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metodoPrueba"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método</FormLabel>
                    <Select
                      disabled={isPending}
                      value={field.value == null ? "__none__" : String(field.value)}
                      onValueChange={(v) => field.onChange(!v || v === "__none__" ? null : parseInt(v, 10))}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        <SelectItem value={String(METODO_PRUEBA.HIDROSTATICA)}>Hidrostática</SelectItem>
                        <SelectItem value={String(METODO_PRUEBA.NEUMATICA)}>Neumática</SelectItem>
                        <SelectItem value={String(METODO_PRUEBA.VACIO)}>Vacío</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="fluido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fluido</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Agua, Nitrógeno" disabled={isPending} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pidReferencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>P&amp;ID referencia</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: PID-042" disabled={isPending} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="limitesBateria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Límites de batería</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción de los límites" disabled={isPending} rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Parámetros funcionales (Basic Function)
            </p>
            <FormField
              control={form.control}
              name="tipoPruebaFuncional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de prueba</FormLabel>
                  <Select
                    disabled={isPending}
                    value={field.value == null ? "__none__" : String(field.value)}
                    onValueChange={(v) => field.onChange(!v || v === "__none__" ? null : parseInt(v, 10))}
                  >
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      <SelectItem value={String(TIPO_PRUEBA_FUNCIONAL.FTS)}>FTS</SelectItem>
                      <SelectItem value={String(TIPO_PRUEBA_FUNCIONAL.OTS)}>OTS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alcanceFuncional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alcance funcional</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalle del alcance" disabled={isPending} rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

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
