"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { pendienteCreateSchema, type PendienteFormValues } from "../schema"
import { useGetPendienteCategorias, useGetPendienteTipos } from "../api/use-catalogos"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetSistemasSelect } from "@/features/sistemas/api/use-get-sistemas-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyectoUsuarios } from "@/features/proyectos/api/use-get-proyecto-usuarios"
import { PRIORIDAD } from "../types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Combobox } from "@/components/ui/combobox"
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

interface PendienteFormProps {
  defaultValues?: Partial<PendienteFormValues>
  onSubmit: (values: PendienteFormValues) => void
  isPending: boolean
  onCancel: () => void
}

const NONE = "__none__"

export function PendienteForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
}: PendienteFormProps) {
  const { data: perfil } = useGetPerfil()
  const { data: categoriasRaw } = useGetPendienteCategorias()
  const { data: tiposRaw } = useGetPendienteTipos()
  const { data: sistemasRaw } = useGetSistemasSelect()
  const { data: subSistemasRaw } = useGetSubSistemasSelect()
  const { data: usuariosRaw } = useGetProyectoUsuarios(perfil?.proyectoId ?? null)
  const { data: especialidadesRaw } = useGetEspecialidades()

  const categorias = categoriasRaw?.data ?? []
  const tipos = tiposRaw?.data ?? []
  const sistemas = sistemasRaw?.data ?? []
  const subSistemas = subSistemasRaw?.data ?? []
  const usuarios = usuariosRaw ?? []
  const especialidades = especialidadesRaw?.data ?? []

  const hoy = new Date()
  const en30dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)
  const fechaDefault = en30dias.toISOString().substring(0, 10)

  const form = useForm<PendienteFormValues>({
    resolver: zodResolver(pendienteCreateSchema),
    defaultValues: {
      categoriaId: defaultValues?.categoriaId ?? "",
      tipoId: defaultValues?.tipoId ?? "",
      responsableId: defaultValues?.responsableId ?? "",
      descripcion: defaultValues?.descripcion ?? "",
      prioridad: defaultValues?.prioridad ?? 2,
      fechaCierreEstimado: defaultValues?.fechaCierreEstimado ?? fechaDefault,
      subSistemaId: defaultValues?.subSistemaId ?? null,
      elementoId: defaultValues?.elementoId ?? null,
      especialidadId: defaultValues?.especialidadId ?? null,
      pid: defaultValues?.pid ?? null,
      circuito: defaultValues?.circuito ?? null,
    },
  })

  // Watch subsistema para filtrar elementos.
  const subSistemaIdActual = form.watch("subSistemaId")
  const { data: elementosRaw } = useGetElementos({
    page: 1,
    pageSize: 500,
    subSistemaId: subSistemaIdActual ?? undefined,
  })
  const elementos = elementosRaw?.data ?? []

  // Filtramos subsistemas por sistema (UI extra: select de sistema para acotar lista).
  const [sistemaId, setSistemaId] = useStateLike(defaultValues?.subSistemaId, subSistemas)
  const subSistemasFiltrados = useMemo(
    () => (sistemaId ? subSistemas.filter((ss) => ss.sistemaId === sistemaId) : subSistemas),
    [sistemas, subSistemas, sistemaId],
  )

  // Opciones para Combobox de elementos (búsqueda).
  const elementoOptions = useMemo(
    () => [
      { value: "", label: "Sin elemento asignado" },
      ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
    ],
    [elementos],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        {/* Datos principales */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Información principal
          </p>

          <FormField
            control={form.control}
            name="descripcion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describí el pendiente con detalle..."
                    rows={4}
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí categoría">
                          {categorias.find((c) => c.id === field.value)?.nombre ?? "Elegí categoría"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegí tipo">
                          {tipos.find((t) => t.id === field.value)?.tipo ?? "Elegí tipo"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.tipo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="prioridad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridad</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => v && field.onChange(Number(v))}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{PRIORIDAD[field.value] ?? "Prioridad"}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PRIORIDAD).map(([id, nombre]) => (
                        <SelectItem key={id} value={id}>{nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fechaCierreEstimado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cierre estimado</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="responsableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsable</FormLabel>
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignar a un usuario del proyecto">
                        {usuarios.find((u) => u.usuarioId === field.value)?.userName ?? "Asignar"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {usuarios.map((u) => (
                      <SelectItem key={u.usuarioId} value={u.usuarioId}>
                        {u.userName} — {u.email}
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

        {/* Localización (opcional) */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Localización (opcional)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel>Sistema</FormLabel>
              <Select value={sistemaId || NONE} onValueChange={(v) => setSistemaId(v === NONE ? "" : v)}>
                <SelectTrigger>
                  <SelectValue>
                    {sistemaId
                      ? sistemas.find((s) => s.id === sistemaId)?.nombre ?? "Sistema"
                      : "Todos"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Todos</SelectItem>
                  {sistemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              control={form.control}
              name="subSistemaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subsistema</FormLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? null : v)}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin subsistema">
                          {field.value
                            ? subSistemas.find((ss) => ss.id === field.value)?.nombre ?? "Subsistema"
                            : "Sin subsistema"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin subsistema</SelectItem>
                      {subSistemasFiltrados.map((ss) => (
                        <SelectItem key={ss.id} value={ss.id}>{ss.codigo} — {ss.nombre}</SelectItem>
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
            name="elementoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Elemento</FormLabel>
                <FormControl>
                  <Combobox
                    options={elementoOptions}
                    value={field.value ?? ""}
                    onChange={(v) => field.onChange(v || null)}
                    placeholder="Sin elemento asignado"
                    searchPlaceholder="Buscar elemento..."
                    emptyMessage="Sin resultados"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="especialidadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad</FormLabel>
                  <FormControl>
                    <Combobox
                      options={especialidades.map((e) => ({
                        value: e.id,
                        label: e.codigo ? `${e.codigo} — ${e.nombre}` : e.nombre,
                      }))}
                      value={field.value ?? ""}
                      onChange={(v) => field.onChange(v || null)}
                      placeholder="Seleccionar especialidad"
                      searchPlaceholder="Buscar..."
                      emptyMessage="No hay especialidades cargadas"
                      disabled={isPending}
                    />
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
                    <Input
                      disabled={isPending}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="circuito"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Circuito</FormLabel>
                <FormControl>
                  <Input
                    disabled={isPending}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="flex-1">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  )
}

// Mini-helper para state local del select de sistema (no afecta el formulario).
import { useState } from "react"
function useStateLike(
  initialSubSistemaId: string | null | undefined,
  subsistemas: Array<{ id: string; sistemaId: string }>,
) {
  const inferido = initialSubSistemaId
    ? subsistemas.find((ss) => ss.id === initialSubSistemaId)?.sistemaId ?? ""
    : ""
  const [val, setVal] = useState<string>(inferido)
  // Si llegan nuevos subsistemas y todavía no había inferencia, intentamos inferir de nuevo.
  useEffect(() => {
    if (!val && initialSubSistemaId) {
      const ss = subsistemas.find((s) => s.id === initialSubSistemaId)
      if (ss?.sistemaId) setVal(ss.sistemaId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsistemas.length, initialSubSistemaId])
  return [val, setVal] as const
}
