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
import { Combobox } from "@/components/ui/combobox"

import { useUpdateNoConformidad } from "../api/use-no-conformidades"
import { useGetNcMotivos } from "../api/use-catalogos"
import { useGetNcAreas } from "../api/use-nc-areas"
import type { NoConformidadDetalle } from "../types"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetElementos } from "@/features/elementos/api/use-get-elementos"

/**
 * Edición de los datos del informe: lo que describe el hallazgo, no lo que el
 * circuito fue produciendo.
 *
 * El contenido de las etapas —acción inmediata, investigación, eficacia— no se edita
 * acá: cada uno se carga en su paso, queda firmado por quien lo cargó, y permitir
 * reescribirlo después desde otra pantalla vaciaría de sentido esa firma.
 *
 * El tipo tampoco: una no conformidad no se convierte en oportunidad de mejora
 * cambiando un select. Si está mal el tipo, el informe se cancela y se abre el que
 * corresponde, que además deja el rastro de por qué.
 */
export function EditNoConformidadSheet({
  nc,
  open,
  onOpenChange,
}: {
  nc: NoConformidadDetalle
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const motivos = useGetNcMotivos()
  const areas = useGetNcAreas(open)
  const subsistemas = useGetSubSistemasSelect()
  const especialidades = useGetEspecialidades()
  const actualizar = useUpdateNoConformidad()

  const [error, setError] = useState<string | null>(null)
  const [titulo, setTitulo] = useState(nc.titulo)
  const [severidad, setSeveridad] = useState(String(nc.severidad))
  const [grupoAfectadoId, setGrupoAfectadoId] = useState(nc.grupoAfectadoId)
  const [grupoSeguimientoId, setGrupoSeguimientoId] = useState(nc.grupoSeguimientoId)
  const [motivoId, setMotivoId] = useState(nc.motivoId ?? "")
  const [subSistemaId, setSubSistemaId] = useState(nc.subSistemaId ?? "")
  const [especialidadId, setEspecialidadId] = useState(nc.especialidadId ?? "")
  const [elementoId, setElementoId] = useState(nc.elementoId ?? "")
  const [fechaCompromiso, setFechaCompromiso] = useState(nc.fechaCompromiso ?? "")
  const [descripcion, setDescripcion] = useState(nc.descripcion ?? "")

  const listaMotivos = motivos.data?.data ?? []
  const listaSubsistemas = (subsistemas.data?.data ?? []) as {
    id: string
    codigo: string
    nombre: string
  }[]
  const listaEspecialidades = especialidades.data?.data ?? []
  const areasAfectada = areas.data?.data?.afectada ?? []
  const areasSeguimiento = areas.data?.data?.seguimiento ?? []

  const { data: elementosRaw } = useGetElementos({
    page: 1,
    pageSize: 500,
    subSistemaId: subSistemaId || undefined,
    especialidadId: especialidadId || undefined,
  })
  const elementos = elementosRaw?.data ?? []

  // El elemento ya asignado va sí o sí, aunque el filtro lo deje afuera: si no, el
  // combo se ve vacío y parece que la edición lo borró.
  const elementoOptions = [
    { value: "", label: "Sin elemento" },
    ...elementos.map((e) => ({ value: e.id, label: `${e.tag} — ${e.nombre}` })),
  ]
  if (nc.elementoId && !elementos.some((e) => e.id === nc.elementoId))
    elementoOptions.push({ value: nc.elementoId, label: nc.elementoTag ?? nc.elementoId })

  const mismasAreas = Boolean(grupoAfectadoId) && grupoAfectadoId === grupoSeguimientoId
  const puedeGuardar =
    titulo.trim().length > 0 &&
    Boolean(grupoAfectadoId) &&
    Boolean(grupoSeguimientoId) &&
    !mismasAreas &&
    !actualizar.isPending

  async function guardar() {
    setError(null)
    try {
      await actualizar.mutateAsync({
        id: nc.id,
        data: {
          titulo: titulo.trim(),
          severidad: Number(severidad),
          grupoAfectadoId,
          grupoSeguimientoId,
          motivoId: motivoId || undefined,
          subSistemaId: subSistemaId || undefined,
          elementoId: elementoId || undefined,
          especialidadId: especialidadId || undefined,
          fechaCompromiso: fechaCompromiso || undefined,
          descripcion: descripcion.trim(),
        },
      })
      onOpenChange(false)
    } catch (e) {
      setError(
        (e as { body?: { message?: string } })?.body?.message ??
          (e as Error)?.message ??
          "No se pudo guardar.",
      )
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar informe {nc.codigoFormateado}</SheetTitle>
          <SheetDescription>
            Los datos del hallazgo. El contenido de cada etapa se edita en su paso.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Severidad</Label>
              <Select value={severidad} onValueChange={(v) => setSeveridad(v ?? "1")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{severidad === "2" ? "Mayor" : "Menor"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Menor</SelectItem>
                  <SelectItem value="2">Mayor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Motivo</Label>
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
            </div>

            <div className="space-y-1.5">
              <Label>Área afectada *</Label>
              <Select
                value={grupoAfectadoId}
                onValueChange={(v) => setGrupoAfectadoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {areasAfectada.find((g) => g.id === grupoAfectadoId)?.nombre ??
                      nc.grupoAfectadoNombre ??
                      "Elegir"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areasAfectada.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Área de seguimiento *</Label>
              <Select
                value={grupoSeguimientoId}
                onValueChange={(v) => setGrupoSeguimientoId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {areasSeguimiento.find((g) => g.id === grupoSeguimientoId)?.nombre ??
                      nc.grupoSeguimientoNombre ??
                      "Elegir"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {areasSeguimiento.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mismasAreas && (
                <p className="text-xs text-destructive">
                  Debe ser distinta de la afectada: una ejecuta y la otra controla.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Subsistema</Label>
              <Select value={subSistemaId} onValueChange={(v) => setSubSistemaId(v ?? "")}>
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
            </div>

            <div className="space-y-1.5">
              <Label>Especialidad</Label>
              <Select
                value={especialidadId}
                onValueChange={(v) => setEspecialidadId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {listaEspecialidades.find((e) => e.id === especialidadId)?.nombre ??
                      "Opcional"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {listaEspecialidades.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Elemento</Label>
              <Combobox
                options={elementoOptions}
                value={elementoId}
                onChange={(v) => {
                  setElementoId(v || "")
                  const elegido = elementos.find((e) => e.id === v)
                  if (elegido?.subSistemaId) setSubSistemaId(elegido.subSistemaId)
                  if (elegido?.elementoTipoEspecialidadId)
                    setEspecialidadId(elegido.elementoTipoEspecialidadId)
                }}
                placeholder="Opcional"
                searchPlaceholder="Buscar por TAG o nombre..."
                emptyMessage="Sin elementos"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Compromiso</Label>
              <Input
                type="date"
                value={fechaCompromiso}
                onChange={(e) => setFechaCompromiso(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Descripción del hallazgo</Label>
            <Textarea
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={guardar} disabled={!puedeGuardar} className="flex-1">
              {actualizar.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={actualizar.isPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
