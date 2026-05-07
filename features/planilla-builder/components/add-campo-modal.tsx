"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useGetCamposSelect } from "@/features/campos/api/use-get-campos-select"
import { useCreateCampo } from "@/features/campos/api/use-create-campo"
import { useCreateOpcion } from "@/features/campos/api/use-create-opcion"
import { useAddCampo } from "@/features/planillas/api/use-add-campo"
import { campoSchema, type CampoFormValues } from "@/features/campos/schema"
import {
  CAMPO_TIPO_DATO,
  CAMPO_LISTA_RENDER_MODE_LABEL,
  type CampoTipoDato,
  type CampoListaRenderMode,
  type PlanillaSeccion,
} from "@/features/planillas/types"
import { Trash2, Plus } from "lucide-react"

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
  // Opciones temporales para nuevo campo Lista (se crean tras crear el Campo).
  const [tempOpciones, setTempOpciones] = useState<Array<{ valor: string; etiqueta: string }>>([])
  const [opcionInput, setOpcionInput] = useState({ valor: "", etiqueta: "" })

  const { data: camposResult } = useGetCamposSelect()
  const campos = (camposResult as any)?.data ?? []
  const createCampoMutation = useCreateCampo()
  const createOpcionMutation = useCreateOpcion()
  const addCampoMutation = useAddCampo()

  const form = useForm<CampoFormValues>({
    resolver: zodResolver(campoSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      etiqueta: "",
      tipoDato: 1,
      unidad: "",
      descripcion: "",
    },
  })

  const availableCampos = campos.filter(
    (c) => !existingCampoIds.includes(c.id) &&
      (campoSearch === "" ||
        c.nombre.toLowerCase().includes(campoSearch.toLowerCase()) ||
        c.codigo.toLowerCase().includes(campoSearch.toLowerCase()))
  )

  const handleClose = () => {
    setSelectedCampoId("")
    setCampoSearch("")
    setRenderMode(0)
    setTempOpciones([])
    setOpcionInput({ valor: "", etiqueta: "" })
    form.reset()
    onClose()
  }

  const selectedCampoExistente = campos.find((c: any) => c.id === selectedCampoId)
  const tipoDatoFormulario = form.watch("tipoDato") as CampoTipoDato
  const isListaExistente = selectedCampoExistente?.tipoDato === 5
  const isListaNuevo = tipoDatoFormulario === 5

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
      },
      { onSuccess: handleClose }
    )
  }

  const handleCreateAndAdd = async (values: CampoFormValues) => {
    try {
      const res: any = await createCampoMutation.mutateAsync(values)
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
      })
      handleClose()
    } catch {
      // Errores ya se muestran via mutation.isError
    }
  }

  const handleAddOpcion = () => {
    if (!opcionInput.valor.trim() || !opcionInput.etiqueta.trim()) return
    setTempOpciones((prev) => [...prev, { valor: opcionInput.valor.trim(), etiqueta: opcionInput.etiqueta.trim() }])
    setOpcionInput({ valor: "", etiqueta: "" })
  }

  const handleRemoveOpcion = (index: number) => {
    setTempOpciones((prev) => prev.filter((_, i) => i !== index))
  }

  const isPending = createCampoMutation.isPending || createOpcionMutation.isPending || addCampoMutation.isPending

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
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
            <Select value={seccionId} onValueChange={setSeccionId}>
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
                      <span className="font-medium">{c.nombre}</span>
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
                    onValueChange={(v) => setRenderMode(Number(v) as CampoListaRenderMode)}
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

                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Temperatura de aceite" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="etiqueta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiqueta</FormLabel>
                        <FormControl>
                          <Input placeholder="Temp. aceite" disabled={isPending} {...field} />
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

                {/* Sub-sección Lista: opciones + render mode */}
                {isListaNuevo && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                    <p className="text-xs font-semibold text-blue-900">Opciones de la lista</p>

                    {tempOpciones.length > 0 && (
                      <div className="space-y-1">
                        {tempOpciones.map((op, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-white border rounded px-2 py-1">
                            <span className="font-mono text-gray-500 shrink-0">{op.valor}</span>
                            <span className="flex-1 truncate">{op.etiqueta}</span>
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

                    <div className="space-y-1">
                      <Label className="text-xs">Cómo se muestra</Label>
                      <Select
                        value={String(renderMode)}
                        onValueChange={(v) => setRenderMode(Number(v) as CampoListaRenderMode)}
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
