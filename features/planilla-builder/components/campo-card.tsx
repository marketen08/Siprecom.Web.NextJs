"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Trash2, ChevronDown, ChevronUp, Plus, X } from "lucide-react"

import type { PlanillaCampoDetalle, CampoTipoDato, CampoListaRenderMode, PlanillaSeccion, AlineacionTexto } from "@/features/planillas/types"
import { CAMPO_TIPO_DATO, CAMPO_LISTA_RENDER_MODE_LABEL, CAMPO_LISTA_RENDER_MODE_OPCIONES, CAMPO_TAMANO_OPCIONES, ALINEACION_TEXTO_LABEL } from "@/features/planillas/types"
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
  // Local state para el input de "Etiqueta alternativa" — guardamos en blur/Enter
  // para no disparar un mutation por cada tecla. Se hidrata desde el campo global
  // via useEffect cuando cambia el valor del server.
  const [etiquetaAltInput, setEtiquetaAltInput] = useState(campo.campoEtiquetaAlt ?? "")
  // Flag para forzar modo Personalizado en el selector de ancho aunque el valor
  // coincida con una opción predefinida.
  const [modoPersonalizado, setModoPersonalizado] = useState(false)

  const removeMutation = useRemoveCampo()
  const updateMutation = useUpdateCampo()
  const createOpcionMutation = useCreateOpcion()
  const reorderOpcionesMutation = useReorderOpciones()
  const deleteOpcionMutation = useDeleteOpcion()

  const tipoDatoLabel = CAMPO_TIPO_DATO[campo.campoTipoDato as CampoTipoDato] ?? "—"
  const isLista = campo.campoTipoDato === 5
  const isChecklist = campo.campoTipoDato === 11
  // "Con opciones" agrupa Lista y Checklist para el editor de opciones.
  const tieneOpciones = isLista || isChecklist
  const isImagen = campo.campoTipoDato === 8
  const isTabla = campo.campoTipoDato === 9
  const isLabel = campo.campoTipoDato === 10
  const isTextoArea = campo.campoTipoDato === 12
  const tablaEsMatriz = (campo.filas?.length ?? 0) > 0

  const updateCampoGlobal = useUpdateCampoGlobal()

  // Sincroniza el input local cuando el valor del campo global cambia (ej. tras
  // guardar o cuando otra planilla abrió/cambió el campo).
  useEffect(() => {
    setEtiquetaAltInput(campo.campoEtiquetaAlt ?? "")
  }, [campo.campoEtiquetaAlt])

  const saveEtiquetaAlt = (nuevo: string) => {
    const valor = nuevo.trim()
    if (valor === (campo.campoEtiquetaAlt ?? "")) return
    updateCampoGlobal.mutate({
      id: campo.campoId,
      codigo: campo.campoCodigo ?? "",
      etiqueta: campo.campoEtiqueta ?? "",
      etiquetaAlt: valor || undefined,
      tipoDato: campo.campoTipoDato,
      unidad: campo.campoUnidad,
      // Preserva el estilo de Label global si es Label; para otros tipos son ignorados.
      negrita: campo.campoNegrita ?? false,
      conBorde: campo.campoConBorde ?? false,
      fondoGris: campo.campoFondoGris ?? false,
      alineacion: campo.campoAlineacion ?? 0,
      sinPadding: campo.campoSinPadding ?? false,
      sinMargen: campo.campoSinMargen ?? false,
      numeroLineas: campo.campoNumeroLineas ?? 3,
    })
  }

  // Update de NumeroLineas (Campo global, solo TextoArea). Rango 1-20, default 3.
  const saveNumeroLineas = (valor: number) => {
    const clamped = Math.min(20, Math.max(1, Math.floor(valor)))
    if (clamped === (campo.campoNumeroLineas ?? 3)) return
    updateCampoGlobal.mutate({
      id: campo.campoId,
      codigo: campo.campoCodigo ?? "",
      etiqueta: campo.campoEtiqueta ?? "",
      etiquetaAlt: campo.campoEtiquetaAlt || undefined,
      tipoDato: campo.campoTipoDato,
      unidad: campo.campoUnidad,
      negrita: campo.campoNegrita ?? false,
      conBorde: campo.campoConBorde ?? false,
      fondoGris: campo.campoFondoGris ?? false,
      alineacion: campo.campoAlineacion ?? 0,
      sinPadding: campo.campoSinPadding ?? false,
      sinMargen: campo.campoSinMargen ?? false,
      numeroLineas: clamped,
    })
  }
  // El estilo del Label vive en el Campo global → update global (afecta todas las
  // planillas que usen este campo). Otros campos del Campo no aplican a un Label.
  const updateLabelStyle = (overrides: Partial<{ negrita: boolean; conBorde: boolean; fondoGris: boolean; alineacion: AlineacionTexto; sinPadding: boolean; sinMargen: boolean }>) => {
    updateCampoGlobal.mutate({
      id: campo.campoId,
      codigo: campo.campoCodigo ?? "",
      etiqueta: campo.campoEtiqueta ?? "",
      etiquetaAlt: campo.campoEtiquetaAlt || undefined,
      tipoDato: campo.campoTipoDato,
      unidad: campo.campoUnidad,
      negrita: campo.campoNegrita ?? false,
      conBorde: campo.campoConBorde ?? false,
      fondoGris: campo.campoFondoGris ?? false,
      alineacion: campo.campoAlineacion ?? 0,
      sinPadding: campo.campoSinPadding ?? false,
      sinMargen: campo.campoSinMargen ?? false,
      numeroLineas: campo.campoNumeroLineas ?? 3,
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
    etiquetaArriba?: boolean
    alineacionEtiqueta?: AlineacionTexto
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
    etiquetaArriba: campo.etiquetaArriba ?? false,
    alineacionEtiqueta: campo.alineacionEtiqueta ?? 0,
    ...overrides,
  })

  const handleToggle = (field: "esObligatorio" | "visible" | "soloLectura", value: boolean) => {
    updateMutation.mutate(buildUpdatePayload({ [field]: value }))
  }

  const handleRenderModeChange = (value: CampoListaRenderMode) => {
    // Solo aplica a Lista real (5). Checklist (11) ignora el renderMode: su
    // render es siempre tabla. El select del renderMode ya no se muestra para
    // Checklist en la UI de abajo.
    updateMutation.mutate(buildUpdatePayload({ renderMode: value }))
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
      etiquetaArriba: otro.etiquetaArriba ?? false,
      alineacionEtiqueta: otro.alineacionEtiqueta ?? 0,
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

          {/* Layout en el PDF: etiqueta arriba. Solo campos lineales (no Imagen/
              Tabla/Label/Checklist — esos tienen su propio layout). El botón
              "Aplicar a todos de esta sección" replica el valor actual del flag
              a los demás campos aptos de la misma sección. */}
          {!isImagen && !isTabla && !isLabel && !isChecklist && (
            <div className="border rounded-md bg-blue-50/40 px-3 py-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 shrink-0"
                  checked={campo.etiquetaArriba ?? false}
                  onChange={(e) =>
                    updateMutation.mutate(buildUpdatePayload({ etiquetaArriba: e.target.checked }))
                  }
                  disabled={updateMutation.isPending}
                />
                <span className="text-xs">
                  <strong>Etiqueta arriba</strong> en el PDF
                  <span className="block text-[10px] text-muted-foreground">
                    Etiqueta arriba, valor/línea abajo (layout tipo Excel).
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Label className="text-xs shrink-0">Alineación etiqueta</Label>
                <Select
                  value={String(campo.alineacionEtiqueta ?? 0)}
                  onValueChange={(v) =>
                    updateMutation.mutate(buildUpdatePayload({
                      alineacionEtiqueta: Number(v) as AlineacionTexto,
                    }))
                  }
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger className="h-7 text-xs w-32">
                    <SelectValue>
                      {ALINEACION_TEXTO_LABEL[(campo.alineacionEtiqueta ?? 0) as AlineacionTexto]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ALINEACION_TEXTO_LABEL) as Array<[string, string]>).map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] ml-auto shrink-0"
                  onClick={async () => {
                    // Replica AMBOS flags de este campo a los demás campos aptos de
                    // la misma sección (mismo planillaSeccionId, incluye null="Sin
                    // sección"). Aptos = no Imagen/Tabla/Label/Checklist.
                    const objEtiqueta = campo.etiquetaArriba ?? false
                    const objAlineacion = campo.alineacionEtiqueta ?? 0
                    const restantes = allCampos.filter((c) =>
                      c.id !== campo.id
                      && (c.planillaSeccionId ?? null) === (campo.planillaSeccionId ?? null)
                      && c.campoTipoDato !== 8
                      && c.campoTipoDato !== 9
                      && c.campoTipoDato !== 10
                      && c.campoTipoDato !== 11
                      && (
                        (c.etiquetaArriba ?? false) !== objEtiqueta
                        || (c.alineacionEtiqueta ?? 0) !== objAlineacion
                      ),
                    )
                    for (const c of restantes) {
                      await updateMutation.mutateAsync({
                        id: c.id,
                        planillaId,
                        campoId: c.campoId,
                        planillaSeccionId: c.planillaSeccionId,
                        orden: c.orden,
                        esObligatorio: c.esObligatorio,
                        visible: c.visible,
                        soloLectura: c.soloLectura,
                        valorDefault: c.valorDefault,
                        renderMode: c.renderMode,
                        tamano: c.tamano,
                        numeroFilas: c.numeroFilas ?? null,
                        etiquetaArriba: objEtiqueta,
                        alineacionEtiqueta: objAlineacion,
                      })
                    }
                  }}
                  disabled={updateMutation.isPending}
                  title="Copia el layout y la alineación de la etiqueta a los demás campos aptos de esta sección"
                >
                  Aplicar a esta sección
                </Button>
              </div>
            </div>
          )}

          {/* Etiqueta alternativa — traducción/comentario del Campo GLOBAL.
              Se guarda en blur o Enter. Modifica el catálogo, por eso el hint
              lo aclara al user. No aplica a Tabla (usa columnas propias). */}
          {!isTabla && (
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Etiqueta alternativa</Label>
                <span className="text-[10px] text-muted-foreground italic">
                  afecta al campo global
                </span>
              </div>
              <Input
                value={etiquetaAltInput}
                onChange={(e) => setEtiquetaAltInput(e.target.value)}
                onBlur={() => saveEtiquetaAlt(etiquetaAltInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                placeholder="Oil temperature"
                className="mt-1 h-7 text-sm"
                maxLength={200}
                disabled={updateCampoGlobal.isPending}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Opcional. Se muestra debajo del label en itálica en el PDF.
              </p>
            </div>
          )}

          {/* Filas del área de texto — Campo global. Sólo TextoArea. Rango 1-20. */}
          {isTextoArea && (
            <div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Filas visibles</Label>
                <span className="text-[10px] text-muted-foreground italic">
                  afecta al campo global
                </span>
              </div>
              <Input
                type="number"
                min={1}
                max={20}
                defaultValue={campo.campoNumeroLineas ?? 3}
                onBlur={(e) => {
                  const num = Number(e.target.value)
                  if (Number.isFinite(num)) saveNumeroLineas(num)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                className="mt-1 h-7 text-sm w-24"
                disabled={updateCampoGlobal.isPending}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Cantidad de líneas para escritura manual en el PDF (1–20).
              </p>
            </div>
          )}

          {/* Valor por defecto — no aplica a tipo Imagen, Tabla ni Label */}
          {!isImagen && !isTabla && !isLabel && (
            <div>
              <Label className="text-xs">Valor por defecto</Label>
              {tieneOpciones ? (
                // Para Lista/Checklist el default es UNA de las opciones, no texto libre.
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
                  if (modoPersonalizado) return "-1"
                  const match = CAMPO_TAMANO_OPCIONES.find((o) => o.value === campo.tamano)
                  return String(match?.value ?? -1)
                })()}
                onValueChange={(v) => {
                  const num = Number(v)
                  if (num === -1) {
                    setModoPersonalizado(true)
                  } else {
                    setModoPersonalizado(false)
                    handleTamanoChange(num)
                  }
                }}
                disabled={updateMutation.isPending || isChecklist}
              >
                <SelectTrigger className="h-8 text-sm flex-1">
                  <SelectValue>
                    {(() => {
                      if (modoPersonalizado) return `Personalizado (${campo.tamano})`
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
              {(modoPersonalizado || !CAMPO_TAMANO_OPCIONES.some((o) => o.value === campo.tamano)) && (
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
              {isChecklist
                ? "Los campos Checklist siempre ocupan el ancho completo (12) para renderizarse como tabla."
                : "En grilla de 12. Los campos consecutivos se agrupan automáticamente."}
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
                  {CAMPO_LISTA_RENDER_MODE_OPCIONES.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Opciones (Lista y Checklist) */}
          {tieneOpciones && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs">{isChecklist ? "Opciones del checklist" : "Opciones de lista"}</Label>
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
