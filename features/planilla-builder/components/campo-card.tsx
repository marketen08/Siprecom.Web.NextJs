"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Trash2, ChevronDown, ChevronUp, Plus, X } from "lucide-react"

import type { PlanillaCampoDetalle, CampoTipoDato, CampoListaRenderMode, PlanillaSeccion, AlineacionTexto } from "@/features/planillas/types"
import { CAMPO_TIPO_DATO, CAMPO_LISTA_RENDER_MODE_LABEL, CAMPO_TAMANO_OPCIONES, ALINEACION_TEXTO_LABEL } from "@/features/planillas/types"
import { useRemoveCampo } from "@/features/planillas/api/use-remove-campo"
import { useUpdateCampo } from "@/features/planillas/api/use-update-campo"
import { useUpdateCampoGlobal } from "@/features/campos/api/use-update-campo"
import { useCreateOpcion } from "@/features/campos/api/use-create-opcion"
import { useReorderOpciones } from "@/features/campos/api/use-reorder-opciones"
import { useDeleteOpcion } from "@/features/campos/api/use-delete-opcion"
import { CampoTablaEditor } from "./campo-tabla-editor"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog"
import { cn } from "@/lib/utils"

interface CampoCardProps {
  campo: PlanillaCampoDetalle
  planillaId: string
  /** Todas las secciones de la planilla (para el selector "mover de sección"). */
  secciones: PlanillaSeccion[]
  /** Todos los campos de la planilla (para calcular el orden al final de la sección destino). */
  allCampos: PlanillaCampoDetalle[]
  /** Vecino anterior en la sección (para reordenar arriba). null si es el primero. */
  previousCampo?: PlanillaCampoDetalle | null
  /** Vecino siguiente en la sección (para reordenar abajo). null si es el último. */
  nextCampo?: PlanillaCampoDetalle | null
}

