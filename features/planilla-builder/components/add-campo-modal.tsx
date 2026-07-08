"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useRef } from "react"
import { useGetCamposSelect } from "@/features/campos/api/use-get-campos-select"
import { useCreateCampo } from "@/features/campos/api/use-create-campo"
import { useCreateOpcion } from "@/features/campos/api/use-create-opcion"
import { useAddCampo } from "@/features/planillas/api/use-add-campo"
import { useUploadImagenCampo } from "@/features/planillas/api/use-upload-imagen-campo"
import { campoSchema, type CampoFormValues } from "@/features/campos/schema"
import { slugifyCodigoCampo } from "@/features/campos/lib/slugify-codigo"
import { CHECKLIST_PRESETS } from "@/features/campos/lib/checklist-presets"
import {
  CAMPO_TIPO_DATO,
  CAMPO_LISTA_RENDER_MODE_LABEL,
  CAMPO_LISTA_RENDER_MODE_OPCIONES,
  CAMPO_TAMANO_OPCIONES,
  CAMPO_TAMANO_DEFAULT,
  ALINEACION_TEXTO_LABEL,
  type AlineacionTexto,
  type CampoTipoDato,
  type CampoListaRenderMode,
  type PlanillaSeccion,
} from "@/features/planillas/types"
import { ArrowDown, ArrowUp, ClipboardPaste, ImageIcon, Trash2, Plus, Star } from "lucide-react"
import { BulkPasteOpcionesDialog } from "@/features/campos/components/bulk-paste-opciones-dialog"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"

interface AddCampoModalProps {
  open: boolean
  onClose: () => void
  planillaId: string
  secciones: PlanillaSeccion[]
  selectedSeccionId: string | null
  existingCampoIds: string[]
  nextOrden: number
}

type Tab = "existing" | "new" | "bulk"
type BulkTipo = 1 | 11 // Texto | Checklist

/** Opciones precargadas para el bloque compartido de Checklist en el tab "bulk". */
const BULK_CHECKLIST_DEFAULT_OPCIONES = CHECKLIST_PRESETS[0].opciones

