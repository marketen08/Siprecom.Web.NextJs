"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useRef } from "react"
import { useGetCamposSelect } from "@/features/campos/api/use-get-campos-select"
import { useCreateCampo } from "@/features/campos/api/use-create-campo"
import { useCreateOpcion } from "@/features/campos/api/use-create-opcion"
import { useAddCampo } from "@/features/planillas/api/use-add-campo"
import { useUploadImagenCampo } from "@/features/planillas/api/use-upload-imagen-campo"
import { campoSchema, type CampoFormValues } from "@/features/campos/schema"
import {
  CAMPO_TIPO_DATO,
  CAMPO_LISTA_RENDER_MODE_LABEL,
  CAMPO_TAMANO_OPCIONES,
  CAMPO_TAMANO_DEFAULT,
  type CampoTipoDato,
  type CampoListaRenderMode,
  type PlanillaSeccion,
} from "@/features/planillas/types"
import { ArrowDown, ArrowUp, ImageIcon, Trash2, Plus } from "lucide-react"

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

type Tab = "existing" | "new"

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
  const [renderMode, setRenderMode] = useState<CampoListaRenderMode>(0)
  const [tamano, setTamano] = useState<number>(CAMPO_TAMANO_DEFAULT)
  // Opciones temporales para nuevo campo Lista (se crean tras crear el Campo).
  const [tempOpciones, setTempOpciones] = useState<Array<{ valor: string; etiqueta: string }>>([])
  const [opcionInput, setOpcionInput] = useState({ valor: "", etiqueta: "" })
  // Mientras esté en false, cada opción nueva se inserta alfabéticamente por etiqueta.
  // En cuanto el usuario use las flechas, pasa a true y se respeta su orden manual.
  const [opcionesManualOrder, setOpcionesManualOrder] = useState(false)
  // Imagen pre-cargada para campo nuevo de tipo Imagen (sube primero, recibe URL).
  const [imagenUrl, setImagenUrl] = useState<string | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setRenderMode(0)
    setTamano(CAMPO_TAMANO_DEFAULT)
    setTempOpciones([])
    setOpcionInput({ valor: "", etiqueta: "" })
    setOpcionesManualOrder(false)
    setImagenUrl(undefined)
    form.reset()
    onClose()
  }

  const selectedCampoExistente = campos.find((c: any) => c.id === selectedCampoId)
  const tipoDatoFormulario = form.watch("tipoDato") as CampoTipoDato
  const isListaExistente = selectedCampoExistente?.tipoDato === 5
  const isListaNuevo = tipoDatoFormulario === 5
  const isImagenNuevo = tipoDatoFormulario === 8

  const handleUploadImagen = async (file: File) => {
    const url = await uploadMutation.mutateAsync(file)
    setImagenUrl(url)
  }

  const handleAddExisting = () => {
    if (!selectedCampoId) return
    addCampoMutation.mutate(
      {
        planillaId,
        campoId: selectedCampoId,
        planillaSeccionId: seccionId === "__none__" ? undefined : seccionId,
        orden: nextOrden,
        esObligatorio: false,
        visible: true,
        soloLectura: false,
        renderMode: isListaExistente ? renderMode : undefined,
        tamano,
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
      })
      const newCampoId = res?.data?.id ?? res?.id
      if (!newCampoId) return

      // Si es Lista y hay opciones cargadas, crearlas en serie antes de agregar a la planilla.
      if (values.tipoDato === 5 && tempOpciones.length > 0) {
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
        esObligatorio: false,
        visible: true,
        soloLectura: false,
        renderMode: values.tipoDato === 5 ? renderMode : undefined,
        tamano,
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

  // Si elige Checklist y aún no cargó opciones, sugerir SI/NO/NA por defecto
  // (solo aplica al tab "Nuevo"; en "Existente" las opciones ya están definidas en el Campo).
  const handleRenderModeChange = (next: CampoListaRenderMode) => {
    setRenderMode(next)
    if (tab === "new" && next === 3 && tempOpciones.length === 0) {
      // Sí/No/NA es un orden semántico explícito, no alfabético: activamos manual.
      setTempOpciones([
        { valor: "SI", etiqueta: "Sí" },
        { valor: "NO", etiqueta: "No" },
        { valor: "NA", etiqueta: "No Aplica" },
      ])
      setOpcionesManualOrder(true)
    }
  }

  const handleRemoveOpcion = (index: number) => {
    setTempOpciones((prev) => prev.filter((_, i) => i !== index))
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

  const isPending = createCampoMutation.isPending || createOpcionMutation.isPending || addCampoMutation.isPending

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Agregar campo</SheetTitle>
          <SheetDescription>
            Seleccioná un campo existente o creá uno nuevo.
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

          {/* Ancho del campo (shared) */}
          <div className="space-y-1.5">
            <Label>Ancho del campo</Label>
            <div className="flex items-center gap-2">
              <Select
                value={(() => {
                  const match = CAMPO_TAMANO_OPCIONES.find((o) => o.value === tamano)
                  return String(match?.value ?? -1)
                })()}
                onValueChange={(v) => {
                  const num = Number(v)
                  if (num === -1) {
                    // Personalizado: dejá el actual, mostrar input numérico
                    if (CAMPO_TAMANO_OPCIONES.some((o) => o.value === tamano)) setTamano(tamano)
                  } else {
                    setTamano(num)
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue>
                    {(() => {
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
              {!CAMPO_TAMANO_OPCIONES.some((o) => o.value === tamano) && (
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
              Grilla de 12. Los campos consecutivos se agrupan automáticamente.
            </p>
          </div>

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
                      {Object.entries(CAMPO_LISTA_RENDER_MODE_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
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
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateAndAdd)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="TEMP-001" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipoDato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de dato</FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
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
                </div>

                <div className="grid grid-cols-[2fr_1fr] gap-3">
                  <FormField
                    control={form.control}
                    name="etiqueta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiqueta</FormLabel>
                        <FormControl>
                          <Input placeholder="Temperatura de aceite" disabled={isPending} {...field} />
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

                {/* Sub-sección Lista: opciones + render mode */}
                {isListaNuevo && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
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
                          {Object.entries(CAMPO_LISTA_RENDER_MODE_LABEL).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="text-xs font-semibold text-blue-900">Opciones de la lista</p>

                    {tempOpciones.length > 0 && (
                      <div className="space-y-1">
                        {tempOpciones.map((op, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1">
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
