"use client"

import { useState } from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCreateNoConformidad } from "../api/use-no-conformidades"
import { useGetNcMotivos, useGetNcTipos } from "../api/use-catalogos"
import { useGetUsuariosGrupos } from "@/features/usuarios-grupos/api/use-usuarios-grupos"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Se llama con el id del informe creado, para navegar a su detalle. */
  onCreada?: (id: string) => void
  /** Cuando se escala desde un pendiente, queda vinculado como origen. */
  pendienteOrigenId?: string
  /** Valores heredados del pendiente al escalar. */
  defaults?: {
    titulo?: string
    subSistemaId?: string
    elementoId?: string
    especialidadId?: string
    descripcion?: string
  }
}

/**
 * Campo del formulario. El wrapper con `space-y-1.5` es lo que separa la
 * etiqueta del control — sin eso quedan pegados. Es la misma separación que usa
 * FilterField en la barra de filtros.
 */
function Campo({
  label,
  children,
  className,
  hint,
}: {
  label: string
  children: React.ReactNode
  className?: string
  hint?: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint}
    </div>
  )
}

export function NewNoConformidadSheet({
  open,
  onOpenChange,
  onCreada,
  pendienteOrigenId,
  defaults,
}: Props) {
  const tipos = useGetNcTipos()
  const motivos = useGetNcMotivos()
  const grupos = useGetUsuariosGrupos()
  const subsistemas = useGetSubSistemasSelect()
  const crear = useCreateNoConformidad()

  const [error, setError] = useState<string | null>(null)
  const [tipoId, setTipoId] = useState("")
  const [titulo, setTitulo] = useState(defaults?.titulo ?? "")
  const [severidad, setSeveridad] = useState("1")
  const [grupoAfectadoId, setGrupoAfectadoId] = useState("")
  const [grupoSeguimientoId, setGrupoSeguimientoId] = useState("")
  const [motivoId, setMotivoId] = useState("")
  const [subSistemaId, setSubSistemaId] = useState(defaults?.subSistemaId ?? "")
  const [fechaCompromiso, setFechaCompromiso] = useState("")
  const [descripcion, setDescripcion] = useState(defaults?.descripcion ?? "")

  const listaTipos = tipos.data?.data ?? []
  const listaMotivos = motivos.data?.data ?? []
  // El flag UsoCalidad existe en la base pero el API todavía no lo expone (el ABM
  // es del paso 6). Por ahora se ofrecen todos los grupos activos: el default de
  // la columna es true, así que el resultado es el mismo.
  const gruposCalidad = grupos.data?.data ?? []
  const listaSubsistemas = (subsistemas.data?.data ?? []) as {
    id: string
    codigo: string
    nombre: string
  }[]

  const mismasAreas =
    Boolean(grupoAfectadoId) && grupoAfectadoId === grupoSeguimientoId

  const puedeGuardar =
    Boolean(tipoId) &&
    titulo.trim().length > 0 &&
    Boolean(grupoAfectadoId) &&
    Boolean(grupoSeguimientoId) &&
    !mismasAreas &&
    descripcion.trim().length > 0 &&
    !crear.isPending

  const guardar = () => {
    setError(null)
    crear.mutate(
      {
        tipoId,
        titulo: titulo.trim(),
        severidad: Number(severidad),
        grupoAfectadoId,
        grupoSeguimientoId,
        motivoId: motivoId || undefined,
        subSistemaId: subSistemaId || undefined,
        elementoId: defaults?.elementoId || undefined,
        especialidadId: defaults?.especialidadId || undefined,
        fechaCompromiso: fechaCompromiso || undefined,
        descripcion: descripcion.trim(),
        pendienteOrigenId: pendienteOrigenId || undefined,
      },
      {
        onSuccess: (res) => {
          const id = (res as { data?: { id?: string } })?.data?.id
          if (id && onCreada) onCreada(id)
          else onOpenChange(false)
        },
        onError: (e: unknown) => {
          setError(
            (e as { body?: { message?: string } })?.body?.message ??
              (e as Error)?.message ??
              "No se pudo crear el informe.",
          )
        },
      },
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl!">
        <SheetHeader>
          <SheetTitle>Nuevo informe de calidad</SheetTitle>
          <SheetDescription>
            Nace en Evaluación: el área de seguimiento tiene que aceptarlo antes de que
            el área afectada empiece a trabajar.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4">
          {error && (
            <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
          )}

          {/* Dos columnas: la clasificación a la izquierda, el contexto a la
              derecha. Título y descripción cruzan ambas porque son texto largo. */}
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Campo label="Título *" className="sm:col-span-2">
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={300}
                placeholder="Resumen en una línea"
              />
            </Campo>

            <Campo label="Tipo *">
              <Select value={tipoId} onValueChange={(v) => setTipoId(v ?? "")}>
                <SelectTrigger className="w-full">
                  {/* Sin children, SelectValue muestra el value crudo — o sea el
                      GUID. Hay que resolver la etiqueta a mano. */}
                  <SelectValue>
                    {(() => {
                      const t = listaTipos.find((x) => x.id === tipoId)
                      return t ? `${t.codigo} — ${t.nombre}` : "Seleccioná el tipo"
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaTipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.codigo} — {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Severidad">
              <Select value={severidad} onValueChange={(v) => setSeveridad(v ?? "1")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{severidad === "2" ? "Mayor" : "Menor"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Menor</SelectItem>
                  <SelectItem value="2">Mayor</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Área afectada *">
              <Select
                value={grupoAfectadoId}
                onValueChange={(v) => setGrupoAfectadoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {gruposCalidad.find((g) => g.id === grupoAfectadoId)?.nombre ??
                      "Quién tiene que resolver"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {gruposCalidad.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              label="Área de seguimiento *"
              hint={
                mismasAreas ? (
                  <p className="text-xs text-destructive">
                    Debe ser distinta de la afectada: una ejecuta y la otra controla.
                  </p>
                ) : null
              }
            >
              <Select
                value={grupoSeguimientoId}
                onValueChange={(v) => setGrupoSeguimientoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {gruposCalidad.find((g) => g.id === grupoSeguimientoId)?.nombre ??
                      "Quién controla y valida"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {gruposCalidad.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Motivo">
              <Select value={motivoId} onValueChange={(v) => setMotivoId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {listaMotivos.find((m) => m.id === motivoId)?.nombre ?? "Opcional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaMotivos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Fecha de compromiso">
              <Input
                type="date"
                value={fechaCompromiso}
                onChange={(e) => setFechaCompromiso(e.target.value)}
              />
            </Campo>

            <Campo
              label="Subsistema"
              className="sm:col-span-2"
              hint={
                !subSistemaId ? (
                  <p className="text-xs text-amber-700">
                    Sin subsistema, el informe no bloquea la emisión de certificados.
                  </p>
                ) : null
              }
            >
              <Select
                value={subSistemaId}
                onValueChange={(v) => setSubSistemaId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(() => {
                      const s = listaSubsistemas.find((x) => x.id === subSistemaId)
                      return s ? `${s.codigo} — ${s.nombre}` : "Opcional"
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaSubsistemas.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.codigo} — {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Descripción del hallazgo *" className="sm:col-span-2">
              <Textarea
                rows={4}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Qué se detectó y en qué contexto."
              />
            </Campo>
          </div>

          <div className="flex gap-2 pt-5">
            <Button disabled={!puedeGuardar} onClick={guardar}>
              {crear.isPending ? "Creando…" : "Crear informe"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