export function AddCampoModal({
  open,
  onClose,
  planillaId,
  secciones,
  selectedSeccionId,
  existingCampoIds,
  nextOrden,
}: AddCampoModalProps) {
  const [tab, setTab] = useState<Tab>("existing")
  const [selectedCampoId, setSelectedCampoId] = useState<string>("")
  const [seccionId, setSeccionId] = useState<string>(selectedSeccionId ?? "__none__")
  const [campoSearch, setCampoSearch] = useState("")
  // Default: Inline (1). `Auto` (0) fue deprecado — para "checklist" el usuario
  // ahora elige Checklist como tipo dedicado en el picker visual.
  const [renderMode, setRenderMode] = useState<CampoListaRenderMode>(1)
  const [tamano, setTamano] = useState<number>(CAMPO_TAMANO_DEFAULT)
  // Flag para forzar modo Personalizado aunque el valor coincida con una opción
  // predefinida — necesario para que el input numérico aparezca al elegir
  // "Personalizado" con un tamaño que ya está en la lista.
  const [modoPersonalizado, setModoPersonalizado] = useState(false)
  // Opciones temporales para nuevo campo Lista (se crean tras crear el Campo).
  const [tempOpciones, setTempOpciones] = useState<Array<{ valor: string; etiqueta: string }>>([])
  // Opción marcada como valor por defecto (por su `valor`). Se persiste como
  // PlanillaCampo.ValorDefault al agregar el campo. null = sin default.
  const [opcionDefaultValor, setOpcionDefaultValor] = useState<string | null>(null)
  const [opcionInput, setOpcionInput] = useState({ valor: "", etiqueta: "" })
  const [bulkPasteOpen, setBulkPasteOpen] = useState(false)

  // ── Tab "En lote" ─────────────────────────────────────────────────────────
  // Crea N campos de golpe (Checklist o Texto) desde una lista de etiquetas.
  // Todos comparten sección, obligatoriedad y — para Checklist — el mismo set
  // de opciones (default Sí/No/NA, editable).
  const [bulkTipo, setBulkTipo] = useState<BulkTipo>(11)
  const [bulkEtiquetas, setBulkEtiquetas] = useState("")
  const [bulkReusar, setBulkReusar] = useState(true)
  const [bulkChecklistOpciones, setBulkChecklistOpciones] = useState<
    Array<{ valor: string; etiqueta: string }>
  >(BULK_CHECKLIST_DEFAULT_OPCIONES)
  const [bulkOpcionInput, setBulkOpcionInput] = useState({ valor: "", etiqueta: "" })
  const [bulkPending, setBulkPending] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkResumen, setBulkResumen] = useState<string | null>(null)
  // Mientras esté en false, cada opción nueva se inserta alfabéticamente por etiqueta.
  // En cuanto el usuario use las flechas, pasa a true y se respeta su orden manual.
  const [opcionesManualOrder, setOpcionesManualOrder] = useState(false)
  // Imagen pre-cargada para campo nuevo de tipo Imagen (sube primero, recibe URL).
  const [imagenUrl, setImagenUrl] = useState<string | undefined>(undefined)
  // Estilo para campo nuevo de tipo Label.
  const [labelStyle, setLabelStyle] = useState<{ negrita: boolean; conBorde: boolean; fondoGris: boolean; alineacion: AlineacionTexto; sinPadding: boolean; sinMargen: boolean }>({
    negrita: false, conBorde: false, fondoGris: false, alineacion: 0, sinPadding: false, sinMargen: false,
  })
  // Obligatoriedad del campo en ESTA planilla. En "Existente" se precarga del
  // EsObligatorioDefault del campo; en "Nuevo" además se guarda como default del campo.
  const [esObligatorio, setEsObligatorio] = useState(false)
  // Auto-derivar `codigo` desde `etiqueta` mientras el user no toque el input
  // del código. En el tab "Nuevo" arrancamos siempre limpio (no hay defaultValues).
  const [codigoSucio, setCodigoSucio] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // El initializer de useState sólo corre en el primer montaje (cuando aún no hay
  // sección activa), así que re-sincronizamos cada vez que el modal se abre para que
  // venga preseleccionada la sección sobre la que está posicionado el usuario.
  useEffect(() => {
    if (open) setSeccionId(selectedSeccionId ?? "__none__")
  }, [open, selectedSeccionId])

  // Al elegir un campo existente, precargamos el checkbox de obligatorio con el
  // EsObligatorioDefault guardado en ese campo.
  useEffect(() => {
    if (tab !== "existing" || !selectedCampoId) return
    const c = campos.find((x) => x.id === selectedCampoId)
    setEsObligatorio(Boolean(c?.esObligatorioDefault))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampoId, tab])

  const { data: camposResult } = useGetCamposSelect()
  const campos: Array<{ id: string; etiqueta: string; codigo: string } & Record<string, any>> = (camposResult as any)?.data ?? []
  const createCampoMutation = useCreateCampo()
  const createOpcionMutation = useCreateOpcion()
  const addCampoMutation = useAddCampo()
  const uploadMutation = useUploadImagenCampo()

  const form = useForm<CampoFormValues>({
    resolver: zodResolver(campoSchema),
    defaultValues: {
      codigo: "",
      etiqueta: "",
      tipoDato: 1,
      unidad: "",
      descripcion: "",
    },
  })

  const availableCampos = campos.filter(
    (c) => !existingCampoIds.includes(c.id) &&
      (campoSearch === "" ||
        c.etiqueta.toLowerCase().includes(campoSearch.toLowerCase()) ||
        c.codigo.toLowerCase().includes(campoSearch.toLowerCase()))
  )

  const handleClose = () => {
    setSelectedCampoId("")
    setCampoSearch("")
    setRenderMode(1)
    setTamano(CAMPO_TAMANO_DEFAULT)
    setModoPersonalizado(false)
    setTempOpciones([])
    setOpcionDefaultValor(null)
    setOpcionInput({ valor: "", etiqueta: "" })
    setOpcionesManualOrder(false)
    setImagenUrl(undefined)
    setLabelStyle({ negrita: false, conBorde: false, fondoGris: false, alineacion: 0, sinPadding: false, sinMargen: false })
    setEsObligatorio(false)
    setCodigoSucio(false)
    setBulkTipo(11)
    setBulkEtiquetas("")
    setBulkReusar(true)
    setBulkChecklistOpciones(BULK_CHECKLIST_DEFAULT_OPCIONES)
    setBulkOpcionInput({ valor: "", etiqueta: "" })
    setBulkError(null)
    setBulkResumen(null)
    form.reset()
    onClose()
  }

  const selectedCampoExistente = campos.find((c: any) => c.id === selectedCampoId)
  const tipoDatoFormulario = form.watch("tipoDato") as CampoTipoDato
  // Tanto Lista (5) como Checklist (11) tienen opciones. Los usamos como "familia"
  // para decidir cuándo mostrar el editor de opciones y el sub-selector de render.
  const isListaExistente = selectedCampoExistente?.tipoDato === 5 || selectedCampoExistente?.tipoDato === 11
  const isChecklistExistente = selectedCampoExistente?.tipoDato === 11
  const isListaNuevo = tipoDatoFormulario === 5
  const isChecklistNuevo = tipoDatoFormulario === 11
  const tieneOpcionesNuevo = isListaNuevo || isChecklistNuevo
  const isImagenNuevo = tipoDatoFormulario === 8
  const isLabelNuevo = tipoDatoFormulario === 10

  const handleUploadImagen = async (file: File) => {
    const url = await uploadMutation.mutateAsync(file)
    setImagenUrl(url)
  }

  const handleAddExisting = () => {
    if (!selectedCampoId) return
    // Para Lista tradicional, el usuario elige el renderMode. Para Checklist el
    // modo es fijo (el backend lo ignora) y el ancho es 12.
    const esListaReal = selectedCampoExistente?.tipoDato === 5
    addCampoMutation.mutate(
      {
        planillaId,
        campoId: selectedCampoId,
        planillaSeccionId: seccionId === "__none__" ? undefined : seccionId,
        orden: nextOrden,
        esObligatorio,
        visible: true,
        soloLectura: false,
        renderMode: esListaReal ? renderMode : undefined,
        tamano: isChecklistExistente ? 12 : tamano,
      },
      { onSuccess: handleClose }
    )
  }

  const handleCreateAndAdd = async (values: CampoFormValues) => {
    try {
      // La imagen vive en el Campo (global). Si es tipo Imagen, mandamos imagenUrl al crear.
      const res: any = await createCampoMutation.mutateAsync({
        ...values,
        tipoDato: values.tipoDato as CampoTipoDato,
        imagenUrl: values.tipoDato === 8 ? imagenUrl : undefined,
        // Guardamos la obligatoriedad como default del campo (para próximas planillas).
        esObligatorioDefault: esObligatorio,
        // Estilo del Label (display-only).
        ...(values.tipoDato === 10
          ? { negrita: labelStyle.negrita, conBorde: labelStyle.conBorde, fondoGris: labelStyle.fondoGris, alineacion: labelStyle.alineacion, sinPadding: labelStyle.sinPadding, sinMargen: labelStyle.sinMargen }
          : {}),
      })
      const newCampoId = res?.data?.id ?? res?.id
      if (!newCampoId) return

      // Si es Lista o Checklist, y hay opciones cargadas, crearlas en serie antes
      // de agregar a la planilla.
      const esConOpciones = values.tipoDato === 5 || values.tipoDato === 11
      if (esConOpciones && tempOpciones.length > 0) {
        for (let i = 0; i < tempOpciones.length; i++) {
          const op = tempOpciones[i]
          await createOpcionMutation.mutateAsync({
            campoId: newCampoId,
            valor: op.valor.trim(),
            etiqueta: op.etiqueta.trim(),
            orden: i + 1,
          })
        }
      }

      await addCampoMutation.mutateAsync({
        planillaId,
        campoId: newCampoId,
        planillaSeccionId: seccionId === "__none__" ? undefined : seccionId,
        orden: nextOrden,
        esObligatorio,
        visible: true,
        soloLectura: false,
        // Para Lista/Checklist, la opción marcada con la estrella es el valor por defecto.
        valorDefault: esConOpciones ? (opcionDefaultValor ?? undefined) : undefined,
        // Solo Lista (5) usa renderMode; Checklist (11) lo ignora en runtime.
        renderMode: values.tipoDato === 5 ? renderMode : undefined,
        // Checklist siempre ancho completo.
        tamano: values.tipoDato === 11 ? 12 : tamano,
      })
      handleClose()
    } catch {
      // Errores ya se muestran via mutation.isError
    }
  }

  const handleAddOpcion = () => {
    if (!opcionInput.valor.trim() || !opcionInput.etiqueta.trim()) return
    const nueva = { valor: opcionInput.valor.trim(), etiqueta: opcionInput.etiqueta.trim() }
    setTempOpciones((prev) => {
      // Sin orden manual → insertamos alfabéticamente. Con orden manual → al final.
      if (opcionesManualOrder) return [...prev, nueva]
      return [...prev, nueva].sort((a, b) =>
        a.etiqueta.localeCompare(b.etiqueta, "es", { sensitivity: "base" })
      )
    })
    setOpcionInput({ valor: "", etiqueta: "" })
  }

  // Solo aplica a Lista real (5). Para Checklist (11) el modo es fijo y este
  // handler no se dispara — el picker de tipo ya oculta el sub-selector.
  const handleRenderModeChange = (next: CampoListaRenderMode) => {
    setRenderMode(next)
  }

  const handleRemoveOpcion = (index: number) => {
    setTempOpciones((prev) => {
      // Si la opción que se quita era la default, limpiamos la marca.
      if (prev[index]?.valor === opcionDefaultValor) setOpcionDefaultValor(null)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleMoveOpcion = (index: number, dir: -1 | 1) => {
    setTempOpciones((prev) => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    // Una vez que el usuario reordena manualmente, no volvemos a auto-ordenar al agregar.
    setOpcionesManualOrder(true)
  }

  // ── Parse + estado por línea del tab "En lote" ────────────────────────────
  // Cada línea puede terminar en uno de 4 estados:
  //   - "reusa"       — reuso activo + matcheo por etiqueta case-insensitive
  //   - "nuevo"       — se crea un Campo nuevo (con opciones si es Checklist)
  //   - "en_planilla" — reuso encontró el campo, pero ya está en esta planilla
  //   - "dup"         — la etiqueta ya apareció más arriba en el mismo pegado
  const bulkParsed = useMemo(() => {
    const lineas = bulkEtiquetas
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    // Catálogo filtrado por tipo, indexado por etiqueta lowercase. Sólo con
    // reuso activo — sino, forzamos crear cada campo aunque exista.
    const catalogo = new Map<string, (typeof campos)[number]>()
    if (bulkReusar) {
      for (const c of campos) {
        if (c.tipoDato === bulkTipo) {
          catalogo.set(String(c.etiqueta ?? "").trim().toLowerCase(), c)
        }
      }
    }

    // Códigos ya tomados: los del catálogo entero + los que vayamos generando
    // en esta corrida. Comparamos uppercase.
    const codigosDB = new Set(
      campos.map((c) => String(c.codigo ?? "").toUpperCase()),
    )
    const codigosGenerados = new Set<string>()
    const generarCodigo = (etiqueta: string): string => {
      const base =
        slugifyCodigoCampo(etiqueta, 30) || etiqueta.toUpperCase().slice(0, 30) || "CAMPO"
      let candidato = base
      let n = 2
      while (
        codigosDB.has(candidato.toUpperCase()) ||
        codigosGenerados.has(candidato.toUpperCase())
      ) {
        // Recortamos el base para dejar lugar al sufijo y no pasar 30 chars.
        const sufijo = `_${n}`
        candidato = base.slice(0, Math.max(1, 30 - sufijo.length)) + sufijo
        n += 1
      }
      codigosGenerados.add(candidato.toUpperCase())
      return candidato
    }

    const vistos = new Set<string>()
    return lineas.map((etiqueta) => {
      const key = etiqueta.toLowerCase()
      if (vistos.has(key)) {
        return { etiqueta, estado: "dup" as const }
      }
      vistos.add(key)

      const existente = catalogo.get(key)
      if (existente) {
        if (existingCampoIds.includes(existente.id)) {
          return {
            etiqueta,
            estado: "en_planilla" as const,
            campoIdExistente: existente.id,
          }
        }
        return {
          etiqueta,
          estado: "reusa" as const,
          campoIdExistente: existente.id,
          codigoExistente: existente.codigo,
        }
      }

      return {
        etiqueta,
        estado: "nuevo" as const,
        codigoNuevo: generarCodigo(etiqueta),
      }
    })
  }, [bulkEtiquetas, bulkTipo, bulkReusar, campos, existingCampoIds])

  const bulkAInsertar = bulkParsed.filter(
    (p) => p.estado === "reusa" || p.estado === "nuevo",
  )

  const handleBulkCreateAndAdd = async () => {
    if (bulkAInsertar.length === 0) return
    setBulkPending(true)
    setBulkError(null)
    setBulkResumen(null)
    try {
      let creados = 0
      let reusados = 0
      let orden = nextOrden
      for (const item of bulkAInsertar) {
        let campoId: string
        if (item.estado === "reusa") {
          campoId = item.campoIdExistente
          reusados += 1
        } else {
          // Crear Campo. Para Checklist, además creamos las opciones compartidas.
          const res: any = await createCampoMutation.mutateAsync({
            codigo: item.codigoNuevo,
            etiqueta: item.etiqueta,
            tipoDato: bulkTipo as CampoTipoDato,
            unidad: "",
            descripcion: "",
            esObligatorioDefault: esObligatorio,
          } as any)
          const newId = res?.data?.id ?? res?.id
          if (!newId) throw new Error(`No se pudo crear el campo "${item.etiqueta}"`)
          if (bulkTipo === 11 && bulkChecklistOpciones.length > 0) {
            for (let i = 0; i < bulkChecklistOpciones.length; i++) {
              const op = bulkChecklistOpciones[i]
              await createOpcionMutation.mutateAsync({
                campoId: newId,
                valor: op.valor.trim(),
                etiqueta: op.etiqueta.trim(),
                orden: i + 1,
              })
            }
          }
          campoId = newId
          creados += 1
        }

        await addCampoMutation.mutateAsync({
          planillaId,
          campoId,
          planillaSeccionId: seccionId === "__none__" ? undefined : seccionId,
          orden,
          esObligatorio,
          visible: true,
          soloLectura: false,
          // Checklist siempre 12; Texto respeta 12 también (default de este flujo).
          tamano: 12,
        })
        orden += 1
      }
      setBulkResumen(
        `Se agregaron ${creados + reusados} campo${creados + reusados !== 1 ? "s" : ""}` +
          (reusados > 0 ? ` (${creados} nuevo${creados !== 1 ? "s" : ""}, ${reusados} reusado${reusados !== 1 ? "s" : ""})` : ""),
      )
      // Cerramos al terminar; el resumen se pierde con el reset. Es intencional:
      // el user verá los campos aparecer en la planilla al volver al builder.
      handleClose()
    } catch (err) {
      setBulkError((err as Error)?.message ?? "No se pudieron crear los campos.")
    } finally {
      setBulkPending(false)
    }
  }

  const handleAddBulkOpcion = () => {
    if (!bulkOpcionInput.valor.trim() || !bulkOpcionInput.etiqueta.trim()) return
    setBulkChecklistOpciones((prev) => [
      ...prev,
      { valor: bulkOpcionInput.valor.trim(), etiqueta: bulkOpcionInput.etiqueta.trim() },
    ])
    setBulkOpcionInput({ valor: "", etiqueta: "" })
  }

  const handleBulkPasteConfirm = (
    nuevas: Array<{ valor: string; etiqueta: string }>,
    modo: "append" | "replace",
  ) => {
    // Bulk paste respeta el orden pegado — pasa a modo manual para que futuras
    // altas se agreguen al final en lugar de reordenarse alfabéticamente.
    setOpcionesManualOrder(true)
    setTempOpciones((prev) => {
      if (modo === "replace") {
        // Limpiar el default si el valor previo ya no está en la nueva lista.
        if (
          opcionDefaultValor &&
          !nuevas.some((n) => n.valor === opcionDefaultValor)
        ) {
          setOpcionDefaultValor(null)
        }
        return nuevas
      }
      return [...prev, ...nuevas]
    })
    setBulkPasteOpen(false)
  }

  const isPending = createCampoMutation.isPending || createOpcionMutation.isPending || addCampoMutation.isPending

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Agregar campo</SheetTitle>
          <SheetDescription>
            Seleccioná un campo existente, creá uno nuevo, o cargá varios de una
            vez pegando una lista.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-4 pb-6 space-y-4">
          {/* Tab selector */}
          <div className="flex border-b">
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "existing"
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("existing")}
            >
              Campos existentes
            </button>
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "new"
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("new")}
            >
              Crear nuevo campo
            </button>
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "bulk"
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("bulk")}
            >
              En lote
            </button>
          </div>

          {/* Sección destino (shared) */}
          <div className="space-y-1.5">
            <Label>Sección destino</Label>
            <Select value={seccionId} onValueChange={(v) => setSeccionId(v ?? "__none__")}>
              <SelectTrigger>
                <SelectValue placeholder="Sin sección">
                  {seccionId === "__none__"
                    ? "Sin sección"
                    : secciones.find((s) => s.id === seccionId)?.nombre ?? "Sin sección"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin sección</SelectItem>
                {secciones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ancho del campo (shared) — deshabilitado cuando el campo es Checklist,
              porque en tabla siempre ocupa la fila completa. El tab "En lote"
              usa ancho 12 fijo, así que ocultamos el selector ahí. */}
          {tab !== "bulk" && (
          <div className="space-y-1.5">
            <Label>Ancho del campo</Label>
            <div className="flex items-center gap-2">
              <Select
                disabled={isChecklistExistente || isChecklistNuevo}
                value={(() => {
                  if (modoPersonalizado) return "-1"
                  const match = CAMPO_TAMANO_OPCIONES.find((o) => o.value === tamano)
                  return String(match?.value ?? -1)
                })()}
                onValueChange={(v) => {
                  const num = Number(v)
                  if (num === -1) {
                    setModoPersonalizado(true)
                  } else {
                    setModoPersonalizado(false)
                    setTamano(num)
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue>
                    {(() => {
                      if (modoPersonalizado) return `Personalizado (${tamano})`
                      const match = CAMPO_TAMANO_OPCIONES.find((o) => o.value === tamano)
                      return match ? match.label : `Personalizado (${tamano})`
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CAMPO_TAMANO_OPCIONES.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(modoPersonalizado || !CAMPO_TAMANO_OPCIONES.some((o) => o.value === tamano)) && (
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={tamano}
                  className="w-20"
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (Number.isFinite(n)) setTamano(Math.max(1, Math.min(12, Math.floor(n))))
                  }}
                />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {(isChecklistExistente || isChecklistNuevo)
                ? "Los campos Checklist siempre ocupan el ancho completo (12) para renderizarse como tabla."
                : "Grilla de 12. Los campos consecutivos se agrupan automáticamente."}
            </p>
          </div>
          )}

          {/* Obligatorio (compartido entre las tres tabs). En "Nuevo"/"Bulk" se
              guarda además como default del campo; en "Existente" se precarga
              de ese default. */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={esObligatorio}
              onChange={(e) => setEsObligatorio(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            Campo obligatorio
          </label>

          {tab === "existing" ? (
            <div className="space-y-3">
              <Input
                placeholder="Buscar campo por nombre o código..."
                value={campoSearch}
                onChange={(e) => setCampoSearch(e.target.value)}
              />
              <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
                {availableCampos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {campos.length === 0 ? "No hay campos disponibles." : "No hay más campos para agregar."}
                  </p>
                ) : (
                  availableCampos.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCampoId(c.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors",
                        selectedCampoId === c.id
                          ? "bg-blue-50 text-blue-900"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <span className="font-medium">{c.etiqueta}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{c.codigo}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {CAMPO_TIPO_DATO[c.tipoDato as CampoTipoDato]}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {isListaExistente && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-1">
                  <Label className="text-xs">Cómo se muestra esta lista</Label>
                  <Select
                    value={String(renderMode)}
                    onValueChange={(v) => handleRenderModeChange(Number(v) as CampoListaRenderMode)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue>{CAMPO_LISTA_RENDER_MODE_LABEL[renderMode]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPO_LISTA_RENDER_MODE_OPCIONES.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-blue-900 hover:bg-blue-800"
                  onClick={handleAddExisting}
                  disabled={!selectedCampoId || isPending}
                >
                  {isPending ? "Agregando..." : "Agregar"}
                </Button>
                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : tab === "new" ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateAndAdd)} className="space-y-3">
                {/* Orden: tipo → etiqueta → código (autoderivado) → unidad. */}
                <FormField
                  control={form.control}
                  name="tipoDato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de dato</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => {
                          const nuevoTipo = Number(v) as CampoTipoDato
                          field.onChange(nuevoTipo)
                          // Checklist forza ancho completo; el renderMode se ignora
                          // en runtime pero mantenemos el state consistente (Inline).
                          if (nuevoTipo === 11) {
                            setTamano(12)
                            setRenderMode(1)
                            setModoPersonalizado(false)
                            // Precargar Sí/No/N/A si el usuario aún no cargó opciones.
                            if (tempOpciones.length === 0) {
                              setTempOpciones([
                                { valor: "SI", etiqueta: "Sí" },
                                { valor: "NO", etiqueta: "No" },
                                { valor: "NA", etiqueta: "No Aplica" },
                              ])
                              setOpcionesManualOrder(true)
                            }
                          }
                        }}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue>
                              {CAMPO_TIPO_DATO[field.value as CampoTipoDato] ?? ""}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CAMPO_TIPO_DATO).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="etiqueta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etiqueta</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Temperatura de aceite"
                          disabled={isPending}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e)
                            // Auto-derivar `codigo` mientras el user no lo haya
                            // tocado manualmente.
                            if (!codigoSucio) {
                              form.setValue("codigo", slugifyCodigoCampo(e.target.value), {
                                shouldValidate: false,
                              })
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-[2fr_1fr] gap-3">
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Auto — o escribí uno"
                            disabled={isPending}
                            className="font-mono"
                            {...field}
                            onChange={(e) => {
                              // Cualquier edición manual detiene el auto-derivado.
                              // Vaciarlo lo reactiva.
                              setCodigoSucio(e.target.value.trim().length > 0)
                              field.onChange(e)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unidad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidad</FormLabel>
                        <FormControl>
                          <Input placeholder="°C" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Sub-sección Imagen: subir archivo + preview */}
                {isImagenNuevo && (
                  <div className="space-y-2 rounded-md border border-blue-100 bg-blue-50/40 p-3">
                    <Label className="text-xs font-semibold text-blue-900">Imagen</Label>
                    {imagenUrl ? (
                      <div className="rounded border bg-white p-2">
                        <img
                          src={imagenUrl}
                          alt="Imagen del campo"
                          className="max-h-40 max-w-full object-contain mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-blue-200 bg-white px-3 py-6 text-center text-xs text-muted-foreground">
                        Sin imagen cargada
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUploadImagen(f)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadMutation.isPending || isPending}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {uploadMutation.isPending
                          ? "Subiendo..."
                          : imagenUrl
                            ? "Reemplazar imagen"
                            : "Subir imagen"}
                      </Button>
                      {uploadMutation.isError && (
                        <span className="text-xs text-red-600">Error al subir la imagen</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Formatos: JPG, PNG, WEBP, SVG, GIF. Máximo 5 MB.
                    </p>
                  </div>
                )}

                {/* Sub-sección Label: estilo (display-only) */}
                {isLabelNuevo && (
                  <div className="space-y-3 rounded-md border border-blue-100 bg-blue-50/40 p-3">
                    <Label className="text-xs font-semibold text-blue-900">Estilo del label</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Texto fijo (sale de la etiqueta). No es un campo a completar: sirve como encabezado,
                      ej. arriba de una tabla. Ocupa el ancho completo.
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                          checked={labelStyle.negrita}
                          onChange={(e) => setLabelStyle((s) => ({ ...s, negrita: e.target.checked }))} />
                        Negrita
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                          checked={labelStyle.conBorde}
                          onChange={(e) => setLabelStyle((s) => ({ ...s, conBorde: e.target.checked }))} />
                        Borde
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                          checked={labelStyle.fondoGris}
                          onChange={(e) => setLabelStyle((s) => ({ ...s, fondoGris: e.target.checked }))} />
                        Fondo gris
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                          checked={labelStyle.sinPadding}
                          onChange={(e) => setLabelStyle((s) => ({ ...s, sinPadding: e.target.checked }))} />
                        Sin padding
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                          checked={labelStyle.sinMargen}
                          onChange={(e) => setLabelStyle((s) => ({ ...s, sinMargen: e.target.checked }))} />
                        Sin margen
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Alineación</Label>
                      <select
                        className="h-8 rounded-md border border-input bg-white px-2 text-sm"
                        value={labelStyle.alineacion}
                        onChange={(e) => setLabelStyle((s) => ({ ...s, alineacion: Number(e.target.value) as AlineacionTexto }))}
                      >
                        {Object.entries(ALINEACION_TEXTO_LABEL).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    {/* Preview */}
                    <div
                      className={`text-sm ${labelStyle.sinPadding ? "" : "px-2 py-1"} ${labelStyle.fondoGris ? "bg-gray-100" : ""} ${labelStyle.conBorde ? "border border-gray-300" : ""} ${labelStyle.negrita ? "font-bold" : ""}`}
                      style={{ textAlign: labelStyle.alineacion === 1 ? "center" : labelStyle.alineacion === 2 ? "right" : "left" }}
                    >
                      {form.watch("etiqueta") || "Vista previa del label"}
                    </div>
                  </div>
                )}

                {/* Sub-sección Lista/Checklist: opciones + (solo Lista) render mode.
                    Checklist se renderiza siempre como tabla — no muestra el sub-selector. */}
                {tieneOpcionesNuevo && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                    {isListaNuevo && (
                      <div className="space-y-1">
                        <Label className="text-xs">Cómo se muestra</Label>
                        <Select
                          value={String(renderMode)}
                          onValueChange={(v) => handleRenderModeChange(Number(v) as CampoListaRenderMode)}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue>
                              {CAMPO_LISTA_RENDER_MODE_LABEL[renderMode]}
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

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-blue-900">
                          Opciones {isChecklistNuevo ? "del checklist" : "de la lista"}
                        </p>
                        <p className="text-[10px] text-blue-700/70">
                          Tocá la ★ para marcar el valor por defecto.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 shrink-0"
                        onClick={() => setBulkPasteOpen(true)}
                        disabled={isPending}
                      >
                        <ClipboardPaste className="h-3.5 w-3.5" /> Pegar en lote
                      </Button>
                    </div>

                    {/* Presets rápidos — sólo para Checklist. Reemplazan la lista
                        actual y limpian el default si el valor previo ya no está. */}
                    {isChecklistNuevo && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-blue-700/70">Preset:</span>
                        {CHECKLIST_PRESETS.map((p) => (
                          <Button
                            key={p.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              setTempOpciones(p.opciones)
                              setOpcionesManualOrder(true)
                              if (
                                opcionDefaultValor &&
                                !p.opciones.some((o) => o.valor === opcionDefaultValor)
                              ) {
                                setOpcionDefaultValor(null)
                              }
                            }}
                            disabled={isPending}
                          >
                            {p.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {tempOpciones.length > 0 && (
                      <div className="space-y-1">
                        {tempOpciones.map((op, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1">
                            <button
                              type="button"
                              onClick={() => setOpcionDefaultValor((cur) => (cur === op.valor ? null : op.valor))}
                              className={cn(
                                "shrink-0",
                                op.valor === opcionDefaultValor ? "text-amber-500" : "text-gray-300 hover:text-amber-400",
                              )}
                              title="Marcar como valor por defecto"
                              aria-label="Marcar como valor por defecto"
                            >
                              <Star className={cn("h-3.5 w-3.5", op.valor === opcionDefaultValor && "fill-amber-400")} />
                            </button>
                            <span className="font-mono text-gray-500 shrink-0">{op.valor}</span>
                            <span className="flex-1 truncate">{op.etiqueta}</span>
                            <button
                              type="button"
                              onClick={() => handleMoveOpcion(i, -1)}
                              disabled={i === 0}
                              className="text-gray-400 hover:text-gray-700 shrink-0 disabled:opacity-30 disabled:hover:text-gray-400"
                              aria-label="Mover arriba"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOpcion(i, 1)}
                              disabled={i === tempOpciones.length - 1}
                              className="text-gray-400 hover:text-gray-700 shrink-0 disabled:opacity-30 disabled:hover:text-gray-400"
                              aria-label="Mover abajo"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveOpcion(i)}
                              className="text-gray-400 hover:text-red-500 shrink-0"
                              aria-label="Quitar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-end gap-1.5">
                      <div className="space-y-1 w-24 shrink-0">
                        <Label className="text-xs">Valor</Label>
                        <Input
                          value={opcionInput.valor}
                          onChange={(e) => setOpcionInput((p) => ({ ...p, valor: e.target.value }))}
                          placeholder="SI"
                          className="h-7 text-xs font-mono"
                          disabled={isPending}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOpcion() } }}
                        />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <Label className="text-xs">Etiqueta</Label>
                        <Input
                          value={opcionInput.etiqueta}
                          onChange={(e) => setOpcionInput((p) => ({ ...p, etiqueta: e.target.value }))}
                          placeholder="Sí"
                          className="h-7 text-xs"
                          disabled={isPending}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOpcion() } }}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 shrink-0"
                        onClick={handleAddOpcion}
                        disabled={isPending || !opcionInput.valor.trim() || !opcionInput.etiqueta.trim()}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-900 hover:bg-blue-800"
                    disabled={isPending}
                  >
                    {isPending ? "Creando..." : "Crear y agregar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            // ─── Tab "En lote" ──────────────────────────────────────────────
            <div className="space-y-3">
              <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                <p className="text-xs text-blue-900">
                  Pegá una lista de etiquetas — cada línea se convierte en un campo
                  independiente en esta planilla.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de campo</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="bulk-tipo"
                        checked={bulkTipo === 11}
                        onChange={() => setBulkTipo(11)}
                        disabled={bulkPending}
                        className="h-3.5 w-3.5"
                      />
                      Checklist
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="radio"
                        name="bulk-tipo"
                        checked={bulkTipo === 1}
                        onChange={() => setBulkTipo(1)}
                        disabled={bulkPending}
                        className="h-3.5 w-3.5"
                      />
                      Texto
                    </label>
                  </div>
                </div>

                <label className="flex items-start gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkReusar}
                    onChange={(e) => setBulkReusar(e.target.checked)}
                    disabled={bulkPending}
                    className="h-3.5 w-3.5 mt-0.5"
                  />
                  <span>
                    Reusar campos existentes del catálogo cuando la etiqueta coincida
                    (case-insensitive).
                  </span>
                </label>
              </div>

              {/* Opciones compartidas — sólo Checklist. Precarga Sí/No/N/A. */}
              {bulkTipo === 11 && (
                <div className="rounded-md border border-blue-100 bg-blue-50/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-900">
                    Opciones compartidas del checklist
                  </p>
                  <p className="text-[10px] text-blue-700/70 -mt-1">
                    Se aplican a todos los campos que se creen. Los reusados
                    conservan sus opciones actuales.
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-blue-700/70">Preset:</span>
                    {CHECKLIST_PRESETS.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => setBulkChecklistOpciones(p.opciones)}
                        disabled={bulkPending}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  {bulkChecklistOpciones.length > 0 && (
                    <div className="space-y-1">
                      {bulkChecklistOpciones.map((op, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1"
                        >
                          <span className="font-mono text-gray-500 shrink-0 w-16 truncate">
                            {op.valor}
                          </span>
                          <span className="flex-1 truncate">{op.etiqueta}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setBulkChecklistOpciones((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="text-gray-400 hover:text-red-500 shrink-0"
                            aria-label="Quitar"
                            disabled={bulkPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-end gap-1.5">
                    <div className="space-y-1 w-24 shrink-0">
                      <Label className="text-xs">Valor</Label>
                      <Input
                        value={bulkOpcionInput.valor}
                        onChange={(e) =>
                          setBulkOpcionInput((p) => ({ ...p, valor: e.target.value }))
                        }
                        placeholder="SI"
                        className="h-7 text-xs font-mono"
                        disabled={bulkPending}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleAddBulkOpcion() }
                        }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <Label className="text-xs">Etiqueta</Label>
                      <Input
                        value={bulkOpcionInput.etiqueta}
                        onChange={(e) =>
                          setBulkOpcionInput((p) => ({ ...p, etiqueta: e.target.value }))
                        }
                        placeholder="Sí"
                        className="h-7 text-xs"
                        disabled={bulkPending}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleAddBulkOpcion() }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 shrink-0"
                      onClick={handleAddBulkOpcion}
                      disabled={
                        bulkPending ||
                        !bulkOpcionInput.valor.trim() ||
                        !bulkOpcionInput.etiqueta.trim()
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Etiquetas — una por línea</Label>
                <textarea
                  value={bulkEtiquetas}
                  onChange={(e) => setBulkEtiquetas(e.target.value)}
                  rows={8}
                  placeholder={"Verificar torque de bulones\nInspeccionar sello mecánico\nMedir alineación acople"}
                  disabled={bulkPending}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-sans"
                />
              </div>

              {bulkParsed.length > 0 && (
                <div className="rounded-md border max-h-64 overflow-y-auto bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="border-b">
                        <th className="text-left px-2 py-1.5 font-medium text-gray-600">
                          Etiqueta
                        </th>
                        <th className="text-left px-2 py-1.5 font-medium text-gray-600 w-40">
                          Código
                        </th>
                        <th className="text-right px-2 py-1.5 font-medium text-gray-600 w-28">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkParsed.map((it, i) => (
                        <tr
                          key={i}
                          className={cn(
                            "border-t",
                            (it.estado === "dup" || it.estado === "en_planilla") &&
                              "bg-amber-50/50",
                          )}
                        >
                          <td className="px-2 py-1">{it.etiqueta}</td>
                          <td className="px-2 py-1 font-mono text-gray-700">
                            {it.estado === "nuevo"
                              ? it.codigoNuevo
                              : it.estado === "reusa"
                                ? it.codigoExistente
                                : "—"}
                          </td>
                          <td className="px-2 py-1 text-right">
                            {it.estado === "nuevo" ? (
                              <span className="text-emerald-700 text-[10px] uppercase font-semibold">
                                crear
                              </span>
                            ) : it.estado === "reusa" ? (
                              <span className="text-blue-700 text-[10px] uppercase font-semibold">
                                reusar
                              </span>
                            ) : it.estado === "en_planilla" ? (
                              <span className="text-amber-700 text-[10px] uppercase font-semibold">
                                ya en planilla
                              </span>
                            ) : (
                              <span className="text-amber-700 text-[10px] uppercase font-semibold">
                                duplicado
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bulkError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 whitespace-pre-line">
                  {bulkError}
                </div>
              )}

              {bulkResumen && !bulkError && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  {bulkResumen}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  className="flex-1 bg-blue-900 hover:bg-blue-800"
                  onClick={handleBulkCreateAndAdd}
                  disabled={bulkPending || bulkAInsertar.length === 0}
                >
                  {bulkPending
                    ? "Creando..."
                    : `Crear y agregar ${bulkAInsertar.length} campo${bulkAInsertar.length !== 1 ? "s" : ""}`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={bulkPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      <BulkPasteOpcionesDialog
        open={bulkPasteOpen}
        onOpenChange={setBulkPasteOpen}
        existingValores={tempOpciones.map((o) => o.valor)}
        allowReplace
        onConfirm={handleBulkPasteConfirm}
      />
    </Sheet>
  )
}
