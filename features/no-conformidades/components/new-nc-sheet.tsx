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
  /** Se llama con el id del informe creado, para abrir su detalle. */
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

  // El flag UsoCalidad existe en la base pero el API todavia no lo expone (el ABM
  // es del paso 6). Por ahora se ofrecen todos los grupos activos: el default de
  // la columna es true, asi que el resultado es el mismo.
  const gruposCalidad = grupos.data?.data ?? []

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
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Nuevo informe de calidad</SheetTitle>
          <SheetDescription>
            Nace en Evaluación: el área de seguimiento tiene que aceptarlo antes de que
            el área afectada empiece a trabajar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 p-4">
          {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

          <div>
            <Label>Tipo *</Label>
            <Select value={tipoId} onValueChange={(v) => setTipoId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná el tipo" />
              </SelectTrigger>
              <SelectContent>
                {(tipos.data?.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.codigo} — {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={300}
              placeholder="Resumen en una línea"
            />
          </div>

          <div>
            <Label>Severidad</Label>
            <Select value={severidad} onValueChange={(v) => setSeveridad(v ?? "")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Menor</SelectItem>
                <SelectItem value="2">Mayor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Área afectada *</Label>
            <Select value={grupoAfectadoId} onValueChange={(v) => setGrupoAfectadoId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Quién tiene que resolver" />
              </SelectTrigger>
              <SelectContent>
                {gruposCalidad.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Área de seguimiento *</Label>
            <Select value={grupoSeguimientoId} onValueChange={(v) => setGrupoSeguimientoId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Quién controla y valida" />
              </SelectTrigger>
              <SelectContent>
                {gruposCalidad.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {mismasAreas && (
              <p className="mt-1 text-xs text-destructive">
                El área de seguimiento debe ser distinta de la afectada: una ejecuta y la
                otra controla.
              </p>
            )}
          </div>

          <div>
            <Label>Motivo</Label>
            <Select value={motivoId} onValueChange={(v) => setMotivoId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {(motivos.data?.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Subsistema</Label>
            <Select value={subSistemaId} onValueChange={(v) => setSubSistemaId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {((subsistemas.data?.data ?? []) as { id: string; codigo: string; nombre: string }[]).map(
                  (s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.codigo} — {s.nombre}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {!subSistemaId && (
              <p className="mt-1 text-xs text-amber-700">
                Sin subsistema, el informe no bloquea la emisión de certificados.
              </p>
            )}
          </div>

          <div>
            <Label>Fecha de compromiso</Label>
            <Input
              type="date"
              value={fechaCompromiso}
              onChange={(e) => setFechaCompromiso(e.target.value)}
            />
          </div>

          <div>
            <Label>Descripción del hallazgo *</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Qué se detectó y en qué contexto."
            />
          </div>

          <div className="flex gap-2 pt-2">
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