export function CampoCard({ campo, planillaId, secciones, allCampos, previousCampo, nextCampo }: CampoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [newOpcionValor, setNewOpcionValor] = useState("")
  const [newOpcionEtiqueta, setNewOpcionEtiqueta] = useState("")
  const [addingOpcion, setAddingOpcion] = useState(false)

  const removeMutation = useRemoveCampo()
  const updateMutation = useUpdateCampo()
  const createOpcionMutation = useCreateOpcion()
  const reorderOpcionesMutation = useReorderOpciones()
  const deleteOpcionMutation = useDeleteOpcion()

  const tipoDatoLabel = CAMPO_TIPO_DATO[campo.campoTipoDato as CampoTipoDato] ?? "—"
  const isLista = campo.campoTipoDato === 5
  const isImagen = campo.campoTipoDato === 8
  const isTabla = campo.campoTipoDato === 9
  const isLabel = campo.campoTipoDato === 10
  const tablaEsMatriz = (campo.filas?.length ?? 0) > 0

  const updateCampoGlobal = useUpdateCampoGlobal()
  // El estilo del Label vive en el Campo global → update global (afecta todas las
  // planillas que usen este campo). Otros campos del Campo no aplican a un Label.
  const updateLabelStyle = (overrides: Partial<{ negrita: boolean; conBorde: boolean; fondoGris: boolean; alineacion: AlineacionTexto; sinPadding: boolean; sinMargen: boolean }>) => {
    updateCampoGlobal.mutate({
      id: campo.campoId,
      codigo: campo.campoCodigo ?? "",
      etiqueta: campo.campoEtiqueta ?? "",
      tipoDato: campo.campoTipoDato,
      unidad: campo.campoUnidad,
      negrita: campo.campoNegrita ?? false,
      conBorde: campo.campoConBorde ?? false,
      fondoGris: campo.campoFondoGris ?? false,
      alineacion: campo.campoAlineacion ?? 0,
      sinPadding: campo.campoSinPadding ?? false,
      sinMargen: campo.campoSinMargen ?? false,
      ...overrides,
    })
  }

  // Construye el payload de update reusando todos los valores actuales del campo, con overrides.
  const buildUpdatePayload = (overrides: Partial<{
    esObligatorio: boolean
    visible: boolean
    soloLectura: boolean
    valorDefault?: string
    renderMode: CampoListaRenderMode
    orden: number
    tamano: number
    planillaSeccionId?: string
    numeroFilas?: number | null
  }> = {}) => ({
    id: campo.id,
    planillaId,
    campoId: campo.campoId,
    planillaSeccionId: campo.planillaSeccionId,
    orden: campo.orden,
    esObligatorio: campo.esObligatorio,
    visible: campo.visible,
    soloLectura: campo.soloLectura,
    valorDefault: campo.valorDefault,
    renderMode: campo.renderMode,
    tamano: campo.tamano,
    numeroFilas: campo.numeroFilas ?? null,
    ...overrides,
  })

  const handleToggle = (field: "esObligatorio" | "visible" | "soloLectura", value: boolean) => {
    updateMutation.mutate(buildUpdatePayload({ [field]: value }))
  }

  const handleRenderModeChange = (value: CampoListaRenderMode) => {
    // Checklist (3) se renderiza siempre como tabla a ancho completo: forzamos
    // tamano=12 en el mismo update para que la config no quede inconsistente.
    updateMutation.mutate(
      buildUpdatePayload(value === 3 ? { renderMode: value, tamano: 12 } : { renderMode: value }),
    )
  }

  const handleTamanoChange = (n: number) => {
    const clamped = Math.max(1, Math.min(12, Math.floor(n)))
    updateMutation.mutate(buildUpdatePayload({ tamano: clamped }))
  }

  // Swap del orden con un vecino (previousCampo o nextCampo).
  // Como el index en DB no es UNIQUE, podemos hacer 2 updates seguidos sin colisión.
  const swapOrden = async (otro: PlanillaCampoDetalle) => {
    const ordenActual = campo.orden
    const ordenOtro = otro.orden
    await updateMutation.mutateAsync(buildUpdatePayload({ orden: ordenOtro }))
    await updateMutation.mutateAsync({
      id: otro.id,
      planillaId,
      campoId: otro.campoId,
      planillaSeccionId: otro.planillaSeccionId,
      orden: ordenActual,
      esObligatorio: otro.esObligatorio,
      visible: otro.visible,
      soloLectura: otro.soloLectura,
      valorDefault: otro.valorDefault,
      renderMode: otro.renderMode,
      tamano: otro.tamano,
      numeroFilas: otro.numeroFilas ?? null,
    })
  }

  const handleMoveUp = () => { if (previousCampo) swapOrden(previousCampo) }
  const handleMoveDown = () => { if (nextCampo) swapOrden(nextCampo) }

  // Valor del select de sección: "__none__" representa "Sin sección".
  const seccionValue = campo.planillaSeccionId ?? "__none__"

  // Mueve el campo a otra sección. Lo ubicamos al final de la sección destino
  // (max(orden)+1) para que no colisione el orden con campos ya presentes.
  const handleMoveToSeccion = (value: string) => {
    const destino = value === "__none__" ? undefined : value
    if (destino === campo.planillaSeccionId) return
    const enDestino = allCampos.filter((c) =>
      destino == null ? !c.planillaSeccionId : c.planillaSeccionId === destino
    )
    const nextOrden = enDestino.reduce((m, c) => Math.max(m, c.orden), 0) + 1
    updateMutation.mutate(buildUpdatePayload({ planillaSeccionId: destino, orden: nextOrden }))
  }

  // Reorder atómico vía endpoint bulk: el backend asigna orden = index+1 a todas las opciones.
  // Inmune a colisiones de orden previas (legacy o creación con length+1 tras un delete).
  const swapOpcionOrden = async (i: number, dir: -1 | 1) => {
    const opciones = [...campo.opciones].sort((a, b) => a.orden - b.orden)
    const j = i + dir
    if (j < 0 || j >= opciones.length) return
    const reordered = [...opciones]
    ;[reordered[i], reordered[j]] = [reordered[j], reordered[i]]
    await reorderOpcionesMutation.mutateAsync({
      campoId: campo.campoId,
      orderedIds: reordered.map((o) => o.id),
    })
  }

  const handleAddOpcion = () => {
    if (!newOpcionValor.trim() || !newOpcionEtiqueta.trim()) return
    createOpcionMutation.mutate(
      {
        campoId: campo.campoId,
        valor: newOpcionValor.trim(),
        etiqueta: newOpcionEtiqueta.trim(),
        // Usamos max(orden)+1 en vez de length+1 para evitar colisión cuando se borraron items intermedios.
        orden: campo.opciones.reduce((m, o) => Math.max(m, o.orden), 0) + 1,
      },
      {
        onSuccess: () => {
          setNewOpcionValor("")
          setNewOpcionEtiqueta("")
          setAddingOpcion(false)
        },
      }
    )
  }

  return (
    <div className={cn(
      "border rounded-lg bg-white transition-shadow",
      expanded ? "shadow-sm" : ""
    )}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{campo.campoEtiqueta}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono shrink-0">
              {campo.campoCodigo}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
              {tipoDatoLabel}
            </span>
            {campo.campoUnidad && (
              <span className="text-xs text-muted-foreground shrink-0">{campo.campoUnidad}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleMoveUp}
            disabled={!previousCampo || updateMutation.isPending}
            title="Mover arriba"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleMoveDown}
            disabled={!nextCampo || updateMutation.isPending}
            title="Mover abajo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Contraer" : "Expandir"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <ConfirmActionDialog
            trigger={<Trash2 className="h-4 w-4" />}
            triggerClassName="inline-flex items-center justify-center h-7 w-7 rounded-md text-destructive hover:bg-accent transition-colors"
            title="¿Quitar campo?"
            description={
              <>
                Se quitará <strong>{campo.campoEtiqueta}</strong> de esta planilla. El campo global no se elimina.
              </>
            }
            confirmText="Quitar"
            pendingText="Quitando..."
            variant="destructive"
            onConfirm={() => removeMutation.mutateAsync({ planillaId, campoId: campo.id })}
          />
        </div>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3 bg-gray-50 rounded-b-lg">
          {/* Mover de sección */}
          {secciones.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Sección</Label>
              <Select
                value={seccionValue}
                onValueChange={(v) => handleMoveToSeccion(v ?? "__none__")}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue>
                    {seccionValue === "__none__"
                      ? "Sin sección"
                      : secciones.find((s) => s.id === seccionValue)?.nombre ?? "Sin sección"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin sección</SelectItem>
                  {secciones.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Al mover, el campo se ubica al final de la sección destino.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={campo.esObligatorio}
                onChange={(e) => handleToggle("esObligatorio", e.target.checked)}
                disabled={updateMutation.isPending}
              />
              <span className="text-xs">Obligatorio</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={campo.visible}
                onChange={(e) => handleToggle("visible", e.target.checked)}
                disabled={updateMutation.isPending}
              />
              <span className="text-xs">Visible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={campo.soloLectura}
                onChange={(e) => handleToggle("soloLectura", e.target.checked)}
                disabled={updateMutation.isPending}
              />
              <span className="text-xs">Solo lectura</span>
            </label>
          </div>

          {/* Valor por defecto — no aplica a tipo Imagen, Tabla ni Label */}
          {!isImagen && !isTabla && !isLabel && (
            <div>
              <Label className="text-xs">Valor por defecto</Label>
              {isLista ? (
                // Para Lista el default es UNA de las opciones, no texto libre.
                <Select
                  value={campo.valorDefault ?? "__none__"}
                  onValueChange={(v) =>
                    updateMutation.mutate(
                      buildUpdatePayload({ valorDefault: v && v !== "__none__" ? v : undefined }),
                    )
                  }
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="mt-1 h-7 text-sm">
                    <SelectValue>
                      {(() => {
                        if (!campo.valorDefault) return "— Sin valor por defecto —"
                        const op = campo.opciones?.find((o) => o.valor === campo.valorDefault)
                        return op ? op.etiqueta : campo.valorDefault
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin valor por defecto —</SelectItem>
                    {campo.opciones?.map((o) => (
                      <SelectItem key={o.id} value={o.valor}>{o.etiqueta}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="mt-1 h-7 text-sm"
                  defaultValue={campo.valorDefault ?? ""}
                  placeholder="—"
                  onBlur={(e) => {
                    if (e.target.value !== (campo.valorDefault ?? "")) {
                      updateMutation.mutate(buildUpdatePayload({ valorDefault: e.target.value || undefined }))
                    }
                  }}
                  disabled={updateMutation.isPending}
                />
              )}
            </div>
          )}

          {/* Ancho (siempre): selector predefinido + input numérico para Personalizado */}
          <div className="space-y-1">
            <Label className="text-xs">Ancho del campo</Label>
            <div className="flex items-center gap-2">
              <Select
                value={(() => {
                  const match = CAMPO_TAMANO_OPCIONES.find((o) => o.value === campo.tamano)
                  return String(match?.value ?? -1)
                })()}
                onValueChange={(v) => {
                  const num = Number(v)
                  if (num === -1) {
                    // Personalizado: no aplicamos cambio aún, solo cambia la UI a mostrar input
                    handleTamanoChange(campo.tamano || 4)
                  } else {
                    handleTamanoChange(num)
                  }
                }}
                disabled={updateMutation.isPending || campo.renderMode === 3}
              >
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue>
                    {(() => {
                      const match = CAMPO_TAMANO_OPCIONES.find((o) => o.value === campo.tamano)
                      return match ? match.label : `Personalizado (${campo.tamano})`
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CAMPO_TAMANO_OPCIONES.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!CAMPO_TAMANO_OPCIONES.some((o) => o.value === campo.tamano) && (
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={campo.tamano}
                  className="h-8 w-20 text-sm"
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n)) handleTamanoChange(n)
                  }}
                  disabled={updateMutation.isPending}
                />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              En grilla de 12. Los campos consecutivos se agrupan automáticamente.
            </p>
          </div>

          {/* Imagen (solo para tipo Imagen) — preview de la imagen global del Campo */}
          {isImagen && (
            <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/40 p-3">
              <Label className="text-xs font-semibold text-blue-900">Imagen</Label>
              {campo.campoImagenUrl ? (
                <div className="rounded border bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campo.campoImagenUrl}
                    alt={campo.campoEtiqueta || "Imagen"}
                    className="max-h-40 max-w-full object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="rounded border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-muted-foreground">
                  Este campo no tiene imagen cargada.
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                La imagen es parte del Campo global. Editala desde Configuración → Campos.
              </p>
            </div>
          )}

          {/* Render mode (only for Lista) */}
          {isLista && (
            <div className="space-y-1">
              <Label className="text-xs">Cómo se muestra esta lista</Label>
              <Select
                value={String(campo.renderMode ?? 0)}
                onValueChange={(v) => handleRenderModeChange(Number(v) as CampoListaRenderMode)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue>
                    {CAMPO_LISTA_RENDER_MODE_LABEL[campo.renderMode ?? 0]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPO_LISTA_RENDER_MODE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Opciones (only for Lista) */}
          {isLista && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">Opciones de lista</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAddingOpcion(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-1">
                {[...campo.opciones].sort((a, b) => a.orden - b.orden).map((o, i, arr) => (
                  <div key={o.id} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1">
                    <span className="font-mono text-gray-500">{o.valor}</span>
                    <span className="flex-1">{o.etiqueta}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => swapOpcionOrden(i, -1)}
                      disabled={i === 0 || reorderOpcionesMutation.isPending}
                      title="Mover arriba"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => swapOpcionOrden(i, 1)}
                      disabled={i === arr.length - 1 || reorderOpcionesMutation.isPending}
                      title="Mover abajo"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive"
                      onClick={() => deleteOpcionMutation.mutate({ campoId: campo.campoId, opcionId: o.id })}
                      disabled={deleteOpcionMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {addingOpcion && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      value={newOpcionValor}
                      onChange={(e) => setNewOpcionValor(e.target.value)}
                      placeholder="valor"
                      className="h-7 text-xs w-24 font-mono"
                    />
                    <Input
                      value={newOpcionEtiqueta}
                      onChange={(e) => setNewOpcionEtiqueta(e.target.value)}
                      placeholder="etiqueta"
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddOpcion()
                        if (e.key === "Escape") {
                          setAddingOpcion(false)
                          setNewOpcionValor("")
                          setNewOpcionEtiqueta("")
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleAddOpcion}
                      disabled={createOpcionMutation.isPending}
                    >
                      <Plus className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        setAddingOpcion(false)
                        setNewOpcionValor("")
                        setNewOpcionEtiqueta("")
                      }}
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                  </div>
                )}

                {campo.opciones.length === 0 && !addingOpcion && (
                  <p className="text-xs text-muted-foreground italic">Sin opciones definidas.</p>
                )}
              </div>
            </div>
          )}

          {/* Tabla (only for tipo 9): filas por defecto (dinámica) + editor de columnas/filas */}
          {isTabla && (
            <>
              {!tablaEsMatriz && (
                <div className="space-y-1">
                  <Label className="text-xs">Filas por defecto (tabla dinámica)</Label>
                  <FilasPorDefectoInput
                    numeroFilas={campo.numeroFilas}
                    disabled={updateMutation.isPending}
                    onCommit={(n) => updateMutation.mutate(buildUpdatePayload({ numeroFilas: n }))}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Filas vacías que se imprimen en modo físico. En digital el operador agrega de 2 a 10.
                  </p>
                </div>
              )}
              <CampoTablaEditor campo={campo} />
            </>
          )}

          {/* Label (tipo 10): estilo (display-only). Vive en el Campo global. */}
          {isLabel && (
            <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50/60 p-3">
              <Label className="text-xs font-semibold">Estilo del label</Label>
              <p className="text-[10px] text-muted-foreground">
                Texto fijo (la etiqueta). No es un campo a completar. El estilo afecta a todas las
                planillas que usen este campo.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                    checked={campo.campoNegrita ?? false}
                    onChange={(e) => updateLabelStyle({ negrita: e.target.checked })}
                    disabled={updateCampoGlobal.isPending} />
                  Negrita
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                    checked={campo.campoConBorde ?? false}
                    onChange={(e) => updateLabelStyle({ conBorde: e.target.checked })}
                    disabled={updateCampoGlobal.isPending} />
                  Borde
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                    checked={campo.campoFondoGris ?? false}
                    onChange={(e) => updateLabelStyle({ fondoGris: e.target.checked })}
                    disabled={updateCampoGlobal.isPending} />
                  Fondo gris
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                    checked={campo.campoSinPadding ?? false}
                    onChange={(e) => updateLabelStyle({ sinPadding: e.target.checked })}
                    disabled={updateCampoGlobal.isPending} />
                  Sin padding
                </label>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                    checked={campo.campoSinMargen ?? false}
                    onChange={(e) => updateLabelStyle({ sinMargen: e.target.checked })}
                    disabled={updateCampoGlobal.isPending} />
                  Sin margen
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Alineación</Label>
                <select
                  className="h-8 rounded-md border border-input bg-white px-2 text-sm"
                  value={campo.campoAlineacion ?? 0}
                  onChange={(e) => updateLabelStyle({ alineacion: Number(e.target.value) as AlineacionTexto })}
                  disabled={updateCampoGlobal.isPending}
                >
                  {Object.entries(ALINEACION_TEXTO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {/* Preview */}
              <div
                className={`text-sm ${campo.campoSinPadding ? "" : "px-2 py-1"} ${campo.campoFondoGris ? "bg-gray-100" : ""} ${campo.campoConBorde ? "border border-gray-300" : ""} ${campo.campoNegrita ? "font-bold" : ""}`}
                style={{ textAlign: campo.campoAlineacion === 1 ? "center" : campo.campoAlineacion === 2 ? "right" : "left" }}
              >
                {campo.campoEtiqueta || "Label"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Input controlado para "filas por defecto" de una tabla dinámica. Mantiene su
 * propio estado (evita el warning de Base UI por cambiar defaultValue de un input
 * no controlado tras guardar) y se re-sincroniza si el valor persistido cambia.
 */
function FilasPorDefectoInput({
  numeroFilas,
  disabled,
  onCommit,
}: {
  numeroFilas: number | null | undefined
  disabled?: boolean
  onCommit: (n: number) => void
}) {
  const actual = numeroFilas ?? 3
  const [valor, setValor] = useState(String(actual))

  useEffect(() => {
    setValor(String(actual))
  }, [actual])

  return (
    <Input
      type="number"
      min={1}
      max={100}
      className="h-8 w-24 text-sm"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={(e) => {
        const n = Number(e.target.value)
        if (!Number.isFinite(n)) return
        const clamped = Math.max(1, Math.min(100, Math.floor(n)))
        if (clamped !== actual) onCommit(clamped)
      }}
      disabled={disabled}
    />
  )
}
